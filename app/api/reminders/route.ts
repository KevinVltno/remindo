import { timingSafeEqual } from "node:crypto";
import { sendNotification } from "web-push";
import { pushEndpoint } from "@/lib/push-server";
import { serviceDb } from "@/lib/supabase-service";

export const maxDuration = 55;

type Delivery = {
  id: string; subscription_id: string; endpoint: string; p256dh: string; auth_key: string;
  notification_id: string; kind: "reminder" | "assigned" | "updated"; attempts: number;
};

export async function POST(request: Request) {
  const secret = process.env.REMINDO_CRON_SECRET;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return Response.json({ error: "Push configuration missing" }, { status: 503 });

  const db = serviceDb();
  const start = Date.now();
  let sent = 0;
  let failed = 0;

  for (let batch = 0; batch < 5 && Date.now() - start < 40_000; batch++) {
    const { data, error } = await db.rpc("remindo_claim_push");
    if (error || !data) return Response.json({ error: "Push queue unavailable" }, { status: 500 });
    const deliveries = data as Delivery[];
    if (deliveries.length === 0) break;

    const results = await Promise.allSettled(deliveries.map(async item => {
      const removeDelivery = () => db.from("push_deliveries").delete().eq("id", item.id).eq("attempts", item.attempts);
      if (!pushEndpoint(item.endpoint)) {
        const { error } = await removeDelivery();
        if (error) throw error;
        return;
      }

      try {
        await sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth_key } },
          JSON.stringify({
            id: item.notification_id,
            title: "Remindo",
            body: item.kind === "reminder" ? "Anda memiliki pengingat deadline." : "Ada pembaruan tugas untuk Anda.",
          }), { vapidDetails: { subject, publicKey, privateKey }, TTL: 3600, timeout: 5000 });
      } catch (error) {
        const code = (error as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          const result = await db.from("push_subscriptions").delete().eq("id", item.subscription_id)
            .eq("endpoint", item.endpoint).eq("p256dh", item.p256dh).eq("auth_key", item.auth_key);
          if (result.error) throw result.error;
          return;
        }
        failed++;
        return;
      }
      sent++;
      const { error } = await removeDelivery();
      if (error) throw error;
    }));
    failed += results.filter(result => result.status === "rejected").length;
  }
  return Response.json({ sent, failed }, { status: failed ? 502 : 200 });
}

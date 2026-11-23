"use server";

import { ECDH } from "node:crypto";
import { revalidatePath } from "next/cache";
import { activeSession } from "@/lib/session";
import { pushEndpoint } from "@/lib/push-server";
import { serviceDb } from "@/lib/supabase-service";
import { isId, type Feedback } from "@/lib/todos";

export async function savePreferences(_: Feedback, form: FormData): Promise<Feedback> {
  const { profile, db } = await activeSession(true);
  const { data, error } = await db.from("reminder_settings").update({
    one_day_before: form.get("one_day_before") === "on",
    one_hour_before: form.get("one_hour_before") === "on",
    at_deadline: form.get("at_deadline") === "on",
  }).eq("user_id", profile.id).select("user_id").maybeSingle();

  if (error || !data) return { error: "Preferensi gagal disimpan." };
  revalidatePath("/dashboard/notifications");
  return { success: "Preferensi pengingat disimpan." };
}

export async function markRead(_: Feedback, form: FormData): Promise<Feedback> {
  const { profile, db } = await activeSession(true);
  const id = form.get("id");
  if (id !== null && !isId(id)) return { error: "Notifikasi tidak valid." };

  const query = db.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
  if (id) query.eq("id", id);
  const { error } = await query;
  if (error) return { error: "Notifikasi gagal diperbarui." };
  revalidatePath("/dashboard/notifications");
  return { success: id ? "Notifikasi ditandai sudah dibaca." : "Semua notifikasi ditandai sudah dibaca." };
}

export async function setPushSubscription(value: unknown): Promise<Feedback> {
  const { profile } = await activeSession(true);
  if (!value || typeof value !== "object" || !("endpoint" in value) || !pushEndpoint(value.endpoint) ||
    !("keys" in value) || !value.keys || typeof value.keys !== "object" ||
    !("p256dh" in value.keys) || !("auth" in value.keys) ||
    typeof value.keys.p256dh !== "string" || !/^[\w-]{87}$/.test(value.keys.p256dh) ||
    typeof value.keys.auth !== "string" || !/^[\w-]{22}$/.test(value.keys.auth)) {
    return { error: "Layanan push browser ini belum didukung atau langganan tidak valid." };
  }

  try {
    const point = Buffer.from(value.keys.p256dh, "base64url");
    if (point[0] !== 4) return { error: "Kunci push browser tidak valid." };
    ECDH.convertKey(point, "prime256v1");
  } catch {
    return { error: "Kunci push browser tidak valid." };
  }

  const { error } = await serviceDb().from("push_subscriptions").upsert({
    user_id: profile.id, endpoint: value.endpoint, p256dh: value.keys.p256dh, auth_key: value.keys.auth,
  }, { onConflict: "endpoint" });
  return error ? { error: "Langganan push gagal disimpan." } : { success: "Notifikasi browser aktif di perangkat ini." };
}

export async function removePushSubscription(endpoint: unknown): Promise<Feedback> {
  const { profile } = await activeSession(true);
  if (!pushEndpoint(endpoint)) return { error: "Alamat langganan push tidak valid." };
  const { error } = await serviceDb().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", profile.id);
  return error ? { error: "Langganan push gagal dihapus." } : { success: "Notifikasi browser dinonaktifkan di perangkat ini." };
}

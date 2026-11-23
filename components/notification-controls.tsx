"use client";

import { useActionState, useState } from "react";
import { markRead, removePushSubscription, savePreferences, setPushSubscription } from "@/app/dashboard/notifications/actions";
import type { Feedback as FeedbackValue } from "@/lib/todos";
import { Feedback } from "./feedback";

export type Preferences = { one_day_before: boolean; one_hour_before: boolean; at_deadline: boolean };

export function MarkRead({ id, read = false }: { id?: string; read?: boolean }) {
  const [message, action, pending] = useActionState(markRead, {});
  return <form action={action}>
    {id && <input type="hidden" name="id" value={id} />}
    {!read && <button className="quiet" disabled={pending}>{pending ? "Memperbarui…" : id ? "Tandai dibaca" : "Tandai semua dibaca"}</button>}
    <Feedback value={message} />
  </form>;
}

export function ReminderPreferences({ preferences }: { preferences: Preferences }) {
  const [message, action, pending] = useActionState(savePreferences, {});
  const [selection, setSelection] = useState(preferences);
  return (
    <form action={action} className="panel editor" aria-busy={pending}>
      <h2>Waktu pengingat</h2>
      {([
        ["one_day_before", "1 hari sebelum deadline"],
        ["one_hour_before", "1 jam sebelum deadline"],
        ["at_deadline", "Saat deadline tiba"],
      ] as const).map(([key, label]) => <label className="checkbox" key={key}>
        <input type="checkbox" name={key} checked={selection[key]}
          onChange={event => setSelection({ ...selection, [key]: event.target.checked })} />{label}
      </label>)}
      <button disabled={pending}>{pending ? "Menyimpan…" : "Simpan preferensi"}</button>
      <Feedback value={message} />
    </form>
  );
}

function publicKeyBytes(key: string) {
  const padded = key + "=".repeat((4 - key.length % 4) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
}

export function PushSettings({ vapidKey }: { vapidKey?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<FeedbackValue>({});

  async function changePush(enable: boolean) {
    if (!vapidKey || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMessage({ error: "Push tidak tersedia. Gunakan browser yang mendukung push melalui HTTPS atau localhost." });
      return;
    }

    setPending(true);
    try {
      if (enable && await Notification.requestPermission() !== "granted") {
        setMessage({ error: "Izin notifikasi belum diberikan. Periksa pengaturan situs di browser." });
        return;
      }
      if (enable) await navigator.serviceWorker.register("/sw.js");
      const registration = enable ? await navigator.serviceWorker.ready : await navigator.serviceWorker.getRegistration();
      const current = await registration?.pushManager.getSubscription();
      if (!enable) {
        if (current) {
          const result = await removePushSubscription(current.endpoint);
          if (result.error) { setMessage(result); return; }
          await current.unsubscribe();
        }
        setMessage({ success: "Notifikasi browser dinonaktifkan di perangkat ini." });
        return;
      }
      if (!registration) throw new Error("Service worker unavailable");
      const subscription = current ?? await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: publicKeyBytes(vapidKey),
      });
      setMessage(await setPushSubscription(subscription.toJSON()));
    } catch {
      setMessage({ error: "Pengaturan push gagal diperbarui. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  return <section className="panel editor">
    <h2>Notifikasi browser</h2>
    {vapidKey ? <div className="actions">
      <button type="button" disabled={pending} onClick={() => changePush(true)}>{pending ? "Memproses…" : "Aktifkan"}</button>
      <button className="quiet" type="button" disabled={pending} onClick={() => changePush(false)}>Nonaktifkan</button>
    </div> : <p>Notifikasi browser belum dikonfigurasi.</p>}
    <Feedback value={message} />
  </section>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { MarkRead, PushSettings, ReminderPreferences, type Preferences } from "@/components/notification-controls";
import { WorkspaceNav } from "@/components/workspace-nav";
import { activeSession } from "@/lib/session";

export const metadata: Metadata = { title: "Notifikasi" };
const pageSize = 25;

export default async function NotificationsPage({ searchParams }: PageProps<"/dashboard/notifications">) {
  const { db, profile } = await activeSession();
  const { page } = await searchParams;
  const current = typeof page === "string" && /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1;
  const from = (current - 1) * pageSize;
  const [notifications, preferences] = await Promise.all([
    db.from("notifications").select("id,title,message,created_at,is_read", { count: "exact" })
      .eq("user_id", profile.id).order("created_at", { ascending: false }).order("id").range(from, from + pageSize - 1),
    db.from("reminder_settings").select("one_day_before,one_hour_before,at_deadline").eq("user_id", profile.id).single(),
  ]);
  if (notifications.error || preferences.error || !preferences.data) throw new Error("Notifikasi Remindo gagal dimuat.");

  return (
    <main className="shell workspace">
      <WorkspaceNav />
      <h1>Notifikasi</h1>
      <div className="settings-grid">
        <ReminderPreferences preferences={preferences.data as Preferences} />
        <PushSettings vapidKey={process.env.VAPID_PUBLIC_KEY || undefined} />
      </div>
      <section className="stack">
        <div className="section-head"><h2>Kotak masuk</h2><MarkRead /></div>
        {!notifications.data?.length && <p className="empty">{current === 1 ? "Belum ada notifikasi." : "Tidak ada notifikasi di halaman ini."}</p>}
        <ul className="notification-list">
          {notifications.data?.map(item => <li key={item.id} className="task-card">
            <div className="section-head">
              <h3>{item.title}</h3>
              {!item.is_read && <span className="pill">Belum dibaca</span>}
            </div>
            <p>{item.message}</p>
            <p><LocalTime value={item.created_at} /></p>
            <MarkRead id={item.id} read={item.is_read} />
          </li>)}
        </ul>
        <div className="actions">
          {current > 1 && <Link href={`?page=${current - 1}`}>Sebelumnya</Link>}
          {(notifications.count ?? 0) > from + pageSize && <Link href={`?page=${current + 1}`}>Berikutnya</Link>}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { activeSession } from "@/lib/session";
import { RefreshWhenVisible } from "./refresh-when-visible";

export async function WorkspaceNav() {
  const { db, profile } = await activeSession();
  const { count, error } = await db.from("notifications").select("id", { head: true, count: "exact" })
    .eq("user_id", profile.id).eq("is_read", false);

  return <nav className="workspace-nav" aria-label="Navigasi dasbor">
    <RefreshWhenVisible />
    <Link href="/dashboard">Tugas saya</Link>
    {profile.role === "admin" && <><Link href="/admin">Admin</Link><Link href="/admin/users">Pengguna</Link></>}
    <Link className="notification-link" href="/dashboard/notifications">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M17 9a5 5 0 0 0-10 0c0 5-2 6-2 7h14c0-1-2-2-2-7Zm-7 10a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Notifikasi
      {!error && Boolean(count) && <span className="pill" aria-label={`${count} belum dibaca`}>{count! > 99 ? "99+" : count}</span>}
    </Link>
    <form action={logout}><button className="quiet" type="submit">Keluar</button></form>
  </nav>;
}

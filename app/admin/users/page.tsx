import type { Metadata } from "next";
import Link from "next/link";
import { MemberForm } from "@/components/member-form";
import { WorkspaceNav } from "@/components/workspace-nav";
import { adminSession, readPages } from "@/lib/session";
import type { Member } from "@/lib/todos";

export const metadata: Metadata = { title: "Pengguna" };

export default async function UsersPage() {
  const { db, profile } = await adminSession();
  const users = await readPages<Member & { email: string | null }>((from, to) =>
    db.rpc("remindo_admin_users").order("display_name").order("id").range(from, to));

  return (
    <main className="shell workspace admin-workspace">
      <WorkspaceNav />
      <header className="dashboard-banner">
        <div><h1>Pengguna</h1><p>Lihat daftar tugas dan kelola akses setiap akun.</p></div>
        <Link className="banner-link" href="/admin">Dasbor Admin</Link>
      </header>
      <ul className="task-grid">{users.map(user => <li className="task-card" key={user.id}>
        <div className="section-head">
          <h2>{user.display_name}</h2>
          <span className="pill">{user.role === "admin" ? "Admin" : "User"}</span>
        </div>
        {user.email && <p className="description">{user.email}</p>}
        <Link className="button fit" href={{ pathname: "/admin", query: { pengguna: user.id }, hash: "daftar-tugas" }}>Lihat tugas</Link>
        {user.id === profile.id ? <p>Admin · Aktif · Akun Anda</p> :
          <MemberForm member={user} />}
      </li>)}</ul>
    </main>
  );
}

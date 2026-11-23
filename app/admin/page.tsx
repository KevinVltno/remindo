import type { Metadata } from "next";
import Link from "next/link";
import { TodoBoard } from "@/components/todo-board";
import { WorkspaceNav } from "@/components/workspace-nav";
import { adminSession, readPages } from "@/lib/session";
import { isId, type Member, type Todo } from "@/lib/todos";

export const metadata: Metadata = { title: "Admin" };

type Counts = { total: number; completed: number; overdue: number };
type Stats = Counts & { users: (Counts & { id: string; display_name: string })[] };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { db } = await adminSession();
  const { pengguna } = await searchParams;
  const selectedId = isId(pengguna) ? pengguna : undefined;
  const [tasks, members, { data, error }] = await Promise.all([
    readPages<Todo>((from, to) => {
      const query = db.from("todos").select("id,user_id,title,description,category,priority,status,starts_at,deadline_at");
      if (selectedId) query.eq("user_id", selectedId);
      return query.order("id").range(from, to);
    }),
    readPages<Member>((from, to) => db.from("profiles").select("id,display_name,role,is_active").order("display_name").order("id").range(from, to)),
    db.rpc("remindo_admin_stats"),
  ]);
  if (error || !data) throw new Error("Statistik Remindo gagal dimuat.", { cause: error });
  const stats = data as Stats;
  const selected = members.find(member => member.id === selectedId);

  return (
    <main className="shell workspace admin-workspace">
      <WorkspaceNav />
      <header className="dashboard-banner">
        <div><h1>Dasbor Admin</h1><p>Pantau progres dan kelola tugas setiap pengguna.</p></div>
        <Link className="banner-link" href="/admin/users">Kelola pengguna</Link>
      </header>
      <dl className="stat-grid admin-metrics">
        <div className="task-card"><dt>Total tugas</dt><dd>{stats.total}</dd></div>
        <div className="task-card"><dt>Selesai</dt><dd className="done">{stats.completed}</dd></div>
        <div className="task-card"><dt>Terlambat</dt><dd className="danger">{stats.overdue}</dd></div>
      </dl>
      <section className="stack">
        <h2>Statistik per pengguna</h2>
        <div className="table-wrap"><table>
          <thead><tr><th scope="col">Pengguna</th><th scope="col">Total</th><th scope="col">Selesai</th><th scope="col">Terlambat</th></tr></thead>
          <tbody>{stats.users.map(user => <tr key={user.id}>
            <th scope="row"><Link href={{ pathname: "/admin", query: { pengguna: user.id }, hash: "daftar-tugas" }}>{user.display_name}</Link></th><td>{user.total}</td><td>{user.completed}</td><td>{user.overdue}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <div id="daftar-tugas" className="admin-board stack">
        {selectedId && <div className="section-head">
          <p className="pill">{selected ? selected.display_name : "Pengguna tidak ditemukan"}</p>
          <Link href="/admin#daftar-tugas">Lihat semua tugas</Link>
        </div>}
        <TodoBoard key={selectedId ?? "all"} tasks={tasks} members={members} heading={selected ? `Tugas ${selected.display_name}` : "Semua tugas"} />
      </div>
    </main>
  );
}

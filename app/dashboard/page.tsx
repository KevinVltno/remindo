import type { Metadata } from "next";
import { TodoBoard } from "@/components/todo-board";
import { WorkspaceNav } from "@/components/workspace-nav";
import { activeSession, readPages } from "@/lib/session";
import type { Todo } from "@/lib/todos";

export const metadata: Metadata = { title: "Dasbor" };

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const { db, profile } = await activeSession();
  const [tasks, { status }] = await Promise.all([
    readPages<Todo>((from, to) => db.from("todos").select("id,user_id,title,description,category,priority,status,starts_at,deadline_at")
      .eq("user_id", profile.id).order("id").range(from, to)),
    searchParams,
  ]);

  return (
    <main className="shell workspace">
      <WorkspaceNav />
      <h1>Halo, {profile.display_name}</h1>
      {status === "logout-error" && <p role="alert" className="feedback error">Gagal keluar. Coba lagi.</p>}
      <TodoBoard tasks={tasks} />
    </main>
  );
}

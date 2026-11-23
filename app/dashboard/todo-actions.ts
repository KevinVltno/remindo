"use server";

import { revalidatePath } from "next/cache";
import { activeSession } from "@/lib/session";
import { isId, priorities, statuses, type Feedback } from "@/lib/todos";

function readDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value ? date : null;
}

export async function saveTodo(_: Feedback, form: FormData): Promise<Feedback> {
  const { db, profile } = await activeSession(true);
  const id = form.get("id");
  const assignee = form.get("assignee");
  const adminView = profile.role === "admin" && form.get("adminView") === "yes";
  const title = form.get("title");
  const description = form.get("description");
  const category = form.get("category");
  const priority = form.get("priority");
  const status = form.get("status");
  const starts = readDate(form.get("starts_at"));
  const deadline = readDate(form.get("deadline_at"));

  if ((id !== null && !isId(id)) || typeof title !== "string" || !title.trim() || title.trim().length > 150 ||
    typeof description !== "string" || description.length > 5000 ||
    typeof category !== "string" || !category.trim() || category.trim().length > 80 ||
    typeof priority !== "string" || !Object.hasOwn(priorities, priority) ||
    typeof status !== "string" || !Object.hasOwn(statuses, status) || !starts || !deadline || starts > deadline ||
    (adminView && !isId(assignee))) {
    return { error: "Periksa kolom tugas. Deadline harus sama dengan atau setelah waktu mulai." };
  }

  const values = {
    user_id: adminView ? assignee : profile.id,
    title: title.trim(), description: description.trim(), category: category.trim(),
    priority, status, starts_at: starts.toISOString(), deadline_at: deadline.toISOString(),
  };

  const query = id === null ? db.from("todos").insert(values) : db.from("todos").update(values).eq("id", id);
  if (id !== null && !adminView) query.eq("user_id", profile.id);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return { error: "Tugas gagal disimpan. Pastikan akun penerima aktif dan tugas masih tersedia." };
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: id ? "Perubahan tugas disimpan." : "Tugas ditambahkan." };
}

export async function deleteTodo(_: Feedback, form: FormData): Promise<Feedback> {
  const { db, profile } = await activeSession(true);
  const id = form.get("id");
  if (!isId(id)) return { error: "Tugas tidak valid." };
  const query = db.from("todos").delete().eq("id", id);
  if (profile.role !== "admin" || form.get("adminView") !== "yes") query.eq("user_id", profile.id);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return { error: "Tugas gagal dihapus atau sudah tidak tersedia." };
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: "Tugas dihapus." };
}

"use client";

import { startTransition, useActionState } from "react";
import { saveTodo } from "@/app/dashboard/todo-actions";
import { priorities, statuses, type Feedback as FeedbackValue, type Member, type Todo } from "@/lib/todos";
import { Feedback } from "./feedback";

function localInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function TodoForm({ task, members, onSave }: {
  task?: Todo;
  members?: Member[];
  onSave: (message: FeedbackValue) => void;
}) {
  const [feedback, submit, pending] = useActionState(async (_: FeedbackValue, form: FormData) => {
    for (const field of ["starts_at", "deadline_at"]) {
      const value = form.get(field);
      const date = new Date(typeof value === "string" ? value : "");
      if (!Number.isFinite(date.getTime())) return { error: "Masukkan tanggal dan waktu yang valid." };
      form.set(field, date.toISOString());
    }
    if (String(form.get("starts_at")) > String(form.get("deadline_at"))) {
      return { error: "Deadline harus sama dengan atau setelah waktu mulai." };
    }
    const result = await saveTodo({}, form);
    if (result.success) onSave(result);
    return result;
  }, {});

  return (
    <form onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      startTransition(() => submit(form));
    }} className="panel editor" aria-busy={pending}>
      <h2>{task ? "Edit tugas" : "Tambah tugas"}</h2>
      {task && <input type="hidden" name="id" value={task.id} />}
      {members && <>
        <input type="hidden" name="adminView" value="yes" />
        <label>Penerima
          <select name="assignee" required defaultValue={task?.user_id ?? ""}>
            <option value="" disabled>Pilih pengguna</option>
            {members.filter(member => member.is_active || member.id === task?.user_id).map(member => (
              <option key={member.id} value={member.id}>{member.display_name}{member.is_active ? "" : " (nonaktif)"}</option>
            ))}
          </select>
        </label>
      </>}
      <label>Judul<input name="title" required maxLength={150} defaultValue={task?.title} /></label>
      <label>Deskripsi<textarea name="description" rows={3} maxLength={5000} defaultValue={task?.description} /></label>
      <div className="field-pair">
        <label>Kategori<input name="category" required maxLength={80} defaultValue={task?.category ?? "Umum"} /></label>
        <label>Prioritas<select name="priority" defaultValue={task?.priority ?? "sedang"}>
          {Object.entries(priorities).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select></label>
      </div>
      <label>Status<select name="status" defaultValue={task?.status ?? "pending"}>
        {Object.entries(statuses).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select></label>
      <div className="field-pair">
        <label>Mulai<input type="datetime-local" name="starts_at" required defaultValue={localInput(task?.starts_at)} /></label>
        <label>Deadline<input type="datetime-local" name="deadline_at" required defaultValue={localInput(task?.deadline_at)} /></label>
      </div>
      <button disabled={pending}>{pending ? "Menyimpan…" : "Simpan tugas"}</button>
      <Feedback value={feedback} />
    </form>
  );
}

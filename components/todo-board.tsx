"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteTodo } from "@/app/dashboard/todo-actions";
import { priorities, statuses, type Feedback as FeedbackValue, type Member, type Todo } from "@/lib/todos";
import { Feedback } from "./feedback";
import { TodoForm } from "./todo-form";

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const monthFormat = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

function dayKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0")).join("-");
}

function DeleteButton({ task, admin, onDelete }: { task: Todo; admin: boolean; onDelete: (value: FeedbackValue) => void }) {
  const [feedback, action, pending] = useActionState(async (_: FeedbackValue, form: FormData) => {
    const result = await deleteTodo({}, form);
    if (result.success) onDelete(result);
    return result;
  }, {});

  return (
    <form action={action} onSubmit={event => {
      if (!window.confirm(`Hapus tugas “${task.title}”?`)) event.preventDefault();
    }}>
      <input type="hidden" name="id" value={task.id} />
      {admin && <input type="hidden" name="adminView" value="yes" />}
      <button className="quiet danger" disabled={pending}>{pending ? "Menghapus…" : "Hapus"}</button>
      <Feedback value={feedback} />
    </form>
  );
}

export function TodoBoard({ tasks, members, heading }: { tasks: Todo[]; members?: Member[]; heading?: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("deadline");
  const [view, setView] = useState("list");
  const [month, setMonth] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [editor, setEditor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackValue>({});
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setClock(Date.now()), 0);
    const interval = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, []);

  const editing = tasks.find(task => task.id === editor);
  const names = new Map(members?.map(member => [member.id, member.display_name]));
  const categories = [...new Set(tasks.map(task => task.category))].sort((a, b) => a.localeCompare(b, "id"));
  const keyword = query.trim().toLocaleLowerCase("id");
  const visible = tasks.filter(task =>
    (!status || task.status === status) && (!priority || task.priority === priority) &&
    (!category || task.category === category) && (!date || dayKey(new Date(task.deadline_at)) === date) &&
    (!keyword || [task.title, task.description, task.category, names.get(task.user_id)]
      .some(text => text?.toLocaleLowerCase("id").includes(keyword))))
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "id");
      if (sort === "priority") {
        const order = { tinggi: 0, sedang: 1, rendah: 2 };
        return order[a.priority] - order[b.priority] || Date.parse(a.deadline_at) - Date.parse(b.deadline_at);
      }
      const difference = Date.parse(a.deadline_at) - Date.parse(b.deadline_at);
      return sort === "latest" ? -difference : difference;
    });

  const dayTasks = new Map<string, number>();
  if (view === "calendar") {
    for (const task of visible) {
      const key = dayKey(new Date(task.deadline_at));
      dayTasks.set(key, (dayTasks.get(key) ?? 0) + 1);
    }
  }
  const year = month?.getFullYear() ?? 0;
  const monthIndex = month?.getMonth() ?? 0;
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const displayed = view === "list" ? visible : visible.filter(task => {
    const key = dayKey(new Date(task.deadline_at));
    return selectedDay ? key === selectedDay : key.startsWith(monthPrefix);
  });
  const offset = month ? (new Date(year, monthIndex, 1).getDay() + 6) % 7 : 0;
  const days = month ? new Date(year, monthIndex + 1, 0).getDate() : 0;

  function moveMonth(step: number) {
    setMonth(new Date(year, monthIndex + step, 1));
    setSelectedDay("");
  }

  return (
    <section className="stack" aria-label="Tugas">
      <div className="section-head">
        <h2>{heading ?? (members ? "Semua tugas" : "Tugas saya")}</h2>
        <button type="button" onClick={() => setEditor(editor === "new" ? null : "new")}>
          {editor === "new" ? "Tutup formulir" : "+ Tambah tugas"}
        </button>
      </div>
      {(editor === "new" || editing) && <div className="stack">
        {editing && <button type="button" className="quiet fit" onClick={() => setEditor(null)}>Batal edit</button>}
        <TodoForm key={editor} task={editing} members={members} onSave={value => {
          setEditor(null);
          setFeedback(value);
        }} />
      </div>}
      <div className="filters">
        <label>Cari<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Judul, deskripsi, kategori…" /></label>
        <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">Semua</option>
          {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Prioritas<select value={priority} onChange={event => setPriority(event.target.value)}>
          <option value="">Semua</option>
          {Object.entries(priorities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Kategori<select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="">Semua</option>
          {categories.map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>Tanggal deadline<input type="date" value={date} onChange={event => {
          const next = event.target.value;
          setDate(next);
          if (next) {
            setMonth(new Date(next + "T12:00:00"));
            setSelectedDay("");
          }
        }} /></label>
        <label>Urutkan<select value={sort} onChange={event => setSort(event.target.value)}>
          <option value="deadline">Deadline terdekat</option>
          <option value="latest">Deadline terjauh</option>
          <option value="priority">Prioritas tertinggi</option>
          <option value="title">Judul A–Z</option>
        </select></label>
      </div>
      <div className="actions">
        <button type="button" className="quiet" disabled={view === "list"} onClick={() => setView("list")}>Daftar</button>
        <button type="button" className="quiet" disabled={view === "calendar"} onClick={() => {
          if (!month) setMonth(new Date());
          setView("calendar");
        }}>Kalender</button>
      </div>
      {view === "calendar" && month && <div className="calendar stack">
        <div className="section-head">
          <button type="button" className="quiet" onClick={() => moveMonth(-1)}>Sebelumnya</button>
          <h3>{monthFormat.format(month)}</h3>
          <button type="button" className="quiet" onClick={() => moveMonth(1)}>Berikutnya</button>
        </div>
        <div className="calendar-grid">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => <span key={day}>{day}</span>)}
          {Array.from({ length: offset }, (_, index) => <span key={`pad${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const number = index + 1;
            const key = dayKey(new Date(year, monthIndex, number));
            const count = dayTasks.get(key) ?? 0;
            return <button type="button" className="quiet calendar-day" key={key} aria-pressed={selectedDay === key}
              aria-label={`${number} ${monthFormat.format(month)}, ${count} tugas`}
              onClick={() => setSelectedDay(selectedDay === key ? "" : key)}>
              {number}{count > 0 && <small>{count}</small>}
            </button>;
          })}
        </div>
        {selectedDay && <button className="quiet fit" type="button" onClick={() => setSelectedDay("")}>Tampilkan satu bulan</button>}
      </div>}
      {!displayed.length && <p className="empty">{tasks.length ? "Tidak ada tugas yang cocok." : "Belum ada tugas."}</p>}
      <ul className="task-grid">
        {displayed.map(task => {
          const overdue = clock > Date.parse(task.deadline_at) && task.status !== "selesai";
          return <li key={task.id} className="task-card">
            <div className="actions badges">
              <span className={`pill ${task.status === "selesai" ? "done" : ""}`}>{statuses[task.status]}</span>
              <span className="pill">{priorities[task.priority]}</span>
              {overdue && <span className="pill danger">Terlambat</span>}
            </div>
            <h3>{task.title}</h3>
            <p>{task.category}{members && ` · ${names.get(task.user_id) ?? "Pengguna"}`}</p>
            {task.description && <p className="description">{task.description}</p>}
            <dl className="dates">
              <dt>Mulai</dt><dd><time dateTime={task.starts_at}>{clock ? dateFormat.format(new Date(task.starts_at)) : task.starts_at.slice(0, 10)}</time></dd>
              <dt>Deadline</dt><dd><time dateTime={task.deadline_at}>{clock ? dateFormat.format(new Date(task.deadline_at)) : task.deadline_at.slice(0, 10)}</time></dd>
            </dl>
            <div className="actions">
              <button type="button" className="quiet" onClick={() => {
                setEditor(task.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}>Edit tugas</button>
              <DeleteButton task={task} admin={Boolean(members)} onDelete={setFeedback} />
            </div>
          </li>;
        })}
      </ul>
      <Feedback value={feedback} />
    </section>
  );
}

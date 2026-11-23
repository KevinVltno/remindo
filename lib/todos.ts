export const priorities = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" };
export const statuses = { pending: "Menunggu", progress: "Dikerjakan", selesai: "Selesai" };

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: keyof typeof priorities;
  status: keyof typeof statuses;
  starts_at: string;
  deadline_at: string;
};

export type Member = { id: string; display_name: string; role: "user" | "admin"; is_active: boolean };
export type Feedback = { error?: string; success?: string };

export function isId(value: unknown): value is string {
  return typeof value === "string" && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value);
}

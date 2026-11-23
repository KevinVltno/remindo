"use server";

import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/session";
import { isId, type Feedback } from "@/lib/todos";

export async function updateMember(_: Feedback, form: FormData): Promise<Feedback> {
  const { db, profile } = await adminSession(true);
  const id = form.get("id");
  const role = form.get("role");
  const active = form.get("is_active");
  if (!isId(id) || id === profile.id || (role !== "user" && role !== "admin") ||
    (active !== "yes" && active !== "no")) return { error: "Perubahan akun tidak valid." };

  const { data, error } = await db.from("profiles").update({ role, is_active: active === "yes" }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "Akun gagal diperbarui." };
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: "Akun diperbarui." };
}

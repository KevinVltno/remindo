import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "./auth";
import { getProfile } from "./supabase";

export const activeSession = cache(async (writable = false) => {
  const db = await supabaseServer(writable);
  const profile = await getProfile(db);
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?status=inactive");
  return { db, profile };
});

export async function adminSession(writable = false) {
  const session = await activeSession(writable);
  if (session.profile.role !== "admin") redirect("/dashboard");
  return session;
}

export async function readPages<T>(load: (from: number, to: number) => PromiseLike<{
  data: T[] | null;
  error: unknown;
}>) {
  const rows: T[] = [];
  const size = 200;
  for (let from = 0; ; from += size) {
    const { data, error } = await load(from, from + size - 1);
    if (error || !data) throw new Error("Data Remindo gagal dimuat.", { cause: error });
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

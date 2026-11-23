"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/auth";
import { loginAttempt } from "@/lib/login-limit";
import { getProfile } from "@/lib/supabase";

export type AuthFeedback = { error?: string; success?: string };

function credentials(form: FormData) {
  const email = form.get("email");
  const password = form.get("password");
  if (
    typeof email !== "string" || email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" || password.length < 8 || password.length > 128
  ) return null;
  return { email: email.trim(), password };
}

function lockedMessage(until: string) {
  const minutes = Math.max(1, Math.ceil((Date.parse(until) - Date.now()) / 60_000));
  return { error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${minutes} menit.` };
}

export async function login(_: AuthFeedback, form: FormData): Promise<AuthFeedback> {
  const input = credentials(form);
  if (!input) return { error: "Periksa alamat email dan panjang kata sandi." };

  let attempt: ReturnType<typeof loginAttempt>;
  let lockedUntil: string | null;
  const unavailable = { error: "Login sementara tidak tersedia. Coba lagi nanti." };
  try {
    attempt = loginAttempt(input.email);
    const reservation = await attempt.reserve();
    lockedUntil = reservation.lockedUntil;
    if (!reservation.allowed) return lockedUntil ? lockedMessage(lockedUntil) : unavailable;
  } catch {
    return unavailable;
  }

  const supabase = await supabaseServer(true);
  const error = await supabase.auth.signInWithPassword(input).then(
    result => result.error,
    () => ({ code: undefined }),
  );
  if (error?.code === "invalid_credentials") {
    return lockedUntil ? lockedMessage(lockedUntil) : { error: "Gagal masuk. Periksa email dan kata sandi, lalu coba lagi." };
  }

  try {
    // Provider errors and unconfirmed email do not count as incorrect passwords.
    await attempt.finish(!error);
  } catch {
    if (!error) await supabase.auth.signOut({ scope: "local" });
    return unavailable;
  }
  if (error?.code === "email_not_confirmed") return { error: "Konfirmasi alamat email sebelum masuk." };
  if (error) return unavailable;

  const profile = await getProfile(supabase);
  if (!profile?.is_active) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Akun tidak aktif atau profil belum tersedia." };
  }
  redirect("/dashboard");
}

export async function register(_: AuthFeedback, form: FormData): Promise<AuthFeedback> {
  const input = credentials(form);
  const name = form.get("display_name");
  if (!input || typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    return { error: "Isi nama, alamat email yang valid, dan kata sandi 8–128 karakter." };
  }

  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) return { error: "Alamat situs Remindo belum dikonfigurasi." };

  const supabase = await supabaseServer(true);
  const { data, error } = await supabase.auth.signUp({
    ...input,
    options: { data: { display_name: name.trim() }, emailRedirectTo: new URL("/auth/confirm", siteUrl).href },
  });
  if (error) return { error: "Pendaftaran gagal. Periksa data dan coba lagi nanti." };
  if (data.session) redirect("/dashboard");
  return { success: "Jika pendaftaran tersedia, email konfirmasi akan dikirim. Periksa kotak masuk dan folder spam." };
}

export async function logout() {
  const supabase = await supabaseServer(true);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  redirect(error ? "/dashboard?status=logout-error" : "/login");
}

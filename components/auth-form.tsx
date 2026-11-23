"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/auth/actions";

export function AuthForm({ signup = false, notice }: { signup?: boolean; notice?: string }) {
  const [state, action, pending] = useActionState(signup ? register : login, {});

  return (
    <div className="panel">
      <h2>{signup ? "Buat akun" : "Masuk ke Remindo"}</h2>
      <form action={action} className="auth-form" aria-busy={pending}>
        {signup && (
          <label htmlFor="display-name">Nama
            <input id="display-name" name="display_name" autoComplete="name" required maxLength={80} />
          </label>
        )}
        <label htmlFor="email">Email
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label htmlFor="password">Kata sandi
          <input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"}
            required minLength={8} maxLength={128} aria-describedby={signup ? "password-hint" : undefined} />
        </label>
        {signup && <small id="password-hint">Gunakan 8–128 karakter.</small>}
        <button type="submit" disabled={pending}>{pending ? "Memproses…" : signup ? "Daftar" : "Masuk"}</button>
      </form>
      {(state.error || notice) && !state.success && <p className="feedback error" role="alert">{state.error || notice}</p>}
      {state.success && <p className="feedback success" role="status">{state.success}</p>}
      <p className="form-switch">
        {signup ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link href={signup ? "/login" : "/register"}>{signup ? "Masuk" : "Daftar"}</Link>
      </p>
    </div>
  );
}

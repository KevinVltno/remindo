import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { status } = await searchParams;
  const notice = status === "inactive"
    ? "Akun Anda dinonaktifkan. Hubungi admin Remindo."
    : status === "confirmation-error"
      ? "Tautan konfirmasi tidak valid atau sudah kedaluwarsa."
      : undefined;

  return <main className="shell auth-shell"><h1>Ingat tugasmu, tuntaskan tepat waktu.</h1><AuthForm notice={notice} /></main>;
}

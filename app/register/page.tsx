import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return <main className="shell auth-shell"><h1>Ingat tugasmu, tuntaskan tepat waktu.</h1><AuthForm signup /></main>;
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="shell hero">
      <h1>Ingat tugasmu, tuntaskan tepat waktu.</h1>
      <p>Atur tugas dan deadline dalam satu tempat.</p>
      <div className="actions">
        <Link className="button" href="/login">Masuk</Link>
        <Link href="/register">Buat akun</Link>
      </div>
    </main>
  );
}

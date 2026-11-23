"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="shell workspace">
    <h1>Remindo gagal memuat data</h1>
    <p>Periksa koneksi Anda, lalu coba lagi.</p>
    <button type="button" className="fit" onClick={reset}>Coba lagi</button>
  </main>;
}

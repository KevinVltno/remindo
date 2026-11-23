import type { Metadata } from "next";
import Link from "next/link";
import { ThemePicker } from "@/components/theme-picker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Remindo", template: "%s | Remindo" },
  description: "Ingat tugasmu, tuntaskan tepat waktu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        <header className="site-header">
          <nav className="shell" aria-label="Navigasi utama">
            <Link className="brand" href="/">
              <svg aria-hidden="true" width="30" height="30" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="9" fill="currentColor" />
                <path d="M21 14a5 5 0 0 0-10 0c0 4-2 5-2 6h14c0-1-2-2-2-6Zm-7 9a2 2 0 0 0 4 0" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="m14 15 1.5 1.5L18 14" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Remindo
            </Link>
            <ThemePicker />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

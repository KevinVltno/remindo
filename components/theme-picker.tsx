"use client";

import { useEffect, useState } from "react";

export function ThemePicker() {
  const [theme, setTheme] = useState("system");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("remindo-theme");
      if (saved === "light" || saved === "dark") {
        document.documentElement.dataset.theme = saved;
        setTheme(saved);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <label className="theme-picker">
    <span className="sr-only">Tema tampilan</span>
    <select value={theme} onChange={event => {
      const value = event.target.value;
      setTheme(value);
      document.documentElement.dataset.theme = value;
      localStorage.setItem("remindo-theme", value);
    }}>
      <option value="system">Tema perangkat</option>
      <option value="light">Terang</option>
      <option value="dark">Gelap</option>
    </select>
  </label>;
}

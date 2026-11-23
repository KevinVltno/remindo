"use client";

import { useEffect, useState } from "react";

export function LocalTime({ value }: { value: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setText(new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium", timeStyle: "short",
    }).format(new Date(value))), 0);
    return () => window.clearTimeout(timer);
  }, [value]);
  return <time dateTime={value}>{text || value.slice(0, 10)}</time>;
}

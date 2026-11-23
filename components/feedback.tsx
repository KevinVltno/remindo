"use client";

import { useEffect, useState } from "react";
import type { Feedback as FeedbackValue } from "@/lib/todos";

export function Feedback({ value }: { value: FeedbackValue }) {
  const [dismissed, dismiss] = useState<FeedbackValue | null>(null);
  useEffect(() => {
    if (!value.success && !value.error) return;
    const timer = window.setTimeout(() => dismiss(value), 6500);
    return () => window.clearTimeout(timer);
  }, [value]);

  if (dismissed === value || (!value.error && !value.success)) return null;
  return (
    <div className={`toast feedback ${value.error ? "error" : "success"}`} role={value.error ? "alert" : "status"}>
      {value.error || value.success}
      <button className="quiet" type="button" aria-label="Tutup pesan" onClick={() => dismiss(value)}>×</button>
    </div>
  );
}

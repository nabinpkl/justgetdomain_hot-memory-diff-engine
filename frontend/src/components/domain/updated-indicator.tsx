"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0 || diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
}

function formatAbsolute(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function UpdatedIndicator({ className }: { className?: string }) {
  const [updatedAtMs, setUpdatedAtMs] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ updated_at_ms: number }>;
      })
      .then((data) => {
        if (data.updated_at_ms > 0) setUpdatedAtMs(data.updated_at_ms);
      })
      .catch(() => {
        /* silent */
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = updatedAtMs ? `Updated ${formatRelative(updatedAtMs)}` : "Updated recently";

  return (
    <span ref={ref} className={cn("inline-flex items-center gap-1.5 relative", className)}>
      <span>{label}</span>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={(e) => {
          // Keep open if user moves onto the popup itself
          const related = e.relatedTarget as Node | null;
          if (related && ref.current?.contains(related)) return;
          setOpen(false);
        }}
        aria-label="About data freshness"
        className="cursor-pointer text-jgd-dim hover:text-jgd-accent transition-colors inline-flex items-center"
      >
        <Info size={11} strokeWidth={2} />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full mt-2 z-50 w-[260px] rounded-md border border-jgd-border bg-jgd-bg p-3 text-[0.7rem] leading-[1.6] tracking-normal normal-case text-jgd-text shadow-lg"
        >
          <span className="block text-jgd-dim mb-1.5">
            {updatedAtMs ? `Last updated ${formatAbsolute(updatedAtMs)}.` : "Update time unknown."}
          </span>
          <span className="block">
            Availability may have changed since this scan. Always verify with a registrar before purchase.
          </span>
        </span>
      )}
    </span>
  );
}

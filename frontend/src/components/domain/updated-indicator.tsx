"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Daily refresh runs 00:00–01:00 Europe/Berlin (CET/CEST). Anchor freshness to
// the end of that window so the "ago" delta is the same physical duration for
// every viewer, regardless of their local timezone.
const REFRESH_TZ = "Europe/Berlin";
const REFRESH_END_HOUR = 1;

function zonedPartsToUtcMs(year: number, month: number, day: number, hour: number): number {
  const guess = Date.UTC(year, month - 1, day, hour);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: REFRESH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const zonedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  const offset = zonedAsUtc - guess;
  return guess - offset;
}

function lastRefreshMs(now: number): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: REFRESH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(now));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  let y = get("year");
  let m = get("month");
  let d = get("day");
  const h = get("hour") % 24;

  let candidate = zonedPartsToUtcMs(y, m, d, REFRESH_END_HOUR);
  if (h < REFRESH_END_HOUR || candidate > now) {
    const prev = new Date(Date.UTC(y, m - 1, d));
    prev.setUTCDate(prev.getUTCDate() - 1);
    y = prev.getUTCFullYear();
    m = prev.getUTCMonth() + 1;
    d = prev.getUTCDate();
    candidate = zonedPartsToUtcMs(y, m, d, REFRESH_END_HOUR);
  }
  return candidate;
}

function formatRelative(ms: number, now: number): string {
  const diff = now - ms;
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
  const [now, setNow] = useState<number>(() => Date.now());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const updatedAtMs = lastRefreshMs(now);

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

  const label = `Updated ${formatRelative(updatedAtMs, now)}`;

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
            {`Last updated ${formatAbsolute(updatedAtMs)}.`}
          </span>
          <span className="block">
            Availability may have changed since this scan. Always verify with a registrar before purchase.
          </span>
        </span>
      )}
    </span>
  );
}

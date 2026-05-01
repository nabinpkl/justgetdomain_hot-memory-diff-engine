"use client";

import { useEffect, useState } from "react";

type StatsResponse = {
  entries: number;
  index_loaded: boolean;
  snapshot_age_seconds: number | null;
  runtime: {
    request_count: number;
    p50_request_us: number | null;
    p99_request_us: number | null;
    max_request_us: number | null;
    rss_bytes: number | null;
  };
};

const REFRESH_MS = 30_000;

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Tile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="flex-1 min-w-[180px] rounded-sm border border-jgd-border bg-jgd-surface/30 px-5 py-4">
      <p className="text-[0.66rem] uppercase tracking-[2.5px] text-jgd-muted mb-1.5">
        {label}
      </p>
      <p className="font-mono text-[1.35rem] text-jgd-text leading-none mb-1.5">
        {value}
      </p>
      <p className="text-[0.72rem] text-jgd-dim leading-snug">{sublabel}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 min-w-[180px] rounded-sm border border-jgd-border bg-jgd-surface/30 px-5 py-4">
      <div className="h-[0.66rem] w-20 bg-jgd-border/60 rounded mb-2.5" />
      <div className="h-[1.35rem] w-24 bg-jgd-border/60 rounded mb-2.5" />
      <div className="h-[0.72rem] w-32 bg-jgd-border/40 rounded" />
    </div>
  );
}

export function LiveStatsStrip() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const r = await fetch("/api/stats", { cache: "no-store" });
        if (!r.ok) throw new Error(`http ${r.status}`);
        const data = (await r.json()) as StatsResponse;
        if (!cancelled) {
          setStats(data);
          setError(false);
        }
      } catch {
        if (!cancelled && !stats) setError(true);
      }
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // intentionally exclude `stats` — it's only read inside the catch to avoid
    // clobbering a previously-good payload with an error state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      aria-label="Live index stats"
      className="px-6 sm:px-10 pt-2 pb-8 max-w-[1400px] mx-auto"
    >
      <div className="flex flex-wrap gap-3">
        {error && !stats ? (
          <div className="flex-1 min-w-[180px] rounded-sm border border-jgd-border bg-jgd-surface/30 px-5 py-4 text-[0.78rem] text-jgd-muted">
            Live stats temporarily unavailable.
          </div>
        ) : !stats ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : (
          <>
            <Tile
              label="Index size"
              value={stats.entries.toLocaleString()}
              sublabel="entries served from RAM"
            />
            <Tile
              label="p99 latency"
              value={
                stats.runtime.p99_request_us != null
                  ? `${stats.runtime.p99_request_us.toLocaleString()} µs`
                  : "—"
              }
              sublabel={
                stats.runtime.request_count > 0
                  ? `over ${stats.runtime.request_count.toLocaleString()} live requests`
                  : "no requests yet"
              }
            />
            <Tile
              label="Last rebuild"
              value={
                stats.snapshot_age_seconds != null
                  ? formatAgo(stats.snapshot_age_seconds)
                  : "—"
              }
              sublabel="full index swapped atomically"
            />
          </>
        )}
      </div>
    </section>
  );
}

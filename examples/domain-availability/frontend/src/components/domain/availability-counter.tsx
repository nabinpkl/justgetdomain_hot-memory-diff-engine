"use client";

import { useEffect, useState } from "react";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type Stats = {
  total_available: number;
  index_loaded: boolean;
  snapshot_age_seconds: number | null;
};

function formatAgo(seconds: number): string {
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function AvailabilityCounter({ className }: { className?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
      .then((data) => {
        if (!cancelled && data?.index_loaded) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-jgd-muted",
          className,
        )}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-jgd-muted shrink-0" />
        Loading availability&hellip;
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="jgd-pulse inline-block w-1.5 h-1.5 rounded-full bg-jgd-accent shrink-0" />
      <span className="text-jgd-accent">
        {stats.total_available.toLocaleString()} available name.tld combos
      </span>
      {stats.snapshot_age_seconds != null && (
        <>
          <span className="text-jgd-muted" aria-hidden>
            ·
          </span>
          <span className="text-jgd-muted">
            updated {formatAgo(stats.snapshot_age_seconds)}
          </span>
          <Popover>
            <PopoverTrigger
              aria-label="About data freshness"
              openOnHover
              delay={100}
              closeDelay={150}
              className="inline-flex items-center justify-center rounded-full text-jgd-muted hover:text-jgd-accent focus-visible:text-jgd-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-jgd-accent transition-colors cursor-pointer"
            >
              <InfoIcon className="w-3.5 h-3.5" />
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="font-sans">
              <PopoverTitle className="text-[0.82rem]">
                Data may be stale
              </PopoverTitle>
              <PopoverDescription className="text-xs leading-relaxed">
                Availability is based on a daily snapshot of registered
                domains. Names shown as available may have been claimed since
                the last update. Always re-verify at your registrar before you
                buy.
              </PopoverDescription>
            </PopoverContent>
          </Popover>
        </>
      )}
    </span>
  );
}

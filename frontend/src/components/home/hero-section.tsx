"use client";

import { useEffect, useState } from "react";

type Stats = { entries: number; index_loaded: boolean };

export function HeroSection() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
      .then((data) => {
        if (!cancelled && data?.index_loaded) setCount(data.entries);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="px-6 pt-[clamp(3.5rem,12vh,7.5rem)] pb-12 max-w-[720px]">
      <h1 className="jgd-fade-up font-serif text-[clamp(2.5rem,7vw,4rem)] font-normal italic tracking-[-0.02em] leading-[1.1] text-jgd-text mb-5">
        Just get a domain.
      </h1>

      <p className="jgd-fade-up [animation-delay:0.15s] text-[1.06rem] text-jgd-dim leading-[1.7] max-w-[520px]">
        We scanned every short domain combination. The taken ones are gone.
        What&apos;s left is yours to browse.
      </p>

      <div className="jgd-fade-up [animation-delay:0.3s] mt-8 flex items-center gap-1.5">
        {count !== null ? (
          <span className="flex items-center gap-1.5 text-[0.82rem] tracking-wide text-jgd-accent font-medium">
            <span className="jgd-pulse inline-block w-1.5 h-1.5 rounded-full bg-jgd-accent shrink-0" />
            {count.toLocaleString()} domains available now
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[0.82rem] tracking-wide text-jgd-muted">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-jgd-muted shrink-0" />
            Loading availability&hellip;
          </span>
        )}
      </div>
    </section>
  );
}

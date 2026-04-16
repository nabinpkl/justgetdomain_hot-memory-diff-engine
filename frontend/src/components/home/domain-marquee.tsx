"use client";

import { useEffect, useState } from "react";

type SearchResult = {
  name: string;
  tlds: string[];
  length: number;
  match_count: number;
};

type ApiResponse = { total: number; results: SearchResult[] };

function DomainPill({ name, tld }: { name: string; tld: string }) {
  return (
    <span className="shrink-0 px-4 py-2 rounded-sm bg-jgd-surface/50 border border-jgd-border text-[0.82rem] text-jgd-dim font-mono">
      {name}
      <span className="text-jgd-accent/60">.{tld}</span>
    </span>
  );
}

function PillStrip({ domains }: { domains: { name: string; tld: string }[] }) {
  return (
    <div className="flex gap-3 shrink-0 pr-3" aria-hidden>
      {domains.map((d, i) => (
        <DomainPill key={`${d.name}-${d.tld}-${i}`} name={d.name} tld={d.tld} />
      ))}
    </div>
  );
}

type Speed = "normal" | "slow" | "fast";

const LEFT_CLASSES: Record<Speed, string> = {
  normal: "jgd-marquee-left",
  slow: "jgd-marquee-left-slow",
  fast: "jgd-marquee-left",
};

const RIGHT_CLASSES: Record<Speed, string> = {
  normal: "jgd-marquee-right",
  slow: "jgd-marquee-right",
  fast: "jgd-marquee-right-fast",
};

function MarqueeRow({
  domains,
  direction,
  speed = "normal",
}: {
  domains: { name: string; tld: string }[];
  direction: "left" | "right";
  speed?: Speed;
}) {
  const cls =
    direction === "left" ? LEFT_CLASSES[speed] : RIGHT_CLASSES[speed];

  return (
    <div className="overflow-hidden relative">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-jgd-bg to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-jgd-bg to-transparent" />

      <div className={`flex w-max will-change-transform ${cls}`}>
        <PillStrip domains={domains} />
        <PillStrip domains={domains} />
      </div>
    </div>
  );
}

export function DomainMarquee() {
  const [domains, setDomains] = useState<{ name: string; tld: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/search?sort=random&seed=42&limit=60")
      .then((r) => (r.ok ? (r.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const flat = data.results.map((d) => ({
          name: d.name,
          tld: d.tlds[0]?.replace(/^\./, "") ?? "com",
        }));
        setDomains(flat);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (domains.length === 0) {
    return (
      <section className="py-4">
        <div className="h-[132px] flex items-center justify-center">
          <span className="text-[0.75rem] text-jgd-muted tracking-wide">
            Loading domains&hellip;
          </span>
        </div>
      </section>
    );
  }

  const third = Math.ceil(domains.length / 3);
  const row1 = domains.slice(0, third);
  const row2 = domains.slice(third, third * 2);
  const row3 = domains.slice(third * 2);

  return (
    <section className="jgd-fade-up [animation-delay:0.45s] pb-4">
      <div className="flex flex-col gap-3">
        <MarqueeRow domains={row1} direction="left" speed="normal" />
        <MarqueeRow domains={row2} direction="right" speed="fast" />
        <MarqueeRow domains={row3} direction="left" speed="slow" />
      </div>
      <p className="text-center mt-4 text-[0.65rem] uppercase tracking-[3px] text-jgd-muted">
        These are real &middot; available right now &middot; verified
      </p>
    </section>
  );
}

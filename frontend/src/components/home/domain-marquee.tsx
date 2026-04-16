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
    <span className="shrink-0 px-4 py-2 rounded-md bg-jgd-surface/50 border border-jgd-border text-[0.82rem] text-jgd-dim font-mono">
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

function MarqueeRow({
  domains,
  direction,
}: {
  domains: { name: string; tld: string }[];
  direction: "left" | "right";
}) {
  return (
    <div className="overflow-hidden relative">
      {/* Gradient fades */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-jgd-bg to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-jgd-bg to-transparent" />

      {/* Two identical strips back-to-back. Each strip has internal gap-3
          plus a trailing pr-3 so the gap between strip-end → strip-start
          is identical to the internal gaps. translateX(-50%) then loops
          perfectly since both halves are pixel-identical. */}
      <div
        className={`flex w-max will-change-transform ${
          direction === "left" ? "jgd-marquee-left" : "jgd-marquee-right"
        }`}
      >
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
    fetch("/api/search?sort=random&seed=42&limit=40")
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
        <div className="h-[88px] flex items-center justify-center">
          <span className="text-[0.75rem] text-jgd-muted tracking-wide">
            Loading domains&hellip;
          </span>
        </div>
      </section>
    );
  }

  const mid = Math.ceil(domains.length / 2);
  const row1 = domains.slice(0, mid);
  const row2 = domains.slice(mid);

  return (
    <section className="jgd-fade-up [animation-delay:0.45s] pb-4">
      <div className="flex flex-col gap-3">
        <MarqueeRow domains={row1} direction="left" />
        <MarqueeRow domains={row2} direction="right" />
      </div>
      <p className="text-center mt-4 text-[0.65rem] uppercase tracking-[3px] text-jgd-muted">
        These are real &middot; available right now &middot; verified
      </p>
    </section>
  );
}

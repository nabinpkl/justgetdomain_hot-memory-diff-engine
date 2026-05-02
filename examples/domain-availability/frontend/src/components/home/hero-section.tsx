"use client";

import { useEffect, useState } from "react";
import { AvailabilityCounter } from "@/components/domain/availability-counter";

type SearchResult = {
  name: string;
  tlds: string[];
  length: number;
  match_count: number;
};
type ApiResponse = { total: number; results: SearchResult[] };

function DomainGrid({
  domains,
}: {
  domains: { name: string; tld: string }[];
}) {
  if (domains.length === 0) return null;

  const cols = 4;
  const perCol = Math.ceil(domains.length / cols);
  const columns = Array.from({ length: cols }, (_, c) =>
    domains.slice(c * perCol, (c + 1) * perCol),
  );

  return (
    <div
      className="hidden lg:flex gap-3 items-start overflow-hidden select-none pointer-events-none"
      style={{
        opacity: 0.45,
        filter: "blur(0.3px)",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 20%), linear-gradient(to bottom, black 55%, transparent 100%)",
        maskComposite: "intersect",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 20%), linear-gradient(to bottom, black 55%, transparent 100%)",
        WebkitMaskComposite: "source-in",
      }}
    >
      {columns.map((col, c) => (
        <div
          key={c}
          className="flex flex-col gap-3 shrink-0"
          style={{ marginTop: c % 2 === 1 ? "1.5rem" : 0 }}
        >
          {col.map((d) => (
            <div
              key={`${d.name}.${d.tld}`}
              className="px-4 py-2.5 rounded-sm bg-jgd-surface/30 border border-jgd-border/50 text-[0.82rem] text-jgd-dim font-mono whitespace-nowrap"
            >
              {d.name}
              <span className="text-jgd-accent/40">.{d.tld}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function HeroSection() {
  const [domains, setDomains] = useState<{ name: string; tld: string }[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/search?sort=random&seed=99&limit=24")
      .then((r) => (r.ok ? (r.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDomains(
          data.results.map((d) => ({
            name: d.name,
            tld: d.tlds[0]?.replace(/^\./, "") ?? "com",
          })),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="px-6 sm:px-10 pt-[clamp(3.5rem,10vh,7rem)] pb-12 max-w-[1400px] mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-start">
        {/* Left: text */}
        <div>
          <h1 className="jgd-fade-up font-serif text-[clamp(1.85rem,4.2vw,3rem)] font-normal italic tracking-[-0.02em] leading-[1.1] text-jgd-text mb-6">
            You search a domain. It&apos;s taken.
            <br />
            You search another. Still taken.
          </h1>

          <p className="jgd-fade-up [animation-delay:0.1s] text-[clamp(1.05rem,1.6vw,1.2rem)] text-jgd-text leading-[1.5] max-w-[560px] mb-5">
            I got tired of that loop. So I pre-checked every short
            combination across 1,012 TLDs and built a browser for what&apos;s
            actually free.
          </p>

          <p className="jgd-fade-up [animation-delay:0.15s] text-[0.98rem] text-jgd-dim leading-[1.7] max-w-[580px]">
            The interesting part isn&apos;t the search UI. It&apos;s keeping a{" "}
            <span className="text-jgd-text font-medium">5.6 GB</span>{" "}
            availability index fresh nightly without ever taking the site
            offline. The browser below answers in microseconds because the
            whole set sits in RAM and gets atomically swapped after each
            rebuild. Same shape fits anywhere a human (or an LLM) keeps
            proposing names that turn out to be taken: usernames, package
            names, tickers, ENS handles.{" "}
            <a
              href="https://github.com/nabinpkl/justgetdomain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-jgd-accent underline-offset-4 hover:underline"
            >
              Source on GitHub →
            </a>
          </p>

          <div className="jgd-fade-up [animation-delay:0.3s] mt-8">
            <AvailabilityCounter className="text-[0.88rem] tracking-wide font-medium" />
          </div>
        </div>

        {/* Right: decorative domain grid (desktop only) */}
        <DomainGrid domains={domains} />
      </div>
    </section>
  );
}

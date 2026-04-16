"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MiniShelf } from "./mini-shelf";

type SearchResult = {
  name: string;
  tlds: string[];
  length: number;
  match_count: number;
};

type ApiResponse = { total: number; results: SearchResult[] };

type ShelfConfig = {
  title: string;
  tlds: string;
  seed: number;
};

const SHELF_CONFIGS: ShelfConfig[] = [
  { title: "Nature & Earth", tlds: ".garden,.green,.bio,.eco,.earth", seed: 1 },
  { title: ".app Domains", tlds: ".app", seed: 2 },
  { title: "Tech & Dev", tlds: ".dev,.io,.tech", seed: 3 },
];

type ShelfData = {
  total: number;
  domains: { name: string; tld: string }[];
  isLoading: boolean;
};

export function MiniShelvesSection() {
  const [shelves, setShelves] = useState<ShelfData[]>(
    SHELF_CONFIGS.map(() => ({ total: 0, domains: [], isLoading: true })),
  );

  useEffect(() => {
    let cancelled = false;

    SHELF_CONFIGS.forEach((config, idx) => {
      const url = `/api/search?tlds=${encodeURIComponent(config.tlds)}&sort=random&seed=${config.seed}&limit=20`;
      fetch(url)
        .then((r) => (r.ok ? (r.json() as Promise<ApiResponse>) : null))
        .then((data) => {
          if (cancelled || !data) return;
          setShelves((prev) => {
            const next = [...prev];
            next[idx] = {
              total: data.total,
              domains: data.results.map((d) => ({
                name: d.name,
                tld: d.tlds[0]?.replace(/^\./, "") ?? "com",
              })),
              isLoading: false,
            };
            return next;
          });
        })
        .catch(() => {
          if (cancelled) return;
          setShelves((prev) => {
            const next = [...prev];
            next[idx] = { total: 0, domains: [], isLoading: false };
            return next;
          });
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyShelves = shelves.some((s) => !s.isLoading && s.domains.length > 0);
  const allLoaded = shelves.every((s) => !s.isLoading);

  if (allLoaded && !hasAnyShelves) return null;

  return (
    <section className="py-[clamp(2.5rem,8vh,5rem)] px-6 sm:px-10">
      <div className="max-w-[1400px] mx-auto">
        <p className="text-[0.72rem] uppercase tracking-[4px] mb-5 text-jgd-accent">
          A taste
        </p>
        <h2 className="mb-3 font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-normal tracking-[-0.5px] leading-[1.25] text-jgd-text max-w-[520px]">
          Browse by category, not by guessing.
        </h2>
        <p className="text-[1.05rem] text-jgd-dim leading-[1.7] max-w-[500px] mb-10">
          Domains organized by vibe, TLD, and length. Scroll, discover, save the
          ones that click.
        </p>

        {SHELF_CONFIGS.map((config, i) => (
          <MiniShelf
            key={config.title}
            title={config.title}
            total={shelves[i].total}
            domains={shelves[i].domains}
            isLoading={shelves[i].isLoading}
          />
        ))}

        <Link
          href="/explore"
          className="inline-flex items-center mt-2 px-7 py-3 rounded-lg border border-jgd-accent/30 bg-jgd-accent-dim text-jgd-accent text-[0.82rem] font-medium transition-colors hover:bg-jgd-accent-mid hover:border-jgd-accent/50"
        >
          Explore all domains &rarr;
        </Link>
      </div>
    </section>
  );
}

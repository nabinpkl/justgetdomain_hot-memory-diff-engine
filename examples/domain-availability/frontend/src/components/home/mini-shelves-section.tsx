"use client";

import { useState } from "react";
import Link from "next/link";
import { MiniShelf } from "./mini-shelf";
import { useShelfData } from "@/hooks/use-shelf-data";
import {
  getHomepageShelves,
  type ShelfConfig,
} from "@/components/domain/shelf-configs";

/**
 * Shelf configs are the single source of truth (see shelf-configs.ts) so
 * the homepage teaser and `/explore` can't drift apart.
 */
function HomepageShelf({ config }: { config: ShelfConfig }) {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const { domains, total, totalCombos, isLoading } = useShelfData({
    tlds: config.tlds,
    lengths: config.lengths,
    minLength: config.minLength,
    categories: config.categories,
    seed,
    limit: 20,
  });

  return (
    <MiniShelf
      shelfId={config.id}
      title={config.title}
      total={total}
      totalCombos={totalCombos}
      domains={domains}
      isLoading={isLoading}
    />
  );
}

export function MiniShelvesSection() {
  const shelves = getHomepageShelves();

  return (
    <section className="py-[clamp(2.5rem,8vh,5rem)] px-6 sm:px-10">
      <div className="max-w-[1400px] mx-auto">
        <p className="text-[0.72rem] uppercase tracking-[4px] mb-5 text-jgd-accent">
          Live demo
        </p>
        <h2 className="mb-3 font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-normal tracking-[-0.5px] leading-[1.25] text-jgd-text max-w-[640px]">
          Each shelf is one <code className="font-mono text-[0.85em] text-jgd-accent">/search</code> call against the live index.
        </h2>
        <p className="text-[1.05rem] text-jgd-dim leading-[1.7] max-w-[560px] mb-10">
          Filtered by TLD, length, and category. Served from process memory on
          a single Rust binary, swapped in nightly without dropping a request.
        </p>

        {shelves.map((config) => (
          <HomepageShelf key={config.id} config={config} />
        ))}

        <Link
          href="/explore"
          className="inline-flex items-center mt-2 px-7 py-3 rounded-sm border border-jgd-accent/30 bg-jgd-accent-dim text-jgd-accent text-[0.82rem] font-medium transition-colors hover:bg-jgd-accent-mid hover:border-jgd-accent/50"
        >
          Explore all domains &rarr;
        </Link>
      </div>
    </section>
  );
}

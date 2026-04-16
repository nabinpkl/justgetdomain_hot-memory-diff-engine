"use client";

import { useEffect, useState } from "react";
import { ShelfRow } from "@/components/domain/shelf-row";
import { FilterPills } from "@/components/domain/filter-pills";
import { SavedBar } from "@/components/domain/saved-bar";
import { filterShelves, type FilterGroup } from "@/components/domain/shelf-configs";
import { useShortlist } from "@/stores/use-shortlist";

type Stats = { total_available: number; index_loaded: boolean };

export default function ExplorePage() {
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const shortlist = useShortlist();

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
      .then((data) => {
        if (data?.index_loaded) setStats(data);
      })
      .catch(() => {});
  }, []);

  const shelves = filterShelves(filter);

  return (
    <div
      className="min-h-screen bg-jgd-bg text-jgd-text"
      style={{ paddingBottom: shortlist.items.length > 0 ? "70px" : "0" }}
    >
      {/* Header */}
      <section className="px-6 sm:px-10 pt-10 pb-2 max-w-[1400px] mx-auto">
        <h1 className="jgd-fade-up font-serif text-[clamp(1.8rem,4vw,2.75rem)] font-normal italic tracking-[-0.02em] leading-[1.1] text-jgd-text mb-3">
          Browse available domains.
        </h1>
        <p className="jgd-fade-up [animation-delay:0.1s] text-[1rem] text-jgd-dim leading-[1.6] max-w-[520px] mb-2">
          Every domain below is verified available. Tap any name to save it.
          Browse by category or scroll through everything.
        </p>
        {stats && (
          <p className="jgd-fade-up [animation-delay:0.2s] flex items-center gap-1.5 text-[0.82rem] text-jgd-accent font-mono mb-6">
            <span className="jgd-pulse inline-block w-1.5 h-1.5 rounded-full bg-jgd-accent shrink-0" />
            {stats.total_available.toLocaleString()} available domains
          </p>
        )}
      </section>

      {/* Filter pills */}
      <section className="px-6 sm:px-10 pb-8 max-w-[1400px] mx-auto">
        <FilterPills active={filter} onChange={setFilter} />
      </section>

      {/* Shelf rows */}
      <div>
        {shelves.map((config, i) => (
          <div
            key={config.id}
            className="jgd-fade-up"
            style={{ animationDelay: `${0.1 + i * 0.06}s` }}
          >
            <ShelfRow config={config} />
          </div>
        ))}
      </div>

      {/* Stats footer */}
      <footer className="px-6 sm:px-10 py-12 border-t border-jgd-border mt-8">
        <div className="max-w-[1400px] mx-auto flex gap-10 flex-wrap">
          {[
            {
              n: stats?.total_available.toLocaleString() ?? "\u2014",
              l: "Available domains",
            },
            { n: "3\u20138", l: "Character range" },
            { n: "100%", l: "Pre-verified" },
          ].map(({ n, l }) => (
            <div key={l}>
              <div className="text-[1.25rem] font-mono font-bold text-jgd-accent/70">
                {n}
              </div>
              <div className="text-[0.75rem] text-jgd-muted mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </footer>

      {/* Saved bar */}
      <SavedBar />
    </div>
  );
}

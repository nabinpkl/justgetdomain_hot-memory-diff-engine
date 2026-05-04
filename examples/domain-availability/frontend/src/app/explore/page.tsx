"use client";

import { useState } from "react";
import { ShelfRow } from "@/components/domain/shelf-row";
import { FilterPills } from "@/components/domain/filter-pills";
import { SavedBar } from "@/components/domain/saved-bar";
import { AvailabilityCounter } from "@/components/domain/availability-counter";
import { CategoryJumpNav } from "@/components/domain/category-jump-nav";
import { filterShelves, type FilterGroup } from "@/components/domain/shelf-configs";
import { useShortlist } from "@/stores/use-shortlist";

export default function ExplorePage() {
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [query, setQuery] = useState("");
  const shortlist = useShortlist();

  const shelves = filterShelves(filter);

  return (
    <div
      className="min-h-screen bg-jgd-bg text-jgd-text"
      style={{ paddingBottom: shortlist.items.length > 0 ? "70px" : "0" }}
    >
      {/* Header */}
      <section className="px-6 sm:px-10 pt-10 pb-6 max-w-[1400px] mx-auto">
        <h1 className="jgd-fade-up font-serif text-[clamp(1.8rem,4vw,2.75rem)] font-normal italic tracking-[-0.02em] leading-[1.1] text-jgd-text mb-2">
          Browse available domains.
        </h1>
        <p className="jgd-fade-up [animation-delay:0.08s] text-[0.9rem] text-jgd-dim leading-[1.5] mb-3">
          Pre-scanned across all TLDs. Browse what&rsquo;s registrable.
        </p>
        <div className="jgd-fade-up [animation-delay:0.14s] mb-5">
          <AvailabilityCounter className="text-[0.8rem] font-mono" />
        </div>
        <div className="jgd-fade-up [animation-delay:0.18s]">
          <CategoryJumpNav shelves={shelves} />
        </div>
      </section>

      {/* Filter pills */}
      <section className="px-6 sm:px-10 pb-8 max-w-[1400px] mx-auto border-t border-jgd-border pt-5">
        <FilterPills
          active={filter}
          onChange={setFilter}
          query={query}
          onQueryChange={setQuery}
        />
      </section>

      {/* Shelf rows */}
      <div>
        {shelves.map((config, i) => (
          <div
            key={config.id}
            className="jgd-fade-up"
            style={{ animationDelay: `${0.1 + i * 0.06}s` }}
          >
            <ShelfRow config={config} q={query || undefined} />
          </div>
        ))}
      </div>

      <footer className="px-6 sm:px-10 py-12 border-t border-jgd-border mt-8">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[0.72rem] text-jgd-muted max-w-[520px] leading-[1.6]">
            Results come from the live in-memory snapshot served by the API.
            Names shown may have been claimed since the last update, so always
            verify at your registrar before buying.
          </p>
        </div>
      </footer>

      {/* Saved bar */}
      <SavedBar />
    </div>
  );
}

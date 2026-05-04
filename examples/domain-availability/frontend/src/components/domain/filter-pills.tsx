"use client";

import { Search, X } from "lucide-react";
import type { FilterGroup } from "./shelf-configs";
import { RollDiceButton } from "./roll-dice-button";

const FILTERS: { key: FilterGroup; label: string }[] = [
  { key: "all", label: "All Shelves" },
  { key: "core", label: "All Available" },
  { key: "length", label: "Short Names" },
  { key: "tld", label: "TLDs" },
  { key: "topic", label: "Topics" },
];

type FilterPillsProps = {
  active: FilterGroup;
  onChange: (group: FilterGroup) => void;
  query: string;
  onQueryChange: (q: string) => void;
};

export function FilterPills({
  active,
  onChange,
  query,
  onQueryChange,
}: FilterPillsProps) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-1.5 rounded-full text-[0.78rem] font-mono cursor-pointer transition-colors ${
            active === key
              ? "border border-jgd-accent/40 bg-jgd-accent-dim text-jgd-accent"
              : "border border-jgd-border bg-transparent text-jgd-dim hover:text-jgd-text hover:border-jgd-text/20"
          }`}
        >
          {label}
        </button>
      ))}
      <RollDiceButton />
      <div className="relative flex-1 min-w-[180px] max-w-[320px]">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-jgd-muted pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) =>
            onQueryChange(e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase())
          }
          placeholder="Starts with…"
          aria-label="Filter domains by starting letters"
          className="w-full pl-8 pr-8 py-1.5 rounded-sm bg-jgd-surface/40 border border-jgd-border text-[0.78rem] font-mono text-jgd-text placeholder:text-jgd-muted/70 focus:outline-none focus:border-jgd-accent/50 focus:bg-jgd-surface/60 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm text-jgd-muted hover:text-jgd-text hover:bg-jgd-surface/60 transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

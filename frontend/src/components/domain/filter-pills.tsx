"use client";

import type { FilterGroup } from "./shelf-configs";

const FILTERS: { key: FilterGroup; label: string }[] = [
  { key: "all", label: "All Categories" },
  { key: "length", label: "By Length" },
  { key: "tld", label: "By TLD" },
  { key: "vibe", label: "By Vibe" },
];

type FilterPillsProps = {
  active: FilterGroup;
  onChange: (group: FilterGroup) => void;
};

export function FilterPills({ active, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
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
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ALL_TLDS, LENGTHS, type SortMode } from "./domain-data";

// ─── Filter state hook ────────────────────────────────────────────────

export function useFilterState() {
  const [activeTlds, setActiveTlds] = useState<Set<string>>(new Set());
  const [activeLengths, setActiveLengths] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<SortMode>("tlds");

  const toggleTld = useCallback((tld: string) => {
    setActiveTlds((prev) => {
      const next = new Set(prev);
      if (next.has(tld)) next.delete(tld);
      else next.add(tld);
      return next;
    });
  }, []);

  const toggleLength = useCallback((len: number) => {
    setActiveLengths((prev) => {
      const next = new Set(prev);
      if (next.has(len)) next.delete(len);
      else next.add(len);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTlds(new Set());
    setActiveLengths(new Set());
  }, []);

  const hasActiveFilters = activeTlds.size > 0 || activeLengths.size > 0;

  return {
    activeTlds,
    activeLengths,
    sort,
    setSort,
    toggleTld,
    toggleLength,
    clearFilters,
    hasActiveFilters,
  };
}

// ─── Filter Panel ─────────────────────────────────────────────────────

export function FilterPanel({
  activeTlds,
  activeLengths,
  sort,
  onToggleTld,
  onToggleLength,
  onSort,
  hasActiveFilters,
  onClear,
}: {
  activeTlds: Set<string>;
  activeLengths: Set<number>;
  sort: SortMode;
  onToggleTld: (tld: string) => void;
  onToggleLength: (len: number) => void;
  onSort: (mode: SortMode) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      {/* TLD section */}
      <div>
        <p className="text-[0.7rem] uppercase tracking-[2px] mb-3 font-medium text-jgd-dim">
          Extensions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TLDS.map((tld) => {
            const active = activeTlds.has(tld);
            return (
              <button
                key={tld}
                type="button"
                onClick={() => onToggleTld(tld)}
                className={cn(
                  "cursor-pointer text-[0.76rem] px-2.5 py-1 rounded font-sans transition-all border",
                  active
                    ? "bg-jgd-accent-dim text-jgd-accent border-[oklch(0.75_0.18_142/0.2)]"
                    : "bg-transparent text-jgd-dim border-jgd-border"
                )}
              >
                {tld}
              </button>
            );
          })}
        </div>
      </div>

      {/* Length section */}
      <div>
        <p className="text-[0.7rem] uppercase tracking-[2px] mb-3 font-medium text-jgd-dim">
          Length
        </p>
        <div className="flex gap-1.5">
          {LENGTHS.map((len) => {
            const active = activeLengths.has(len);
            return (
              <button
                key={len}
                type="button"
                onClick={() => onToggleLength(len)}
                className={cn(
                  "cursor-pointer text-[0.76rem] px-3 py-1 rounded font-sans transition-all border",
                  active
                    ? "bg-jgd-accent-dim text-jgd-accent border-[oklch(0.75_0.18_142/0.2)]"
                    : "bg-transparent text-jgd-dim border-jgd-border"
                )}
              >
                {len}L
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort section */}
      <div>
        <p className="text-[0.7rem] uppercase tracking-[2px] mb-3 font-medium text-jgd-dim">
          Sort by
        </p>
        <div className="flex flex-col gap-1">
          {([
            ["tlds", "Most TLDs"],
            ["alpha", "A \u2192 Z"],
            ["shortest", "Shortest"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSort(mode)}
              className={cn(
                "cursor-pointer text-left text-[0.76rem] px-2.5 py-1.5 rounded transition-all",
                sort === mode
                  ? "bg-jgd-accent-dim text-jgd-accent"
                  : "text-jgd-dim"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-[0.72rem] uppercase tracking-[2px] py-2 rounded transition-colors text-jgd-dim border border-jgd-border hover:text-jgd-text"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

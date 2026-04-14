"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { FALLBACK_TLDS, LENGTHS, type SortMode } from "./domain-data";
import { ChevronDown, Search, Check } from "lucide-react";

// ─── Fetch TLDs from backend ──────────────────────────────────────────

function useTldList() {
  const [tlds, setTlds] = useState<string[]>(FALLBACK_TLDS);

  useEffect(() => {
    fetch("/api/tlds")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<string[]>;
      })
      .then(setTlds)
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return tlds;
}

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

// ─── TLD Dropdown ─────────────────────────────────────────────────────

function TldDropdown({
  activeTlds,
  onToggleTld,
}: {
  activeTlds: Set<string>;
  onToggleTld: (tld: string) => void;
}) {
  const allTlds = useTldList();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filtered = search
    ? allTlds.filter((tld) => tld.toLowerCase().includes(search.toLowerCase()))
    : allTlds;

  const selectedCount = activeTlds.size;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); setSearch(""); }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded text-[0.76rem] font-sans transition-all border cursor-pointer",
          open || selectedCount > 0
            ? "bg-jgd-accent-dim text-jgd-accent border-jgd-accent-mid"
            : "bg-transparent text-jgd-dim border-jgd-border hover:border-jgd-muted"
        )}
      >
        <span>
          {selectedCount > 0
            ? `${selectedCount} selected`
            : "All extensions"}
        </span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border border-jgd-border bg-jgd-bg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-jgd-border">
            <Search size={12} className="text-jgd-dim shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              className="flex-1 bg-transparent outline-none text-[0.76rem] placeholder:opacity-40 text-jgd-text font-sans"
              spellCheck={false}
            />
          </div>

          {/* TLD list */}
          <div className="max-h-[min(60vh,480px)] overflow-y-auto overscroll-contain">
            {filtered.map((tld) => {
              const active = activeTlds.has(tld);
              return (
                <button
                  key={tld}
                  type="button"
                  onClick={() => onToggleTld(tld)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[0.76rem] font-sans transition-colors cursor-pointer",
                    active
                      ? "bg-jgd-accent-dim text-jgd-accent"
                      : "text-jgd-dim hover:bg-jgd-surface/50 hover:text-jgd-text"
                  )}
                >
                  <span className={cn(
                    "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                    active
                      ? "bg-jgd-accent border-jgd-accent"
                      : "border-jgd-border"
                  )}>
                    {active && <Check size={10} className="text-jgd-bg" />}
                  </span>
                  {tld}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-2.5 py-3 text-[0.72rem] text-jgd-dim text-center">
                No extensions match
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
        <TldDropdown
          activeTlds={activeTlds}
          onToggleTld={onToggleTld}
        />
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
                    ? "bg-jgd-accent-dim text-jgd-accent border-jgd-accent-mid"
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

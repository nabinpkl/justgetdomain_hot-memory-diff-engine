"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortMode } from "@/components/domain/domain-data";
import { FilterPanel, useFilterState } from "@/components/domain/filter-panel";
import { EmptyState } from "@/components/domain/empty-state";
import { UpdatedIndicator } from "@/components/domain/updated-indicator";
import { DisclaimerCard } from "@/components/disclaimer-card";
import { DomainRow } from "@/components/domain/domain-row";
import { useDomainSearch } from "@/hooks/use-domain-search";

const ROW_HEIGHT = 64;
const OVERSCAN = 16;

const SORT_CHIPS: { mode: SortMode; label: string }[] = [
  { mode: "alpha", label: "A-Z" },
  { mode: "shortest", label: "Shortest" },
  { mode: "tlds", label: "Most TLDs" },
];

export function DomainSearch() {
  const [query, setQuery] = useState("");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const {
    activeTlds,
    activeLengths,
    startsWith,
    availableBand,
    sort,
    setSort,
    toggleTld,
    toggleLength,
    setStartsWith,
    setAvailableBand,
    clearFilters,
    hasActiveFilters,
  } = useFilterState();

  const { total, getRows, ensureRange, isLoading } = useDomainSearch({
    query,
    tlds: activeTlds,
    lengths: activeLengths,
    startsWith,
    availableBand,
    sort,
  });

  const clearAll = useCallback(() => {
    clearFilters();
    setQuery("");
    inputRef.current?.focus();
  }, [clearFilters]);

  const hasAnyActive = hasActiveFilters || query.trim().length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerHeight(el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  const totalHeight = total * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN;
  const endIndex = Math.min(total - 1, startIndex + visibleCount);

  useEffect(() => {
    if (total > 0) ensureRange(startIndex, endIndex);
  }, [startIndex, endIndex, total, ensureRange]);

  const visibleEntries = total > 0 ? getRows(startIndex, endIndex) : [];

  // First-letter band shown above the visible window. Gives the scroll a sense
  // of "where am I" without needing per-row sticky headers.
  const currentLetter = useMemo(() => {
    for (const entry of visibleEntries) {
      if (entry?.name) return entry.name[0]?.toUpperCase() ?? "";
    }
    return "";
  }, [visibleEntries]);

  return (
    <div className="flex flex-col font-medium bg-jgd-bg text-jgd-text font-sans">
      {/* Disclaimer */}
      <div className="border-b border-jgd-border">
        <div className="max-w-[1200px] mx-auto px-5 pt-6 pb-5">
          <DisclaimerCard />
        </div>
      </div>

      {/* Two-column layout. Fixed height so the main list scrolls within its
          own container, and the site footer sits cleanly below (revealed by
          page scroll when the mouse is over the sidebar or outside the list). */}
      <div className="max-w-[1200px] w-full mx-auto flex min-h-0 h-[calc(100vh-3.5rem)]">
        {/* Sidebar — desktop. Sticky so it stays visible as the page scrolls
            to reveal the footer below. No internal overflow: scrolls fall
            through to the page. */}
        <aside className="hidden sm:block shrink-0 sticky top-14 self-start w-[220px] border-r border-jgd-border p-6 pr-5">
          <FilterPanel
            activeTlds={activeTlds}
            activeLengths={activeLengths}
            startsWith={startsWith}
            availableBand={availableBand}
            onToggleTld={toggleTld}
            onToggleLength={toggleLength}
            onStartsWith={setStartsWith}
            onAvailableBand={setAvailableBand}
            hasActiveFilters={hasAnyActive}
            onClear={clearAll}
          />
        </aside>

        {/* Mobile filter sheet */}
        {showFiltersMobile && (
          <div
            className="fixed inset-0 z-50 sm:hidden bg-jgd-overlay"
            onClick={() => setShowFiltersMobile(false)}
          >
            <div
              className="absolute inset-0 bg-jgd-bg overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-jgd-bg border-b border-jgd-border">
                <span className="text-[0.7rem] uppercase tracking-[2px] font-bold">
                  Filters
                </span>
                <button
                  type="button"
                  className="cursor-pointer text-jgd-dim"
                  onClick={() => setShowFiltersMobile(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 py-6">
                <FilterPanel
                  activeTlds={activeTlds}
                  activeLengths={activeLengths}
                  startsWith={startsWith}
                  availableBand={availableBand}
                  onToggleTld={toggleTld}
                  onToggleLength={toggleLength}
                  onStartsWith={setStartsWith}
                  onAvailableBand={setAvailableBand}
                  hasActiveFilters={hasAnyActive}
                  onClear={clearAll}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main column */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Sticky top bar */}
          <div className="sticky top-14 z-20 bg-jgd-nav backdrop-blur-[20px] border-b border-jgd-border">
            <div className="px-5 py-3 flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-1.5 rounded-md bg-jgd-surface border border-jgd-border"
                onClick={() => inputRef.current?.focus()}
              >
                <Search size={14} className="text-jgd-dim shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter names..."
                  className="flex-1 bg-transparent outline-none text-[0.85rem] placeholder:opacity-50 text-jgd-text font-sans caret-jgd-accent"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="transition-colors cursor-pointer text-jgd-dim hover:text-jgd-text"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {SORT_CHIPS.map((chip) => (
                  <button
                    key={chip.mode}
                    type="button"
                    onClick={() => setSort(chip.mode)}
                    className={cn(
                      "cursor-pointer text-[0.74rem] px-2.5 py-1 rounded font-sans transition-all border",
                      sort === chip.mode
                        ? "bg-jgd-text text-jgd-bg border-jgd-text"
                        : "bg-transparent text-jgd-dim border-jgd-border hover:border-jgd-muted"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="sm:hidden flex items-center gap-1.5 cursor-pointer text-jgd-dim text-[0.74rem] px-2.5 py-1 rounded border border-jgd-border"
                onClick={() => setShowFiltersMobile(true)}
              >
                <SlidersHorizontal size={12} />
                Filters
              </button>
            </div>

            <div className="px-5 py-2 flex items-center gap-3 text-[0.7rem] uppercase tracking-[2px] text-jgd-dim border-t border-jgd-border">
              <span>{total.toLocaleString()} names</span>
              <span className="text-jgd-muted">/</span>
              <UpdatedIndicator />
              {currentLetter && (
                <span className="ml-auto font-serif text-[0.95rem] tracking-normal normal-case text-jgd-accent">
                  {currentLetter}
                </span>
              )}
            </div>
          </div>

          {/* Virtual scroll list — fills the remaining height inside the
              main column and scrolls internally. The page scroll is free to
              run independently (over the sidebar), revealing the footer. */}
          <div
            ref={scrollRef}
            className="flex-1 min-w-0 min-h-0 overflow-y-auto"
            onScroll={handleScroll}
          >
            {!isLoading && total === 0 ? (
              <EmptyState query={query} hasFilters={hasActiveFilters} onClear={clearAll} />
            ) : (
              <div style={{ height: totalHeight, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: startIndex * ROW_HEIGHT,
                    left: 0,
                    right: 0,
                  }}
                >
                  {visibleEntries.map((entry, i) => {
                    const globalIndex = startIndex + i;
                    if (!entry) {
                      return (
                        <div
                          key={`ph-${globalIndex}`}
                          className="flex items-center px-5 border-b border-jgd-border animate-pulse"
                          style={{ height: ROW_HEIGHT }}
                        >
                          <div className="h-5 w-40 bg-jgd-surface rounded" />
                        </div>
                      );
                    }
                    return (
                      <div key={`${entry.name}-${globalIndex}`} style={{ height: ROW_HEIGHT }}>
                        <DomainRow entry={entry} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

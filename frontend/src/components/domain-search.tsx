"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { DomainTile } from "@/components/domain/domain-tile";
import { FilterPanel, useFilterState } from "@/components/domain/filter-panel";
import { EmptyState } from "@/components/domain/empty-state";
import { useDomainSearch } from "@/hooks/use-domain-search";

// ─── Virtual scroll constants ──────────────────────────────────────────

const ROW_HEIGHT = 140; // px per tile row
const COLS_BREAKPOINTS = [
  { min: 0, cols: 1 },
  { min: 540, cols: 2 },
  { min: 800, cols: 3 },
  { min: 1060, cols: 4 },
];
const OVERSCAN = 8; // extra rows above/below viewport

// ─── Component ──────────────────────────────────────────────────────────

export function DomainSearch() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [cols, setCols] = useState(3);

  const {
    activeTlds,
    activeLengths,
    sort,
    setSort,
    toggleTld,
    toggleLength,
    clearFilters,
    hasActiveFilters,
  } = useFilterState();

  const { total, getRows, isLoading } = useDomainSearch({
    query,
    tlds: activeTlds,
    lengths: activeLengths,
    sort,
  });

  const clearAll = () => {
    clearFilters();
    setQuery("");
    inputRef.current?.focus();
  };

  const hasAnyActive = hasActiveFilters || query.trim().length > 0;

  // Focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Track container resize for column count + height
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      setContainerHeight(el.clientHeight);
      const bp = [...COLS_BREAKPOINTS].reverse().find((b) => width >= b.min);
      setCols(bp?.cols ?? 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  // Virtual scroll calculations
  const totalRows = Math.ceil(total / cols);
  const totalHeight = totalRows * ROW_HEIGHT;

  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleRows = Math.ceil(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN;
  const endRow = Math.min(totalRows - 1, startRow + visibleRows);

  const startIndex = startRow * cols;
  const endIndex = Math.min(total - 1, (endRow + 1) * cols - 1);

  const visibleEntries = total > 0 ? getRows(startIndex, endIndex) : [];

  return (
    <div className="min-h-screen flex flex-col font-medium bg-jgd-bg text-jgd-text font-sans">
      {/* ── Top bar ── */}
      <nav className="sticky top-0 z-50 flex items-center gap-4 px-5 py-3 backdrop-blur-2xl bg-[oklch(0.16_0_0/0.92)] border-b border-jgd-border">
        <Link
          href="/"
          className="flex items-center gap-2 text-[0.75rem] uppercase tracking-[1.5px] transition-colors text-jgd-dim hover:text-jgd-text"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </Link>

        <span className="text-[0.7rem] font-bold uppercase tracking-[1.5px] text-jgd-accent">
          JustGetDomain
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[0.7rem] uppercase tracking-[2px] text-jgd-dim">
            {isLoading ? "Loading..." : `${total.toLocaleString()} found`}
          </span>
        </div>
      </nav>

      {/* ── Search hero ── */}
      <div className="relative border-b border-jgd-border">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 800px 200px at 50% 100%, oklch(0.75 0.18 142 / 0.06), transparent)",
          }}
        />

        <div className="relative max-w-[1200px] mx-auto px-5 pt-10 pb-8 sm:pt-14 sm:pb-10">
          <h1 className="mb-6 font-serif text-[clamp(1.6rem,4vw,2.6rem)] font-normal tracking-[-1px] leading-[1.1]">
            {query.trim() ? (
              <>
                Results for{" "}
                <span className="text-jgd-accent">
                  &ldquo;{query.trim()}&rdquo;
                </span>
              </>
            ) : (
              <>
                Browse available
                <br />
                domains
                <span className="text-jgd-accent">.</span>
              </>
            )}
          </h1>

          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3 transition-all bg-jgd-surface border border-jgd-border rounded-[6px]"
            onClick={() => inputRef.current?.focus()}
          >
            <Search size={16} className="text-jgd-dim shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, pattern, or letters..."
              className="flex-1 bg-transparent outline-none text-[0.9rem] placeholder:opacity-50 text-jgd-text font-sans caret-jgd-accent"
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
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-4 text-[0.72rem] uppercase tracking-[2px] text-jgd-dim">
            <span>{total.toLocaleString()} domains</span>
            <span className="text-[oklch(0.45_0_0)]">/</span>
            <span>Updated 4h ago</span>
            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 cursor-pointer transition-colors sm:hidden"
              style={{ color: showFilters ? "var(--jgd-accent)" : "var(--jgd-dim)" }}
              onClick={() => setShowFilters((p) => !p)}
            >
              <SlidersHorizontal size={12} />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto flex min-h-0">
        {/* Sidebar filters — desktop */}
        <aside className="hidden sm:block shrink-0 sticky top-[53px] self-start overflow-y-auto w-[200px] max-h-[calc(100vh-53px)] border-r border-jgd-border p-6 pr-5">
          <FilterPanel
            activeTlds={activeTlds}
            activeLengths={activeLengths}
            sort={sort}
            onToggleTld={toggleTld}
            onToggleLength={toggleLength}
            onSort={setSort}
            hasActiveFilters={hasAnyActive}
            onClear={clearAll}
          />
        </aside>

        {/* Mobile filter drawer */}
        {showFilters && (
          <div
            className="fixed inset-0 z-40 sm:hidden bg-[oklch(0_0_0/0.7)]"
            onClick={() => setShowFilters(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 p-6 rounded-t-xl bg-jgd-surface border-t border-jgd-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-[0.7rem] uppercase tracking-[2px] font-bold">
                  Filters
                </span>
                <button
                  type="button"
                  className="cursor-pointer text-jgd-dim"
                  onClick={() => setShowFilters(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <FilterPanel
                activeTlds={activeTlds}
                activeLengths={activeLengths}
                sort={sort}
                onToggleTld={toggleTld}
                onToggleLength={toggleLength}
                onSort={setSort}
                hasActiveFilters={hasAnyActive}
                onClear={clearAll}
              />
            </div>
          </div>
        )}

        {/* Virtual scroll area */}
        <main
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ height: "calc(100vh - 53px)" }}
          onScroll={handleScroll}
        >
          {!isLoading && total === 0 ? (
            <EmptyState query={query} hasFilters={hasActiveFilters} onClear={clearAll} />
          ) : (
            <div style={{ height: totalHeight, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: startRow * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                }}
              >
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  }}
                >
                  {visibleEntries.map((entry, i) => {
                    const globalIndex = startIndex + i;
                    if (!entry) {
                      return (
                        <div
                          key={`placeholder-${globalIndex}`}
                          className="px-5 pt-5 pb-4 border-b border-r border-jgd-border"
                          style={{ height: ROW_HEIGHT }}
                        >
                          <div className="animate-pulse">
                            <div className="h-6 w-24 bg-jgd-surface rounded mb-3" />
                            <div className="flex gap-1.5">
                              <div className="h-5 w-10 bg-jgd-surface rounded" />
                              <div className="h-5 w-10 bg-jgd-surface rounded" />
                            </div>
                            <div className="h-4 w-32 bg-jgd-surface rounded mt-3" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <DomainTile
                        key={`${entry.name}-${globalIndex}`}
                        domain={entry}
                        index={globalIndex}
                        activeTlds={activeTlds}
                        isExpanded={expandedDomain === entry.name}
                        onToggle={() =>
                          setExpandedDomain(
                            expandedDomain === entry.name ? null : entry.name
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, X, ExternalLink } from "lucide-react";
import { REGISTRARS } from "@/components/domain/domain-data";
import { FilterPanel, useFilterState } from "@/components/domain/filter-panel";
import { EmptyState } from "@/components/domain/empty-state";
import { UpdatedIndicator } from "@/components/domain/updated-indicator";
import { DisclaimerCard } from "@/components/disclaimer-card";
import { useDomainSearch } from "@/hooks/use-domain-search";

const ROW_HEIGHT = 48;
const OVERSCAN = 20;

export function DomainSearch() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

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

  const { total, getRows, ensureRange, isLoading } = useDomainSearch({
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  return (
    <div className="flex flex-col font-medium bg-jgd-bg text-jgd-text font-sans">
      {/* ── Search hero ── */}
      <div className="relative border-b border-jgd-border">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 800px 200px at 50% 100%, oklch(0.75 0.18 142 / 0.06), transparent)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-5 pt-6 pb-8 sm:pt-8 sm:pb-10">
          <DisclaimerCard className="mb-6" />
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
                Browse available domains
                <span className="text-jgd-accent">.</span>
              </>
            )}
          </h1>

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
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="transition-colors cursor-pointer text-jgd-dim hover:text-jgd-text"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 text-[0.72rem] uppercase tracking-[2px] text-jgd-dim">
            <span>{total.toLocaleString()} domains</span>
            <span className="text-jgd-muted">/</span>
            <UpdatedIndicator />
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
        <aside className="hidden sm:block shrink-0 sticky top-14 self-start w-[200px] border-r border-jgd-border p-6 pr-5">
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
            className="fixed inset-0 z-40 sm:hidden bg-jgd-overlay"
            onClick={() => setShowFilters(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 p-6 rounded-t-xl bg-jgd-surface border-t border-jgd-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-[0.7rem] uppercase tracking-[2px] font-bold">Filters</span>
                <button type="button" className="cursor-pointer text-jgd-dim" onClick={() => setShowFilters(false)}>
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

        {/* Virtual scroll list */}
        <main
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ height: "calc(100vh - 3.5rem)" }}
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
                        <div className="h-4 w-40 bg-jgd-surface rounded" />
                      </div>
                    );
                  }

                  const isExpanded = expandedRow === entry.name;

                  return (
                    <div key={`${entry.name}-${globalIndex}`}>
                      <div
                        className="flex items-center gap-4 px-5 cursor-pointer transition-colors hover:bg-jgd-surface/50 border-b border-jgd-border"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => setExpandedRow(isExpanded ? null : entry.name)}
                      >
                        <span className="font-serif text-[1.05rem] tracking-[-0.3px] text-jgd-text">
                          {entry.name}
                        </span>
                        <span className="text-[0.72rem] px-2 py-0.5 rounded-sm bg-jgd-accent-dim text-jgd-accent font-sans">
                          {entry.tld}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="flex gap-2 px-5 py-3 bg-jgd-row-active border-b border-jgd-border">
                          {REGISTRARS.map((reg) => (
                            <a
                              key={reg.name}
                              href={`${reg.url}${entry.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[0.76rem] px-3 py-2 rounded transition-all text-jgd-text bg-jgd-accent/4 border border-jgd-accent/8 hover:bg-jgd-accent/10 hover:border-jgd-accent/20"
                            >
                              {reg.name}
                              <ExternalLink size={12} className="text-jgd-dim" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

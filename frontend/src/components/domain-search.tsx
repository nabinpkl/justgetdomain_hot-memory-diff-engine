"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { MOCK_DOMAINS } from "@/components/domain/domain-data";
import { DomainTile } from "@/components/domain/domain-tile";
import { FilterPanel, useFilterState } from "@/components/domain/filter-panel";
import { EmptyState } from "@/components/domain/empty-state";

// ─── Component ──────────────────────────────────────────────────────────

export function DomainSearch() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + 24);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Filter + sort logic
  const results = useMemo(() => {
    let filtered = MOCK_DOMAINS;

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter((d) => d.name.includes(q));
    }

    if (activeTlds.size > 0) {
      filtered = filtered.filter((d) =>
        d.tlds.some((tld) => activeTlds.has(tld))
      );
    }

    if (activeLengths.size > 0) {
      filtered = filtered.filter((d) => activeLengths.has(d.length));
    }

    const sorted = [...filtered];
    switch (sort) {
      case "alpha":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "tlds":
        sorted.sort((a, b) => b.tlds.length - a.tlds.length);
        break;
      case "shortest":
        sorted.sort((a, b) => a.name.length - b.name.length);
        break;
    }

    return sorted;
  }, [query, activeTlds, activeLengths, sort]);

  const displayed = results.slice(0, visibleCount);

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
            {results.length} found
          </span>
        </div>
      </nav>

      {/* ── Search hero ── */}
      <div className="relative border-b border-jgd-border">
        {/* Ambient gradient */}
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
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(24);
              }}
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
            <span>{results.length.toLocaleString()} domains</span>
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
      <div className="flex-1 max-w-[1200px] w-full mx-auto flex">
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

        {/* Results area */}
        <main className="flex-1 min-w-0">
          {displayed.length === 0 ? (
            <EmptyState query={query} hasFilters={hasActiveFilters} onClear={clearAll} />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
                {displayed.map((domain, i) => (
                  <DomainTile
                    key={domain.name}
                    domain={domain}
                    index={i}
                    activeTlds={activeTlds}
                    isExpanded={expandedDomain === domain.name}
                    onToggle={() =>
                      setExpandedDomain(
                        expandedDomain === domain.name ? null : domain.name
                      )
                    }
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {visibleCount < results.length && (
                <div ref={sentinelRef} className="py-12 text-center">
                  <span className="text-[0.72rem] uppercase tracking-[3px] text-jgd-dim">
                    Loading more...
                  </span>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

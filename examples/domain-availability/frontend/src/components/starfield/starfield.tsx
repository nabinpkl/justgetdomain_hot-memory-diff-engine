"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { brightness } from "@/lib/starfield/brightness";
import { hashString } from "@/lib/starfield/seeded-random";
import { useFilterState } from "@/lib/starfield/filter-state";
import { MAX_SHORTLIST, useShortlist } from "@/stores/use-shortlist";
import type { DomainEntry } from "./domain-data";
import { SkySlab } from "./sky-slab";
import { Star } from "./star";

const MOBILE_BREAKPOINT = 640;
const SLAB_WIDTH = 240;
const STARS_PER_SLAB = 12;
const OVERSCAN = 2;
const PREFETCH_THRESHOLD = 50;

type StarfieldProps = {
  seed: number | null;
  entries: DomainEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  onShuffle: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  paramsKey: string;
};

export function Starfield({
  seed,
  entries,
  total,
  isLoading,
  error,
  onShuffle,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  paramsKey,
}: StarfieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const add = useShortlist((s) => s.add);
  const items = useShortlist((s) => s.items);
  const { clearFilters, hasAnyActive } = useFilterState();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = size ? size.w < MOBILE_BREAKPOINT : false;

  const savedSet = useMemo(() => new Set(items), [items]);

  const handleStarClick = (domain: string) => {
    if (savedSet.has(domain)) return;
    if (items.length >= MAX_SHORTLIST) return;
    add(domain);
  };

  const slabCount = Math.max(1, Math.ceil(total / STARS_PER_SLAB));

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: slabCount,
    estimateSize: () => SLAB_WIDTH,
    overscan: OVERSCAN,
    getScrollElement: () => scrollRef.current,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastVisibleIndex = virtualItems.length
    ? virtualItems[virtualItems.length - 1].index
    : 0;

  useEffect(() => {
    if (isMobile || seed === null) return;
    const loadedStars = entries.length;
    const needed = (lastVisibleIndex + 1) * STARS_PER_SLAB;
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      needed >= loadedStars - PREFETCH_THRESHOLD
    ) {
      fetchNextPage();
    }
  }, [
    lastVisibleIndex,
    entries.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isMobile,
    seed,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
  }, [paramsKey, seed]);

  useEffect(() => {
    if (!isMobile) return;
    const el = mobileSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries$) => {
        if (entries$.some((e) => e.isIntersecting)) {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const mobileStars = useMemo(() => {
    if (!isMobile || seed === null) return [];
    return entries.map((entry) => {
      const displayTld =
        entry.tlds[hashString(entry.name, seed) % entry.tlds.length];
      return {
        entry,
        displayTld,
        fullDomain: `${entry.name}${displayTld}`,
        brightness: brightness(entry),
      };
    });
  }, [entries, seed, isMobile]);

  const showEmpty = !isLoading && !error && total === 0;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-[480px] w-full overflow-hidden"
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[0.9rem] text-jgd-dim">
          <span>{error}</span>
          <button
            type="button"
            onClick={onShuffle}
            className="ml-3 text-jgd-accent hover:opacity-80 cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {!error && isLoading && !entries.length && (
        <div className="absolute inset-0 flex items-center justify-center text-[0.85rem] text-jgd-dim">
          <span className="jgd-blink">Loading domains…</span>
        </div>
      )}

      {showEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
          <p className="font-serif text-[1.2rem] text-jgd-text">
            Nothing matches.
          </p>
          <p className="text-[0.8rem] text-jgd-dim max-w-[320px]">
            Loosen a filter, or clear them all and shuffle.
          </p>
          {hasAnyActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 cursor-pointer text-[0.7rem] uppercase tracking-[2px] px-4 py-2 rounded text-jgd-accent border border-jgd-accent-mid bg-jgd-accent-dim hover:opacity-90 transition-opacity"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!error && !showEmpty && size !== null && seed !== null && (
        isMobile ? (
          <>
            <ul className="flex flex-col gap-4 py-8 px-4">
              {mobileStars.map(
                ({ entry, displayTld, fullDomain, brightness: b }) => (
                  <Star
                    key={entry.name + displayTld}
                    entry={entry}
                    displayTld={displayTld}
                    brightness={b}
                    position={null}
                    onClick={handleStarClick}
                    saved={savedSet.has(fullDomain)}
                  />
                ),
              )}
            </ul>
            <div ref={mobileSentinelRef} aria-hidden className="h-px w-full" />
            {isFetchingNextPage && (
              <div className="py-4 text-center text-[0.75rem] text-jgd-dim jgd-blink">
                Loading more…
              </div>
            )}
          </>
        ) : (
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-x-auto overflow-y-hidden"
          >
            <div
              style={{
                width: virtualizer.getTotalSize(),
                height: "100%",
                position: "relative",
              }}
            >
              {virtualItems.map((vi) => {
                const slabEntries = entries.slice(
                  vi.index * STARS_PER_SLAB,
                  (vi.index + 1) * STARS_PER_SLAB,
                );
                return (
                  <SkySlab
                    key={vi.key}
                    slabIndex={vi.index}
                    entries={slabEntries}
                    width={SLAB_WIDTH}
                    height={size.h}
                    seed={seed}
                    savedSet={savedSet}
                    onStarClick={handleStarClick}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: SLAB_WIDTH,
                      height: "100%",
                      transform: `translateX(${vi.start}px)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}

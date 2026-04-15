"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { brightness } from "@/lib/starfield/brightness";
import { hashString } from "@/lib/starfield/seeded-random";
import { scatter } from "@/lib/starfield/scatter";
import { useFilterState } from "@/lib/starfield/filter-state";
import { MAX_SHORTLIST, useShortlist } from "@/stores/use-shortlist";
import type { DomainEntry } from "./domain-data";
import { ShuffleButton } from "./shuffle-button";
import { Star } from "./star";

const MOBILE_BREAKPOINT = 640;

type StarfieldProps = {
  seed: number | null;
  entries: DomainEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  onShuffle: () => void;
};

export function Starfield({
  seed,
  entries,
  total,
  isLoading,
  error,
  onShuffle,
}: StarfieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const stars = useMemo(() => {
    if (!entries.length || !size || seed === null) return [];
    const positions = isMobile
      ? null
      : scatter(entries.length, size.w, size.h, seed);
    return entries.map((entry, i) => {
      const displayTld =
        entry.tlds[hashString(entry.name, seed) % entry.tlds.length];
      return {
        entry,
        displayTld,
        fullDomain: `${entry.name}${displayTld}`,
        brightness: brightness(entry),
        position: positions ? positions[i] ?? null : null,
      };
    });
  }, [entries, size, seed, isMobile]);

  const savedSet = useMemo(() => new Set(items), [items]);

  const handleStarClick = (domain: string) => {
    if (savedSet.has(domain)) return;
    if (items.length >= MAX_SHORTLIST) return;
    add(domain);
  };

  const visibleStars = isMobile
    ? stars
    : stars.filter((s) => s.position !== null);

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
          <span className="jgd-blink">Assembling the sky…</span>
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

      {!error && !showEmpty &&
        (isMobile ? (
          <ul className="flex flex-col gap-4 py-8 px-4">
            {visibleStars.map(
              ({ entry, displayTld, fullDomain, brightness: b, position }) => (
                <Star
                  key={entry.name + displayTld}
                  entry={entry}
                  displayTld={displayTld}
                  brightness={b}
                  position={position}
                  onClick={handleStarClick}
                  saved={savedSet.has(fullDomain)}
                />
              ),
            )}
          </ul>
        ) : (
          <ul className="relative h-full w-full list-none">
            {visibleStars.map(
              ({ entry, displayTld, fullDomain, brightness: b, position }) => (
                <Star
                  key={entry.name + displayTld}
                  entry={entry}
                  displayTld={displayTld}
                  brightness={b}
                  position={position}
                  onClick={handleStarClick}
                  saved={savedSet.has(fullDomain)}
                />
              ),
            )}
          </ul>
        ))}

      <ShuffleButton onShuffle={onShuffle} disabled={isLoading} />
    </div>
  );
}

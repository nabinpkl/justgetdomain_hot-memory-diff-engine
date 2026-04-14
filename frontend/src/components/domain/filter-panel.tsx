"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALPHABET,
  type AvailableBand,
  FALLBACK_TLDS,
  LENGTHS,
  type SortMode,
} from "./domain-data";
import { TldDropdown } from "./tld-dropdown";

const POPULAR_COUNT = 9;

// Bands shown in the "Available on" filter. Labels match the mockup.
const BANDS: { key: AvailableBand; label: string }[] = [
  { key: "1", label: "1 TLD" },
  { key: "2-3", label: "2-3" },
  { key: "4+", label: "4+" },
];

function useTldList() {
  const [tlds, setTlds] = useState<string[]>(FALLBACK_TLDS);

  useEffect(() => {
    fetch("/api/tlds")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<string[]>;
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTlds(data);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return tlds;
}

export function useFilterState() {
  const [activeTlds, setActiveTlds] = useState<Set<string>>(new Set());
  const [activeLengths, setActiveLengths] = useState<Set<number>>(new Set());
  const [startsWith, setStartsWithState] = useState<string | null>(null);
  const [availableBand, setAvailableBandState] = useState<AvailableBand | null>(null);
  const [sort, setSort] = useState<SortMode>("alpha");

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

  const setStartsWith = useCallback((letter: string | null) => {
    setStartsWithState((prev) => (prev === letter ? null : letter));
  }, []);

  const setAvailableBand = useCallback((band: AvailableBand | null) => {
    setAvailableBandState((prev) => (prev === band ? null : band));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTlds(new Set());
    setActiveLengths(new Set());
    setStartsWithState(null);
    setAvailableBandState(null);
  }, []);

  const hasActiveFilters =
    activeTlds.size > 0 ||
    activeLengths.size > 0 ||
    startsWith !== null ||
    availableBand !== null;

  return {
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
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] uppercase tracking-[2px] mb-3 font-medium text-jgd-dim">
      {children}
    </p>
  );
}

function Chip({
  active,
  onClick,
  children,
  removable = false,
  size = "sm",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  removable?: boolean;
  size?: "sm" | "xs";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded font-sans transition-all border inline-flex items-center gap-1",
        size === "sm" ? "text-[0.76rem] px-2.5 py-1" : "text-[0.7rem] px-2 py-0.5",
        active
          ? "bg-jgd-accent-dim text-jgd-accent border-jgd-accent-mid"
          : "bg-transparent text-jgd-dim border-jgd-border hover:border-jgd-muted"
      )}
    >
      {children}
      {removable && active && <X size={10} />}
    </button>
  );
}

export function FilterPanel({
  activeTlds,
  activeLengths,
  startsWith,
  availableBand,
  onToggleTld,
  onToggleLength,
  onStartsWith,
  onAvailableBand,
  hasActiveFilters,
  onClear,
}: {
  activeTlds: Set<string>;
  activeLengths: Set<number>;
  startsWith: string | null;
  availableBand: AvailableBand | null;
  onToggleTld: (tld: string) => void;
  onToggleLength: (len: number) => void;
  onStartsWith: (letter: string | null) => void;
  onAvailableBand: (band: AvailableBand | null) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  const allTlds = useTldList();
  const popularTlds = allTlds.slice(0, POPULAR_COUNT);
  const popularSet = new Set(popularTlds);

  // Long-tail TLDs the user has selected via the dropdown — surface them as
  // chips above the popular row so all active selections are visible at a glance.
  const extraSelected = [...activeTlds].filter((t) => !popularSet.has(t));

  return (
    <div className="flex flex-col gap-7">
      {/* Extensions */}
      <div>
        <SectionLabel>Extensions</SectionLabel>

        {extraSelected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {extraSelected.map((tld) => (
              <Chip key={tld} active onClick={() => onToggleTld(tld)} removable>
                {tld}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {popularTlds.map((tld) => (
            <Chip key={tld} active={activeTlds.has(tld)} onClick={() => onToggleTld(tld)}>
              {tld}
            </Chip>
          ))}
        </div>

        <div className="mt-2">
          <TldDropdown
            allTlds={allTlds}
            popularTlds={popularTlds}
            activeTlds={activeTlds}
            onToggleTld={onToggleTld}
          />
        </div>
      </div>

      {/* Length */}
      <div>
        <SectionLabel>Length</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {LENGTHS.map((len, i) => {
            const isLast = i === LENGTHS.length - 1;
            return (
              <Chip
                key={len}
                active={activeLengths.has(len)}
                onClick={() => onToggleLength(len)}
              >
                {isLast ? `${len}+` : `${len}`}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Category — slot reserved; tagging deferred to a follow-up. */}

      {/* Starts with */}
      <div>
        <SectionLabel>Starts with</SectionLabel>
        <div className="grid grid-cols-7 gap-1">
          {ALPHABET.map((letter) => {
            const active = startsWith === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => onStartsWith(letter)}
                className={cn(
                  "cursor-pointer text-[0.7rem] py-1 rounded font-sans transition-all border text-center",
                  active
                    ? "bg-jgd-accent-dim text-jgd-accent border-jgd-accent-mid"
                    : "bg-transparent text-jgd-dim border-transparent hover:border-jgd-border"
                )}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Available on */}
      <div>
        <SectionLabel>Available on</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {BANDS.map((b) => (
            <Chip
              key={b.key}
              active={availableBand === b.key}
              onClick={() => onAvailableBand(b.key)}
            >
              {b.label}
            </Chip>
          ))}
          <Chip active={availableBand === null} onClick={() => onAvailableBand(null)}>
            All
          </Chip>
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

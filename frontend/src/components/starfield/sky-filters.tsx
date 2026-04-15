"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilterState } from "@/lib/starfield/filter-state";
import {
  ALPHABET,
  type AvailableBand,
  FALLBACK_TLDS,
  LENGTHS,
} from "./domain-data";
import { TldDropdown } from "./tld-dropdown";

const POPULAR_COUNT = 9;

const BANDS: { key: AvailableBand; label: string }[] = [
  { key: "1", label: "1 TLD" },
  { key: "2-3", label: "2-3" },
  { key: "4+", label: "4+" },
];

function useTldList() {
  const [tlds, setTlds] = useState<string[]>(FALLBACK_TLDS);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tlds", { signal: controller.signal })
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
    return () => controller.abort();
  }, []);

  return tlds;
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  removable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded font-sans transition-all border inline-flex items-center gap-1 text-[0.76rem] px-2.5 py-1",
        active
          ? "bg-jgd-accent-dim text-jgd-accent border-jgd-accent-mid"
          : "bg-transparent text-jgd-dim border-jgd-border hover:border-jgd-muted",
      )}
    >
      {children}
      {removable && active && <X size={10} />}
    </button>
  );
}

export function SkyFilters({ onClose }: { onClose?: () => void }) {
  const {
    activeTlds,
    activeLengths,
    startsWith,
    availableBand,
    toggleTld,
    toggleLength,
    setStartsWith,
    setAvailableBand,
    clearFilters,
    hasAnyActive,
  } = useFilterState();

  const allTlds = useTldList();
  const popularTlds = allTlds.slice(0, POPULAR_COUNT);
  const popularSet = new Set(popularTlds);
  const extraSelected = [...activeTlds].filter((t) => !popularSet.has(t));

  return (
    <div className="flex flex-col gap-6 normal-case tracking-normal">
      <div>
        <SectionLabel>Length</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {LENGTHS.map((len, i) => {
            const isLast = i === LENGTHS.length - 1;
            return (
              <Chip
                key={len}
                active={activeLengths.has(len)}
                onClick={() => toggleLength(len)}
              >
                {isLast ? `${len}+` : `${len}`}
              </Chip>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Starts with</SectionLabel>
        <div className="grid grid-cols-7 gap-1">
          {ALPHABET.map((letter) => {
            const active = startsWith === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => setStartsWith(letter)}
                className={cn(
                  "cursor-pointer text-[0.7rem] py-1 rounded font-sans transition-all border text-center",
                  active
                    ? "bg-jgd-accent-dim text-jgd-accent border-jgd-accent-mid"
                    : "bg-transparent text-jgd-dim border-transparent hover:border-jgd-border",
                )}
              >
                {letter}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[0.68rem] text-jgd-muted leading-[1.5]">
          Selecting a letter clears the search box.
        </p>
      </div>

      <div>
        <SectionLabel>Extensions</SectionLabel>

        {extraSelected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {extraSelected.map((tld) => (
              <Chip key={tld} active onClick={() => toggleTld(tld)} removable>
                {tld}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {popularTlds.map((tld) => (
            <Chip
              key={tld}
              active={activeTlds.has(tld)}
              onClick={() => toggleTld(tld)}
            >
              {tld}
            </Chip>
          ))}
        </div>

        <div className="mt-2">
          <TldDropdown
            allTlds={allTlds}
            popularTlds={popularTlds}
            activeTlds={activeTlds}
            onToggleTld={toggleTld}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Available on</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {BANDS.map((b) => (
            <Chip
              key={b.key}
              active={availableBand === b.key}
              onClick={() => setAvailableBand(b.key)}
            >
              {b.label}
            </Chip>
          ))}
          <Chip
            active={availableBand === null}
            onClick={() => setAvailableBand(null)}
          >
            All
          </Chip>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasAnyActive}
          className="cursor-pointer text-[0.7rem] uppercase tracking-[2px] text-jgd-dim hover:text-jgd-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear all
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[0.7rem] uppercase tracking-[2px] px-3 py-1.5 rounded border border-jgd-accent-mid text-jgd-accent bg-jgd-accent-dim hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

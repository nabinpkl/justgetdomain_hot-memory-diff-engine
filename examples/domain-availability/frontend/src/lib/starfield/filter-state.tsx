"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { AvailableBand } from "@/components/starfield/domain-data";

type FilterState = {
  query: string;
  activeTlds: Set<string>;
  activeLengths: Set<number>;
  startsWith: string | null;
  availableBand: AvailableBand | null;
};

type FilterActions = {
  setQuery: (q: string) => void;
  toggleTld: (tld: string) => void;
  toggleLength: (len: number) => void;
  setStartsWith: (letter: string | null) => void;
  setAvailableBand: (band: AvailableBand | null) => void;
  clearFilters: () => void;
};

type FilterContextValue = FilterState &
  FilterActions & {
    activeFacetCount: number;
    hasAnyActive: boolean;
  };

const FilterStateContext = createContext<FilterContextValue | null>(null);

export function FilterStateProvider({ children }: { children: React.ReactNode }) {
  const [query, setQueryState] = useState("");
  const [activeTlds, setActiveTlds] = useState<Set<string>>(new Set());
  const [activeLengths, setActiveLengths] = useState<Set<number>>(new Set());
  const [startsWith, setStartsWithState] = useState<string | null>(null);
  const [availableBand, setAvailableBandState] = useState<AvailableBand | null>(null);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    if (q.trim().length > 0) setStartsWithState(null);
  }, []);

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
    setStartsWithState((prev) => {
      const next = prev === letter ? null : letter;
      if (next !== null) setQueryState("");
      return next;
    });
  }, []);

  const setAvailableBand = useCallback((band: AvailableBand | null) => {
    setAvailableBandState((prev) => (prev === band ? null : band));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTlds(new Set());
    setActiveLengths(new Set());
    setStartsWithState(null);
    setAvailableBandState(null);
    setQueryState("");
  }, []);

  const activeFacetCount =
    (activeTlds.size > 0 ? 1 : 0) +
    (activeLengths.size > 0 ? 1 : 0) +
    (startsWith !== null ? 1 : 0) +
    (availableBand !== null ? 1 : 0);

  const hasAnyActive = activeFacetCount > 0 || query.trim().length > 0;

  const value = useMemo<FilterContextValue>(
    () => ({
      query,
      activeTlds,
      activeLengths,
      startsWith,
      availableBand,
      setQuery,
      toggleTld,
      toggleLength,
      setStartsWith,
      setAvailableBand,
      clearFilters,
      activeFacetCount,
      hasAnyActive,
    }),
    [
      query,
      activeTlds,
      activeLengths,
      startsWith,
      availableBand,
      setQuery,
      toggleTld,
      toggleLength,
      setStartsWith,
      setAvailableBand,
      clearFilters,
      activeFacetCount,
      hasAnyActive,
    ],
  );

  return (
    <FilterStateContext.Provider value={value}>
      {children}
    </FilterStateContext.Provider>
  );
}

export function useFilterState() {
  const ctx = useContext(FilterStateContext);
  if (!ctx) {
    throw new Error("useFilterState must be used inside FilterStateProvider");
  }
  return ctx;
}

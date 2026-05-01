import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LENGTHS, type DomainEntry } from "./domain-data";
import { useFilterState } from "@/lib/starfield/filter-state";

type StarfieldData = {
  entries: DomainEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  paramsKey: string;
};

const DEBOUNCE_MS = 200;
export const PAGE_SIZE = 200;

type SearchResponse = { total: number; results: DomainEntry[] };

type BuildUrlParams = {
  query: string;
  tlds: Set<string>;
  lengths: Set<number>;
  startsWith: string | null;
  availableBand: string | null;
};

function buildUrl(
  seed: number,
  offset: number,
  limit: number,
  params: BuildUrlParams,
): string {
  const usp = new URLSearchParams();
  const text = params.query.trim();
  if (text) {
    usp.set("q", text);
  } else if (params.startsWith) {
    usp.set("q", params.startsWith.toLowerCase());
  }
  if (params.tlds.size > 0) usp.set("tlds", [...params.tlds].join(","));
  if (params.lengths.size > 0) {
    // Highest chip in the length picker represents "N+" (open-ended tail).
    // Send it as `min_length` so exact-match `lengths` stays strict.
    const sorted = [...params.lengths].sort((a, b) => a - b);
    const tail = sorted[sorted.length - 1];
    const maxChip = Math.max(...(LENGTHS as readonly number[]));
    if (tail === maxChip) {
      usp.set("min_length", String(tail));
      const exact = sorted.slice(0, -1);
      if (exact.length > 0) usp.set("lengths", exact.join(","));
    } else {
      usp.set("lengths", sorted.join(","));
    }
  }
  if (params.availableBand) usp.set("available", params.availableBand);
  usp.set("sort", "random");
  usp.set("seed", String(seed));
  usp.set("offset", String(offset));
  usp.set("limit", String(limit));
  return `/api/search?${usp.toString()}`;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useStarfieldData(seed: number | null): StarfieldData {
  const { query, activeTlds, activeLengths, startsWith, availableBand } =
    useFilterState();

  const paramsKey = [
    query.trim(),
    [...activeTlds].sort().join(","),
    [...activeLengths].sort().join(","),
    startsWith ?? "",
    availableBand ?? "",
  ].join("|");

  const debouncedKey = useDebouncedValue(paramsKey, DEBOUNCE_MS);

  const params = useMemo<BuildUrlParams>(
    () => ({
      query,
      tlds: activeTlds,
      lengths: activeLengths,
      startsWith,
      availableBand,
    }),
    [query, activeTlds, activeLengths, startsWith, availableBand],
  );

  const query$ = useInfiniteQuery({
    queryKey: ["starfield", seed, debouncedKey],
    enabled: seed !== null,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const url = buildUrl(seed as number, pageParam as number, PAGE_SIZE, params);
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as SearchResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
  });

  const entries = useMemo(
    () => query$.data?.pages.flatMap((p) => p.results) ?? [],
    [query$.data],
  );
  const total = query$.data?.pages[0]?.total ?? 0;

  const error = query$.error
    ? "Couldn't load domains. Try again."
    : null;

  const isLoading =
    seed === null ||
    (query$.isPending && query$.fetchStatus !== "idle") ||
    (query$.isFetching && entries.length === 0);

  return {
    entries,
    total,
    isLoading,
    error,
    fetchNextPage: () => {
      if (query$.hasNextPage && !query$.isFetchingNextPage) {
        query$.fetchNextPage();
      }
    },
    hasNextPage: query$.hasNextPage,
    isFetchingNextPage: query$.isFetchingNextPage,
    paramsKey: debouncedKey,
  };
}

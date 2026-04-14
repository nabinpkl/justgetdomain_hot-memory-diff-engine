import { useCallback, useEffect, useRef, useState } from "react";
import type { AvailableBand, DomainEntry, SortMode } from "@/components/domain/domain-data";

interface SearchResponse {
  total: number;
  results: DomainEntry[];
}

interface UseDomainSearchParams {
  query: string;
  tlds: Set<string>;
  lengths: Set<number>;
  startsWith: string | null;
  availableBand: AvailableBand | null;
  sort: SortMode;
}

interface WindowCache {
  [key: number]: DomainEntry[];
}

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 200;

function buildSearchUrl(
  params: UseDomainSearchParams,
  offset: number,
  limit: number
): string {
  const searchParams = new URLSearchParams();
  const text = params.query.trim();
  if (text) {
    searchParams.set("q", text);
  } else if (params.startsWith) {
    // A-Z grid acts as a prefix filter when the user hasn't typed anything.
    searchParams.set("q", params.startsWith.toLowerCase());
  }
  if (params.tlds.size > 0) searchParams.set("tlds", [...params.tlds].join(","));
  if (params.lengths.size > 0) searchParams.set("lengths", [...params.lengths].join(","));
  if (params.availableBand) searchParams.set("available", params.availableBand);
  searchParams.set("sort", params.sort);
  searchParams.set("offset", String(offset));
  searchParams.set("limit", String(limit));
  return `/api/search?${searchParams.toString()}`;
}

export function useDomainSearch(params: UseDomainSearchParams) {
  const [total, setTotal] = useState(0);
  const [windows, setWindows] = useState<WindowCache>({});
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const inflightRef = useRef<Set<number>>(new Set());
  const windowsRef = useRef<WindowCache>({});
  windowsRef.current = windows;

  const paramsKey = [
    params.query,
    [...params.tlds].sort().join(","),
    [...params.lengths].sort().join(","),
    params.startsWith ?? "",
    params.availableBand ?? "",
    params.sort,
  ].join("|");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      inflightRef.current.clear();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setWindows({});

      const url = buildSearchUrl(params, 0, PAGE_SIZE);
      fetch(url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<SearchResponse>;
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          setTotal(data.total);
          setWindows({ 0: data.results });
          setIsLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error("search fetch failed:", err);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const fetchWindow = useCallback((windowIndex: number) => {
    if (inflightRef.current.has(windowIndex)) return;
    if (windowsRef.current[windowIndex]) return;

    inflightRef.current.add(windowIndex);

    const offset = windowIndex * PAGE_SIZE;
    const url = buildSearchUrl(paramsRef.current, offset, PAGE_SIZE);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        setWindows((p) => ({ ...p, [windowIndex]: data.results }));
      })
      .catch((err) => {
        console.error("window fetch failed:", err);
      })
      .finally(() => {
        inflightRef.current.delete(windowIndex);
      });
  }, []);

  const ensureRange = useCallback(
    (startIndex: number, endIndex: number) => {
      for (let i = startIndex; i <= endIndex; i++) {
        const windowIndex = Math.floor(i / PAGE_SIZE);
        if (!windows[windowIndex]) {
          fetchWindow(windowIndex);
        }
      }
    },
    [windows, fetchWindow]
  );

  const getRows = useCallback(
    (startIndex: number, endIndex: number): (DomainEntry | null)[] => {
      const rows: (DomainEntry | null)[] = [];
      for (let i = startIndex; i <= endIndex; i++) {
        const windowIndex = Math.floor(i / PAGE_SIZE);
        const indexInWindow = i % PAGE_SIZE;
        const window = windows[windowIndex];
        rows.push(window?.[indexInWindow] ?? null);
      }
      return rows;
    },
    [windows]
  );

  return { total, getRows, ensureRange, isLoading };
}

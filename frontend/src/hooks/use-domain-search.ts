import { useCallback, useEffect, useRef, useState } from "react";
import type { DomainEntry, SortMode } from "@/components/domain/domain-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface SearchResponse {
  total: number;
  results: DomainEntry[];
}

interface UseDomainSearchParams {
  query: string;
  tlds: Set<string>;
  lengths: Set<number>;
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
  const url = new URL("/search", API_URL);
  if (params.query.trim()) url.searchParams.set("q", params.query.trim());
  if (params.tlds.size > 0)
    url.searchParams.set("tlds", [...params.tlds].join(","));
  if (params.lengths.size > 0)
    url.searchParams.set("lengths", [...params.lengths].join(","));
  url.searchParams.set("sort", params.sort);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

export function useDomainSearch(params: UseDomainSearchParams) {
  const [total, setTotal] = useState(0);
  const [windows, setWindows] = useState<WindowCache>({});
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track the current abort controller
  const abortRef = useRef<AbortController | null>(null);
  // Ref to track in-flight window fetches
  const windowAbortRef = useRef<AbortController | null>(null);
  // Ref to debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to track current params for staleness checks
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Serialize params for dependency tracking
  const paramsKey = `${params.query}|${[...params.tlds].sort().join(",")}|${[...params.lengths].sort().join(",")}|${params.sort}`;

  // Fetch initial window on filter change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // Abort any in-flight requests
      abortRef.current?.abort();
      windowAbortRef.current?.abort();

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

  // Fetch a specific window (for scroll-driven requests, NOT debounced)
  const fetchWindow = useCallback(
    (windowIndex: number) => {
      setWindows((prev) => {
        // Already have this window
        if (prev[windowIndex]) return prev;

        // Abort previous window fetch
        windowAbortRef.current?.abort();
        const controller = new AbortController();
        windowAbortRef.current = controller;

        const offset = windowIndex * PAGE_SIZE;
        const url = buildSearchUrl(paramsRef.current, offset, PAGE_SIZE);

        fetch(url, { signal: controller.signal })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<SearchResponse>;
          })
          .then((data) => {
            if (controller.signal.aborted) return;
            setWindows((p) => ({ ...p, [windowIndex]: data.results }));
          })
          .catch((err) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            console.error("window fetch failed:", err);
          });

        return prev;
      });
    },
    []
  );

  // Get entries for a range of row indices
  const getRows = useCallback(
    (startIndex: number, endIndex: number): (DomainEntry | null)[] => {
      const rows: (DomainEntry | null)[] = [];
      for (let i = startIndex; i <= endIndex; i++) {
        const windowIndex = Math.floor(i / PAGE_SIZE);
        const indexInWindow = i % PAGE_SIZE;
        const window = windows[windowIndex];
        rows.push(window?.[indexInWindow] ?? null);

        // Trigger fetch if window not loaded
        if (!window) fetchWindow(windowIndex);
      }
      return rows;
    },
    [windows, fetchWindow]
  );

  return { total, getRows, isLoading, windows };
}

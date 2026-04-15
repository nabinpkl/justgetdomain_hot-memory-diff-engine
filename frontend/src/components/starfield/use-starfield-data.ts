import { useEffect, useState } from "react";
import type { DomainEntry } from "./domain-data";
import { useFilterState } from "@/lib/starfield/filter-state";

type StarfieldData = {
  entries: DomainEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
};

const DEBOUNCE_MS = 200;

function buildUrl(
  seed: number,
  limit: number,
  params: {
    query: string;
    tlds: Set<string>;
    lengths: Set<number>;
    startsWith: string | null;
    availableBand: string | null;
  },
): string {
  const usp = new URLSearchParams();
  const text = params.query.trim();
  if (text) {
    usp.set("q", text);
  } else if (params.startsWith) {
    usp.set("q", params.startsWith.toLowerCase());
  }
  if (params.tlds.size > 0) usp.set("tlds", [...params.tlds].join(","));
  if (params.lengths.size > 0) usp.set("lengths", [...params.lengths].join(","));
  if (params.availableBand) usp.set("available", params.availableBand);
  usp.set("sort", "random");
  usp.set("seed", String(seed));
  usp.set("limit", String(limit));
  return `/api/search?${usp.toString()}`;
}

export function useStarfieldData(seed: number | null, limit: number): StarfieldData {
  const { query, activeTlds, activeLengths, startsWith, availableBand } = useFilterState();
  const [entries, setEntries] = useState<DomainEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = [
    query.trim(),
    [...activeTlds].sort().join(","),
    [...activeLengths].sort().join(","),
    startsWith ?? "",
    availableBand ?? "",
  ].join("|");

  useEffect(() => {
    if (seed === null) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      const url = buildUrl(seed, limit, {
        query,
        tlds: activeTlds,
        lengths: activeLengths,
        startsWith,
        availableBand,
      });

      fetch(url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ total: number; results: DomainEntry[] }>;
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          setEntries(data.results);
          setTotal(data.total);
          setIsLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error("starfield fetch failed:", err);
          setError("Sky's quiet — try again.");
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, limit, paramsKey]);

  return { entries, total, isLoading, error };
}

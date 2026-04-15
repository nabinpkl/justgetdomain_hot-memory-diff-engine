import { useEffect, useState } from "react";
import type { DomainEntry } from "@/components/domain/domain-data";

type StarfieldData = {
  entries: DomainEntry[];
  isLoading: boolean;
  error: string | null;
};

export function useStarfieldData(seed: number | null, limit: number): StarfieldData {
  const [entries, setEntries] = useState<DomainEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seed === null) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const url = `/api/search?sort=random&seed=${seed}&limit=${limit}`;
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ total: number; results: DomainEntry[] }>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setEntries(data.results);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("starfield fetch failed:", err);
        setError("Sky's quiet — try again.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [seed, limit]);

  return { entries, isLoading, error };
}

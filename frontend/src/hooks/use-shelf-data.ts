"use client";

import { useEffect, useState } from "react";

type SearchResult = {
  name: string;
  tlds: string[];
  length: number;
  match_count: number;
};

type ApiResponse = { total: number; results: SearchResult[] };

type Domain = { name: string; tld: string };

type ShelfDataResult = {
  domains: Domain[];
  total: number;
  isLoading: boolean;
};

type ShelfDataParams = {
  tlds?: string;
  lengths?: string;
  seed: number;
  limit?: number;
  sort?: string;
};

export function useShelfData({
  tlds,
  lengths,
  seed,
  limit = 20,
  sort = "random",
}: ShelfDataParams): ShelfDataResult {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams();
    if (tlds) params.set("tlds", tlds);
    if (lengths) params.set("lengths", lengths);
    params.set("sort", sort);
    params.set("seed", String(seed));
    params.set("limit", String(limit));

    fetch(`/api/search?${params.toString()}`)
      .then((r) => (r.ok ? (r.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDomains(
          data.results.map((d) => ({
            name: d.name,
            tld: d.tlds[0]?.replace(/^\./, "") ?? "com",
          })),
        );
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tlds, lengths, seed, limit, sort]);

  return { domains, total, isLoading };
}

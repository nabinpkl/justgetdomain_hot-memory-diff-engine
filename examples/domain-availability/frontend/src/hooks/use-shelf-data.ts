"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

type SearchResult = {
  name: string;
  tlds: string[];
  length: number;
  match_count: number;
};

type ApiResponse = {
  total: number;
  total_combos: number;
  results: SearchResult[];
};

type Domain = { name: string; tld: string };

type ShelfDataResult = {
  domains: Domain[];
  total: number;
  totalCombos: number;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

type ShelfDataParams = {
  tlds?: string;
  lengths?: string;
  minLength?: number;
  categories?: string;
  q?: string;
  seed: number;
  limit?: number;
  sort?: string;
};

type OptionalKeys = "tlds" | "lengths" | "minLength" | "categories" | "q";

function buildUrl(
  {
    tlds,
    lengths,
    minLength,
    categories,
    q,
    seed,
    limit,
    sort,
  }: Required<Omit<ShelfDataParams, OptionalKeys>> &
    Pick<ShelfDataParams, OptionalKeys>,
  offset: number,
): string {
  const params = new URLSearchParams();
  if (tlds) params.set("tlds", tlds);
  if (lengths) params.set("lengths", lengths);
  if (minLength !== undefined) params.set("min_length", String(minLength));
  if (categories) params.set("categories", categories);
  if (q) params.set("q", q);
  params.set("sort", sort);
  params.set("seed", String(seed));
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return `/api/search?${params.toString()}`;
}

export function useShelfData({
  tlds,
  lengths,
  minLength,
  categories,
  q,
  seed,
  limit = 20,
  sort = "random",
}: ShelfDataParams): ShelfDataResult {
  const query = useInfiniteQuery({
    queryKey: [
      "shelf-data",
      { tlds, lengths, minLength, categories, q, seed, limit, sort },
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const res = await fetch(
        buildUrl(
          { tlds, lengths, minLength, categories, q, seed, limit, sort },
          pageParam as number,
        ),
        { signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as ApiResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
  });

  const domains = useMemo<Domain[]>(
    () =>
      query.data?.pages.flatMap((p) =>
        p.results.map((d) => ({
          name: d.name,
          tld: d.tlds[0]?.replace(/^\./, "") ?? "com",
        })),
      ) ?? [],
    [query.data],
  );

  const total = query.data?.pages[0]?.total ?? 0;
  const totalCombos = query.data?.pages[0]?.total_combos ?? 0;

  return {
    domains,
    total,
    totalCombos,
    isLoading: query.isPending,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
  };
}

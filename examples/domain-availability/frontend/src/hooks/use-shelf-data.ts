"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type SparseDomain = Domain | undefined;

type ShelfDataResult = {
  domains: Domain[];
  total: number;
  totalCombos: number;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

type VirtualShelfDataResult = {
  domains: SparseDomain[];
  total: number;
  totalCombos: number;
  isLoading: boolean;
  isFetchingRange: boolean;
  requestRange: (start: number, end: number, options?: { immediate?: boolean }) => void;
};

type ShelfDataParams = {
  tlds?: string;
  lengths?: string;
  minLength?: number;
  available?: string;
  categories?: string;
  q?: string;
  seed: number;
  limit?: number;
  initialLimit?: number;
  pageLimit?: number;
  sort?: string;
  mode?: "grouped" | "combos";
};

type OptionalKeys =
  | "tlds"
  | "lengths"
  | "minLength"
  | "available"
  | "categories"
  | "q"
  | "initialLimit"
  | "pageLimit"
  | "mode";

function buildUrl(
  {
    tlds,
    lengths,
    minLength,
    available,
    categories,
    q,
    seed,
    limit,
    sort,
    mode,
  }: Required<Omit<ShelfDataParams, OptionalKeys>> &
    Pick<ShelfDataParams, OptionalKeys>,
  offset: number,
): string {
  const params = new URLSearchParams();
  if (tlds) params.set("tlds", tlds);
  if (lengths) params.set("lengths", lengths);
  if (minLength !== undefined) params.set("min_length", String(minLength));
  if (available) params.set("available", available);
  if (categories) params.set("categories", categories);
  if (q) params.set("q", q);
  if (mode === "combos") params.set("mode", "combos");
  params.set("sort", sort);
  params.set("seed", String(seed));
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return `/api/search?${params.toString()}`;
}

function toDomain(result: SearchResult): Domain {
  return {
    name: result.name,
    tld: result.tlds[0]?.replace(/^\./, "") ?? "com",
  };
}

export function useShelfData({
  tlds,
  lengths,
  minLength,
  available,
  categories,
  q,
  seed,
  limit = 20,
  initialLimit,
  pageLimit,
  sort = "random",
  mode = "grouped",
}: ShelfDataParams): ShelfDataResult {
  const query = useInfiniteQuery({
    queryKey: [
      "shelf-data",
      {
        tlds,
        lengths,
        minLength,
        available,
        categories,
        q,
        seed,
        limit,
        initialLimit,
        pageLimit,
        sort,
        mode,
      },
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const offset = pageParam as number;
      const requestLimit =
        offset === 0 ? (initialLimit ?? limit) : (pageLimit ?? limit);
      const res = await fetch(
        buildUrl(
          {
            tlds,
            lengths,
            minLength,
            available,
            categories,
            q,
            seed,
            limit: requestLimit,
            sort,
            mode,
          },
          offset,
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
        p.results.map(toDomain),
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

export function useVirtualShelfData({
  tlds,
  lengths,
  minLength,
  available,
  categories,
  q,
  seed,
  limit = 20,
  initialLimit,
  pageLimit,
  sort = "random",
  mode = "grouped",
}: ShelfDataParams): VirtualShelfDataResult {
  const initialRequestLimit = initialLimit ?? limit;
  const rangeRequestLimit = pageLimit ?? limit;
  const paramsKey = JSON.stringify({
    tlds,
    lengths,
    minLength,
    available,
    categories,
    q,
    seed,
    sort,
    mode,
    initialRequestLimit,
    rangeRequestLimit,
  });
  const [domainsByIndex, setDomainsByIndex] = useState<Map<number, Domain>>(
    () => new Map(),
  );
  const [total, setTotal] = useState(0);
  const [totalCombos, setTotalCombos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchingCount, setFetchingCount] = useState(0);
  const activeParamsKeyRef = useRef(paramsKey);
  const loadedChunksRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Map<string, AbortController>>(new Map());
  const debounceRef = useRef<number | null>(null);

  const fetchChunk = useCallback(
    async (offset: number, requestLimit: number) => {
      const key = `${offset}:${requestLimit}`;
      if (loadedChunksRef.current.has(key) || inflightRef.current.has(key)) {
        return;
      }

      const controller = new AbortController();
      inflightRef.current.set(key, controller);
      setFetchingCount((count) => count + 1);

      try {
        const response = await fetch(
          buildUrl(
            {
              tlds,
              lengths,
              minLength,
              available,
              categories,
              q,
              seed,
              limit: requestLimit,
              sort,
              mode,
            },
            offset,
          ),
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const page = (await response.json()) as ApiResponse;
        if (activeParamsKeyRef.current !== paramsKey) return;

        loadedChunksRef.current.add(key);
        setTotal(page.total);
        setTotalCombos(page.total_combos);
        setDomainsByIndex((current) => {
          const next = new Map(current);
          page.results.forEach((result, index) => {
            next.set(offset + index, toDomain(result));
          });
          return next;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch domain range", error);
      } finally {
        inflightRef.current.delete(key);
        setFetchingCount((count) => Math.max(0, count - 1));
      }
    },
    [
      available,
      categories,
      lengths,
      minLength,
      mode,
      q,
      seed,
      sort,
      tlds,
      paramsKey,
    ],
  );

  const requestRange = useCallback(
    (
      start: number,
      end: number,
      options: { immediate?: boolean } = {},
    ) => {
      const run = () => {
        const first = Math.max(
          0,
          Math.floor(start / rangeRequestLimit) * rangeRequestLimit,
        );
        const last = Math.max(
          first,
          Math.floor(end / rangeRequestLimit) * rangeRequestLimit,
        );
        const wanted = new Set<string>();

        for (let offset = first; offset <= last; offset += rangeRequestLimit) {
          wanted.add(`${offset}:${rangeRequestLimit}`);
        }

        inflightRef.current.forEach((controller, key) => {
          if (!wanted.has(key)) {
            controller.abort();
          }
        });

        wanted.forEach((key) => {
          const offset = Number(key.split(":")[0]);
          void fetchChunk(offset, rangeRequestLimit);
        });
      };

      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }

      if (options.immediate) {
        run();
      } else {
        debounceRef.current = window.setTimeout(run, 60);
      }
    },
    [fetchChunk, rangeRequestLimit],
  );

  useEffect(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    inflightRef.current.forEach((controller) => controller.abort());
    inflightRef.current.clear();
    activeParamsKeyRef.current = paramsKey;
    loadedChunksRef.current = new Set();
    setDomainsByIndex(new Map());
    setTotal(0);
    setTotalCombos(0);
    setIsLoading(true);
    setFetchingCount(0);

    const effectParamsKey = paramsKey;
    void fetchChunk(0, initialRequestLimit).finally(() => {
      if (activeParamsKeyRef.current === effectParamsKey) {
        setIsLoading(false);
      }
    });

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
      inflightRef.current.forEach((controller) => controller.abort());
      inflightRef.current.clear();
    };
  }, [fetchChunk, initialRequestLimit, paramsKey]);

  const domains = useMemo<SparseDomain[]>(() => {
    const length = Math.max(total, domainsByIndex.size);
    return Array.from({ length }, (_, index) => domainsByIndex.get(index));
  }, [domainsByIndex, total]);

  return {
    domains,
    total,
    totalCombos,
    isLoading,
    isFetchingRange: fetchingCount > 0,
    requestRange,
  };
}

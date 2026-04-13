"use client";

import { Search } from "lucide-react";

export function EmptyState({
  query,
  hasFilters = false,
  onClear,
}: {
  query: string;
  hasFilters?: boolean;
  onClear: () => void;
}) {
  const message = query.trim()
    ? hasFilters
      ? `Nothing matched \u201c${query.trim()}\u201d with the current filters. Try broadening your search.`
      : `Nothing matched \u201c${query.trim()}\u201d in the available set. Try a shorter query or different letters.`
    : "No domains match the current filters. Try removing some.";

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-[120px]">
      <div className="mb-6 size-16 rounded-full bg-jgd-accent-dim flex items-center justify-center">
        <Search size={24} className="text-jgd-accent" />
      </div>
      <h3 className="mb-2 font-serif text-[1.4rem] font-normal">
        No matches
      </h3>
      <p className="text-[0.8rem] max-w-[360px] mb-6 text-jgd-dim leading-[1.7]">
        {message}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer text-[0.7rem] uppercase tracking-[2px] px-5 py-2.5 rounded transition-colors text-jgd-accent border border-jgd-accent/20 bg-jgd-accent-dim hover:bg-jgd-accent/15"
      >
        {hasFilters ? "Clear filters" : "Clear search"}
      </button>
    </div>
  );
}

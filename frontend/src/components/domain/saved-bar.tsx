"use client";

import { useShortlist } from "@/stores/use-shortlist";

export function SavedBar() {
  const { items, remove, clear } = useShortlist();

  if (items.length === 0) return null;

  const copyAll = () => {
    navigator.clipboard.writeText(items.join("\n")).catch(() => {});
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-jgd-bg/95 backdrop-blur-md border-t border-jgd-accent/15 px-6 sm:px-10 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center gap-4">
        {/* Label */}
        <span className="text-[0.68rem] font-mono uppercase tracking-widest text-jgd-accent/60 shrink-0">
          Saved ({items.length})
        </span>

        {/* Saved pills */}
        <div className="flex gap-2 overflow-x-auto flex-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {items.map((domain) => (
            <button
              key={domain}
              onClick={() => remove(domain)}
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-sm bg-jgd-accent-dim/30 border border-jgd-accent/20 text-[0.78rem] font-mono text-jgd-text cursor-pointer transition-colors hover:border-jgd-accent/40"
            >
              {domain}
              <span className="text-jgd-muted text-[0.68rem]">&times;</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={copyAll}
            className="px-4 py-1.5 rounded-sm bg-jgd-accent-dim border border-jgd-accent/30 text-[0.72rem] font-mono text-jgd-accent cursor-pointer transition-colors hover:bg-jgd-accent-mid"
          >
            Copy all
          </button>
          <button
            onClick={clear}
            className="px-3 py-1.5 rounded-sm border border-jgd-border text-[0.72rem] font-mono text-jgd-muted cursor-pointer transition-colors hover:text-jgd-dim hover:border-jgd-dim/30"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

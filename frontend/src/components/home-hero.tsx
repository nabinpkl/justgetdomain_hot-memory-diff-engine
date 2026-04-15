"use client";

import { useEffect, useState } from "react";
import { FilterStateProvider } from "@/lib/starfield/filter-state";
import { SkyCommandBar } from "@/components/starfield/sky-command-bar";
import { Starfield } from "@/components/starfield/starfield";
import { useStarfieldData } from "@/components/starfield/use-starfield-data";

const LIMIT = 80;

function makeSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}

function HomeHeroInner() {
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => {
    if (seed === null) setSeed(makeSeed());
  }, [seed]);

  const { entries, total, isLoading, error } = useStarfieldData(seed, LIMIT);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      <div className="flex flex-col items-center text-center px-6 pt-8 pb-5">
        <h1 className="leading-none font-serif italic text-[clamp(1.5rem,3vw,2.25rem)] font-normal tracking-[-0.5px]">
          Just get a domain<span className="not-italic text-jgd-accent">.</span>
        </h1>
        <p className="mt-3 text-[0.82rem] text-jgd-dim leading-relaxed max-w-[560px]">
          All Names Taken?
          <span className="mx-2 text-jgd-dim/50">·</span>
          Ideas Ran Out?
          <span className="mx-2 text-jgd-dim/50">·</span>
          Settling for Mediocre?
          <span className="mx-2 text-jgd-accent">→</span>
          <span className="text-jgd-accent">Just pick one here.</span>
        </p>
      </div>

      <SkyCommandBar
        total={total}
        onShuffle={() => setSeed(makeSeed())}
        shuffleDisabled={isLoading}
      />

      <div className="relative flex-1 flex flex-col">
        <Starfield
          seed={seed}
          entries={entries}
          total={total}
          isLoading={isLoading}
          error={error}
          onShuffle={() => setSeed(makeSeed())}
        />
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <FilterStateProvider>
      <HomeHeroInner />
    </FilterStateProvider>
  );
}

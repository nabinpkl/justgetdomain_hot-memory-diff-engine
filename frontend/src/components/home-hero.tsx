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
      <div className="flex flex-col items-center text-center px-6 pt-10 pb-6">
        <h1 className="leading-none mb-3 font-serif text-[clamp(2rem,5vw,3.4rem)] font-normal tracking-[-2px]">
          JustGetDomain<span className="text-jgd-accent">.</span>
        </h1>
        <p className="text-[0.72rem] uppercase tracking-[5px] text-jgd-dim">
          Every available short domain. Already found.
        </p>
      </div>

      <SkyCommandBar total={total} />

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

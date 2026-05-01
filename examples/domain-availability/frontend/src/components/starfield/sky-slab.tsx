"use client";

import { memo, useMemo } from "react";
import { brightness } from "@/lib/starfield/brightness";
import { hashString } from "@/lib/starfield/seeded-random";
import { scatter } from "@/lib/starfield/scatter";
import type { DomainEntry } from "./domain-data";
import { Star } from "./star";

type SkySlabProps = {
  slabIndex: number;
  entries: DomainEntry[];
  width: number;
  height: number;
  seed: number;
  savedSet: Set<string>;
  onStarClick: (domain: string) => void;
  style?: React.CSSProperties;
};

function SkySlabImpl({
  slabIndex,
  entries,
  width,
  height,
  seed,
  savedSet,
  onStarClick,
  style,
}: SkySlabProps) {
  const slabSeed = useMemo(
    () => hashString(`slab:${slabIndex}`, seed),
    [slabIndex, seed],
  );

  const positions = useMemo(
    () => scatter(entries.length, width, height, slabSeed),
    [entries.length, width, height, slabSeed],
  );

  return (
    <ul className="list-none" style={style}>
      {entries.map((entry, i) => {
        const position = positions[i] ?? null;
        if (!position) return null;
        const displayTld =
          entry.tlds[hashString(entry.name, seed) % entry.tlds.length];
        const fullDomain = `${entry.name}${displayTld}`;
        return (
          <Star
            key={entry.name + displayTld}
            entry={entry}
            displayTld={displayTld}
            brightness={brightness(entry)}
            position={position}
            onClick={onStarClick}
            saved={savedSet.has(fullDomain)}
          />
        );
      })}
    </ul>
  );
}

export const SkySlab = memo(SkySlabImpl);

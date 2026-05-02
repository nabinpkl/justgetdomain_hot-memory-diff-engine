"use client";

import { useCallback, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Dice5 } from "lucide-react";
import { DomainModal } from "./domain-modal";

type RandomDomain = { name: string; tlds: string[] };

// Each face's pip coordinates on a 3×3 grid (col 1–3, row 1–3).
const FACE_PIPS: { face: string; transform: string; pips: [number, number][] }[] = [
  { face: "one",   transform: "translateZ(50px)",                pips: [[2, 2]] },
  { face: "two",   transform: "rotateY(180deg) translateZ(50px)", pips: [[1, 1], [3, 3]] },
  { face: "three", transform: "rotateY(90deg) translateZ(50px)",  pips: [[1, 1], [2, 2], [3, 3]] },
  { face: "four",  transform: "rotateY(-90deg) translateZ(50px)", pips: [[1, 1], [3, 1], [1, 3], [3, 3]] },
  { face: "five",  transform: "rotateX(90deg) translateZ(50px)",  pips: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]] },
  { face: "six",   transform: "rotateX(-90deg) translateZ(50px)", pips: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]] },
];

function DiceFace({
  transform,
  pips,
}: {
  transform: string;
  pips: [number, number][];
}) {
  return (
    <div className="jgd-dice-face" style={{ transform }}>
      {pips.map(([col, row], i) => (
        <span
          key={i}
          className="jgd-dice-pip"
          style={{ gridColumn: col, gridRow: row }}
        />
      ))}
    </div>
  );
}

function DiceOverlay({ open }: { open: boolean }) {
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-jgd-bg/75 backdrop-blur-sm data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6 outline-none data-open:animate-in data-open:fade-in-0">
          <DialogPrimitive.Title className="sr-only">Rolling dice…</DialogPrimitive.Title>
          <div className="jgd-dice-scene">
            <div className="jgd-dice">
              {FACE_PIPS.map(({ face, transform, pips }) => (
                <DiceFace key={face} transform={transform} pips={pips} />
              ))}
            </div>
          </div>
          <p className="jgd-blink font-mono text-[0.82rem] text-jgd-accent tracking-widest uppercase">
            Rolling…
          </p>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const MIN_ROLL_MS = 1600;

export function RollDiceButton() {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<RandomDomain | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleRoll = useCallback(async () => {
    if (rolling) return;
    setResult(null);
    setRolling(true);

    const seed = Math.floor(Math.random() * 1_000_000_000);
    const url = `/api/search?sort=random&seed=${seed}&limit=1`;

    try {
      const [res] = await Promise.all([
        fetch(url).then((r) => (r.ok ? r.json() : null)),
        new Promise((resolve) => setTimeout(resolve, MIN_ROLL_MS)),
      ]);
      const hit = res?.results?.[0];
      if (hit?.name && Array.isArray(hit.tlds) && hit.tlds.length > 0) {
        setResult({ name: hit.name, tlds: hit.tlds });
        setModalOpen(true);
      }
    } catch {
      // swallow  button re-enables below
    } finally {
      setRolling(false);
    }
  }, [rolling]);

  const heroTld = result?.tlds[0]?.replace(/^\./, "") ?? null;

  return (
    <>
      <button
        type="button"
        onClick={handleRoll}
        disabled={rolling}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-sm text-[0.78rem] font-mono cursor-pointer transition-colors border border-jgd-border bg-jgd-surface/60 text-jgd-text hover:border-jgd-text/25 hover:bg-jgd-surface disabled:opacity-60 disabled:cursor-wait"
      >
        <Dice5 size={13} strokeWidth={2} className="text-jgd-accent/70" />
        Roll a dice
      </button>

      <DiceOverlay open={rolling} />

      <DomainModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setResult(null);
        }}
        name={result?.name ?? null}
        heroTld={heroTld}
      />
    </>
  );
}

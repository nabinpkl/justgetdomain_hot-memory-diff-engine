"use client";

import { Shuffle } from "lucide-react";

type ShuffleButtonProps = {
  onShuffle: () => void;
  disabled?: boolean;
};

export function ShuffleButton({ onShuffle, disabled }: ShuffleButtonProps) {
  return (
    <button
      type="button"
      onClick={onShuffle}
      disabled={disabled}
      aria-label="Shuffle sky"
      className="absolute bottom-6 right-6 z-30 flex items-center gap-2 h-10 px-4 rounded-full border border-jgd-border bg-jgd-surface/80 text-jgd-dim backdrop-blur-sm transition-colors cursor-pointer hover:text-jgd-accent hover:border-jgd-accent-mid disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Shuffle size={14} />
      <span className="text-[0.75rem] tracking-[1.5px] uppercase">Shuffle sky</span>
    </button>
  );
}

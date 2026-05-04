"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="relative size-7 rounded-sm flex items-center justify-center text-jgd-dim border border-jgd-border bg-jgd-surface/60 transition-colors cursor-pointer hover:text-jgd-accent hover:border-jgd-accent-mid"
      suppressHydrationWarning
    >
      {isDark ? (
        <Moon size={14} strokeWidth={2} aria-hidden />
      ) : (
        <Sun size={14} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}

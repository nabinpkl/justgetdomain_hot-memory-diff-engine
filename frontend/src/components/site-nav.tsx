"use client";

import Link from "next/link";
import { ShortlistSlot } from "@/components/shortlist-slot";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav() {
  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="sticky top-0 z-50 h-14 flex justify-between items-center px-6 sm:px-8 text-[0.75rem] tracking-[1.5px] uppercase backdrop-blur-[16px] bg-jgd-nav border-b border-jgd-border"
    >
      <Link
        href="/"
        className="flex items-center gap-1.5 text-jgd-accent font-bold transition-opacity hover:opacity-80"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className="w-8 h-8 shrink-0"
          aria-hidden
        >
          <text
            x="105"
            y="340"
            fontFamily="sans-serif"
            fontWeight="700"
            fontSize="280"
            fill="currentColor"
            letterSpacing="-15"
          >
            &gt;_
          </text>
          <circle cx="385" cy="375" r="20" fill="currentColor" />
        </svg>
        JustGetDomain
      </Link>

      <div className="flex items-center gap-4">
        <span className="hidden md:flex items-center gap-2 text-jgd-dim">
          <span
            aria-hidden
            className="jgd-pulse inline-block w-1.5 h-1.5 rounded-full bg-jgd-accent"
          />
          Launching Soon
        </span>
        <ShortlistSlot />
        <ThemeToggle />
      </div>
    </nav>
  );
}

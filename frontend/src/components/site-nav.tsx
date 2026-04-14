"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav() {
  const pathname = usePathname();
  const onDomains = pathname?.startsWith("/domains") ?? false;

  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="sticky top-0 z-50 h-14 flex justify-between items-center px-6 sm:px-8 text-[0.75rem] tracking-[1.5px] uppercase backdrop-blur-[16px] bg-jgd-nav border-b border-jgd-border"
    >
      <Link
        href="/"
        className="text-jgd-accent font-bold transition-opacity hover:opacity-80"
      >
        JustGetDomain
      </Link>

      <div className="flex items-center gap-4">
        {!onDomains && (
          <Link
            href="/domains"
            className="text-jgd-dim transition-colors hover:text-jgd-accent"
          >
            Browse Domains
          </Link>
        )}
        <span className="hidden sm:flex items-center gap-2 text-jgd-dim">
          <span
            aria-hidden
            className="jgd-pulse inline-block w-1.5 h-1.5 rounded-full bg-jgd-accent"
          />
          Launching Soon
        </span>
        <ThemeToggle />
      </div>
    </nav>
  );
}

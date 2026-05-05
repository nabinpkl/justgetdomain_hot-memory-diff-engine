"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="sticky top-0 z-50 flex h-[62px] items-center justify-between border-b border-[#d9dee7] bg-[#fbfbfa]/95 px-6 text-[0.9rem] font-medium text-[#111318] backdrop-blur-[16px] sm:px-8"
    >
      <Link
        href="/"
        className="flex items-center gap-4 text-[#087d36] transition-opacity hover:opacity-80"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className="h-8 w-8 shrink-0"
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
        <span className="text-[1.25rem] font-bold uppercase tracking-[0.05em] text-black">
          JustGetDomain
        </span>
      </Link>

      <p
        className="absolute left-1/2 hidden max-w-[520px] -translate-x-1/2 text-center text-[0.82rem] font-semibold leading-tight tracking-[0.08em] text-[#7b8395] md:block"
        role="note"
      >
        Proof of concept · real data, availability not guaranteed.
      </p>

      <div className="flex h-full items-center gap-7">
        <Link
          href="/"
          className={`flex h-full items-center border-b-[3px] px-1 pt-[3px] transition-opacity hover:opacity-100 ${
            pathname === "/"
              ? "border-[#087d36] text-black"
              : "border-transparent text-[#4f586b]"
          }`}
        >
          Explore
        </Link>
        <Link href="/api/search" className="hidden text-[#4f586b] sm:block">
          API
        </Link>
        <Link
          href="https://github.com/nabinpkl/justgetdomain.com"
          className="hidden items-center gap-1.5 text-[#4f586b] sm:flex"
        >
          Source on GitHub <span aria-hidden>↗</span>
        </Link>
      </div>
    </nav>
  );
}

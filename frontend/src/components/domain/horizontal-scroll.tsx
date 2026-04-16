"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

type HorizontalScrollProps = {
  children: ReactNode;
  showArrows?: boolean;
  className?: string;
};

export function HorizontalScroll({
  children,
  showArrows = false,
  className = "",
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Left fade */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-jgd-bg to-transparent" />
      )}

      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-jgd-bg to-transparent" />

      {/* Scroll arrows */}
      {showArrows && canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-jgd-surface/80 border border-jgd-border text-jgd-dim flex items-center justify-center backdrop-blur-sm cursor-pointer hover:text-jgd-text hover:border-jgd-text/30 transition-colors"
        >
          &lsaquo;
        </button>
      )}
      {showArrows && canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-jgd-surface/80 border border-jgd-border text-jgd-dim flex items-center justify-center backdrop-blur-sm cursor-pointer hover:text-jgd-text hover:border-jgd-text/30 transition-colors"
        >
          &rsaquo;
        </button>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {children}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Starfield } from "@/components/starfield/starfield";

export function HomeHero() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    const target = trimmed ? `/domains?q=${encodeURIComponent(trimmed)}` : "/domains";
    router.push(target);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      <div className="flex flex-col items-center text-center px-6 pt-10 pb-6">
        <h1 className="leading-none mb-3 font-serif text-[clamp(2rem,5vw,3.4rem)] font-normal tracking-[-2px]">
          JustGetDomain<span className="text-jgd-accent">.</span>
        </h1>
        <p className="text-[0.72rem] uppercase tracking-[5px] text-jgd-dim mb-5">
          Every available short domain. Already found.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="w-full max-w-[520px]"
        >
          <div
            className="flex items-center gap-3 cursor-text bg-jgd-surface border border-jgd-accent/15 rounded-lg px-5 py-3"
            onClick={() => inputRef.current?.focus()}
          >
            <Search size={16} className="text-jgd-dim shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search available domains..."
              className="flex-1 bg-transparent outline-none text-[0.95rem] placeholder:opacity-50 text-jgd-text font-sans caret-jgd-accent"
              spellCheck={false}
            />
          </div>
          <p className="mt-3 text-[0.8rem] text-jgd-dim">
            Or stumble the sky below · press enter to{" "}
            <Link href="/domains" className="text-jgd-accent border-b border-jgd-accent/30 hover:opacity-80 transition-opacity cursor-pointer">
              browse millions
            </Link>
            .
          </p>
        </form>
      </div>

      <div className="relative flex-1 flex flex-col border-t border-jgd-border">
        <div className="flex items-center justify-between px-6 py-3 text-[0.65rem] uppercase tracking-[3px] text-jgd-dim">
          <span>Stumble the sky</span>
          <span className="hidden sm:block">Click a star to save it</span>
        </div>
        <Starfield />
      </div>
    </div>
  );
}

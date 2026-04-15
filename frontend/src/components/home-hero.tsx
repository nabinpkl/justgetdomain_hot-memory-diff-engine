"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
    <div className="flex flex-col items-center text-center px-6 min-h-[calc(100vh-3.5rem)] justify-center">
      <h1 className="leading-none mb-3 font-serif text-[clamp(3rem,10vw,6.5rem)] font-normal tracking-[-3px]">
        JustGet
        <br />
        Domain
        <span className="text-jgd-accent">.</span>
      </h1>
      <p className="text-[0.88rem] uppercase tracking-[6px] text-jgd-dim mb-10">
        Every available short domain. Already found.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="w-full max-w-[640px]"
      >
        <div
          className="flex items-center gap-3 cursor-text bg-jgd-surface border border-jgd-accent/15 rounded-lg px-6 py-[18px]"
          onClick={() => inputRef.current?.focus()}
        >
          <Search size={20} className="text-jgd-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search available domains..."
            className="flex-1 bg-transparent outline-none text-[1.1rem] placeholder:opacity-50 text-jgd-text font-sans caret-jgd-accent"
            spellCheck={false}
            autoFocus
          />
        </div>
        <p className="mt-5 text-[0.95rem] text-jgd-dim leading-[1.7]">
          Press enter to browse{" "}
          <Link href="/domains" className="text-jgd-accent border-b border-jgd-accent/30 hover:opacity-80 transition-opacity cursor-pointer">
            millions of available domains
          </Link>
          .
        </p>
      </form>
    </div>
  );
}

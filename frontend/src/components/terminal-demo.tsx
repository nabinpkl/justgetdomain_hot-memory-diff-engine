"use client";

import { useEffect, useState } from "react";

const LINES = [
  { cls: "comment",   text: "# scanning 3-letter .com domains...", delay: 0 },
  { cls: "scanning",  text: "  aaa ✗  aab ✗  aac ✗  aad ✗  aae ✗", delay: 400 },
  { cls: "scanning",  text: "  ...scanning...", delay: 700 },
  { cls: "available", text: "  ✓ bxq.com              available", delay: 1100 },
  { cls: "available", text: "  ✓ fwj.com              available", delay: 1350 },
  { cls: "gap",       text: "", delay: 1500 },
  { cls: "comment",   text: "# expanding to 4-letter dictionary words...", delay: 1700 },
  { cls: "scanning",  text: "  apex ✗  bold ✗  calm ✗  dart ✗", delay: 2100 },
  { cls: "available", text: "  ✓ flux.dev             available", delay: 2500 },
  { cls: "available", text: "  ✓ grit.sh              available", delay: 2700 },
  { cls: "available", text: "  ✓ plow.io              available", delay: 2900 },
  { cls: "gap",       text: "", delay: 3100 },
  { cls: "comment",   text: "# going deeper — 5 letters...", delay: 3300 },
  { cls: "scanning",  text: "  blaze ✗  crane ✗  drift ✗", delay: 3600 },
  { cls: "available", text: "  ✓ gleam.dev            available", delay: 4000 },
  { cls: "available", text: "  ✓ stoic.sh             available", delay: 4200 },
  { cls: "gap",       text: "", delay: 4400 },
  { cls: "prompt",    text: "  7 domains found. 0 taken shown.", delay: 4700 },
  { cls: "cursor",    text: "", delay: 5000 },
] as const;

const LINE_COLORS: Record<string, string> = {
  comment:   "oklch(0.64 0.10 145)",
  scanning:  "oklch(0.56 0 0)",
  available: "var(--jgd-accent)",
  prompt:    "var(--jgd-accent)",
};

export function TerminalDemo() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timers = LINES.map((line, i) =>
      setTimeout(() => setCount(i + 1), line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="mt-14 w-full max-w-[560px] text-left overflow-hidden"
      style={{
        background: "var(--jgd-surface)",
        border: "1px solid var(--jgd-border)",
        borderRadius: "8px",
        boxShadow: "0 40px 80px oklch(0 0 0 / 0.5)",
      }}
      role="img"
      aria-label="Demo showing recursive domain scanning"
    >
      {/* title bar */}
      <div
        className="flex items-center gap-1.5 px-3.5 py-2.5"
        style={{ borderBottom: "1px solid var(--jgd-border)" }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--jgd-border)" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--jgd-border)" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--jgd-border)" }} />
        <span
          className="flex-1 text-center text-[0.72rem] uppercase tracking-[1px]"
          style={{ color: "var(--jgd-dim)" }}
        >
          recursive scan
        </span>
      </div>

      {/* body */}
      <div className="p-5 text-[0.8rem] min-h-[200px]">
        {LINES.slice(0, count).map((line, i) => {
          if (line.cls === "gap") {
            return <div key={i} style={{ height: "12px" }} />;
          }
          if (line.cls === "cursor") {
            return (
              <div key={i} style={{ color: "var(--jgd-accent)" }}>
                {"$ "}
                <span
                  className="jgd-blink inline-block"
                  style={{
                    width: "8px",
                    height: "16px",
                    background: "var(--jgd-accent)",
                    verticalAlign: "text-bottom",
                  }}
                />
              </div>
            );
          }
          return (
            <div
              key={i}
              className="my-0.5 whitespace-pre"
              style={{
                color: LINE_COLORS[line.cls] ?? "inherit",
                fontStyle: line.cls === "comment" ? "italic" : undefined,
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { DomainEntry } from "@/components/starfield/domain-data";

export type Brightness = "bright" | "mid" | "dim";

export function brightness(entry: DomainEntry): Brightness {
  if (entry.match_count >= 10) return "bright";
  if (entry.match_count >= 4) return "mid";
  return "dim";
}

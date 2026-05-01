export type DomainEntry = {
  name: string;
  tlds: string[];
  length: number;
  match_count: number;
};

export const FALLBACK_TLDS = [".com", ".dev", ".io", ".ai", ".app", ".sh", ".xyz", ".net", ".org"];

export const LENGTHS = [3, 4, 5, 6, 7, 8] as const;

export type AvailableBand = "1" | "2-3" | "4+";

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

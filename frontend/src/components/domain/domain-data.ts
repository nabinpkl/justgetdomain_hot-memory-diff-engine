export type DomainEntry = {
  name: string;
  tlds: string[];
  length: number;
  available_count: number;
};

export const REGISTRARS = [
  { name: "Namecheap", url: "https://www.namecheap.com/domains/registration/results/?domain=" },
  { name: "Porkbun", url: "https://porkbun.com/checkout/search?q=" },
  { name: "Cloudflare", url: "https://www.cloudflare.com/products/registrar/" },
];

export const FALLBACK_TLDS = [".com", ".dev", ".io", ".ai", ".app", ".sh", ".xyz", ".net", ".org"];

// Highest entry in this list is treated as ">=" by the backend, so 8 covers 8+.
export const LENGTHS = [3, 4, 5, 6, 7, 8] as const;

export type SortMode = "alpha" | "tlds" | "shortest";

export type AvailableBand = "1" | "2-3" | "4+";

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

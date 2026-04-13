// ─── Shared types and constants for domain search ────────

export type DomainEntry = {
  name: string;
  tlds: string[];
  length: number;
};

export const REGISTRARS = [
  { name: "Namecheap", url: "https://www.namecheap.com/domains/registration/results/?domain=" },
  { name: "Porkbun", url: "https://porkbun.com/checkout/search?q=" },
  { name: "Cloudflare", url: "https://www.cloudflare.com/products/registrar/" },
];

export const ALL_TLDS = [".com", ".dev", ".io", ".app", ".sh", ".xyz", ".net", ".org"];
export const LENGTHS = [3, 4, 5] as const;

export type SortMode = "alpha" | "tlds" | "shortest";

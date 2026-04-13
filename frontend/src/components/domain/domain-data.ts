// ─── Shared types, mock data, and constants for domain search ────────

export type DomainEntry = {
  name: string;
  tlds: string[];
  length: number;
};

export const MOCK_DOMAINS: DomainEntry[] = [
  { name: "flux", tlds: [".dev", ".sh", ".xyz"], length: 4 },
  { name: "grit", tlds: [".sh", ".io", ".xyz"], length: 4 },
  { name: "plow", tlds: [".io", ".dev"], length: 4 },
  { name: "gleam", tlds: [".dev", ".app", ".sh"], length: 5 },
  { name: "stoic", tlds: [".sh", ".xyz", ".io"], length: 5 },
  { name: "bxq", tlds: [".com", ".dev", ".io", ".app"], length: 3 },
  { name: "fwj", tlds: [".com", ".net", ".xyz"], length: 3 },
  { name: "vex", tlds: [".dev", ".io"], length: 3 },
  { name: "elm", tlds: [".sh", ".app"], length: 3 },
  { name: "crisp", tlds: [".dev", ".sh", ".xyz", ".io"], length: 5 },
  { name: "bloom", tlds: [".sh", ".xyz"], length: 5 },
  { name: "drift", tlds: [".dev", ".io", ".app"], length: 5 },
  { name: "spark", tlds: [".sh", ".xyz", ".io", ".app"], length: 5 },
  { name: "plume", tlds: [".dev", ".sh"], length: 5 },
  { name: "oxide", tlds: [".dev", ".sh", ".io"], length: 5 },
  { name: "zest", tlds: [".dev", ".io", ".sh", ".app"], length: 4 },
  { name: "wick", tlds: [".dev", ".sh"], length: 4 },
  { name: "dusk", tlds: [".io", ".xyz", ".app"], length: 4 },
  { name: "knot", tlds: [".dev", ".sh", ".io"], length: 4 },
  { name: "palm", tlds: [".sh", ".xyz"], length: 4 },
  { name: "cove", tlds: [".dev", ".io", ".app", ".sh"], length: 4 },
  { name: "reef", tlds: [".dev", ".sh", ".xyz"], length: 4 },
  { name: "bolt", tlds: [".sh", ".io"], length: 4 },
  { name: "mist", tlds: [".dev", ".xyz", ".io"], length: 4 },
  { name: "rune", tlds: [".dev", ".sh", ".app"], length: 4 },
  { name: "vale", tlds: [".dev", ".io"], length: 4 },
  { name: "pyre", tlds: [".sh", ".xyz"], length: 4 },
  { name: "haze", tlds: [".dev", ".io", ".app"], length: 4 },
  { name: "nyx", tlds: [".dev", ".io", ".sh", ".com"], length: 3 },
  { name: "orb", tlds: [".dev", ".sh"], length: 3 },
  { name: "zyl", tlds: [".com", ".io", ".dev"], length: 3 },
  { name: "kvo", tlds: [".dev", ".sh", ".xyz"], length: 3 },
  { name: "wren", tlds: [".dev", ".io", ".sh", ".app", ".xyz"], length: 4 },
  { name: "sage", tlds: [".dev", ".sh"], length: 4 },
  { name: "fern", tlds: [".dev", ".io", ".xyz"], length: 4 },
  { name: "loom", tlds: [".sh", ".dev", ".io"], length: 4 },
  { name: "quill", tlds: [".dev", ".sh", ".io"], length: 5 },
  { name: "forge", tlds: [".dev", ".sh", ".app"], length: 5 },
  { name: "slate", tlds: [".dev", ".io", ".xyz", ".sh"], length: 5 },
  { name: "thorn", tlds: [".dev", ".sh"], length: 5 },
  { name: "briar", tlds: [".dev", ".io", ".sh"], length: 5 },
  { name: "flint", tlds: [".dev", ".sh", ".xyz", ".app"], length: 5 },
  { name: "ember", tlds: [".dev", ".io"], length: 5 },
  { name: "fjord", tlds: [".dev", ".sh", ".io", ".app"], length: 5 },
  { name: "prism", tlds: [".dev", ".io", ".sh"], length: 5 },
  { name: "tidal", tlds: [".dev", ".sh", ".xyz"], length: 5 },
];

export const REGISTRARS = [
  { name: "Namecheap", url: "https://www.namecheap.com/domains/registration/results/?domain=" },
  { name: "Porkbun", url: "https://porkbun.com/checkout/search?q=" },
  { name: "Cloudflare", url: "https://www.cloudflare.com/products/registrar/" },
];

export const ALL_TLDS = [".com", ".dev", ".io", ".app", ".sh", ".xyz", ".net", ".org"];
export const LENGTHS = [3, 4, 5] as const;

export type SortMode = "alpha" | "tlds" | "shortest";

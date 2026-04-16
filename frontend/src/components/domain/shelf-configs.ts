export type ShelfConfig = {
  id: string;
  title: string;
  description: string;
  tlds?: string;
  lengths?: string;
  seed: number;
  group: "vibe" | "tld" | "length";
};

export const SHELF_CONFIGS: ShelfConfig[] = [
  // By Vibe
  {
    id: "nature",
    title: "Nature & Earth",
    description:
      "Organic, natural words — great for wellness, eco, lifestyle brands",
    tlds: ".garden,.green,.bio,.eco,.earth",
    seed: 1,
    group: "vibe",
  },
  {
    id: "tech",
    title: "Tech & Motion",
    description:
      "Speed, precision, systems — built for SaaS, devtools, startups",
    tlds: ".dev,.io,.tech,.sh,.run",
    seed: 3,
    group: "vibe",
  },
  {
    id: "food",
    title: "Food & Taste",
    description:
      "Flavor-forward names — restaurants, food tech, lifestyle",
    tlds: ".kitchen,.recipes,.cafe,.menu,.bar",
    seed: 4,
    group: "vibe",
  },

  // By TLD
  {
    id: "app",
    title: ".app Domains",
    description:
      "The app-store TLD — signals software, tools, products",
    tlds: ".app",
    seed: 5,
    group: "tld",
  },
  {
    id: "dev",
    title: ".dev Domains",
    description: "By developers, for developers — your builder identity",
    tlds: ".dev",
    seed: 6,
    group: "tld",
  },
  {
    id: "io",
    title: ".io Domains",
    description:
      "The startup classic — still the default for tech products",
    tlds: ".io",
    seed: 7,
    group: "tld",
  },

  // By Length
  {
    id: "3-letter",
    title: "3-Letter Names",
    description:
      "The rarest namespace — every available one surfaced",
    lengths: "3",
    seed: 8,
    group: "length",
  },
  {
    id: "4-letter",
    title: "4-Letter Names",
    description:
      "The sweet spot for brandable names — short, memorable, available",
    lengths: "4",
    seed: 9,
    group: "length",
  },
  {
    id: "5-letter",
    title: "5-Letter Names",
    description:
      "Real words, compound fragments, memorable slugs — the widest net",
    lengths: "5",
    seed: 10,
    group: "length",
  },
];

/** The first 3 configs used as homepage teasers. */
export const HOMEPAGE_SHELF_IDS = ["nature", "app", "tech"] as const;

export function getHomepageShelves(): ShelfConfig[] {
  return SHELF_CONFIGS.filter((c) =>
    (HOMEPAGE_SHELF_IDS as readonly string[]).includes(c.id),
  );
}

export type FilterGroup = "all" | "vibe" | "tld" | "length";

export function filterShelves(
  group: FilterGroup,
): ShelfConfig[] {
  if (group === "all") return SHELF_CONFIGS;
  return SHELF_CONFIGS.filter((c) => c.group === group);
}

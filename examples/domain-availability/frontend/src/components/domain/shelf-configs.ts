export type ShelfConfig = {
  id: string;
  title: string;
  description: string;
  tlds?: string;
  lengths?: string;
  minLength?: number;
  categories?: string;
  group: "core" | "tld" | "length" | "topic";
};

export const SHELF_CONFIGS: ShelfConfig[] = [
  {
    id: "all",
    title: "All Available",
    description: "Every available name in the live snapshot.",
    group: "core",
  },
  {
    id: "shortnames",
    title: "Short Names",
    description: "Available 3, 4, and 5 character names.",
    lengths: "3,4,5",
    group: "length",
  },
  {
    id: "developer",
    title: "Developer TLDs",
    description: "Live available names on .dev.",
    tlds: ".dev",
    group: "tld",
  },
  {
    id: "tech",
    title: "Tech",
    description: "Tech-category words available on .dev, .tech, and .ai.",
    categories: "tech",
    tlds: ".dev,.tech,.ai",
    group: "topic",
  },
  {
    id: "ai",
    title: "AI",
    description: "All available names on .ai.",
    tlds: ".ai",
    group: "tld",
  },
];

/** The first 3 configs used as homepage teasers. */
export const HOMEPAGE_SHELF_IDS = ["shortnames", "developer", "tech"] as const;

export function getHomepageShelves(): ShelfConfig[] {
  return SHELF_CONFIGS.filter((c) =>
    (HOMEPAGE_SHELF_IDS as readonly string[]).includes(c.id),
  );
}

export type FilterGroup = "all" | "core" | "tld" | "length" | "topic";

export function filterShelves(
  group: FilterGroup,
): ShelfConfig[] {
  if (group === "all") return SHELF_CONFIGS;
  return SHELF_CONFIGS.filter((c) => c.group === group);
}

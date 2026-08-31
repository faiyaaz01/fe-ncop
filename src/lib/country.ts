const COUNTRY_ALIASES: Record<string, string> = {
  "u.s.": "United States",
  "u.s.a.": "United States",
  us: "United States",
  usa: "United States",
  "united states of america": "United States",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  uae: "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  dprk: "North Korea",
  drc: "Democratic Republic of the Congo",
  "côte d’ivoire": "Côte d’Ivoire",
  "cote d'ivoire": "Côte d’Ivoire",
  "cote d’ivoire": "Côte d’Ivoire",
};

function titleCaseCountryName(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/(^|[\s-])([\p{L}])/gu, (_, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase()}`,
    );
}

/** Produces one consistent display/storage spelling for free-text country names. */
export function normalizeCountryName(value?: string | null): string {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return "";

  const alias = COUNTRY_ALIASES[trimmed.toLocaleLowerCase()];
  if (alias) return alias;

  return titleCaseCountryName(trimmed);
}

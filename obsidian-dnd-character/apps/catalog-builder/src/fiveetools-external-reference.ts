import type { ExternalReference } from "@obsidian-dnd/catalog-contract";

/**
 * Reviewed finite reproduction of pinned 5eTools `js/utils.js` UrlUtil:
 * PG_RACES/PG_BACKGROUNDS/PG_CLASSES and URL_TO_HASH_GENERIC.
 */
const PAGE_BY_KIND = { species: "races.html", background: "backgrounds.html", class: "classes.html" } as const;
type SupportedExternalKind = keyof typeof PAGE_BY_KIND;

function encodeHashPart(value: string): string { return encodeURIComponent(value.toLowerCase()).toLowerCase(); }

export function createFiveEToolsExternalReference(
  kind: SupportedExternalKind,
  name: string,
  source: string,
): ExternalReference | undefined {
  if (name.trim().length === 0 || source.trim().length === 0) return undefined;
  return { provider: "5etools", relativeTarget: `${PAGE_BY_KIND[kind]}#${encodeHashPart(name)}_${encodeHashPart(source)}` };
}

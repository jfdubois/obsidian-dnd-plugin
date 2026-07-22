import type { SourceId, Ruleset, SourceCategory } from "@obsidian-dnd/domain";
import { isSourceId, isRuleset, isSourceCategory } from "@obsidian-dnd/domain";

/* ── Source metadata ────────────────────────────────────────────
   Describes a single source book in the catalog. The builder
   produces one record per source; the plugin uses them for
   display, source selection, and access classification.         */

export interface CatalogSource {
  id: SourceId;
  name: string;
  abbreviation: string;
  ruleset: Ruleset;
  published?: string;
  category: SourceCategory;
}

export function isCatalogSource(value: unknown): value is CatalogSource {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isSourceId(obj.id)) return false;
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (typeof obj.abbreviation !== "string" || obj.abbreviation.length === 0) return false;
  if (!isRuleset(obj.ruleset)) return false;
  if (obj.published !== undefined && (typeof obj.published !== "string" || obj.published.length === 0)) return false;
  if (!isSourceCategory(obj.category)) return false;

  return true;
}

export function createCatalogSource(
  props: {
    id: SourceId;
    name: string;
    abbreviation: string;
    ruleset: Ruleset;
    published?: string;
    category: SourceCategory;
  },
): CatalogSource {
  return {
    id: props.id,
    name: props.name,
    abbreviation: props.abbreviation,
    ruleset: props.ruleset,
    published: props.published,
    category: props.category,
  };
}

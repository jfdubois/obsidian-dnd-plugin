/* ── Species choice filter: EntityQuery evaluation ───────────────
   Evaluates EntityQuery filters against catalog entity summaries.
   Pure TypeScript logic — no Obsidian UI.                         */

import type { CatalogEntitySummary, EntityQuery } from "@obsidian-dnd/catalog-contract";
import type { CatalogRevision } from "@obsidian-dnd/domain";
import type { CatalogService } from "./catalog/catalog-service";

/**
 * Fetches and filters entity candidates based on an EntityQuery.
 * Evaluates: kind, ruleset, sourceId, access, tags, excludeLegacy,
 * and eligibility callback.
 */
export async function evaluateEntityQuery(
  catalog: CatalogService,
  revision: CatalogRevision,
  query: EntityQuery,
  ruleset: string,
  isEntityEligible: (sourceId: string, access: string) => boolean,
): Promise<CatalogEntitySummary[]> {
  const index = await catalog.fetchIndex(revision, query.kind as never);

  return index.filter((summary) => {
    // Ruleset filter (always applied)
    if (summary.ruleset !== ruleset) return false;

    // Source ID filter (optional)
    if (query.sourceId !== undefined && summary.sourceId !== query.sourceId) {
      return false;
    }

    // Access filter (optional)
    if (query.access !== undefined && summary.access !== query.access) {
      return false;
    }

    // Tags filter (optional) — all query tags must be present on the entity
    if (query.tags !== undefined && query.tags.length > 0) {
      const summaryTags = summary.tags ?? [];
      if (!query.tags.every((tag) => summaryTags.includes(tag))) {
        return false;
      }
    }

    // Exclude legacy filter (optional)
    if (query.excludeLegacy === true && summary.legacy === true) {
      return false;
    }

    // Eligibility callback
    if (!isEntityEligible(summary.sourceId, summary.access)) {
      return false;
    }

    return true;
  });
}

/**
 * Maps ProficiencyQueryKind to the corresponding RuleEntityKind
 * for fetching the entity index.
 */
export function proficiencyKindToEntityKind(kind: string): string {
  switch (kind) {
    case "skill":
      return "skill";
    case "tool":
      return "item";
    case "saving-throw":
      return "skill";
    case "armor":
      return "item";
    default:
      return kind;
  }
}

import type { EquipmentQuery } from "./query";
import type { ItemRule } from "./entity-item";
import type { CatalogEntitySummary, CatalogItemSummary } from "./entity-summary";
import { isCatalogItemSummary } from "./entity-summary";

/** Evaluates published equipment constraints against published ItemRules. */
export function evaluateEquipmentQuery(items: readonly ItemRule[], query: EquipmentQuery): ItemRule[] {
  return items.filter((item) => {
    if (query.category !== undefined && item.category !== query.category) return false;
    if (query.rarity !== undefined && item.rarity !== query.rarity) return false;
    if (query.bodySlot !== undefined && item.bodySlot !== query.bodySlot) return false;
    if (query.sourceId !== undefined && item.sourceId !== query.sourceId) return false;
    if (query.access !== undefined && item.access !== query.access) return false;
    return query.equipmentGroups === undefined || query.equipmentGroups.some((group) => item.equipmentGroups.includes(group));
  });
}

export class EquipmentQueryIndexCompatibilityError extends Error {
  readonly code = "EQUIPMENT_QUERY_INDEX_METADATA_UNAVAILABLE";

  constructor(reason: "missing-equipment-groups" | "unsupported-query-field") {
    super(reason === "missing-equipment-groups"
      ? "EquipmentQuery requires compact item-index equipmentGroups metadata. Activate a catalog revision using schema v4 or later."
      : "EquipmentQuery contains a field that the compact item index cannot evaluate.");
    this.name = "EquipmentQueryIndexCompatibilityError";
  }
}

export interface EquipmentQueryIndexEligibilityInput {
  ruleset?: CatalogItemSummary["ruleset"] | null;
  enabledSourceIds?: readonly CatalogItemSummary["sourceId"][];
}

/**
 * Evaluates the compact-index subset of EquipmentQuery. Item details are
 * intentionally not accepted here: callers must select eligible IDs first and
 * lazy-load only the details their current UI needs.
 */
export function evaluateEquipmentQueryIndex(
  summaries: readonly CatalogEntitySummary[],
  query: EquipmentQuery,
  input: EquipmentQueryIndexEligibilityInput = {},
): CatalogItemSummary[] {
  if (query.category !== undefined || query.rarity !== undefined || query.bodySlot !== undefined) {
    throw new EquipmentQueryIndexCompatibilityError("unsupported-query-field");
  }

  const items: CatalogItemSummary[] = [];
  for (const summary of summaries) {
    if (summary.kind !== "item") continue;
    if (!isCatalogItemSummary(summary)) {
      throw new EquipmentQueryIndexCompatibilityError("missing-equipment-groups");
    }
    if (input.ruleset !== undefined && input.ruleset !== null && summary.ruleset !== input.ruleset) continue;
    if (summary.access !== "core" && (input.enabledSourceIds === undefined || !input.enabledSourceIds.includes(summary.sourceId))) continue;
    if (query.sourceId !== undefined && summary.sourceId !== query.sourceId) continue;
    if (query.access !== undefined && summary.access !== query.access) continue;
    if (query.equipmentGroups !== undefined && !query.equipmentGroups.some((group) => summary.equipmentGroups.includes(group))) continue;
    items.push(summary);
  }
  return items;
}

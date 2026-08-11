import type { EquipmentQuery } from "./query";
import type { ItemRule } from "./entity-item";

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

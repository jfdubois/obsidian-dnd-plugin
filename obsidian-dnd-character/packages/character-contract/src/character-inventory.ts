import type { Ability, EntityId, ItemInstanceId } from "@obsidian-dnd/domain";
import { isAbility, isEntityId, isItemInstanceId } from "@obsidian-dnd/domain";

export interface ItemInstanceOverrides { abilityModifier?: Record<Ability, number>; }
export interface InventoryItemInstanceBase { instanceId: ItemInstanceId; quantity: number; equipped: boolean; containerInstanceId?: ItemInstanceId; customName?: string; notes?: string; }
export interface CatalogInventoryItemInstance extends InventoryItemInstanceBase { type: "catalog-item"; itemId: EntityId; attuned: boolean; chargesUsed?: number; overrides?: ItemInstanceOverrides; }
export interface NamedInventoryItemInstance extends InventoryItemInstanceBase { type: "named-item"; name: string; }
export type InventoryItemInstance = CatalogInventoryItemInstance | NamedInventoryItemInstance;

function isItemInstanceOverrides(value: unknown): value is ItemInstanceOverrides {
  if (typeof value !== "object" || value === null) return false;
  const modifier = (value as Record<string, unknown>).abilityModifier;
  return modifier === undefined || (typeof modifier === "object" && modifier !== null && !Array.isArray(modifier)
    && Object.entries(modifier).every(([ability, bonus]) => isAbility(ability) && typeof bonus === "number" && Number.isInteger(bonus)));
}
function isBase(value: Record<string, unknown>): boolean {
  return isItemInstanceId(value.instanceId) && typeof value.quantity === "number" && Number.isInteger(value.quantity) && value.quantity >= 0
    && typeof value.equipped === "boolean" && (value.containerInstanceId === undefined || isItemInstanceId(value.containerInstanceId))
    && (value.customName === undefined || typeof value.customName === "string") && (value.notes === undefined || typeof value.notes === "string");
}
export function isInventoryItemInstance(value: unknown): value is InventoryItemInstance {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isBase(obj)) return false;
  if (obj.type === "catalog-item") return isEntityId(obj.itemId) && typeof obj.attuned === "boolean"
    && (obj.chargesUsed === undefined || typeof obj.chargesUsed === "number" && Number.isInteger(obj.chargesUsed) && obj.chargesUsed >= 0)
    && (obj.overrides === undefined || isItemInstanceOverrides(obj.overrides));
  return obj.type === "named-item" && typeof obj.name === "string" && obj.name.trim().length > 0
    && obj.itemId === undefined && obj.attuned === undefined && obj.chargesUsed === undefined && obj.overrides === undefined;
}

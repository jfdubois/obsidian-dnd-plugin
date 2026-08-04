import type {
  Ability,
  EntityId,
  ItemInstanceId,
} from "@obsidian-dnd/domain";
import {
  isAbility,
  isEntityId,
  isItemInstanceId,
} from "@obsidian-dnd/domain";

/* ── Item instance overrides ───────────────────────────────────── */

export interface ItemInstanceOverrides {
  abilityModifier?: Record<Ability, number>;
}

function isItemInstanceOverrides(value: unknown): value is ItemInstanceOverrides {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj.abilityModifier !== undefined) {
    if (typeof obj.abilityModifier !== "object" || obj.abilityModifier === null || Array.isArray(obj.abilityModifier)) {
      return false;
    }
    for (const [key, val] of Object.entries(obj.abilityModifier)) {
      if (!isAbility(key)) return false;
      if (typeof val !== "number" || !Number.isInteger(val)) return false;
    }
  }

  return true;
}

/* ── Inventory item instance ───────────────────────────────────── */

export interface InventoryItemInstance {
  instanceId: ItemInstanceId;
  itemId: EntityId;
  quantity: number;
  equipped: boolean;
  attuned: boolean;
  containerInstanceId?: ItemInstanceId;
  chargesUsed?: number;
  customName?: string;
  notes?: string;
  overrides?: ItemInstanceOverrides;
}

export function isInventoryItemInstance(value: unknown): value is InventoryItemInstance {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isItemInstanceId(obj.instanceId)) return false;
  if (!isEntityId(obj.itemId)) return false;
  if (typeof obj.quantity !== "number" || !Number.isInteger(obj.quantity) || obj.quantity < 0) return false;
  if (typeof obj.equipped !== "boolean") return false;
  if (typeof obj.attuned !== "boolean") return false;
  if (obj.containerInstanceId !== undefined && !isItemInstanceId(obj.containerInstanceId)) return false;
  if (obj.chargesUsed !== undefined && (typeof obj.chargesUsed !== "number" || !Number.isInteger(obj.chargesUsed) || obj.chargesUsed < 0)) return false;
  if (obj.customName !== undefined && typeof obj.customName !== "string") return false;
  if (obj.notes !== undefined && typeof obj.notes !== "string") return false;
  if (obj.overrides !== undefined && !isItemInstanceOverrides(obj.overrides)) return false;

  return true;
}

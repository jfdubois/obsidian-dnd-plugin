import type { EntityId, RuleGrantId } from "@obsidian-dnd/domain";
import { isEntityId, isRuleGrantId } from "@obsidian-dnd/domain";
import type { RuleEffect } from "./effect";
import { isRuleEffect } from "./effect";

export type CurrencyDenomination = "cp" | "sp" | "ep" | "gp" | "pp";

export type CurrencyGrantAmount =
  | { readonly type: "fixed"; readonly value: number }
  | { readonly type: "dice"; readonly count: number; readonly dieSides: number; readonly multiplier: number };

export type RuleGrant =
  | { readonly id: RuleGrantId; readonly type: "entity"; readonly entityId: EntityId }
  | { readonly id: RuleGrantId; readonly type: "effect"; readonly effect: RuleEffect }
  | { readonly id: RuleGrantId; readonly type: "item"; readonly itemId: EntityId; readonly quantity: number }
  | { readonly id: RuleGrantId; readonly type: "named-item"; readonly name: string; readonly quantity: number }
  | { readonly id: RuleGrantId; readonly type: "currency"; readonly denomination: CurrencyDenomination; readonly amount: CurrencyGrantAmount };

export type ChoiceOptionGrant = RuleGrant;

const DENOMINATIONS: readonly CurrencyDenomination[] = ["cp", "sp", "ep", "gp", "pp"];

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isCurrencyGrantAmount(value: unknown): value is CurrencyGrantAmount {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as { type?: unknown; value?: unknown; count?: unknown; dieSides?: unknown; multiplier?: unknown };
  if (obj.type === "fixed") return isPositiveInteger(obj.value);
  return obj.type === "dice" && isPositiveInteger(obj.count) && typeof obj.dieSides === "number"
    && Number.isInteger(obj.dieSides) && obj.dieSides >= 2 && isPositiveInteger(obj.multiplier);
}

export function isRuleGrant(value: unknown): value is RuleGrant {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as { id?: unknown; type?: unknown; entityId?: unknown; effect?: unknown; itemId?: unknown; quantity?: unknown; name?: unknown; denomination?: unknown; amount?: unknown };
  if (!isRuleGrantId(obj.id)) return false;
  switch (obj.type) {
    case "entity": return isEntityId(obj.entityId);
    case "effect": return isRuleEffect(obj.effect);
    case "item": return isEntityId(obj.itemId) && isPositiveInteger(obj.quantity);
    case "named-item": return typeof obj.name === "string" && obj.name.trim().length > 0 && isPositiveInteger(obj.quantity);
    case "currency": return DENOMINATIONS.includes(obj.denomination as CurrencyDenomination) && isCurrencyGrantAmount(obj.amount);
    default: return false;
  }
}

export function createFixedCurrencyGrantAmount(value: number): CurrencyGrantAmount {
  return { type: "fixed", value };
}

export function createDiceCurrencyGrantAmount(count: number, dieSides: number, multiplier = 1): CurrencyGrantAmount {
  return { type: "dice", count, dieSides, multiplier };
}

import type {
  EntityId,
  Ruleset,
  SourceId,
  ContentAccess,
  WeaponCategory,
  ProficiencyGroup,
} from "@obsidian-dnd/domain";
import {
  isEntityId,
  isRuleset,
  isContentAccess,
  isWeaponCategory,
  isProficiencyGroup,
} from "@obsidian-dnd/domain";
import type { ChoiceDefinition } from "./choice-definition";
import { isChoiceDefinition } from "./choice-definition";
import type { RulePrerequisite } from "./prerequisite";
import { isRulePrerequisite } from "./prerequisite";
import type { RuleEffect } from "./effect";
import { isRuleEffect } from "./effect";
import type { RenderNode } from "./render-node";
import { isRenderNode } from "./render-node";
import type { EquipmentCategory, EquipmentRarity, EquipmentBodySlot, EquipmentGroup } from "./query";
import { isEquipmentCategory, isEquipmentRarity, isEquipmentBodySlot, isEquipmentGroup } from "./query";

/* ── ItemCost ─────────────────────────────────────────────────────
    Represents the monetary cost of an item.                      */

export interface ItemCost {
  amount: number;
  unit: string;
}

/* ── ItemRule ────────────────────────────────────────────────────
    Complete item definition extending RuleEntity fields with
    equipment-specific data: category, rarity, cost, weight,
    body slot, properties list, and attunement requirement.       */

export interface ItemRule {
  id: EntityId;
  kind: "item";
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: ContentAccess;
  page?: number;
  legacy: boolean;
  summary?: string;
  content: RenderNode[];
  prerequisites: RulePrerequisite[];
  effects: RuleEffect[];
  choices: ChoiceDefinition[];
  dependencies: EntityId[];
  category: EquipmentCategory;
  rarity?: EquipmentRarity;
  cost?: ItemCost;
  weight?: number;
  bodySlot?: EquipmentBodySlot;
  properties: string[];
  requiresAttunement: boolean;
  equipmentGroups: EquipmentGroup[];
  weaponCategory?: WeaponCategory;
  proficiencyGroups: ProficiencyGroup[];
}

/* ── ItemCost validator ────────────────────────────────────────── */

export function isItemCost(value: unknown): value is ItemCost {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.amount !== "number" || !Number.isFinite(obj.amount)) return false;
  if (obj.amount < 0) return false;

  if (typeof obj.unit !== "string" || obj.unit.length === 0) return false;

  return true;
}

/* ── ItemRule validator ────────────────────────────────────────── */

export function isItemRule(value: unknown): value is ItemRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "item") return false;
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (!isEntityId(obj.sourceId)) return false;
  if (!isRuleset(obj.ruleset)) return false;
  if (!isContentAccess(obj.access)) return false;

  if (obj.page !== undefined) {
    if (typeof obj.page !== "number" || !Number.isInteger(obj.page)) return false;
    if (obj.page < 1) return false;
  }

  if (typeof obj.legacy !== "boolean") return false;

  if (obj.summary !== undefined && typeof obj.summary !== "string") return false;

  if (!Array.isArray(obj.content)) return false;
  if (!obj.content.every((n: unknown) => isRenderNode(n))) return false;

  if (!Array.isArray(obj.prerequisites)) return false;
  if (!obj.prerequisites.every((p: unknown) => isRulePrerequisite(p))) return false;

  if (!Array.isArray(obj.effects)) return false;
  if (!obj.effects.every((e: unknown) => isRuleEffect(e))) return false;

  if (!Array.isArray(obj.choices)) return false;
  if (!obj.choices.every((c: unknown) => isChoiceDefinition(c))) return false;

  if (!Array.isArray(obj.dependencies)) return false;
  if (!obj.dependencies.every((d: unknown) => isEntityId(d))) return false;

  if (!isEquipmentCategory(obj.category)) return false;

  if (obj.rarity !== undefined && !isEquipmentRarity(obj.rarity)) return false;

  if (obj.cost !== undefined && !isItemCost(obj.cost)) return false;

  if (obj.weight !== undefined) {
    if (typeof obj.weight !== "number" || !Number.isFinite(obj.weight)) return false;
    if (obj.weight < 0) return false;
  }

  if (obj.bodySlot !== undefined && !isEquipmentBodySlot(obj.bodySlot)) return false;

  if (!Array.isArray(obj.properties)) return false;
  if (!obj.properties.every((p: unknown) => typeof p === "string")) return false;

  if (typeof obj.requiresAttunement !== "boolean") return false;
  if (!Array.isArray(obj.equipmentGroups) || !obj.equipmentGroups.every(isEquipmentGroup)) return false;

  if (obj.weaponCategory !== undefined && !isWeaponCategory(obj.weaponCategory)) return false;
  if (!Array.isArray(obj.proficiencyGroups) || !obj.proficiencyGroups.every(isProficiencyGroup)) return false;

  return true;
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createItemCost(amount: number, unit: string): ItemCost {
  return { amount, unit };
}

export function createItemRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  category: EquipmentCategory,
  properties: string[],
  requiresAttunement: boolean,
  content: RenderNode[],
  prerequisites: RulePrerequisite[],
  effects: RuleEffect[],
  choices: ChoiceDefinition[],
  dependencies: EntityId[],
  legacy: boolean,
  page?: number,
  summary?: string,
  rarity?: EquipmentRarity,
  cost?: ItemCost,
  weight?: number,
  bodySlot?: EquipmentBodySlot,
  equipmentGroups: EquipmentGroup[] = [],
  weaponCategory?: WeaponCategory,
  proficiencyGroups: ProficiencyGroup[] = [],
): ItemRule {
  return {
    id,
    kind: "item",
    name,
    sourceId,
    ruleset,
    access,
    page,
    legacy,
    summary,
    content: [...content],
    prerequisites: [...prerequisites],
    effects: [...effects],
    choices: [...choices],
    dependencies: [...dependencies],
    category,
    rarity,
    cost,
    weight,
    bodySlot,
    properties: [...properties],
    requiresAttunement,
    equipmentGroups: [...equipmentGroups],
    weaponCategory,
    proficiencyGroups: [...proficiencyGroups],
  };
}

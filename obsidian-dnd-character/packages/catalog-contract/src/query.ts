import type { EntityId, SourceId, RuleEntityKind, ContentAccess } from "@obsidian-dnd/domain";
import {
  isEntityId,
  isSourceId,
  isRuleEntityKind,
  isContentAccess,
} from "@obsidian-dnd/domain";

/* ── Query enums ───────────────────────────────────────────────── */

export type SpellAcquisitionMode = "known" | "prepared" | "always-prepared" | "ritual";

export const SPELL_ACQUISITION_MODES: ReadonlyArray<SpellAcquisitionMode> = [
  "known",
  "prepared",
  "always-prepared",
  "ritual",
];

export function isSpellAcquisitionMode(value: unknown): value is SpellAcquisitionMode {
  return SPELL_ACQUISITION_MODES.includes(value as SpellAcquisitionMode);
}

export type ProficiencyQueryKind = "tool" | "skill" | "saving-throw" | "armor";

export const PROFICIENCY_QUERY_KINDS: ReadonlyArray<ProficiencyQueryKind> = [
  "tool",
  "skill",
  "saving-throw",
  "armor",
];

export function isProficiencyQueryKind(value: unknown): value is ProficiencyQueryKind {
  return PROFICIENCY_QUERY_KINDS.includes(value as ProficiencyQueryKind);
}

export type EquipmentCategory = "weapon" | "armor" | "adventuring-gear" | "consumable" | "service" | "other";

export const EQUIPMENT_CATEGORIES: ReadonlyArray<EquipmentCategory> = [
  "weapon",
  "armor",
  "adventuring-gear",
  "consumable",
  "service",
  "other",
];

export function isEquipmentCategory(value: unknown): value is EquipmentCategory {
  return EQUIPMENT_CATEGORIES.includes(value as EquipmentCategory);
}

export type EquipmentRarity = "common" | "uncommon" | "rare" | "very-rare" | "legendary" | "artifact";

export const EQUIPMENT_RARITIES: ReadonlyArray<EquipmentRarity> = [
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
];

export function isEquipmentRarity(value: unknown): value is EquipmentRarity {
  return EQUIPMENT_RARITIES.includes(value as EquipmentRarity);
}

export type EquipmentBodySlot =
  | "amulet"
  | "armor"
  | "belt"
  | "boots"
  | "cloak"
  | "eyes"
  | "head"
  | "hands"
  | "ring"
  | "shield"
  | "weapon"
  | "wings"
  | "wrist";

export const EQUIPMENT_BODY_SLOTS: ReadonlyArray<EquipmentBodySlot> = [
  "amulet",
  "armor",
  "belt",
  "boots",
  "cloak",
  "eyes",
  "head",
  "hands",
  "ring",
  "shield",
  "weapon",
  "wings",
  "wrist",
];

export function isEquipmentBodySlot(value: unknown): value is EquipmentBodySlot {
  return EQUIPMENT_BODY_SLOTS.includes(value as EquipmentBodySlot);
}

/* ── Catalog queries ─────────────────────────────────────────────
   Discriminated union of query types used by choice definitions
   to filter candidate entities. Each query is evaluated against
   a QueryContext containing ruleset, source policy, and flags.   */

export type CatalogQuery =
  | EntityQuery
  | SpellQuery
  | ProficiencyQuery
  | EquipmentQuery;

export interface EntityQuery {
  type: "entity";
  kind: RuleEntityKind;
  sourceId?: SourceId;
  access?: ContentAccess;
  tags?: string[];
  excludeLegacy?: boolean;
}

export interface SpellQuery {
  type: "spell";
  classId?: EntityId;
  subclassId?: EntityId;
  maxSpellLevel?: number;
  acquisitionMode?: SpellAcquisitionMode;
  excludeKnown?: EntityId[];
}

export interface ProficiencyQuery {
  type: "proficiency";
  kind: ProficiencyQueryKind;
}

export interface EquipmentQuery {
  type: "equipment";
  category?: EquipmentCategory;
  rarity?: EquipmentRarity;
  bodySlot?: EquipmentBodySlot;
  sourceId?: SourceId;
  access?: ContentAccess;
}

/* ── Validator ─────────────────────────────────────────────────── */

export function isCatalogQuery(value: unknown): value is CatalogQuery {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "entity": {
      if (!isRuleEntityKind(obj.kind)) return false;
      if (obj.sourceId !== undefined && !isSourceId(obj.sourceId)) return false;
      if (obj.access !== undefined && !isContentAccess(obj.access)) return false;
      if (obj.tags !== undefined) {
        if (!Array.isArray(obj.tags)) return false;
        if (!obj.tags.every((t: unknown) => typeof t === "string")) return false;
      }
      if (obj.excludeLegacy !== undefined && typeof obj.excludeLegacy !== "boolean") return false;
      return true;
    }
    case "spell": {
      if (obj.classId !== undefined && !isEntityId(obj.classId)) return false;
      if (obj.subclassId !== undefined && !isEntityId(obj.subclassId)) return false;
      if (obj.maxSpellLevel !== undefined) {
        if (typeof obj.maxSpellLevel !== "number") return false;
        if (!Number.isFinite(obj.maxSpellLevel)) return false;
        if (obj.maxSpellLevel < 0) return false;
      }
      if (obj.acquisitionMode !== undefined && !isSpellAcquisitionMode(obj.acquisitionMode)) return false;
      if (obj.excludeKnown !== undefined) {
        if (!Array.isArray(obj.excludeKnown)) return false;
        if (!obj.excludeKnown.every((id: unknown) => isEntityId(id))) return false;
      }
      return true;
    }
    case "proficiency": {
      if (!isProficiencyQueryKind(obj.kind)) return false;
      return true;
    }
    case "equipment": {
      if (obj.category !== undefined && !isEquipmentCategory(obj.category)) return false;
      if (obj.rarity !== undefined && !isEquipmentRarity(obj.rarity)) return false;
      if (obj.bodySlot !== undefined && !isEquipmentBodySlot(obj.bodySlot)) return false;
      if (obj.sourceId !== undefined && !isSourceId(obj.sourceId)) return false;
      if (obj.access !== undefined && !isContentAccess(obj.access)) return false;
      return true;
    }
    default: {
      return false;
    }
  }
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createEntityQuery(
  kind: RuleEntityKind,
  options?: {
    sourceId?: SourceId;
    access?: ContentAccess;
    tags?: string[];
    excludeLegacy?: boolean;
  },
): EntityQuery {
  return {
    type: "entity",
    kind,
    sourceId: options?.sourceId,
    access: options?.access,
    tags: options?.tags ? [...options.tags] : undefined,
    excludeLegacy: options?.excludeLegacy,
  };
}

export function createSpellQuery(
  options?: {
    classId?: EntityId;
    subclassId?: EntityId;
    maxSpellLevel?: number;
    acquisitionMode?: SpellAcquisitionMode;
    excludeKnown?: EntityId[];
  },
): SpellQuery {
  return {
    type: "spell",
    classId: options?.classId,
    subclassId: options?.subclassId,
    maxSpellLevel: options?.maxSpellLevel,
    acquisitionMode: options?.acquisitionMode,
    excludeKnown: options?.excludeKnown ? [...options.excludeKnown] : undefined,
  };
}

export function createProficiencyQuery(kind: ProficiencyQueryKind): ProficiencyQuery {
  return { type: "proficiency", kind };
}

export function createEquipmentQuery(
  options?: {
    category?: EquipmentCategory;
    rarity?: EquipmentRarity;
    bodySlot?: EquipmentBodySlot;
    sourceId?: SourceId;
    access?: ContentAccess;
  },
): EquipmentQuery {
  return {
    type: "equipment",
    category: options?.category,
    rarity: options?.rarity,
    bodySlot: options?.bodySlot,
    sourceId: options?.sourceId,
    access: options?.access,
  };
}

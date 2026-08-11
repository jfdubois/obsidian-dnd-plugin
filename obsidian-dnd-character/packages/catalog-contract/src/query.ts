import type { EntityId, SourceId, RuleEntityKind, ContentAccess, ProficiencyGroup } from "@obsidian-dnd/domain";
import {
  isEntityId,
  isSourceId,
  isRuleEntityKind,
  isContentAccess,
  isProficiencyGroup,
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

export type EquipmentGroup =
  | "artisan-tool"
  | "musical-instrument"
  | "gaming-set"
  | "simple-weapon"
  | "simple-melee-weapon"
  | "martial-weapon"
  | "martial-melee-weapon"
  | "arcane-spellcasting-focus"
  | "holy-spellcasting-focus"
  | "druidic-spellcasting-focus";

export const EQUIPMENT_GROUPS: readonly EquipmentGroup[] = [
  "artisan-tool", "musical-instrument", "gaming-set", "simple-weapon", "simple-melee-weapon",
  "martial-weapon", "martial-melee-weapon", "arcane-spellcasting-focus", "holy-spellcasting-focus",
  "druidic-spellcasting-focus",
];

export function isEquipmentGroup(value: unknown): value is EquipmentGroup {
  return EQUIPMENT_GROUPS.includes(value as EquipmentGroup);
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

export type ProficiencyQueryConstraint =
  | { type: "exact-eligible-ids"; eligibleIds: EntityId[] }
  | { type: "proficiency-groups"; groups: ProficiencyGroup[] };

export interface ProficiencyQuery {
  type: "proficiency";
  kind: ProficiencyQueryKind;
  constraint?: ProficiencyQueryConstraint;
}

export interface EquipmentQuery {
  type: "equipment";
  category?: EquipmentCategory;
  rarity?: EquipmentRarity;
  bodySlot?: EquipmentBodySlot;
  sourceId?: SourceId;
  access?: ContentAccess;
  equipmentGroups?: EquipmentGroup[];
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
      if (obj.constraint !== undefined) {
        const c = obj.constraint as Record<string, unknown>;
        const cType = c.type;
        if (typeof cType !== "string") return false;
        if (cType === "exact-eligible-ids") {
          if (!Array.isArray(c.eligibleIds) || c.eligibleIds.length === 0) return false;
          if (!c.eligibleIds.every((id: unknown) => isEntityId(id))) return false;
          // Reject duplicates
          if (new Set(c.eligibleIds).size !== c.eligibleIds.length) return false;
        } else if (cType === "proficiency-groups") {
          if (!Array.isArray(c.groups) || c.groups.length === 0) return false;
          if (!c.groups.every((g: unknown) => isProficiencyGroup(g))) return false;
          // Reject duplicates
          if (new Set(c.groups).size !== c.groups.length) return false;
        } else {
          return false;
        }
      }
      return true;
    }
    case "equipment": {
      if (obj.category !== undefined && !isEquipmentCategory(obj.category)) return false;
      if (obj.rarity !== undefined && !isEquipmentRarity(obj.rarity)) return false;
      if (obj.bodySlot !== undefined && !isEquipmentBodySlot(obj.bodySlot)) return false;
      if (obj.sourceId !== undefined && !isSourceId(obj.sourceId)) return false;
      if (obj.access !== undefined && !isContentAccess(obj.access)) return false;
      if (obj.equipmentGroups !== undefined && (!Array.isArray(obj.equipmentGroups)
        || obj.equipmentGroups.length === 0 || !obj.equipmentGroups.every(isEquipmentGroup))) return false;
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

export function createProficiencyQuery(
  kind: ProficiencyQueryKind,
  constraint?: ProficiencyQueryConstraint,
): ProficiencyQuery {
  return { type: "proficiency", kind, constraint };
}

export function createEquipmentQuery(
  options?: {
    category?: EquipmentCategory;
    rarity?: EquipmentRarity;
    bodySlot?: EquipmentBodySlot;
    sourceId?: SourceId;
    access?: ContentAccess;
    equipmentGroups?: EquipmentGroup[];
  },
): EquipmentQuery {
  return {
    type: "equipment",
    category: options?.category,
    rarity: options?.rarity,
    bodySlot: options?.bodySlot,
    sourceId: options?.sourceId,
    access: options?.access,
    equipmentGroups: options?.equipmentGroups ? [...options.equipmentGroups] : undefined,
  };
}

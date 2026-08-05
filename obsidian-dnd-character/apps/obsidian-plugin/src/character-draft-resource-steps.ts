/* ── Character draft: resource step data ─────────────────────────
   Covers: abilities, proficiencies, languages, equipment,
   spell-eligibility, spells.                                    */

import type { Ability, EntityId } from "@obsidian-dnd/domain";
import { isAbility, isEntityId } from "@obsidian-dnd/domain";
import type {
  InventoryItemInstance,
  CharacterSpellSelection,
  SpellAcquisition,
} from "@obsidian-dnd/character-contract";
import { isInventoryItemInstance } from "@obsidian-dnd/character-contract";

/* ── Ability score step ────────────────────────────────────────── */

export type AbilityScoreMethod = "standard-array" | "point-buy" | "rolling" | "custom";

export const ABILITY_SCORE_METHODS: ReadonlyArray<AbilityScoreMethod> = [
  "standard-array",
  "point-buy",
  "rolling",
  "custom",
];

export function isAbilityScoreMethod(value: unknown): value is AbilityScoreMethod {
  return ABILITY_SCORE_METHODS.includes(value as AbilityScoreMethod);
}

export interface DraftAbilityData {
  method: AbilityScoreMethod | null;
  scores?: Record<Ability, number>;
  rollResults?: Record<Ability, number[]>;
}

export function isDraftAbilityData(value: unknown): value is DraftAbilityData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.method !== null && !isAbilityScoreMethod(obj.method)) return false;

  if (obj.scores !== undefined) {
    if (typeof obj.scores !== "object" || obj.scores === null || Array.isArray(obj.scores)) {
      return false;
    }
    for (const [key, val] of Object.entries(obj.scores)) {
      if (!isAbility(key)) return false;
      if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 30) return false;
    }
  }

  if (obj.rollResults !== undefined) {
    if (typeof obj.rollResults !== "object" || obj.rollResults === null || Array.isArray(obj.rollResults)) {
      return false;
    }
    for (const [key, val] of Object.entries(obj.rollResults)) {
      if (!isAbility(key)) return false;
      if (!Array.isArray(val)) return false;
      if (!val.every((r: unknown) => typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 20)) {
        return false;
      }
    }
  }

  return true;
}

export function createEmptyDraftAbilityData(): DraftAbilityData {
  return { method: null };
}

/* ── Proficiency step ──────────────────────────────────────────── */

export interface DraftProficiencyData {
  skillProficiencies: EntityId[];
  toolProficiencies: EntityId[];
}

export function isDraftProficiencyData(value: unknown): value is DraftProficiencyData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.skillProficiencies)) return false;
  if (!obj.skillProficiencies.every((id) => isEntityId(id))) return false;
  if (!Array.isArray(obj.toolProficiencies)) return false;
  if (!obj.toolProficiencies.every((id) => isEntityId(id))) return false;
  return true;
}

export function createEmptyDraftProficiencyData(): DraftProficiencyData {
  return { skillProficiencies: [], toolProficiencies: [] };
}

/* ── Language step ─────────────────────────────────────────────── */

export interface DraftLanguageData {
  languageIds: EntityId[];
}

export function isDraftLanguageData(value: unknown): value is DraftLanguageData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.languageIds)) return false;
  if (!obj.languageIds.every((id) => isEntityId(id))) return false;
  return true;
}

export function createEmptyDraftLanguageData(): DraftLanguageData {
  return { languageIds: [] };
}

/* ── Equipment step ────────────────────────────────────────────── */

export interface DraftEquipmentData {
  items: InventoryItemInstance[];
}

export function isDraftEquipmentData(value: unknown): value is DraftEquipmentData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return false;
  if (!obj.items.every((item) => isInventoryItemInstance(item))) return false;
  return true;
}

export function createEmptyDraftEquipmentData(): DraftEquipmentData {
  return { items: [] };
}

/* ── Spell eligibility step ────────────────────────────────────── */

export interface DraftSpellEligibilityData {
  isSpellcaster: boolean;
  spellcastingAbility?: Ability;
}

export function isDraftSpellEligibilityData(value: unknown): value is DraftSpellEligibilityData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.isSpellcaster !== "boolean") return false;
  if (obj.spellcastingAbility !== undefined && !isAbility(obj.spellcastingAbility)) return false;
  return true;
}

export function createEmptyDraftSpellEligibilityData(): DraftSpellEligibilityData {
  return { isSpellcaster: false };
}

/* ── Spell selection step ──────────────────────────────────────── */

export interface DraftSpellData {
  selections: CharacterSpellSelection[];
}

const SPELL_ACQUISITION_VALUES: ReadonlyArray<SpellAcquisition> = [
  "known",
  "prepared",
  "always-prepared",
  "species",
  "background",
  "feat",
  "item",
];

function isSpellAcquisition(value: unknown): value is SpellAcquisition {
  return SPELL_ACQUISITION_VALUES.includes(value as SpellAcquisition);
}

function isCharacterSpellSelection(value: unknown): value is CharacterSpellSelection {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isEntityId(obj.spellId)) return false;
  if (obj.classInstanceId !== undefined && typeof obj.classInstanceId !== "string") return false;
  if (obj.originGrantId !== undefined && !isEntityId(obj.originGrantId)) return false;
  if (!isSpellAcquisition(obj.acquisition)) return false;
  return true;
}

export function isDraftSpellData(value: unknown): value is DraftSpellData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.selections)) return false;
  if (!obj.selections.every((s) => isCharacterSpellSelection(s))) return false;
  return true;
}

export function createEmptyDraftSpellData(): DraftSpellData {
  return { selections: [] };
}

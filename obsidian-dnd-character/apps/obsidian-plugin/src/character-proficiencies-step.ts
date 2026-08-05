/* ── Proficiencies and languages step ────────────────────────────
   Step 7 of character creation: select skill proficiencies, tool
   proficiencies, and languages. Pure TypeScript logic — no Obsidian
   UI.                                                              */

import type { EntityId } from "@obsidian-dnd/domain";
import { isEntityId } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";

/* ── Proficiency validation ────────────────────────────────────── */

/**
 * Validates that the given value is a valid proficiencies record.
 * Must be a non-null, non-array object with:
 * - skillProficiencies: array of EntityIds
 * - toolProficiencies: array of EntityIds
 */
export function validateProficiencies(
  value: unknown,
): value is { skillProficiencies: EntityId[]; toolProficiencies: EntityId[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.skillProficiencies)) return false;
  if (!obj.skillProficiencies.every((id) => isEntityId(id))) return false;
  if (!Array.isArray(obj.toolProficiencies)) return false;
  if (!obj.toolProficiencies.every((id) => isEntityId(id))) return false;
  return true;
}

/* ── Language validation ───────────────────────────────────────── */

/**
 * Validates that the given value is a valid languages record.
 * Must be a non-null, non-array object with:
 * - languageIds: array of EntityIds
 */
export function validateLanguages(
  value: unknown,
): value is { languageIds: EntityId[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.languageIds)) return false;
  if (!obj.languageIds.every((id) => isEntityId(id))) return false;
  return true;
}

/* ── Proficiency selection ─────────────────────────────────────── */

/**
 * Sets the proficiencies on the draft. Validates that:
 * - The species step has been resolved first
 * - The background step has been resolved first
 * - The class step has been resolved first
 * - The abilities step has been resolved first
 * - The proficiencies data has valid skill and tool proficiency arrays
 *
 * Sets the draft.proficiencies with the validated selection,
 * marks the proficiencies draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Returns true if the proficiencies were accepted and applied,
 * false if validation failed.
 */
export function selectProficiencies(
  draft: CharacterDraft,
  proficiencies: unknown,
): boolean {
  // Proficiencies depend on species being resolved first
  if (getStepState(draft, "species") !== "resolved") {
    return false;
  }

  // Proficiencies depend on background being resolved first
  if (getStepState(draft, "background") !== "resolved") {
    return false;
  }

  // Proficiencies depend on class being resolved first
  if (getStepState(draft, "class") !== "resolved") {
    return false;
  }

  // Proficiencies depend on abilities being resolved first
  if (getStepState(draft, "abilities") !== "resolved") {
    return false;
  }

  if (!validateProficiencies(proficiencies)) {
    return false;
  }

  draft.proficiencies.skillProficiencies = [...proficiencies.skillProficiencies];
  draft.proficiencies.toolProficiencies = [...proficiencies.toolProficiencies];
  markStepResolved(draft, "proficiencies");
  invalidateDependentSteps(draft, "proficiencies");
  return true;
}

/* ── Language selection ────────────────────────────────────────── */

/**
 * Sets the languages on the draft. Validates that:
 * - The species step has been resolved first
 * - The background step has been resolved first
 * - The class step has been resolved first
 * - The language data has a valid languageIds array
 *
 * Sets the draft.languages with the validated selection,
 * marks the languages draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Returns true if the languages were accepted and applied,
 * false if validation failed.
 */
export function selectLanguages(
  draft: CharacterDraft,
  languages: unknown,
): boolean {
  // Languages depend on species being resolved first
  if (getStepState(draft, "species") !== "resolved") {
    return false;
  }

  // Languages depend on background being resolved first
  if (getStepState(draft, "background") !== "resolved") {
    return false;
  }

  // Languages depend on class being resolved first
  if (getStepState(draft, "class") !== "resolved") {
    return false;
  }

  if (!validateLanguages(languages)) {
    return false;
  }

  draft.languages.languageIds = [...languages.languageIds];
  markStepResolved(draft, "languages");
  invalidateDependentSteps(draft, "languages");
  return true;
}

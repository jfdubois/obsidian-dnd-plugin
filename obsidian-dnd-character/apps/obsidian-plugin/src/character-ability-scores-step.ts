/* ── Ability scores step: sixth step of character creation ───────
   Allows the user to assign ability scores (STR, DEX, CON, INT,
   WIS, CHA) to the character. Pure TypeScript logic — no Obsidian
   UI.                                                              */

import type { Ability } from "@obsidian-dnd/domain";
import { ABILITIES, isAbility } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validates that the given value is a valid ability scores record.
 * The value must be a non-null, non-array object whose keys are all
 * valid Ability values (STR, DEX, CON, INT, WIS, CHA) and whose
 * values are all integer scores between 1 and 30 inclusive.
 * All six abilities must be present.
 */
export function validateAbilityScores(
  value: unknown,
): value is Record<Ability, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value);

  // Must have exactly 6 abilities
  if (entries.length !== ABILITIES.length) {
    return false;
  }

  for (const [key, val] of entries) {
    if (!isAbility(key)) return false;
    if (typeof val !== "number") return false;
    if (!Number.isInteger(val)) return false;
    if (val < 1 || val > 30) return false;
  }

  // Ensure all six abilities are present (no duplicates)
  const keys = new Set(Object.keys(value));
  for (const ability of ABILITIES) {
    if (!keys.has(ability)) return false;
  }

  return true;
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Sets the ability scores on the draft. Validates that:
 * - The ruleset step has been resolved first (abilities depends on ruleset)
 * - The species step has been resolved first (abilities depends on species)
 * - All six ability scores are valid (1-30, integer)
 *
 * Sets the draft.abilities.scores with the validated selection,
 * marks the abilities draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Returns true if the scores were accepted and applied,
 * false if validation failed.
 */
export function selectAbilityScores(
  draft: CharacterDraft,
  scores: unknown,
): boolean {
  // Abilities step depends on ruleset being resolved first
  if (getStepState(draft, "ruleset") !== "resolved") {
    return false;
  }

  // Abilities step depends on species being resolved first
  if (getStepState(draft, "species") !== "resolved") {
    return false;
  }

  if (!validateAbilityScores(scores)) {
    return false;
  }

  draft.abilities.scores = { ...scores };
  markStepResolved(draft, "abilities");
  invalidateDependentSteps(draft, "abilities");
  return true;
}

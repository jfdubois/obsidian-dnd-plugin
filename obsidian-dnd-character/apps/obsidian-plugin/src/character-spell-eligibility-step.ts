/* ── Spell eligibility step ──────────────────────────────────────
   Determines whether the character is a spellcaster based on class
   and species, and identifies the spellcasting ability score.
   Pure TypeScript logic — no Obsidian UI.                          */

import type { DraftSpellEligibilityData } from "./character-draft-steps";
import { isDraftSpellEligibilityData } from "./character-draft-steps";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validates that the given value is a valid spell eligibility result.
 * Delegates to the shared DraftSpellEligibilityData validator.
 */
function validateSpellEligibility(
  value: unknown,
): value is DraftSpellEligibilityData {
  return isDraftSpellEligibilityData(value);
}

/* ── Spell eligibility query ───────────────────────────────────── */

/**
 * Queries and sets the spell eligibility on the draft. Validates that:
 * - The class step has been resolved first (spell eligibility depends on class)
 * - The species step has been resolved first (spell eligibility depends on species)
 * - The eligibility data is a valid DraftSpellEligibilityData record
 *
 * Sets the draft.spellEligibility with the validated data,
 * marks the spell-eligibility draft step as resolved, and invalidates
 * all downstream dependent steps (spells).
 *
 * Returns true if the eligibility was accepted and applied,
 * false if validation failed.
 */
export function querySpellEligibility(
  draft: CharacterDraft,
  eligibility: unknown,
): boolean {
  // Spell eligibility depends on class being resolved first
  if (getStepState(draft, "class") !== "resolved") {
    return false;
  }

  // Spell eligibility depends on species being resolved first
  if (getStepState(draft, "species") !== "resolved") {
    return false;
  }

  if (!validateSpellEligibility(eligibility)) {
    return false;
  }

  draft.spellEligibility.isSpellcaster = eligibility.isSpellcaster;
  if (eligibility.spellcastingAbility !== undefined) {
    draft.spellEligibility.spellcastingAbility = eligibility.spellcastingAbility;
  } else {
    draft.spellEligibility.spellcastingAbility = undefined;
  }
  markStepResolved(draft, "spell-eligibility");
  invalidateDependentSteps(draft, "spell-eligibility");
  return true;
}

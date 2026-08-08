/* ── Species choices step: fifth step of character creation ──────
   Allows the user to select species traits, features, and abilities
   (e.g., Darkvision, Fey Ancestry) granted by the chosen species.
   Pure TypeScript logic — no Obsidian UI.                        */

import type { ChoiceInstanceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { isCharacterChoice } from "@obsidian-dnd/character-contract";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validates that the given value is a valid species choices record.
 * The value must be a non-null object with a `choices` property that
 * is a non-null, non-array object whose values are all valid
 * CharacterChoice records.
 */
export function validateSpeciesChoices(
  value: unknown,
): value is Record<ChoiceInstanceId, CharacterChoice> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  for (const [, val] of Object.entries(value)) {
    if (!isCharacterChoice(val)) return false;
  }
  return true;
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Sets the species choices on the draft. Validates that:
 * - The species step has been resolved first (species-choices depends on species)
 * - All choice values are valid CharacterChoice records
 *
 * Sets the draft.speciesChoices.choices with the validated selection,
 * marks the species-choices draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Note: This function only resolves the "species-choices" draft step.
 * The "species" draft step is resolved separately by the species step
 * (P10-T006).
 *
 * Returns true if the choices were accepted and applied,
 * false if validation failed.
 */
export function selectSpeciesChoices(
  draft: CharacterDraft,
  choices: unknown,
): boolean {
  // Species choices step depends on species being resolved first
  if (getStepState(draft, "species") !== "resolved") {
    return false;
  }

  if (!validateSpeciesChoices(choices)) {
    return false;
  }

  // Guard against infinite rerender loop: if the species-choices step is
  // already resolved and the caller passes an empty choices record (zero-choice
  // auto-resolve), do NOT re-resolve. This prevents the cycle:
  // renderSpeciesChoices() -> zero choices -> onChoicesResolved({}) ->
  // selectSpeciesChoices() returns true -> renderCurrentStep() ->
  // renderSpeciesChoices() -> repeat forever.
  if (getStepState(draft, "species-choices") === "resolved" &&
      Object.keys(choices).length === 0) {
    return false;
  }

  draft.speciesChoices.choices = { ...choices };
  markStepResolved(draft, "species-choices");
  invalidateDependentSteps(draft, "species-choices");
  return true;
}

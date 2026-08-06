/* ── Proficiency & Language choices steps ────────────────────────
    Allows the user to select proficiency and language choices
    granted by species, background, and class options.
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
 * Validates that the given value is a valid choices record.
 * The value must be a non-null object with values that are all
 * valid CharacterChoice records.
 */
function validateChoices(
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

/* ── Proficiency choices selection ─────────────────────────────── */

/**
 * Sets the proficiency choices on the draft. Validates that:
 * - The species-choices, background-choices, and class steps are resolved
 * - All choice values are valid CharacterChoice records
 *
 * Sets the draft.proficiencyChoices.choices with the validated selection,
 * marks the proficiency-choices draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Returns true if the choices were accepted and applied,
 * false if validation failed.
 */
export function selectProficiencyChoices(
  draft: CharacterDraft,
  choices: unknown,
): boolean {
  // Proficiency choices depend on species-choices, background-choices, class
  if (getStepState(draft, "species-choices") !== "resolved") {
    return false;
  }
  if (getStepState(draft, "background-choices") !== "resolved") {
    return false;
  }
  if (getStepState(draft, "class") !== "resolved") {
    return false;
  }

  if (!validateChoices(choices)) {
    return false;
  }

  draft.proficiencyChoices.choices = { ...choices };
  markStepResolved(draft, "proficiency-choices");
  invalidateDependentSteps(draft, "proficiency-choices");
  return true;
}

/* ── Language choices selection ────────────────────────────────── */

/**
 * Sets the language choices on the draft. Validates that:
 * - The species-choices, background-choices, and class steps are resolved
 * - All choice values are valid CharacterChoice records
 *
 * Sets the draft.languageChoices.choices with the validated selection,
 * marks the language-choices draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Returns true if the choices were accepted and applied,
 * false if validation failed.
 */
export function selectLanguageChoices(
  draft: CharacterDraft,
  choices: unknown,
): boolean {
  // Language choices depend on species-choices, background-choices, class
  if (getStepState(draft, "species-choices") !== "resolved") {
    return false;
  }
  if (getStepState(draft, "background-choices") !== "resolved") {
    return false;
  }
  if (getStepState(draft, "class") !== "resolved") {
    return false;
  }

  if (!validateChoices(choices)) {
    return false;
  }

  draft.languageChoices.choices = { ...choices };
  markStepResolved(draft, "language-choices");
  invalidateDependentSteps(draft, "language-choices");
  return true;
}

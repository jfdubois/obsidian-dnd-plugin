/* ── Equipment choices step ──────────────────────────────────────
   Allows the user to select starting equipment choices granted by
   background and class options (weapons, armor, tools, loot packages).
   Pure TypeScript logic — no Obsidian UI.                          */

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
 * Validates that the given value is a valid equipment choices record.
 * The value must be a non-null object with values that are all
 * valid CharacterChoice records.
 */
function validateEquipmentChoices(
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

/* ── Equipment choices selection ───────────────────────────────── */

/**
 * Sets the equipment choices on the draft. Validates that:
 * - The background-choices and class steps are resolved
 * - All choice values are valid CharacterChoice records
 *
 * Sets the draft.equipmentChoices.choices with the validated selection,
 * marks the equipment-choices draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Returns true if the choices were accepted and applied,
 * false if validation failed.
 */
export function selectEquipmentChoices(
  draft: CharacterDraft,
  choices: unknown,
): boolean {
  // Equipment choices depend on background-choices and class
  if (getStepState(draft, "background-choices") !== "resolved") {
    return false;
  }
  if (getStepState(draft, "class") !== "resolved") {
    return false;
  }

  if (!validateEquipmentChoices(choices)) {
    return false;
  }

  draft.equipmentChoices.choices = { ...choices };
  markStepResolved(draft, "equipment-choices");
  invalidateDependentSteps(draft, "equipment-choices");
  return true;
}

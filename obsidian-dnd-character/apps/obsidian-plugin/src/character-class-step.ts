/* ── Class step: sixth step of character creation ────────────────
   Allows the user to select a class for the character.
   Filters options by ruleset and character source policy.
   Pure TypeScript logic — no Obsidian UI.                        */

import type { EntityId } from "@obsidian-dnd/domain";
import { isEntityId } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validates that the given value is a valid EntityId for class
 * selection. The value must be a non-empty branded string.
 */
export function validateClassSelection(
  value: unknown,
): value is EntityId {
  return isEntityId(value);
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Selects a class on the draft. Validates that:
 * - The ruleset step has been resolved first (class depends on ruleset)
 * - The sources step has been resolved first (class depends on sources)
 * - The class ID is a valid EntityId
 *
 * Sets the draft.class.classId with the validated selection,
 * marks the class draft step as resolved, and invalidates all
 * downstream dependent steps (class-starting-grants, etc.).
 *
 * Note: This function only resolves the "class" draft step.
 * The "class-starting-grants" draft step is resolved separately by
 * the class starting grants step.
 *
 * Returns true if the class was accepted and applied,
 * false if validation failed.
 */
export function selectClass(
  draft: CharacterDraft,
  classId: unknown,
): boolean {
  // Class step depends on ruleset being resolved first
  if (getStepState(draft, "ruleset") !== "resolved") {
    return false;
  }

  // Class step depends on sources being resolved first
  if (getStepState(draft, "sources") !== "resolved") {
    return false;
  }

  if (!validateClassSelection(classId)) {
    return false;
  }

  draft.class.classId = classId;
  markStepResolved(draft, "class");
  invalidateDependentSteps(draft, "class");
  return true;
}

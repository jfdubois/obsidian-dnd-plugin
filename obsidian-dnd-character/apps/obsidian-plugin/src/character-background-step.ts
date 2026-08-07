/* ── Background step: fifth step of character creation ───────────
   Allows the user to select a background for the character.
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
 * Validates that the given value is a valid EntityId for background
 * selection. The value must be a non-empty branded string.
 */
export function validateBackgroundSelection(
  value: unknown,
): value is EntityId {
  return isEntityId(value);
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Selects a background on the draft. Validates that:
 * - The ruleset step has been resolved first (background depends on ruleset)
 * - The sources step has been resolved first (background depends on sources)
 * - The background ID is a valid EntityId
 *
 * Sets the draft.background.backgroundId with the validated selection,
 * marks the background draft step as resolved, and invalidates all
 * downstream dependent steps (background-choices, etc.).
 *
 * Note: This function only resolves the "background" draft step.
 * The "background-choices" draft step is resolved separately by
 * the background choices step.
 *
 * Returns true if the background was accepted and applied,
 * false if validation failed.
 */
export function selectBackground(
  draft: CharacterDraft,
  backgroundId: unknown,
): boolean {
  // Background step depends on ruleset being resolved first
  if (getStepState(draft, "ruleset") !== "resolved") {
    return false;
  }

  // Background step depends on sources being resolved first
  if (getStepState(draft, "sources") !== "resolved") {
    return false;
  }

  if (!validateBackgroundSelection(backgroundId)) {
    return false;
  }

  draft.background.backgroundId = backgroundId;
  markStepResolved(draft, "background");
  invalidateDependentSteps(draft, "background");
  return true;
}

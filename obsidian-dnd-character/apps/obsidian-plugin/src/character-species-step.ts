/* ── Species step: fourth step of character creation ─────────────
   Allows the user to select a species (race) for the character.
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
 * Validates that the given value is a valid EntityId for species
 * selection. The value must be a non-empty branded string.
 */
export function validateSpeciesSelection(
  value: unknown,
): value is EntityId {
  return isEntityId(value);
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Selects a species on the draft. Validates that:
 * - The ruleset step has been resolved first (species depends on ruleset)
 * - The sources step has been resolved first (species depends on sources)
 * - The species ID is a valid EntityId
 *
 * Sets the draft.species.speciesId with the validated selection,
 * marks the species draft step as resolved, and invalidates all
 * downstream dependent steps (species-choices, abilities, etc.).
 *
 * Note: This function only resolves the "species" draft step.
 * The "species-choices" draft step is resolved separately by
 * the species choices step (P10-T007).
 *
 * Returns true if the species was accepted and applied,
 * false if validation failed.
 */
export function selectSpecies(
  draft: CharacterDraft,
  speciesId: unknown,
): boolean {
  // Species step depends on ruleset being resolved first
  if (getStepState(draft, "ruleset") !== "resolved") {
    return false;
  }

  // Species step depends on sources being resolved first
  if (getStepState(draft, "sources") !== "resolved") {
    return false;
  }

  if (!validateSpeciesSelection(speciesId)) {
    return false;
  }

  draft.species.speciesId = speciesId;
  markStepResolved(draft, "species");
  invalidateDependentSteps(draft, "species");
  return true;
}

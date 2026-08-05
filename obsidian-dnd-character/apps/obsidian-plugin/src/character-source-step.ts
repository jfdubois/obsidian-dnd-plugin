/* ── Source step: second step of character creation ──────────────
   Allows the user to select optional source books for the character.
   Filters by ruleset dependency and validates source IDs.
   Pure TypeScript logic — no Obsidian UI.                        */

import type { SourceId } from "@obsidian-dnd/domain";
import { isSourceId } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validates that the given value is a valid array of source IDs.
 * Each element must be a valid SourceId (non-empty string).
 * An empty array is valid (no optional sources selected).
 */
export function validateSourceSelection(value: unknown): value is SourceId[] {
  if (!Array.isArray(value)) return false;
  return value.every((id) => isSourceId(id));
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Selects source books on the draft. Validates that:
 * - The ruleset step has been resolved first (sources depends on ruleset)
 * - All source IDs are valid SourceId values
 *
 * Sets the draft.sources.enabledSourceIds with the validated selection,
 * marks the sources step as resolved, and invalidates all downstream
 * dependent steps (species, background, class, etc.).
 *
 * Policy mode defaults to "snapshot" (enforced by the CharacterContentPolicy
 * type literal).
 *
 * Returns true if the selection was accepted and applied,
 * false if validation failed.
 */
export function selectSources(
  draft: CharacterDraft,
  sourceIds: unknown,
): boolean {
  // Sources step depends on ruleset being resolved first
  if (getStepState(draft, "ruleset") !== "resolved") {
    return false;
  }

  if (!validateSourceSelection(sourceIds)) {
    return false;
  }

  // Reject duplicate source IDs
  if (new Set(sourceIds).size !== sourceIds.length) {
    return false;
  }

  draft.sources.enabledSourceIds = [...sourceIds];
  markStepResolved(draft, "sources");
  invalidateDependentSteps(draft, "sources");
  return true;
}

/* ── Ruleset step: first step of character creation ──────────────
   Allows the user to select between the 2014 and 2024 rulesets.
   Pure TypeScript logic — no Obsidian UI.                        */

import type { Ruleset } from "@obsidian-dnd/domain";
import { RULESETS, isRuleset } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import { markStepResolved } from "./character-draft";

/* ── Available ruleset options ─────────────────────────────────── */

/** The rulesets available for character creation. */
export const RULESET_STEP_OPTIONS: ReadonlyArray<Ruleset> = RULESETS;

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validates that the given value is a supported ruleset for the
 * ruleset step. Accepts only "2014" or "2024".
 */
export function validateRulesetSelection(value: unknown): value is Ruleset {
  return isRuleset(value);
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Selects a ruleset on the draft, marking the ruleset step as
 * resolved and invalidating all downstream dependent steps.
 *
 * On first selection (previous value is null), dependents are NOT
 * invalidated since they are still unvisited. On ruleset change,
 * dependents are invalidated exactly once.
 *
 * Returns true if the ruleset was accepted and applied,
 * false if the value was rejected.
 */
export function selectRuleset(
  draft: CharacterDraft,
  ruleset: unknown,
): boolean {
  if (!validateRulesetSelection(ruleset)) {
    return false;
  }

  // Same value — no-op
  if (draft.ruleset.ruleset === ruleset) {
    return true;
  }

  const isFirstSelection = draft.ruleset.ruleset === null;

  draft.ruleset.ruleset = ruleset;

  if (isFirstSelection) {
    // First selection: mark resolved but don't invalidate unvisited dependents
    markStepResolved(draft, "ruleset", false);
  } else {
    // Changing ruleset: mark resolved and invalidate dependents (once)
    markStepResolved(draft, "ruleset", true);
  }

  return true;
}

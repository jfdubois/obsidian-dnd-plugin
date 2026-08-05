/* ── Ruleset step: first step of character creation ──────────────
   Allows the user to select between the 2014 and 2024 rulesets.
   Pure TypeScript logic — no Obsidian UI.                        */

import type { Ruleset } from "@obsidian-dnd/domain";
import { RULESETS, isRuleset } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
} from "./character-draft";

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

  draft.ruleset.ruleset = ruleset;
  markStepResolved(draft, "ruleset");
  invalidateDependentSteps(draft, "ruleset");
  return true;
}

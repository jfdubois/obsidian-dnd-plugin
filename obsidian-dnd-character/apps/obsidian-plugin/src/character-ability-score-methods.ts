/* ── Ability score methods: generation and validation ─────────────
   Implements the ability score generation/assignment methods used
   during character creation. Supports standard array, point buy,
   rolling, and custom methods with ruleset-specific validation.
   Pure TypeScript logic — no Obsidian UI.                          */

import type { Ruleset, Ability } from "@obsidian-dnd/domain";
import { ABILITIES } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import type { AbilityScoreMethod } from "./character-draft-resource-steps";
import { isAbilityScoreMethod } from "./character-draft-resource-steps";
import {
  invalidateStep,
  getStepState,
} from "./character-draft";

/* ── Ruleset-to-methods mapping ─────────────────────────────────── */

/**
 * Maps each ruleset to its available ability score generation methods.
 *
 * 2014: standard-array, point-buy (26pt), rolling, custom
 * 2024: point-buy (27pt), rolling, custom
 */
export const RULESET_ABILITY_SCORE_METHODS: ReadonlyMap<
  Ruleset,
  ReadonlyArray<AbilityScoreMethod>
> = new Map([
  ["2014", ["standard-array", "point-buy", "rolling", "custom"]],
  ["2024", ["point-buy", "rolling", "custom"]],
]);

/**
 * Returns the available ability score methods for the given ruleset.
 */
export function getAvailableAbilityScoreMethods(
  ruleset: Ruleset,
): ReadonlyArray<AbilityScoreMethod> {
  return RULESET_ABILITY_SCORE_METHODS.get(ruleset) ?? [];
}

/**
 * Returns true if the given method is available for the given ruleset.
 */
export function isMethodAvailableForRuleset(
  method: AbilityScoreMethod,
  ruleset: Ruleset,
): boolean {
  return getAvailableAbilityScoreMethods(ruleset).includes(method);
}

/* ── Method selection ───────────────────────────────────────────── */

/**
 * Selects an ability score generation method on the draft. Validates that:
 * - The ruleset step has been resolved first (method availability is ruleset-specific)
 * - The method is a valid AbilityScoreMethod value
 * - The method is available for the active ruleset
 *
 * Sets draft.abilities.method with the validated selection, clears any
 * existing scores and roll results (since the method changed), and
 * invalidates the abilities step and all downstream dependent steps.
 *
 * Returns true if the method was accepted and applied,
 * false if validation failed.
 */
export function selectAbilityScoreMethod(
  draft: CharacterDraft,
  method: unknown,
): boolean {
  // Method selection depends on ruleset being resolved first
  if (getStepState(draft, "ruleset") !== "resolved") {
    return false;
  }

  if (!isAbilityScoreMethod(method)) {
    return false;
  }

  const ruleset = draft.ruleset.ruleset;
  if (ruleset === null) {
    return false;
  }

  if (!isMethodAvailableForRuleset(method, ruleset)) {
    return false;
  }

  draft.abilities.method = method;
  // Clear existing scores when method changes
  draft.abilities.scores = undefined;
  draft.abilities.rollResults = undefined;
  // Invalidate abilities step and all downstream dependents
  invalidateStep(draft, "abilities");
  return true;
}

/* ── Standard array generation ──────────────────────────────────── */

/** The standard array values in ability order (STR, DEX, CON, INT, WIS, CHA). */
const STANDARD_ARRAY: ReadonlyArray<number> = [15, 14, 13, 12, 10, 8];

/**
 * Generates ability scores using the standard array method.
 * Assigns values in the canonical ability order:
 * STR=15, DEX=14, CON=13, INT=12, WIS=10, CHA=8.
 */
export function generateStandardArrayScores(): Record<Ability, number> {
  const scores: Record<string, number> = {};
  for (let i = 0; i < ABILITIES.length; i++) {
    scores[ABILITIES[i]!] = STANDARD_ARRAY[i]!;
  }
  return scores as Record<Ability, number>;
}

/* ── Point buy validation ───────────────────────────────────────── */

/** Point buy cost table (base score -> cost in points). */
const POINT_BUY_COST: ReadonlyMap<number, number> = new Map([
  [8, 0],
  [9, 1],
  [10, 2],
  [11, 3],
  [12, 4],
  [13, 5],
  [14, 7],
  [15, 9],
]);

/** Point buy budget per ruleset. */
const POINT_BUY_BUDGET: ReadonlyMap<Ruleset, number> = new Map([
  ["2014", 26],
  ["2024", 27],
]);

/**
 * Validates that the given scores are valid for the point buy method
 * under the specified ruleset. Checks:
 * - Each score is between 8 and 15 (before racial bonuses)
 * - Total point cost does not exceed the ruleset's budget
 *   (26 for 2014, 27 for 2024)
 */
export function validatePointBuyScores(
  scores: Record<Ability, number>,
  ruleset: Ruleset,
): boolean {
  const budget = POINT_BUY_BUDGET.get(ruleset);
  if (budget === undefined) {
    return false;
  }

  let totalCost = 0;
  for (const ability of ABILITIES) {
    const score = scores[ability];
    if (score === undefined) {
      return false;
    }
    if (score < 8 || score > 15) {
      return false;
    }
    const cost = POINT_BUY_COST.get(score);
    if (cost === undefined) {
      return false;
    }
    totalCost += cost;
  }

  return totalCost <= budget;
}

/* ── Rolling generation ─────────────────────────────────────────── */

/**
 * Result of rolling ability scores, including both the final scores
 * and the raw dice rolls for each ability.
 */
export interface RollingResult {
  scores: Record<Ability, number>;
  rollResults: Record<Ability, number[]>;
}

/**
 * Generates ability scores using the rolling method (4d6 drop lowest).
 * Returns both the final scores and the raw dice rolls for each ability.
 */
export function generateRollingScores(): RollingResult {
  const scores: Record<string, number> = {};
  const rollResults: Record<string, number[]> = {};

  for (const ability of ABILITIES) {
    const rolls = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    const sorted = [...rolls].sort((a, b) => a - b);
    rollResults[ability] = sorted;
    scores[ability] = sorted[1]! + sorted[2]! + sorted[3]!;
  }

  return {
    scores: scores as Record<Ability, number>,
    rollResults: rollResults as Record<Ability, number[]>,
  };
}

/* ── Custom scores validation ───────────────────────────────────── */

/**
 * Validates that the given scores are valid for the custom method.
 * Checks:
 * - All six abilities are present
 * - Each score is between 1 and 30 (inclusive)
 */
export function validateCustomScores(scores: Record<Ability, number>): boolean {
  for (const ability of ABILITIES) {
    const score = scores[ability];
    if (score === undefined) {
      return false;
    }
    if (typeof score !== "number") {
      return false;
    }
    if (!Number.isInteger(score)) {
      return false;
    }
    if (score < 1 || score > 30) {
      return false;
    }
  }
  return true;
}

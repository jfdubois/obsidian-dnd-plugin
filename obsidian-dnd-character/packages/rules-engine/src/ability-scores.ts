import type { Ability } from "@obsidian-dnd/domain";
import { ABILITIES } from "@obsidian-dnd/domain";
import type { Character } from "@obsidian-dnd/character-contract";
import type { AddAbilityEffect, RuleEffect } from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";

/* ── Ability score result types ────────────────────────────────────
   Pure calculation results for ability scores and modifiers.
   Deterministic and independent of Obsidian UI.                    */

/** Per-ability result containing the final score and its modifier. */
export interface AbilityScoreEntry {
  ability: Ability;
  baseScore: number;
  effectTotal: number;
  finalScore: number;
  modifier: number;
}

/** Complete ability score calculation result for all six abilities. */
export interface AbilityScoresResult {
  abilities: ReadonlyArray<AbilityScoreEntry>;
}

/* ── Modifier calculation ──────────────────────────────────────────
   Standard D&D 5e formula: floor((score - 10) / 2).               */

/**
 * Calculates the ability modifier for a given ability score.
 *
 * Uses the standard D&D formula: floor((score - 10) / 2)
 *
 * @param score - The ability score (1-30 typical range)
 * @returns The ability modifier
 *
 * @example
 * abilityModifier(1)   // -5
 * abilityModifier(10)  //  0
 * abilityModifier(20)  //  5
 * abilityModifier(30)  // 10
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/* ── Effect filtering ────────────────────────────────────────────── */

/**
 * Checks if a collected effect is an add-ability effect targeting a
 * specific ability.
 */
function isAddAbilityEffectFor(
  effect: RuleEffect,
  ability: Ability,
): effect is RuleEffect & AddAbilityEffect {
  return (
    effect.type === "add-ability" &&
    (effect as RuleEffect & AddAbilityEffect).ability === ability
  );
}

/* ── Main calculation ────────────────────────────────────────────── */

/**
 * Calculates final ability scores and modifiers for a character.
 *
 * Process:
 * 1. Start with base scores from character.abilities.scores
 * 2. Collect all rule effects via collectEffects
 * 3. Apply add-ability effects to each ability score
 * 4. Calculate modifiers from final scores
 *
 * Results are returned in deterministic ability order:
 * STR, DEX, CON, INT, WIS, CHA
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with per-ability breakdowns
 */
export function calculateAbilityScores(
  character: Character,
  catalog: CatalogLookup,
): AbilityScoresResult {
  const collected = collectEffects(character, catalog);

  const abilities: AbilityScoreEntry[] = [];

  for (const ability of ABILITIES) {
    const baseScore = character.abilities.scores[ability];

    // Sum all add-ability effects for this ability
    let effectTotal = 0;
    for (const ce of collected) {
      if (isAddAbilityEffectFor(ce.effect, ability)) {
        effectTotal += ce.effect.value;
      }
    }

    const finalScore = baseScore + effectTotal;
    const modifier = abilityModifier(finalScore);

    abilities.push({
      ability,
      baseScore,
      effectTotal,
      finalScore,
      modifier,
    });
  }

  return {
    abilities: Object.freeze(abilities),
  };
}

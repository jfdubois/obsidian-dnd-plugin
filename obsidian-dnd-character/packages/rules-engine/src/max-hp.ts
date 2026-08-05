import type { Character } from "@obsidian-dnd/character-contract";
import type { AddHitPointIncreaseEffect, RuleEffect } from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup, CollectedEffect } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { calculateAbilityScores } from "./ability-scores";

/* ── Per-class HP breakdown ────────────────────────────────────────
   Describes the maximum HP contribution from a single class.       */

export interface MaxHpClassBreakdown {
  classId: Character["progression"]["classes"][number]["classId"];
  instanceId: Character["progression"]["classes"][number]["instanceId"];
  level: number;
  hitDie: number;
  maxHp: number;
}

/* ── Max HP result ─────────────────────────────────────────────────
   Complete maximum HP calculation result.                          */

export interface MaxHpResult {
  totalHp: number;
  conModifier: number;
  perClassBreakdown: ReadonlyArray<MaxHpClassBreakdown>;
  hitPointIncreases: ReadonlyArray<number>;
}

/* ── Effect filtering ────────────────────────────────────────────── */

function isAddHitPointIncreaseEffect(
  effect: RuleEffect,
): effect is RuleEffect & AddHitPointIncreaseEffect {
  return effect.type === "add-hit-point-increase";
}

/* ── Main calculation ────────────────────────────────────────────── */

/**
 * Calculates the maximum hit points for a character.
 *
 * Formula:
 *   totalHp = sum(per-class hitDie * level)
 *            + conModifier * totalLevels
 *            + sum(hit-point-increase effects)
 *
 * Process:
 * 1. Calculate final CON modifier from ability scores
 * 2. Sum hitDie * level for each class
 * 3. Add CON modifier * total levels
 * 4. Add all add-hit-point-increase effect values
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with total HP and breakdowns
 */
export function calculateMaxHp(
  character: Character,
  catalog: CatalogLookup,
  collectedEffects?: ReadonlyArray<CollectedEffect>,
): MaxHpResult {
  const abilityScores = calculateAbilityScores(character, catalog);
  const conEntry = abilityScores.abilities.find((a) => a.ability === "CON");
  const conModifier = conEntry?.modifier ?? 0;

  const perClassBreakdown: MaxHpClassBreakdown[] = [];

  for (const cls of character.progression.classes) {
    const classRule = catalog.getClass(cls.classId);
    const hitDie = classRule?.hitDie ?? 8;
    const maxHp = hitDie * cls.level + conModifier * cls.level;

    perClassBreakdown.push({
      classId: cls.classId,
      instanceId: cls.instanceId,
      level: cls.level,
      hitDie,
      maxHp,
    });
  }

  const collected = collectedEffects ?? collectEffects(character, catalog);
  const hitPointIncreases: number[] = [];

  for (const ce of collected) {
    if (isAddHitPointIncreaseEffect(ce.effect)) {
      hitPointIncreases.push(ce.effect.value);
    }
  }

  const classHpTotal = perClassBreakdown.reduce((sum, c) => sum + c.maxHp, 0);
  const hitPointIncreaseTotal = hitPointIncreases.reduce((sum, v) => sum + v, 0);

  return {
    totalHp: classHpTotal + hitPointIncreaseTotal,
    conModifier,
    perClassBreakdown: Object.freeze(perClassBreakdown),
    hitPointIncreases: Object.freeze(hitPointIncreases),
  };
}

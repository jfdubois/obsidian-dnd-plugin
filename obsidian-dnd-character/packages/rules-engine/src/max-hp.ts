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

/* ── Per-level HP gain with minimum rule ───────────────────────────
   D&D 5e: a character's hit point maximum cannot decrease when
   gaining a level. Each level contributes at least 1 HP.           */

function clampedLevelHpGain(baseHp: number, conModifier: number): number {
  return Math.max(1, baseHp + conModifier);
}

/* ── Per-class HP calculation ──────────────────────────────────────
   Starting level (level 1): full hit die + CON modifier.
   Subsequent levels (2+): authoritative hitPointIncreases entries
   consumed from persisted CharacterClassState, each plus CON modifier.
   Missing entries for levels 2+ are not backfilled; the engine
   trusts the persisted state produced by the level-up workflow.    */

function calculateClassMaxHp(
  cls: Character["progression"]["classes"][number],
  hitDie: number,
  conModifier: number,
): number {
  // Level 1: full hit die + CON (minimum 1)
  let hp = clampedLevelHpGain(hitDie, conModifier);

  // Levels 2+: consume persisted hitPointIncreases for this class
  for (const increase of cls.hitPointIncreases) {
    if (increase.level >= 2 && increase.level <= cls.level) {
      hp += clampedLevelHpGain(increase.rollOrMax, conModifier);
    }
  }

  return hp;
}

/* ── Main calculation ────────────────────────────────────────────── */

/**
 * Calculates the maximum hit points for a character.
 *
 * Formula (single-class):
 *   level 1:   max(1, hitDie + conModifier)
 *   level 2+:  sum of max(1, hitPointIncrease.rollOrMax + conModifier)
 *   total:     class HP + sum(add-hit-point-increase effect values)
 *
 * Data flow:
 * 1. Starting level HP comes from normalized class hitDie.
 * 2. Subsequent level HP comes from persisted hitPointIncreases
 *    entries (populated by the level-up workflow, Phase 13).
 * 3. Constitution modifier is applied per level with minimum-1 rule.
 * 4. add-hit-point-increase effects (e.g., Tough feat) are flat
 *    additive bonuses independent of per-level HP choices.
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
    const maxHp = calculateClassMaxHp(cls, hitDie, conModifier);

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

import type { Ability } from "@obsidian-dnd/domain";
import { ABILITIES } from "@obsidian-dnd/domain";
import type { Character } from "@obsidian-dnd/character-contract";
import type {
  AddProficiencyEffect,
  ConditionalRollModeEffect,
  ProficiencySavingThrowRef,
  RollPredicate,
  RollMode,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { abilityModifier } from "./ability-scores";
import { proficiencyBonusForLevel } from "./proficiency-bonus";
import { calculateTotalLevel } from "./total-level";

/* ── Saving throw result types ──────────────────────────────────────
   Pure calculation results for saving throw totals and conditionals.
   Deterministic and independent of Obsidian UI.                       */

/** A conditional roll mode applied to a specific saving throw. */
export interface SavingThrowConditional {
  /** The roll mode: advantage or disadvantage. */
  mode: RollMode;
  /** The predicate that triggers this conditional. */
  predicate: RollPredicate;
}

/** Per-ability saving throw result with full breakdown. */
export interface SavingThrowEntry {
  /** The ability this saving throw uses. */
  ability: Ability;
  /** The ability modifier for this saving throw. */
  modifier: number;
  /** Whether the character is proficient in this saving throw. */
  isProficient: boolean;
  /** The proficiency bonus applied (0 if not proficient). */
  proficiencyBonus: number;
  /** The final saving throw total (modifier + proficiencyBonus). */
  total: number;
  /** Conditional roll modes (advantage/disadvantage) from effects. */
  conditionals: ReadonlyArray<SavingThrowConditional>;
}

/** Complete saving throw calculation result for all six abilities. */
export interface SavingThrowsResult {
  /** Total character level used for proficiency bonus calculation. */
  totalLevel: number;
  /** Base proficiency bonus from level. */
  proficiencyBonus: number;
  /** Per-ability saving throw entries in deterministic ability order. */
  savingThrows: ReadonlyArray<SavingThrowEntry>;
}

/* ── Effect type guards ────────────────────────────────────────────── */

function isAddProficiencyEffect(
  effect: RuleEffect,
): effect is RuleEffect & AddProficiencyEffect {
  return effect.type === "add-proficiency";
}

function isConditionalRollModeEffect(
  effect: RuleEffect,
): effect is RuleEffect & ConditionalRollModeEffect {
  return effect.type === "conditional-roll-mode";
}

function isSavingThrowProficiencyRef(
  prof: AddProficiencyEffect["proficiency"],
): prof is ProficiencySavingThrowRef {
  return prof.kind === "saving-throw";
}

/* ── Predicate matching ────────────────────────────────────────────── */

/**
 * Checks if a roll predicate matches a specific saving throw ability.
 *
 * Matches:
 * - ability predicate targeting the same ability
 * - concentration predicate (applies to all saving throws)
 * - damage-type predicate (applies to all saving throws against that damage)
 * - condition predicate (applies to all saving throws to avoid/end condition)
 *
 * Does NOT match:
 * - skill predicate (skills are not saving throws)
 */
function predicateMatchesSavingThrow(
  predicate: RollPredicate,
  ability: Ability,
): boolean {
  switch (predicate.type) {
    case "ability":
      return predicate.ability === ability;
    case "skill":
      return false;
    case "condition":
      return true;
    case "damage-type":
      return true;
    case "concentration":
      return true;
  }
}

/* ── Main calculation ──────────────────────────────────────────────── */

/**
 * Calculates saving throw totals for all six abilities.
 *
 * Process:
 * 1. Calculate total level and proficiency bonus
 * 2. Collect all rule effects via collectEffects
 * 3. For each ability:
 *    a. Get the ability modifier from the character's scores
 *    b. Check for saving throw proficiency effects
 *    c. Check for conditional roll mode effects (advantage/disadvantage)
 *    d. Calculate total = modifier + (proficiencyBonus if proficient)
 *
 * Results are returned in deterministic ability order:
 * STR, DEX, CON, INT, WIS, CHA
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with per-ability saving throw breakdowns
 */
export function calculateSavingThrows(
  character: Character,
  catalog: CatalogLookup,
): SavingThrowsResult {
  const totalLevel = calculateTotalLevel(character);
  const proficiencyBonus = proficiencyBonusForLevel(totalLevel);

  const collected = collectEffects(character, catalog);

  // Collect saving throw proficiency abilities
  const proficientAbilities = new Set<Ability>();
  for (const ce of collected) {
    if (isAddProficiencyEffect(ce.effect)) {
      const prof = ce.effect.proficiency;
      if (isSavingThrowProficiencyRef(prof)) {
        proficientAbilities.add(prof.ability);
      }
    }
  }

  // Build per-ability entries
  const savingThrows: SavingThrowEntry[] = [];

  for (const ability of ABILITIES) {
    const modifier = abilityModifier(character.abilities.scores[ability]);
    const isProficient = proficientAbilities.has(ability);
    const profBonus = isProficient ? proficiencyBonus : 0;
    const total = modifier + profBonus;

    // Collect conditional roll modes for this ability
    const conditionals: SavingThrowConditional[] = [];
    for (const ce of collected) {
      if (isConditionalRollModeEffect(ce.effect)) {
        const { rollType, mode, predicate } = ce.effect;
        if (rollType === "saving-throw" && predicateMatchesSavingThrow(predicate, ability)) {
          conditionals.push({
            mode,
            predicate,
          });
        }
      }
    }

    savingThrows.push({
      ability,
      modifier,
      isProficient,
      proficiencyBonus: profBonus,
      total,
      conditionals: Object.freeze(conditionals),
    });
  }

  return {
    totalLevel,
    proficiencyBonus,
    savingThrows: Object.freeze(savingThrows),
  };
}

import type { Character } from "@obsidian-dnd/character-contract";
import type {
  AddProficiencyEffect,
  AddInitiativeEffect,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup, CollectedEffect } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { abilityModifier } from "./ability-scores";
import { proficiencyBonusForLevel } from "./proficiency-bonus";
import { calculateTotalLevel } from "./total-level";

/* ── Initiative result types ────────────────────────────────────────
   Pure calculation results for initiative.
   Deterministic and independent of Obsidian UI.                      */

/** Complete initiative calculation result. */
export interface InitiativeResult {
  /** The character's DEX modifier. */
  dexModifier: number;
  /** The proficiency bonus from total level. */
  proficiencyBonus: number;
  /** Whether the character is proficient in initiative. */
  isProficient: boolean;
  /** Sum of all flat add-initiative bonuses from effects. */
  flatBonuses: number;
  /** Total initiative value: DEX mod + (profBonus if proficient) + flat bonuses. */
  total: number;
}

/* ── Effect type guards ───────────────────────────────────────────── */

/** Checks if a rule effect is an add-proficiency effect. */
function isAddProficiencyEffect(
  effect: RuleEffect,
): effect is RuleEffect & AddProficiencyEffect {
  return effect.type === "add-proficiency";
}

/** Checks if a rule effect is an add-initiative effect. */
function isAddInitiativeEffect(
  effect: RuleEffect,
): effect is RuleEffect & AddInitiativeEffect {
  return effect.type === "add-initiative";
}

/** Checks if a proficiency ref targets initiative. */
function isInitiativeProficiency(
  prof: AddProficiencyEffect["proficiency"],
): boolean {
  return prof.kind === "initiative";
}

/* ── Main calculation ─────────────────────────────────────────────── */

/**
 * Calculates the character's initiative total.
 *
 * Process:
 * 1. Calculate total level and proficiency bonus
 * 2. Get the character's DEX modifier from base scores
 * 3. Collect all rule effects via collectEffects
 * 4. Check for initiative proficiency (add-proficiency with kind: "initiative")
 * 5. Sum all add-initiative flat bonuses
 * 6. Calculate total = DEX mod + (profBonus if proficient) + flat bonuses
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with initiative total and breakdown
 */
export function calculateInitiative(
  character: Character,
  catalog: CatalogLookup,
  collectedEffects?: ReadonlyArray<CollectedEffect>,
): InitiativeResult {
  const totalLevel = calculateTotalLevel(character);
  const proficiencyBonus = proficiencyBonusForLevel(totalLevel);
  const dexModifier = abilityModifier(character.abilities.scores.DEX);

  const collected = collectedEffects ?? collectEffects(character, catalog);

  // Check for initiative proficiency
  let isProficient = false;
  for (const ce of collected) {
    if (isAddProficiencyEffect(ce.effect)) {
      if (isInitiativeProficiency(ce.effect.proficiency)) {
        isProficient = true;
        break;
      }
    }
  }

  // Sum all add-initiative flat bonuses
  let flatBonuses = 0;
  for (const ce of collected) {
    if (isAddInitiativeEffect(ce.effect)) {
      flatBonuses += ce.effect.value;
    }
  }

  const profBonus = isProficient ? proficiencyBonus : 0;
  const total = dexModifier + profBonus + flatBonuses;

  return {
    dexModifier,
    proficiencyBonus,
    isProficient,
    flatBonuses,
    total,
  };
}

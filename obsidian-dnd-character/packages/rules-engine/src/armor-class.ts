import type { Character } from "@obsidian-dnd/character-contract";
import type {
  SetAcFormulaEffect,
  AddAcEffect,
  ArmorClassFormula,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { abilityModifier } from "./ability-scores";
import { calculateTotalLevel } from "./total-level";

/* ── Armor class result types ──────────────────────────────────────
   Pure calculation results for armor class.
   Deterministic and independent of Obsidian UI.                     */

/** Result of evaluating a single AC formula against character stats. */
export interface AcFormulaResult {
  /** The formula that was used. */
  formula: ArmorClassFormula;
  /** The base AC value from the formula (before flat bonuses). */
  baseAc: number;
  /** How much DEX modifier contributed to the base AC. */
  dexContribution: number;
}

/** Complete armor class calculation result. */
export interface ArmorClassResult {
  /** Final armor class total. */
  total: number;
  /** The AC formula used (last set-ac-formula or default). */
  formula: ArmorClassFormula;
  /** The base AC from the formula (before flat bonuses). */
  baseAc: number;
  /** The character's DEX modifier. */
  dexModifier: number;
  /** How much DEX contributed to the AC base. */
  dexContribution: number;
  /** Sum of all flat add-ac bonuses applied. */
  flatBonuses: number;
  /** Character's total level for provenance. */
  totalLevel: number;
}

/* ── Effect type guards ──────────────────────────────────────────── */

/** Checks if a rule effect is a set-ac-formula effect. */
function isSetAcFormulaEffect(
  effect: RuleEffect,
): effect is RuleEffect & SetAcFormulaEffect {
  return effect.type === "set-ac-formula";
}

/** Checks if a rule effect is an add-ac effect. */
function isAddAcEffect(
  effect: RuleEffect,
): effect is RuleEffect & AddAcEffect {
  return effect.type === "add-ac";
}

/** Checks if an add-ac effect has a condition (and should be skipped). */
function hasCondition(effect: RuleEffect & AddAcEffect): boolean {
  return effect.condition !== undefined;
}

/* ── Formula evaluation ──────────────────────────────────────────── */

/**
 * Evaluates an AC formula against the character's DEX modifier.
 *
 * - "base": flat base AC
 * - "dex": 10 + DEX modifier
 * - "dex-plus": base + min(DEX mod, maxDexBonus)
 * - "dex-minus": base + max(DEX mod, -dexPenalty)
 * - "natural": flat natural AC
 * - "armor": deferred to Phase 12, returns 0
 */
function evaluateFormula(
  formula: ArmorClassFormula,
  dexModifier: number,
): AcFormulaResult {
  switch (formula.type) {
    case "base": {
      return { formula, baseAc: formula.base, dexContribution: 0 };
    }

    case "dex": {
      return { formula, baseAc: 10 + dexModifier, dexContribution: dexModifier };
    }

    case "dex-plus": {
      const capped = Math.min(dexModifier, formula.maxDexBonus);
      return {
        formula,
        baseAc: formula.base + capped,
        dexContribution: capped,
      };
    }

    case "dex-minus": {
      const floored = Math.max(dexModifier, -formula.dexPenalty);
      return {
        formula,
        baseAc: formula.base + floored,
        dexContribution: floored,
      };
    }

    case "natural": {
      return { formula, baseAc: formula.base, dexContribution: 0 };
    }

    case "armor": {
      // Deferred to Phase 12 (armor-based AC)
      return { formula, baseAc: 0, dexContribution: 0 };
    }

    default: {
      // Should not occur due to discriminated union, but handle safely
      const _exhaustive: never = formula;
      return {
        formula: _exhaustive,
        baseAc: 0,
        dexContribution: 0,
      };
    }
  }
}

/* ── Main calculation ────────────────────────────────────────────── */

/**
 * Calculates the character's armor class.
 *
 * Process:
 * 1. Collect all rule effects via collectEffects
 * 2. Find the last set-ac-formula effect (last wins)
 * 3. If none found, default to DexAcFormula (10 + DEX mod)
 * 4. Evaluate the formula against the character's DEX modifier
 * 5. Sum all unconditioned add-ac effects
 * 6. Return structured result
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with AC total and breakdown
 */
export function calculateArmorClass(
  character: Character,
  catalog: CatalogLookup,
): ArmorClassResult {
  const collected = collectEffects(character, catalog);
  const totalLevel = calculateTotalLevel(character);
  const dexModifier = abilityModifier(character.abilities.scores.DEX);

  // Find the last set-ac-formula effect (last wins)
  let acFormula: ArmorClassFormula = { type: "dex" };
  for (const ce of collected) {
    if (isSetAcFormulaEffect(ce.effect)) {
      acFormula = ce.effect.formula;
    }
  }

  // Evaluate the formula
  const formulaResult = evaluateFormula(acFormula, dexModifier);

  // Sum all unconditioned add-ac effects
  let flatBonuses = 0;
  for (const ce of collected) {
    if (isAddAcEffect(ce.effect) && !hasCondition(ce.effect)) {
      flatBonuses += ce.effect.value;
    }
  }

  return {
    total: formulaResult.baseAc + flatBonuses,
    formula: formulaResult.formula,
    baseAc: formulaResult.baseAc,
    dexModifier,
    dexContribution: formulaResult.dexContribution,
    flatBonuses,
    totalLevel,
  };
}

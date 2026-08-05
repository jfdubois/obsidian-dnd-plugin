import type { Ability } from "@obsidian-dnd/domain";
import type { Character } from "@obsidian-dnd/character-contract";
import type {
  GrantAttackEffect,
  AttackDefinition,
  AttackRange,
  DamageDefinition,
  DiceExpression,
  AttackProperty,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { calculateAbilityScores, abilityModifier } from "./ability-scores";
import { proficiencyBonusForLevel } from "./proficiency-bonus";
import { calculateTotalLevel } from "./total-level";

/* ── Attack result types ────────────────────────────────────────────
   Pure calculation results for character attacks.
   Deterministic and independent of Obsidian UI.                     */

/** Describes how damage is dealt by a single attack. */
export interface AttackDamageInstance {
  /** The dice expression for this damage (e.g., "1d8"). */
  dice: DiceExpression;
  /** The damage type string (e.g., "slashing", "piercing"). */
  damageType: string;
  /** The ability modifier added to this damage. */
  abilityModifier: number;
  /** The flat modifier from the attack definition. */
  diceModifier: number;
  /** Total damage: dice + ability modifier + flat modifier. */
  totalModifier: number;
}

/** Describes the range of an attack. */
export interface AttackRangeInfo {
  /** The kind of range: melee, ranged, or touch. */
  kind: "melee" | "ranged" | "touch";
  /** Reach in feet for melee attacks. */
  reach?: number;
  /** Normal range in feet for ranged attacks. */
  normalRange?: number;
  /** Maximum range in feet for ranged attacks. */
  maxRange?: number;
}

/** A single attack entry with full breakdown. */
export interface AttackEntry {
  /** The attack name (e.g., "Longsword", "Bite"). */
  name: string;
  /** The attack range information. */
  range: AttackRangeInfo;
  /** The attack properties (e.g., "finesse", "thrown"). */
  properties: ReadonlyArray<AttackProperty>;
  /** The ability used for the attack bonus. */
  ability: Ability;
  /** The ability modifier contribution to the attack bonus. */
  abilityModifier: number;
  /** The proficiency bonus (0 if not proficient). */
  proficiencyBonus: number;
  /** Whether the character is proficient with this attack. */
  isProficient: boolean;
  /** Total attack bonus: ability mod + prof bonus. */
  attackBonus: number;
  /** The damage instances for this attack. */
  damage: ReadonlyArray<AttackDamageInstance>;
}

/** Complete attacks calculation result. */
export interface AttacksResult {
  /** All attacks available to the character. */
  attacks: ReadonlyArray<AttackEntry>;
  /** The character's proficiency bonus (for provenance). */
  proficiencyBonus: number;
  /** The character's total level (for provenance). */
  totalLevel: number;
}

/* ── Effect type guards ──────────────────────────────────────────── */

/** Checks if a rule effect is a grant-attack effect. */
function isGrantAttackEffect(
  effect: RuleEffect,
): effect is RuleEffect & GrantAttackEffect {
  return effect.type === "grant-attack";
}

/* ── Range parsing ───────────────────────────────────────────────── */

/** Converts an AttackRange from the contract into AttackRangeInfo. */
function parseAttackRange(range: AttackRange): AttackRangeInfo {
  switch (range.type) {
    case "melee": {
      return { kind: "melee", reach: range.reach };
    }
    case "ranged": {
      return { kind: "ranged", normalRange: range.normal, maxRange: range.maximum };
    }
    case "touch": {
      return { kind: "touch" };
    }
  }
}

/* ── Ability determination ───────────────────────────────────────── */

/**
 * Determines which ability to use for an attack's bonus and damage.
 *
 * Rules:
 * - Melee attacks (non-finesse): STR
 * - Ranged attacks (non-finesse): DEX
 * - Finesse attacks: higher of STR or DEX
 * - Touch attacks: DEX (default)
 */
function determineAttackAbility(
  attack: AttackDefinition,
  abilityScores: Map<Ability, number>,
): Ability {
  const hasFinesse = attack.properties.includes("finesse");

  if (hasFinesse) {
    const strMod = abilityModifier(abilityScores.get("STR") ?? 10);
    const dexMod = abilityModifier(abilityScores.get("DEX") ?? 10);
    return dexMod >= strMod ? "DEX" : "STR";
  }

  const rangeKind = attack.range.type;

  if (rangeKind === "ranged") {
    return "DEX";
  }

  // melee and touch default to STR for melee, DEX for touch
  if (rangeKind === "touch") {
    return "DEX";
  }

  return "STR";
}

/* ── Damage calculation ──────────────────────────────────────────── */

/** Calculates damage instances from a damage definition. */
function calculateDamage(
  damage: DamageDefinition,
  abilityMod: number,
): AttackDamageInstance[] {
  switch (damage.type) {
    case "simple": {
      return [
        {
          dice: damage.dice,
          damageType: damage.damageType,
          abilityModifier: abilityMod,
          diceModifier: damage.dice.modifier,
          totalModifier: abilityMod + damage.dice.modifier,
        },
      ];
    }

    case "multi": {
      return damage.damages.map((entry) => ({
        dice: entry.dice,
        damageType: entry.damageType,
        abilityModifier: abilityMod,
        diceModifier: entry.dice.modifier,
        totalModifier: abilityMod + entry.dice.modifier,
      }));
    }
  }
}

/* ── Attack bonus calculation ────────────────────────────────────── */

/**
 * Calculates the attack bonus for a single attack.
 *
 * Formula: abilityModifier + (proficiencyBonus if proficient)
 */
function calculateAttackBonus(
  abilityMod: number,
  proficiencyBonus: number,
  isProficient: boolean,
): number {
  return abilityMod + (isProficient ? proficiencyBonus : 0);
}

/* ── Main calculation ────────────────────────────────────────────── */

/**
 * Calculates all attacks for a character.
 *
 * Process:
 * 1. Calculate ability scores and proficiency bonus
 * 2. Collect all rule effects via collectEffects
 * 3. Filter for grant-attack effects
 * 4. For each attack:
 *    a. Determine the ability to use (STR/DEX/finesse)
 *    b. Calculate the attack bonus
 *    c. Calculate the damage instances
 *    d. Parse the range information
 * 5. Return structured results
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with all attacks and breakdowns
 */
export function calculateAttacks(
  character: Character,
  catalog: CatalogLookup,
): AttacksResult {
  const abilityScoresResult = calculateAbilityScores(character, catalog);
  const totalLevel = calculateTotalLevel(character);
  const proficiencyBonus = proficiencyBonusForLevel(totalLevel);

  // Build a map of ability -> score for quick lookup
  const scoreMap = new Map<Ability, number>();
  for (const entry of abilityScoresResult.abilities) {
    scoreMap.set(entry.ability, entry.finalScore);
  }

  const collected = collectEffects(character, catalog);

  // Collect all grant-attack effects
  const attackEntries: AttackEntry[] = [];

  for (const ce of collected) {
    if (!isGrantAttackEffect(ce.effect)) {
      continue;
    }

    const attackDef = ce.effect.attack;

    // Determine ability for this attack
    const ability = determineAttackAbility(attackDef, scoreMap);
    const abilityMod = abilityModifier(scoreMap.get(ability) ?? 10);

    // For now, all grant-attack effects grant proficiency
    // (weapon proficiency is tracked separately via add-proficiency effects)
    const isProficient = true;
    const profBonus = isProficient ? proficiencyBonus : 0;

    // Calculate attack bonus
    const attackBonus = calculateAttackBonus(abilityMod, profBonus, isProficient);

    // Calculate damage
    const damage = calculateDamage(attackDef.damage, abilityMod);

    // Parse range
    const range = parseAttackRange(attackDef.range);

    attackEntries.push({
      name: attackDef.name,
      range,
      properties: Object.freeze([...attackDef.properties]),
      ability,
      abilityModifier: abilityMod,
      proficiencyBonus: profBonus,
      isProficient,
      attackBonus,
      damage: Object.freeze(damage),
    });
  }

  return {
    attacks: Object.freeze(attackEntries),
    proficiencyBonus,
    totalLevel,
  };
}

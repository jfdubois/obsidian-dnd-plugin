import type { EntityId } from "@obsidian-dnd/domain";
import type { Character } from "@obsidian-dnd/character-contract";
import type {
  AddResistanceEffect,
  AddImmunityEffect,
  AddCapabilityEffect,
  ImmunityDefinition,
  CapabilityDefinition,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup, CollectedEffect } from "./effect-provenance";
import { collectEffects } from "./effect-collection";

/* ── Result types ────────────────────────────────────────────────
   Pure calculation results for defenses, immunities, and capabilities.
   Deterministic and independent of Obsidian UI.                    */

/** Complete defenses calculation result (resistances and immunities). */
export interface DefensesResult {
  /** Sorted, deduplicated list of damage types the character resists. */
  resistances: ReadonlyArray<string>;
  /** Sorted, deduplicated list of damage types the character is immune to. */
  damageImmunities: ReadonlyArray<string>;
  /** Sorted list of condition entity IDs the character is immune to. */
  conditionImmunities: ReadonlyArray<EntityId>;
  /** True if the character has disease immunity. */
  hasDiseaseImmunity: boolean;
  /** True if the character has magical sleep immunity. */
  hasMagicalSleepImmunity: boolean;
}

/** Complete capabilities calculation result. */
export interface CapabilitiesResult {
  /** True if the character does not require breathing. */
  noBreathingRequired: boolean;
  /** True if the character does not require food. */
  noFoodRequired: boolean;
  /** True if the character does not require water. */
  noWaterRequired: boolean;
  /** True if the character does not require sleep. */
  noSleepRequired: boolean;
  /** True if the character can breathe underwater. */
  waterBreathing: boolean;
}

/* ── Effect type guards ─────────────────────────────────────────── */

function isAddResistanceEffect(
  effect: unknown,
): effect is AddResistanceEffect {
  return (
    typeof effect === "object" &&
    effect !== null &&
    "type" in effect &&
    (effect as Record<string, unknown>).type === "add-resistance"
  );
}

function isAddImmunityEffect(
  effect: unknown,
): effect is AddImmunityEffect {
  return (
    typeof effect === "object" &&
    effect !== null &&
    "type" in effect &&
    (effect as Record<string, unknown>).type === "add-immunity"
  );
}

function isAddCapabilityEffect(
  effect: unknown,
): effect is AddCapabilityEffect {
  return (
    typeof effect === "object" &&
    effect !== null &&
    "type" in effect &&
    (effect as Record<string, unknown>).type === "add-capability"
  );
}

/* ── Immunity discriminator ─────────────────────────────────────── */

function processImmunityDefinition(immunity: ImmunityDefinition) {
  switch (immunity.type) {
    case "damage":
      return { kind: "damage" as const, damageType: immunity.damageType };
    case "condition":
      return { kind: "condition" as const, conditionId: immunity.conditionId };
    case "disease":
      return { kind: "disease" as const };
    case "magical-sleep":
      return { kind: "magical-sleep" as const };
  }
}

/* ── Capability discriminator ───────────────────────────────────── */

function processCapabilityDefinition(capability: CapabilityDefinition) {
  switch (capability.type) {
    case "no-breathing-required":
      return "no-breathing-required" as const;
    case "no-food-required":
      return "no-food-required" as const;
    case "no-water-required":
      return "no-water-required" as const;
    case "no-sleep-required":
      return "no-sleep-required" as const;
    case "water-breathing":
      return "water-breathing" as const;
  }
}

/* ── Main calculations ──────────────────────────────────────────── */

/**
 * Calculates defenses (resistances and immunities) for a character.
 *
 * Process:
 * 1. Collect all rule effects via collectEffects
 * 2. Filter for add-resistance, add-immunity effects
 * 3. Aggregate into sorted, deduplicated results
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with resistances and immunities
 */
export function calculateDefenses(
  character: Character,
  catalog: CatalogLookup,
  collectedEffects?: ReadonlyArray<CollectedEffect>,
): DefensesResult {
  const collected = collectedEffects ?? collectEffects(character, catalog);

  const resistanceSet = new Set<string>();
  const damageImmunitySet = new Set<string>();
  const conditionImmunitySet = new Set<EntityId>();
  let hasDiseaseImmunity = false;
  let hasMagicalSleepImmunity = false;

  for (const ce of collected) {
    if (isAddResistanceEffect(ce.effect)) {
      resistanceSet.add(ce.effect.damageType);
    } else if (isAddImmunityEffect(ce.effect)) {
      const processed = processImmunityDefinition(ce.effect.immunity);
      switch (processed.kind) {
        case "damage":
          damageImmunitySet.add(processed.damageType);
          break;
        case "condition":
          conditionImmunitySet.add(processed.conditionId);
          break;
        case "disease":
          hasDiseaseImmunity = true;
          break;
        case "magical-sleep":
          hasMagicalSleepImmunity = true;
          break;
      }
    }
  }

  return {
    resistances: Object.freeze([...resistanceSet].sort()),
    damageImmunities: Object.freeze([...damageImmunitySet].sort()),
    conditionImmunities: Object.freeze([...conditionImmunitySet].sort()),
    hasDiseaseImmunity,
    hasMagicalSleepImmunity,
  };
}

/**
 * Calculates capabilities for a character.
 *
 * Process:
 * 1. Collect all rule effects via collectEffects
 * 2. Filter for add-capability effects
 * 3. Aggregate into boolean flags
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with capability flags
 */
export function calculateCapabilities(
  character: Character,
  catalog: CatalogLookup,
  collectedEffects?: ReadonlyArray<CollectedEffect>,
): CapabilitiesResult {
  const collected = collectedEffects ?? collectEffects(character, catalog);

  let noBreathingRequired = false;
  let noFoodRequired = false;
  let noWaterRequired = false;
  let noSleepRequired = false;
  let waterBreathing = false;

  for (const ce of collected) {
    if (isAddCapabilityEffect(ce.effect)) {
      const capabilityType = processCapabilityDefinition(ce.effect.capability);
      switch (capabilityType) {
        case "no-breathing-required":
          noBreathingRequired = true;
          break;
        case "no-food-required":
          noFoodRequired = true;
          break;
        case "no-water-required":
          noWaterRequired = true;
          break;
        case "no-sleep-required":
          noSleepRequired = true;
          break;
        case "water-breathing":
          waterBreathing = true;
          break;
      }
    }
  }

  return {
    noBreathingRequired,
    noFoodRequired,
    noWaterRequired,
    noSleepRequired,
    waterBreathing,
  };
}

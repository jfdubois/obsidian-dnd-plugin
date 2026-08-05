import type { Character } from "@obsidian-dnd/character-contract";
import type { CollectedEffect, CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { calculateTotalLevel } from "./total-level";
import { proficiencyBonusForLevel } from "./proficiency-bonus";
import type { AbilityScoresResult } from "./ability-scores";
import { calculateAbilityScores } from "./ability-scores";
import type { ProficienciesResult } from "./proficiencies";
import { calculateProficiencies } from "./proficiencies";
import type { SavingThrowsResult } from "./saving-throws";
import { calculateSavingThrows } from "./saving-throws";
import type { SkillsResult } from "./skills";
import { calculateSkills } from "./skills";
import type { MovementSensesResult } from "./movement-senses";
import { calculateMovementSenses } from "./movement-senses";
import type { MaxHpResult } from "./max-hp";
import { calculateMaxHp } from "./max-hp";
import type { ArmorClassResult } from "./armor-class";
import { calculateArmorClass } from "./armor-class";
import type { InitiativeResult } from "./initiative";
import { calculateInitiative } from "./initiative";
import type { AttacksResult } from "./attacks";
import { calculateAttacks } from "./attacks";
import type { DefensesResult } from "./defenses";
import { calculateDefenses } from "./defenses";
import type { CapabilitiesResult } from "./defenses";
import { calculateCapabilities } from "./defenses";
import type { SpellcastingResult } from "./spellcasting";
import { calculateSpellcasting } from "./spellcasting";
import type { ResourcesResult } from "./resources";
import { calculateResources } from "./resources";
import type { ContributionTracesResult } from "./contribution-traces";
import { buildContributionTraces } from "./contribution-traces";
import type { UnsupportedMechanicsResult } from "./unsupported-mechanics";
import { detectUnsupportedMechanics } from "./unsupported-mechanics";

/* ── Character sheet projection ────────────────────────────────────
   Aggregates all Phase 9 sub-calculations into a single unified
   projection with explanation/provenance traces, deterministic
   output, and a single shared effect collection.                  */

/**
 * Unified character sheet projection containing all calculated
 * mechanical values with full provenance traces.
 *
 * This projection is derived, never persisted. It is computed
 * fresh from the character document and catalog on each request.
 *
 * Effects are collected exactly once and shared across all
 * sub-calculations to ensure consistency and performance.
 *
 * The output is frozen (deeply immutable) and deterministic:
 * identical inputs always produce an identical snapshot.
 */
export interface CharacterSheetProjection {
  /** Total character level across all classes. */
  totalLevel: number;
  /** Proficiency bonus derived from total level. */
  proficiencyBonus: number;
  /** Ability scores and modifiers. */
  abilities: AbilityScoresResult;
  /** Proficiencies and expertise flags. */
  proficiencies: ProficienciesResult;
  /** Saving throw entries per ability. */
  savingThrows: SavingThrowsResult;
  /** Skill entries with passive values. */
  skills: SkillsResult;
  /** Movement speeds and sense ranges. */
  movementSenses: MovementSensesResult;
  /** Maximum hit points with per-class breakdown. */
  maxHp: MaxHpResult;
  /** Armor class total and formula breakdown. */
  armorClass: ArmorClassResult;
  /** Initiative total and proficiency flag. */
  initiative: InitiativeResult;
  /** Attack entries with damage breakdowns. */
  attacks: AttacksResult;
  /** Resistances and immunities (separate from capabilities). */
  defenses: DefensesResult;
  /** Biological and environmental capabilities (separate from defenses). */
  capabilities: CapabilitiesResult;
  /** Spellcasting slots and known/prepared spells. */
  spellcasting: SpellcastingResult;
  /** Feature resources (Rage, Ki, Second Wind, etc.). */
  resources: ResourcesResult;
  /** Provenance traces connecting totals to originating effects. */
  contributionTraces: ContributionTracesResult;
  /** Diagnostics for effects the engine cannot fully automate. */
  unsupportedMechanics: UnsupportedMechanicsResult;
  /** Single shared effect collection with provenance metadata. */
  effects: ReadonlyArray<CollectedEffect>;
}

/**
 * Builds a complete character sheet projection from the character
 * document and catalog.
 *
 * Effects are collected exactly once via collectEffects() and
 * shared across all sub-calculations. The result is frozen and
 * deterministic.
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Frozen unified projection with all calculated values
 */
export function buildCharacterSheetProjection(
  character: Character,
  catalog: CatalogLookup,
): CharacterSheetProjection {
  // Single effect collection shared across all sub-calculations
  const effects = collectEffects(character, catalog);

  // Derive shared values
  const totalLevel = calculateTotalLevel(character);
  const proficiencyBonus = proficiencyBonusForLevel(totalLevel);

  // Extract raw RuleEffect[] for functions that accept effects directly
  const rawEffects = effects.map((ce) => ce.effect);

  // Execute all sub-calculations with shared effects
  const abilities = calculateAbilityScores(character, catalog, effects);
  const proficiencies = calculateProficiencies(character, catalog, effects);
  const savingThrows = calculateSavingThrows(character, catalog, effects);
  const skills = calculateSkills(character, catalog, effects);
  const movementSenses = calculateMovementSenses(character, catalog, effects);
  const maxHp = calculateMaxHp(character, catalog, effects);
  const armorClass = calculateArmorClass(character, catalog, effects);
  const initiative = calculateInitiative(character, catalog, effects);
  const attacks = calculateAttacks(character, catalog, effects);
  const defenses = calculateDefenses(character, catalog, effects);
  const capabilities = calculateCapabilities(character, catalog, effects);
  const spellcasting = calculateSpellcasting(rawEffects);
  const resources = calculateResources(rawEffects, totalLevel, character.abilities.scores);
  const contributionTraces = buildContributionTraces(effects);
  const unsupportedMechanics = detectUnsupportedMechanics(effects);

  // Build frozen projection
  const projection: CharacterSheetProjection = {
    totalLevel,
    proficiencyBonus,
    abilities,
    proficiencies,
    savingThrows,
    skills,
    movementSenses,
    maxHp,
    armorClass,
    initiative,
    attacks,
    defenses,
    capabilities,
    spellcasting,
    resources,
    contributionTraces,
    unsupportedMechanics,
    effects,
  };

  return Object.freeze(projection);
}

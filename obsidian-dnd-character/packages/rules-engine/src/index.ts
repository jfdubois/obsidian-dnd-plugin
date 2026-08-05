export {
  /* Effect provenance types */
  type EffectSourceKind,
  type EffectProvenance,
  type CollectedEffect,
  type CatalogLookup,
  /* Effect source kind constants */
  EFFECT_SOURCE_KINDS,
} from "./effect-provenance";

export {
  /* Effect collection */
  type CollectEffectsOptions,
  collectEffects,
} from "./effect-collection";

export {
  /* Total character level */
  calculateTotalLevel,
} from "./total-level";

export {
  /* Proficiency bonus */
  PROFICIENCY_BONUS_TABLE,
  proficiencyBonusForLevel,
} from "./proficiency-bonus";

export {
  /* Ability scores and modifiers */
  type AbilityScoreEntry,
  type AbilityScoresResult,
  abilityModifier,
  calculateAbilityScores,
} from "./ability-scores";

export {
  /* Proficiencies and expertise */
  type ArmorProficiencyEntry,
  type WeaponProficiencyEntry,
  type ToolProficiencyEntry,
  type SkillProficiencyEntry,
  type SavingThrowProficiencyEntry,
  type ProficienciesResult,
  calculateProficiencies,
} from "./proficiencies";

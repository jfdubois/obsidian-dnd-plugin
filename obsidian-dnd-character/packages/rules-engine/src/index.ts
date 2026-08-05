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

export {
  /* Saving throws and conditional save effects */
  type SavingThrowConditional,
  type SavingThrowEntry,
  type SavingThrowsResult,
  calculateSavingThrows,
} from "./saving-throws";

export {
  /* Skills, passive values, and conditional skill effects */
  type SkillConditional,
  type SkillEntry,
  type PassiveValues,
  type SkillsResult,
  calculateSkills,
} from "./skills";

export {
  /* Movement speeds and sense ranges */
  type MovementKind,
  type SenseKind,
  type MovementEntry,
  type SenseEntry,
  type MovementSensesResult,
  MOVEMENT_KINDS,
  SENSE_KINDS,
  calculateMovementSenses,
} from "./movement-senses";

export {
  /* Maximum hit points */
  type MaxHpClassBreakdown,
  type MaxHpResult,
  calculateMaxHp,
} from "./max-hp";

export {
  /* Armor class */
  type AcFormulaResult,
  type ArmorClassResult,
  calculateArmorClass,
} from "./armor-class";

export {
  /* Initiative calculation */
  type InitiativeResult,
  calculateInitiative,
} from "./initiative";

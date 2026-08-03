export {
  /* Catalog manifest types */
  type CatalogManifest,
  /* Catalog manifest factory */
  createCatalogManifest,
  /* Catalog manifest validator */
  isCatalogManifest,
} from "./catalog-manifest";

export {
  /* Schema version constants */
  CATALOG_API_VERSION,
  CATALOG_SCHEMA_VERSION,
  /* Schema version types */
  type CatalogApiVersion,
  /* Schema version guards */
  isSupportedApiVersion,
  isSupportedSchemaVersion,
} from "./schema-version";

export {
  /* Required entity kinds constant */
  REQUIRED_ENTITY_KINDS,
  /* Schema version validation */
  validateSchemaVersion,
  /* Required entity kinds validation */
  validateRequiredEntityKinds,
} from "./compatibility-validation";

export {
  /* Current revision pointer types */
  type CurrentRevision,
  /* Current revision pointer factory */
  createCurrentRevision,
  /* Current revision pointer validator */
  isCurrentRevision,
} from "./current-revision";

export {
  /* Source metadata types */
  type CatalogSource,
  /* Source metadata factory */
  createCatalogSource,
  /* Source metadata validator */
  isCatalogSource,
} from "./source-metadata";

export {
  /* Entity summary types */
  type CatalogEntitySummary,
  /* Entity summary factory */
  createCatalogEntitySummary,
  /* Entity summary validator */
  isCatalogEntitySummary,
} from "./entity-summary";

export {
  /* Render node types */
  type RenderNode,
  type RenderParagraphNode,
  type RenderHeadingNode,
  type RenderListNode,
  type RenderTableNode,
  type RenderReferenceNode,
  type RenderDiceNode,
  type RenderNoteNode,
  /* Render node validator */
  isRenderNode,
  /* Render node factories */
  createRenderParagraph,
  createRenderHeading,
  createRenderListNode,
  createRenderTableNode,
  createRenderReferenceNode,
  createRenderDiceNode,
  createRenderNote,
} from "./render-node";

export {
  /* Prerequisite types */
  type RulePrerequisite,
  type AbilityScorePrerequisite,
  type LevelPrerequisite,
  type EntitySelectionPrerequisite,
  /* Prerequisite validator */
  isRulePrerequisite,
  /* Prerequisite factories */
  createAbilityScorePrerequisite,
  createLevelPrerequisite,
  createEntitySelectionPrerequisite,
} from "./prerequisite";

export {
  /* Choice-definition types */
  type ChoiceDefinition,
  type ChoiceDefinitionType,
  /* Choice-definition constants */
  CHOICE_DEFINITION_TYPES,
  /* Choice-definition guard */
  isChoiceDefinitionType,
  /* Choice-definition validator */
  isChoiceDefinition,
  /* Choice-definition factory */
  createChoiceDefinition,
} from "./choice-definition";

export {
  /* Query types */
  type CatalogQuery,
  type EntityQuery,
  type SpellQuery,
  type ProficiencyQuery,
  type EquipmentQuery,
  /* Query enums */
  type SpellAcquisitionMode,
  type ProficiencyQueryKind,
  type EquipmentCategory,
  type EquipmentRarity,
  type EquipmentBodySlot,
  /* Query enum constants */
  SPELL_ACQUISITION_MODES,
  PROFICIENCY_QUERY_KINDS,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_RARITIES,
  EQUIPMENT_BODY_SLOTS,
  /* Query enum guards */
  isSpellAcquisitionMode,
  isProficiencyQueryKind,
  isEquipmentCategory,
  isEquipmentRarity,
  isEquipmentBodySlot,
  /* Query validator */
  isCatalogQuery,
  /* Query factories */
  createEntityQuery,
  createSpellQuery,
  createProficiencyQuery,
  createEquipmentQuery,
} from "./query";

export {
  /* Effect types */
  type RuleEffect,
  type RuleEffectType,
  type AddAbilityEffect,
  type SetAbilityEffect,
  type AddProficiencyEffect,
  type AddExpertiseEffect,
  type AddLanguageEffect,
  type SetMovementEffect,
  type AddMovementEffect,
  type AddSenseEffect,
  type AddResistanceEffect,
  type AddImmunityEffect,
  type ConditionalRollModeEffect,
  type AddCapabilityEffect,
  type SetAcFormulaEffect,
  type AddAcEffect,
  type GrantSpellEffect,
  type GrantResourceEffect,
  type GrantAttackEffect,
  type GrantFeatureEffect,
  /* Effect metadata types */
  type RuleEffectMetadata,
  type AutomationStatus,
  type SheetProjection,
  type EffectPresentation,
  type EffectOrigin,
  /* Roll types */
  type RollType,
  type RollMode,
  type RollPredicate,
  /* Immunity definition */
  type ImmunityDefinition,
  /* Capability definition */
  type CapabilityDefinition,
  /* Supporting effect types */
  type ProficiencyRef,
  type ProficiencySkillRef,
  type ProficiencyToolRef,
  type ProficiencyArmorRef,
  type ProficiencySavingThrowRef,
  type ProficiencyWeaponRef,
  type MovementMode,
  type SenseDefinition,
  type DarkvisionSense,
  type BlindsenseSense,
  type TremorsenseSense,
  type TruesightSense,
  type GenericSense,
  type ArmorClassFormula,
  type BaseAcFormula,
  type DexAcFormula,
  type DexPlusAcFormula,
  type DexMinusAcFormula,
  type NaturalAcFormula,
  type ArmorAcFormula,
  type EffectCondition,
  type EquipmentCondition,
  type ClassLevelCondition,
  type AlwaysCondition,
  type SpellGrant,
  type SpellKnownGrant,
  type SpellPreparedGrant,
  type SpellAlwaysPreparedGrant,
  type SpellCantripGrant,
  type ResourceDefinition,
  type ValueFormula,
  type FixedValueFormula,
  type LevelBasedValueFormula,
  type AbilityBasedValueFormula,
  type SumValueFormula,
  type ResourceRecovery,
  type ShortRestRecovery,
  type LongRestRecovery,
  type NoRecovery,
  type CustomRecovery,
  type AttackDefinition,
  type DamageDefinition,
  type SimpleDamageDefinition,
  type MultiDamageDefinition,
  type DamageEntry,
  type DiceExpression,
  type AttackRange,
  type MeleeRange,
  type RangedRange,
  type TouchRange,
  type AttackProperty,
  type AttackPropertyCustom,
  /* Effect constants */
  RULE_EFFECT_TYPES,
  MOVEMENT_MODES,
  ATTACK_PROPERTIES,
  AUTOMATION_STATUSES,
  SHEET_PROJECTIONS,
  ROLL_TYPES,
  ROLL_MODES,
  CAPABILITY_TYPES,
  /* Effect guards */
  isRuleEffectType,
  isMovementMode,
  isAutomationStatus,
  isSheetProjection,
  isRollType,
  isRollMode,
  /* Effect validator */
  isRuleEffect,
  /* Metadata validators */
  isRuleEffectMetadata,
  isEffectPresentation,
  isEffectOrigin,
  /* Roll validators */
  isRollPredicate,
  /* Immunity validator */
  isImmunityDefinition,
  /* Capability validator */
  isCapabilityDefinition,
  /* Supporting validators */
  isProficiencyRef,
  isSenseDefinition,
  isArmorClassFormula,
  isEffectCondition,
  isSpellGrant,
  isResourceDefinition,
  isValueFormula,
  isResourceRecovery,
  isAttackDefinition,
  isDamageDefinition,
  isDamageEntry,
  isDiceExpression,
  isAttackRange,
  isAttackProperty,
  /* Effect metadata factory */
  createRuleEffectMetadata,
  /* Effect factories */
  createAddAbilityEffect,
  createSetAbilityEffect,
  createAddProficiencyEffect,
  createAddExpertiseEffect,
  createAddLanguageEffect,
  createSetMovementEffect,
  createAddMovementEffect,
  createAddSenseEffect,
  createAddResistanceEffect,
  createAddImmunityEffect,
  createConditionalRollModeEffect,
  createAddCapabilityEffect,
  createSetAcFormulaEffect,
  createAddAcEffect,
  createGrantSpellEffect,
  createGrantResourceEffect,
  createGrantAttackEffect,
  createGrantFeatureEffect,
  /* Immunity definition factories */
  createDamageImmunity,
  createConditionImmunity,
  createDiseaseImmunity,
  createMagicalSleepImmunity,
  /* Capability definition factories */
  createNoBreathingRequiredCapability,
  createNoFoodRequiredCapability,
  createNoWaterRequiredCapability,
  createNoSleepRequiredCapability,
  createWaterBreathingCapability,
  /* Roll predicate factories */
  createAbilityRollPredicate,
  createSkillRollPredicate,
  createConditionRollPredicate,
  createDamageTypeRollPredicate,
  createConcentrationRollPredicate,
  /* Effect presentation factory */
  createEffectPresentation,
  /* Effect origin factory */
  createEffectOrigin,
  /* Supporting type factories */
  createProficiencySkillRef,
  createProficiencyToolRef,
  createProficiencyArmorRef,
  createProficiencySavingThrowRef,
  createProficiencyWeaponRef,
  createDarkvisionSense,
  createBlindsenseSense,
  createTremorsenseSense,
  createTruesightSense,
  createGenericSense,
  createBaseAcFormula,
  createDexAcFormula,
  createDexPlusAcFormula,
  createDexMinusAcFormula,
  createNaturalAcFormula,
  createArmorAcFormula,
  createEquipmentCondition,
  createClassLevelCondition,
  createAlwaysCondition,
  createSpellKnownGrant,
  createSpellPreparedGrant,
  createSpellAlwaysPreparedGrant,
  createSpellCantripGrant,
  createResourceDefinition,
  createFixedValueFormula,
  createLevelBasedValueFormula,
  createAbilityBasedValueFormula,
  createSumValueFormula,
  createShortRestRecovery,
  createLongRestRecovery,
  createNoRecovery,
  createCustomRecovery,
  createAttackDefinition,
  createSimpleDamageDefinition,
  createMultiDamageDefinition,
  createDiceExpression,
  createMeleeRange,
  createRangedRange,
  createTouchRange,
} from "./effect";

export {
  /* Class progression types */
  type LevelGrant,
  type FeatureGrant,
  type ChoiceGrant,
  type SubclassChoiceGrant,
  type AbilityScoreImprovementGrant,
  type SpellProgressionGrant,
  type ResourceProgressionGrant,
  type SpellLevelGrant,
  type SpellcastingProgression,
  type LevelDefinition,
  type ClassRule,
  /* Class progression validators */
  isLevelGrant,
  isSpellLevelGrant,
  isSpellcastingProgression,
  isLevelDefinition,
  isClassRule,
  /* Class progression factories */
  createFeatureGrant,
  createChoiceGrant,
  createSubclassChoiceGrant,
  createAbilityScoreImprovementGrant,
  createSpellProgressionGrant,
  createResourceProgressionGrant,
  createSpellLevelGrant,
  createSpellcastingProgression,
  createLevelDefinition,
  createClassRule,
} from "./class-progression";

export {
  /* Species types */
  type TraitDefinition,
  type SpeciesRule,
  /* Species validators */
  isTraitDefinition,
  isSpeciesRule,
  /* Species factories */
  createTraitDefinition,
  createSpeciesRule,
} from "./entity-species";

export {
  /* Background types */
  type BackgroundRule,
  /* Background validator */
  isBackgroundRule,
  /* Background factory */
  createBackgroundRule,
} from "./entity-background";

export {
  /* Subclass types */
  type SubclassRule,
  /* Subclass validator */
  isSubclassRule,
  /* Subclass factory */
  createSubclassRule,
} from "./entity-subclass";

export {
  /* Class feature types */
  type ClassFeatureRule,
  /* Class feature validator */
  isClassFeatureRule,
  /* Class feature factory */
  createClassFeatureRule,
} from "./entity-class-feature";

export {
  /* Subclass feature types */
  type SubclassFeatureRule,
  /* Subclass feature validator */
  isSubclassFeatureRule,
  /* Subclass feature factory */
  createSubclassFeatureRule,
} from "./entity-subclass-feature";

export {
  /* Feat types */
  type FeatRule,
  /* Feat validator */
  isFeatRule,
  /* Feat factory */
  createFeatRule,
} from "./entity-feat";

export {
  /* Spell types */
  type SpellRule,
  /* Spell validator */
  isSpellRule,
  /* Spell factory */
  createSpellRule,
} from "./entity-spell";

export {
  /* Item types */
  type ItemCost,
  type ItemRule,
  /* Item validators */
  isItemCost,
  isItemRule,
  /* Item factories */
  createItemCost,
  createItemRule,
} from "./entity-item";

export {
  /* Optional-feature types */
  type OptionalFeatureRule,
  /* Optional-feature validator */
  isOptionalFeatureRule,
  /* Optional-feature factory */
  createOptionalFeatureRule,
} from "./entity-optional-feature";

export {
  /* Skill types */
  type SkillRule,
  /* Skill validator */
  isSkillRule,
  /* Skill factory */
  createSkillRule,
} from "./entity-skill";

export {
  /* Language types */
  type LanguageRule,
  type LanguageType,
  /* Language constants */
  LANGUAGE_TYPES,
  /* Language guards */
  isLanguageType,
  /* Language validator */
  isLanguageRule,
  /* Language factory */
  createLanguageRule,
} from "./entity-language";

export {
  /* Entity detail response types */
  type EntityDetailResponse,
  /* Entity detail response validator */
  isEntityDetailResponse,
} from "./entity-detail";

export {
  /* Cache envelope schema version */
  CACHE_SCHEMA_VERSION,
  /* Cache envelope types */
  type CacheSchemaVersion,
  type CacheEnvelope,
  /* Expiration policy types */
  type CacheExpirationPolicy,
  type CacheExpirationNoExpiry,
  type CacheExpirationTtl,
  type CacheExpirationAbsolute,
  /* Cache envelope validator */
  isCacheEnvelope,
  /* Expiration policy validator */
  isCacheExpirationPolicy,
  /* Cache envelope factory */
  createCacheEnvelope,
  /* Expiration policy factories */
  createNoExpiryExpiration,
  createTtlExpiration,
  createAbsoluteExpiration,
  /* Cache validity helpers */
  isCacheExpired,
  isCacheValid,
} from "./cache-envelope";

export {
  /* Cache store interface */
  type CatalogCacheStore,
  /* In-memory cache store implementation */
  InMemoryCatalogCacheStore,
} from "./cache-store";

export {
  /* Cache stats type */
  type CacheStats,
  /* Cache manager class (also usable as type) */
  CatalogCacheManager,
} from "./cache-manager";

export {
  /* Cache key builders */
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
  buildEntityCacheKey,
  /* Cache key parser */
  parseCacheKey,
  isCatalogCacheKey,
} from "./cache-keys";

export {
  /* Cache store diagnostic types */
  type CacheStoreDiagnostic,
  type CacheStoreDiagnosticReason,
} from "./cache-store-diagnostic";

export {
  /* Runtime error class */
  CatalogRuntimeError,
} from "./catalog-runtime-error";

export {
  /* Runtime service class */
  CatalogRuntimeService,
  /* Activation state type */
  type CatalogActivationState,
  /* Diagnostics type */
  type CatalogRuntimeDiagnostics,
  /* Fetcher type */
  type Fetcher,
  /* Required catalog reference type */
  type RequiredCatalogReference,
  /* Required catalog reference guard */
  isRequiredCatalogReference,
  /* Activation options type */
  type ActivateOptions,
} from "./catalog-runtime-service";

export {
  /* Kind-to-index-filename mapping */
  KIND_INDEX_FILENAME,
} from "./kind-index-mapping";

export {
  /* Artifact path validation */
  validateArtifactPath,
} from "./artifact-path-utils";

export {
  /* Canonical artifact path composition */
  buildCatalogArtifactUrl,
} from "./catalog-artifact-path";

export {
  /* Branded ID types */
  type EntityId,
  type SourceId,
  type CharacterId,
  type CatalogRevision,
  type ChoiceDefinitionId,
  type ChoiceOptionId,
  type RuleGrantId,
  type ChoiceInstanceId,
  type ClassInstanceId,
  type ItemInstanceId,
  type ResourceId,
  /* Factory functions */
  createEntityId,
  createSourceId,
  createCharacterId,
  createCatalogRevision,
  createChoiceDefinitionId,
  createChoiceOptionId,
  createRuleGrantId,
  createChoiceInstanceId,
  createClassInstanceId,
  createItemInstanceId,
  createResourceId,
  /* String accessors */
  entityIdStr,
  sourceIdStr,
  characterIdStr,
  catalogRevisionStr,
  choiceDefinitionIdStr,
  choiceOptionIdStr,
  ruleGrantIdStr,
  choiceInstanceIdStr,
  classInstanceIdStr,
  itemInstanceIdStr,
  resourceIdStr,
} from "./ids";

export {
  /* Enum types */
  type Ruleset,
  type RuleEntityKind,
  type Ability,
  type ContentAccess,
  type SourceCategory,
  type DiagnosticSeverity,
  /* Enum constants */
  RULESETS,
  RULE_ENTITY_KINDS,
  ABILITIES,
  CONTENT_ACCESSES,
  SOURCE_CATEGORIES,
  DIAGNOSTIC_SEVERITIES,
  /* Enum guards */
  isRuleset,
  isRuleEntityKind,
  isAbility,
  isContentAccess,
  isSourceCategory,
  isDiagnosticSeverity,
} from "./enums";

export {
  /* ID type guards */
  isEntityId,
  isSourceId,
  isCharacterId,
  isCatalogRevision,
  isChoiceDefinitionId,
  isChoiceOptionId,
  isRuleGrantId,
  isChoiceInstanceId,
  isClassInstanceId,
  isItemInstanceId,
  isResourceId,
  /* ID assertion helpers */
  assertEntityId,
  assertSourceId,
  assertCharacterId,
  assertCatalogRevision,
  assertChoiceDefinitionId,
  assertChoiceOptionId,
  assertRuleGrantId,
  assertChoiceInstanceId,
  assertClassInstanceId,
  assertItemInstanceId,
  assertResourceId,
} from "./validators";

export {
  /* Source policy types */
  type CharacterContentPolicy,
  type SourceProfileOrigin,
  type QueryContext,
  /* Source policy factories */
  createCharacterContentPolicy,
  createQueryContext,
  /* Source policy validators */
  isCharacterContentPolicy,
  isQueryContext,
  /* Source policy helpers */
  policyContainsSource,
  queryContextContainsSource,
} from "./source-policy";

export {
  /* Canonical entity ID types */
  type CanonicalEntityKey,
  type CanonicalEntityIdDiagnosticCode,
  type CanonicalEntityIdDiagnostic,
  type CanonicalEntityIdResult,
  type CanonicalEntityIdBatchResult,
  /* Canonical entity ID functions */
  canonicalSourceId,
  canonicalEntityNameSegment,
  createCanonicalEntityId,
  createCanonicalEntityIds,
} from "./canonical-entity-id";

export {
  /* Weapon proficiency types */
  type WeaponCategory,
  type WeaponPropertyRef,
  type ProficiencyGroup,
  /* Weapon proficiency constants */
  WEAPON_CATEGORIES,
  WEAPON_PROPERTY_REFS,
  PROFICIENCY_GROUPS,
  /* Weapon proficiency guards */
  isWeaponCategory,
  isWeaponPropertyRef,
  isProficiencyGroup,
} from "./weapon-proficiency";

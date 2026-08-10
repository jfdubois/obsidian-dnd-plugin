# 03 — Data Contracts

All examples are conceptual TypeScript. The implementation must provide runtime validation for every external or persisted boundary.

## 1. Common identifiers

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

type EntityId = Brand<string, "EntityId">;
type SourceId = Brand<string, "SourceId">;
type CharacterId = Brand<string, "CharacterId">;
type CatalogRevision = Brand<string, "CatalogRevision">;
type ChoiceDefinitionId = Brand<string, "ChoiceDefinitionId">;
type ChoiceOptionId = Brand<string, "ChoiceOptionId">;
type ChoiceInstanceId = Brand<string, "ChoiceInstanceId">;
type ClassInstanceId = Brand<string, "ClassInstanceId">;
type ItemInstanceId = Brand<string, "ItemInstanceId">;
type ResourceId = Brand<string, "ResourceId">;

type Ruleset = "2014" | "2024";
```

## 2. Catalog manifest

```ts
interface CatalogManifest {
  apiVersion: 1;
  schemaVersion: number;
  catalogRevision: CatalogRevision;
  sourceRevision: string;
  builderVersion: string;
  generatedAt: string;
  rulesets: Ruleset[];
  entityKinds: RuleEntityKind[];
  checksums: Record<string, string>;
}
```

## 3. Source metadata

```ts
interface CatalogSource {
  id: SourceId;
  name: string;
  abbreviation: string;
  ruleset: Ruleset;
  published?: string;
  category: "core" | "supplement" | "setting" | "adventure" | "other";
}
```

`category: "core"` is display metadata. It does not grant free access to every record.

## 4. Entity summary

```ts
interface CatalogEntitySummary {
  id: EntityId;
  kind: RuleEntityKind;
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: "core" | "source";
  legacy: boolean;
  tags: string[];
  detailPath: string;
}
```

## 5. Normalized entity

```ts
interface RuleEntity { 
  id: EntityId; 
  kind: RuleEntityKind; 
  name: string; sourceId: 
  SourceId; ruleset: 
  Ruleset; 
  access: "core" | "source"; 
  page?: number; 
  legacy: boolean; 
  summary?: string; 
  content: RenderNode[]; 
  prerequisites: RulePrerequisite[]; 
  effects: RuleEffect[]; 
  choices: ChoiceDefinition[]; 
  dependencies: EntityId[];

  automationStatus: AutomationStatus; 
  displayProjection: SheetProjection;
}
```

`automationStatus` describes the overall support level of the entity or feature.

`displayProjection` identifies where the full entity or feature description is primarily displayed. Individual effects may define different projections.

## 6. Render nodes

Do not pass raw 5eTools entry structures to the plugin.

```ts
type RenderNode =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "list"; ordered: boolean; items: RenderNode[][] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "reference"; entityId: EntityId; label: string }
  | { type: "dice"; expression: string; label?: string }
  | { type: "note"; text: string };
```

Rendering must be safe. No arbitrary HTML or script is accepted from the catalog.

## 7. Choices

```ts
interface ChoiceDefinitionBase {
  id: ChoiceDefinitionId;
  label: string;
  type:
    | "entity"
    | "ability"
    | "skill-proficiency"
    | "tool-proficiency"
    | "language"
    | "equipment"
    | "spell"
    | "feature";
  minimum: number;
  maximum: number;
  repeatable: boolean;
  prerequisites: RulePrerequisite[];
}

type ChoiceDefinition =
  | (ChoiceDefinitionBase & {
      selection: { kind: "entity-query"; optionQuery: CatalogQuery };
    })
  | (ChoiceDefinitionBase & {
      type: "ability";
      selection: {
        kind: "ability-allocation";
        eligibleAbilities: Ability[];
        allowedDistributions: AbilityAllocationDistribution[];
      };
    })
  | (ChoiceDefinitionBase & {
      selection: { kind: "closed-options"; options: ClosedChoiceOption[] };
    });

interface AbilityAllocationDistribution {
  increases: { ability: Ability; increase: number }[];
}

interface ClosedChoiceOption {
  id: ChoiceOptionId;
  label: string;
  content: RenderNode[];
  grants: RuleEffect[];
}
```

`ChoiceOptionId` is the smallest consistent additional branded identifier. It is deterministic and runtime-validated by the normalized catalog contract, is unique and stable within its containing `ChoiceDefinition`, and must encode or be validated against that definition identity. It is never an `EntityId`. A closed-option payload (including a starting-equipment package) belongs to the catalog; a character retains only the selected option identity.

`selection` is exhaustive and runtime-validated. Entity-query choices retain candidate queries, ability-allocation choices retain their eligible abilities and permitted distributions, and closed-option choices retain their source-defined option definitions. The catalog must separately preserve automatic grants, selectable choices, prerequisites/dependencies, and provenance. Future contract work reuses effects, grants, and `ChoiceDefinition` where they fit; it adds vocabulary only when verified structured 2014/2024 data cannot be represented faithfully. An incompatible published catalog change increments the catalog schema version.

## 8. Catalog queries

```ts
type CatalogQuery =
  | EntityQuery
  | SpellQuery
  | ProficiencyQuery
  | EquipmentQuery;

interface QueryContext {
  ruleset: Ruleset;
  enabledSourceIds: SourceId[];
  requiredSourceIds: SourceId[];
  includeCore: true;
}
```

Query evaluation must be deterministic for a given catalog revision and input.

## 9. Effects and projections

```ts
type AutomationStatus = 
  | "full" 
  | "partial" 
  | "display-only" 
  | "manual-adjudication";

type SheetProjection = 
  | "armor-class" 
  | "initiative" 
  | "movement" 
  | "senses" 
  | "abilities" 
  | "saving-throws" 
  | "skills" 
  | "defenses" 
  | "proficiencies" 
  | "actions" 
  | "attacks" 
  | "spellcasting" 
  | "resources" 
  | "inventory" 
  | "conditions" 
  | "species-traits" 
  | "class-features" 
  | "feats" 
  | "features-and-traits";

interface EffectPresentation { 
  primary: SheetProjection; 
  secondary: SheetProjection[]; 
}

interface EffectOrigin { 
  entityId: EntityId; 
  sourceId: SourceId; 
  method: "structured" | "reviewed-mapping";
}

interface RuleEffectMetadata { 
  automationStatus: AutomationStatus; 
  presentation: EffectPresentation; 
  origin: EffectOrigin;
}
```

Conditional roll effects use explicit roll and predicate types:

```ts
type RollType = 
  | "saving-throw" 
  | "ability-check" 
  | "skill-check" 
  | "attack-roll"; 

type RollMode = 
  | "advantage" 
  | "disadvantage"; 

type RollPredicate = 
  | { 
    type: "ability"; 
    ability: Ability; 
    } 
  | { 
    type: "skill"; 
    skillId: EntityId; 
    } 
  | { 
    type: "condition"; 
    conditionId: EntityId; 
    purpose: "avoid" | "end" | "avoid-or-end"; 
    } 
  | { 
    type: "damage-type"; 
    damageType: string; 
    } 
  | { 
    type: "concentration"; 
    };
```

Immunities shall not be represented by an ambiguous string:

```ts
type ImmunityDefinition = 
  | { 
    type: "damage"; 
    damageType: string; 
    } 
  | { 
    type: "condition"; 
    conditionId: EntityId; 
    } 
  | { 
    type: "disease"; 
    } 
  | { 
    type: "magical-sleep"; 
    };
```

Capabilities represent mechanical rules that do not necessarily change a numeric total:

```ts
type CapabilityDefinition = 
  | { 
    type: "no-breathing-required"; 
  } 
  | { 
    type: "no-food-required"; 
  } 
  | { 
    type: "no-water-required"; 
  } 
  | { 
    type: "no-sleep-required"; 
  } 
  | { 
    type: "water-breathing"; 
  };
```

The effect union becomes:

```ts
type RuleEffect = RuleEffectMetadata & 
  ( 
    | { type: "add-ability"; ability: Ability; value: number } 
    | { type: "set-ability"; ability: Ability; value: number } 
    | { type: "add-proficiency"; proficiency: ProficiencyRef } 
    | { type: "add-expertise"; skillId: EntityId } 
    | { type: "add-language"; languageId: EntityId } 
    | { type: "set-movement"; mode: MovementMode; value: number } 
    | { type: "add-movement"; mode: MovementMode; value: number } 
    | { type: "add-sense"; sense: SenseDefinition } 
    | { type: "add-resistance"; damageType: string } 
    | { type: "add-immunity"; immunity: ImmunityDefinition } 
    | { 
      type: "conditional-roll-mode"; 
      rollType: RollType; 
      mode: RollMode; 
      predicate: RollPredicate; 
      } 
    | { 
      type: "add-capability"; 
      capability: CapabilityDefinition; 
      } 
    | { type: "set-ac-formula"; formula: ArmorClassFormula } 
    | { 
      type: "add-ac"; 
      value: number; 
      condition?: EffectCondition; 
      } 
    | { 
      type: "grant-spell"; 
      spellId: EntityId; 
      grant: SpellGrant; 
      } 
    | { 
      type: "grant-resource"; 
      resource: ResourceDefinition; 
      } 
    | { 
      type: "grant-attack"; 
      attack: AttackDefinition; 
      } 
    | { 
      type: "grant-feature"; 
      featureId: EntityId; 
      } 
  );
```

A future mechanic that cannot fit an existing discriminated union requires a formal schema change.

Narrative content without a normalized effect remains in `RuleEntity.content`. It shall not be converted into a guessed effect.

## 10. Class progression

```ts
interface ClassRule extends RuleEntity {
  kind: "class";
  hitDie: number;
  primaryAbilities: Ability[];
  savingThrowProficiencies: Ability[];
  startingChoices: ChoiceDefinition[];
  levels: Record<number, LevelDefinition>;
  subclassIds: EntityId[];
  spellcasting?: SpellcastingProgression;
}

interface LevelDefinition {
  level: number;
  grants: LevelGrant[];
}

type LevelGrant =
  | { type: "feature"; featureId: EntityId }
  | { type: "choice"; choiceDefinitionId: ChoiceDefinitionId }
  | { type: "subclass-choice"; choiceDefinitionId: ChoiceDefinitionId }
  | { type: "ability-score-improvement"; choiceDefinitionId: ChoiceDefinitionId }
  | { type: "spell-progression"; progression: SpellLevelGrant }
  | { type: "resource-progression"; resourceId: ResourceId; maximum: ValueFormula };
```

Creator correctness requires usable normalized starting-class coverage in both supported rulesets. A level-one starting class must expose applicable starting proficiencies, saving throws, starting choices, starting-equipment choices, level-one grants/features, and spellcasting/progression data where applicable. A build supporting both rulesets must not silently publish zero usable starting classes for either ruleset; missing coverage is a publication diagnostic. The builder work belongs to P10-CORRECTIVE-I.

The same source-driven rule applies to Species and Background: each selected entity must distinguish automatic consequence, required or optional player choice, display/context information, and unsupported-mechanic diagnostic. The normalized source—not the entity kind or a visual page—decides ownership.

## 11. Character source policy

```ts
interface CharacterContentPolicy {
  ruleset: Ruleset;
  enabledSourceIds: SourceId[];
  mode: "snapshot";
  sourceProfileOrigin?: {
    profileId: string;
    profileRevision: number;
  };
}
```

Required source IDs are normally derived from current references rather than manually authored.

## 12. Character document

```ts
interface CharacterDocument {
  schemaVersion: number;
  id: CharacterId;

  catalog: {
    catalogSchemaVersion: number;
    createdWithRevision: CatalogRevision;
    lastValidatedRevision: CatalogRevision;
  };

  contentPolicy: CharacterContentPolicy;

  identity: {
    name: string;
    playerName?: string;
    portraitPath?: string;
    pronouns?: string;
    alignment?: string;
    notes?: string;
  };

  progression: {
    classes: CharacterClassState[];
    experiencePoints?: number;
  };

  origins: {
    speciesId: EntityId;
    backgroundId: EntityId;
  };

  selections: Record<ChoiceInstanceId, CharacterChoice>;
  abilities: CharacterAbilityState;
  spells: CharacterSpellState;
  inventory: InventoryItemInstance[];
  resources: CharacterResourceState;
  overrides: CharacterOverrides;

  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}
```

## 13. Current class state

```ts
interface CharacterClassState {
  instanceId: ClassInstanceId;
  classId: EntityId;
  level: number;
  isStartingClass: boolean;
  subclassId?: EntityId;
  hitPointIncreases: HitPointIncrease[];
}
```

## 14. Selected choices

```ts
interface CharacterChoice {
  instanceId: ChoiceInstanceId;
  definitionId: ChoiceDefinitionId;
  originGrantId: EntityId;
  selectedValue: CharacterChoiceSelectedValue;
}

type CharacterChoiceSelectedValue =
  | { kind: "entity-ids"; entityIds: EntityId[] }
  | {
      kind: "ability-allocation";
      increases: { ability: Ability; increase: number }[];
    }
  | { kind: "closed-option"; optionId: ChoiceOptionId };
```

The discriminator and every nested value are runtime-validatable and exhaustive. The persisted choice preserves instance identity, choice-definition identity, origin grant/entity identity, and the typed selected value. It retains no candidate list and copies no catalog definition.

When implementation raises the character schema version, a deterministic runtime-validated migration maps each valid legacy `selectedOptionIds: EntityId[]` value losslessly to `{ kind: "entity-ids", entityIds: selectedOptionIds }`. It must reject invalid legacy values with a diagnostic, never silently replace a selection, add candidates, or copy catalog definitions. Migration tests remain mandatory even if no production character currently uses the old schema.

## 15. Spell state

```ts
interface CharacterSpellSelection {
  spellId: EntityId;
  classInstanceId?: ClassInstanceId;
  originGrantId?: EntityId;
  acquisition:
    | "known"
    | "prepared"
    | "always-prepared"
    | "species"
    | "background"
    | "feat"
    | "item";
}

interface CharacterSpellState {
  selections: CharacterSpellSelection[];
  spellSlotsUsed: Record<number, number>;
  pactSlotsUsed?: number;
}
```

## 16. Inventory state

```ts
interface InventoryItemInstance {
  instanceId: ItemInstanceId;
  itemId: EntityId;
  quantity: number;
  equipped: boolean;
  attuned: boolean;
  containerInstanceId?: ItemInstanceId;
  chargesUsed?: number;
  customName?: string;
  notes?: string;
  overrides?: ItemInstanceOverrides;
}
```

Selecting a closed equipment package is distinct from the resulting authoritative inventory or resource state. The selected `ChoiceOptionId` identifies the catalog package; materialized inventory remains character state. The current conceptual contract has no explicit currency field. If a package creates authoritative currency or another missing resource, future implementation must add a typed persisted contract for that resulting state rather than hiding it in a generic choice payload.

## 17. Mutable resources

```ts
interface CharacterResourceState {
  currentHp: number;
  temporaryHp: number;
  deathSaves: { successes: number; failures: number };
  hitDiceUsed: Record<ClassInstanceId, number>;
  featureUses: Record<ResourceId, number>;
  conditions: EntityId[];
}
```

## 18. Derived snapshot

```ts
interface DerivedCharacterSnapshot { 
  characterId: CharacterId; 
  catalogRevision: CatalogRevision; 
  characterStateHash: string; 
  totalLevel: number; 
  proficiencyBonus: DerivedNumber; 
  abilities: Record<Ability, DerivedAbility>; 
  savingThrows: Record<Ability, DerivedNumber>; 
  skills: Record<EntityId, DerivedNumber>; 
  armorClass: DerivedNumber; 
  initiative: DerivedNumber; 
  movement: DerivedMovement; 
  hitPoints: { 
    maximum: DerivedNumber; 
    current: number; 
    temporary: number; 
  }; 
  attacks: DerivedAttack[]; 
  spellcasting: DerivedSpellcasting[]; 
  resources: DerivedResource[]; 

  defenses: DerivedDefense[]; 
  conditionalRollEffects: DerivedConditionalRollEffect[]; 
  capabilities: DerivedCapability[]; 
  features: DerivedFeature[]; 

  projections: Record< 
    SheetProjection, 
    DerivedFeatureReference[] 
  >; 

  diagnostics: Diagnostic[]; 
}
```

A projected feature reference shall retain the normalized source entity or feature ID.

The same normalized effect may appear in multiple projection arrays, but it shall not be evaluated more than once.

```ts
interface DerivedNumber {
  total: number;
  contributions: Contribution[];
}
```

## 19. Cache envelopes

```ts
interface CacheEnvelope<T> {
  cacheSchemaVersion: number;
  catalogRevision: CatalogRevision;
  inputHash: string;
  createdAt: string;
  value: T;
}
```

A cache envelope is invalid when the schema version, catalog revision, or input hash does not match.

## 20. D&D Beyond reference interpretation

The provided character response contains a hydrated combination of character state, selected choices, candidate option IDs, choice definitions, class definitions, current inventory definitions, modifiers, and progression metadata. This supports the project's hybrid architecture, but it does not prove that D&D Beyond stores the exact response as its internal persistence model.

Project decision:

- persist current selections and mutable state;
- retain origin grants;
- derive future grants from normalized class progression;
- query or cache candidate IDs;
- do not embed the complete catalog in character files.

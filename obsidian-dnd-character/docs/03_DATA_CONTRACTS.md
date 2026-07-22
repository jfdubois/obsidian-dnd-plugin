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
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: "core" | "source";
  page?: number;
  legacy: boolean;
  summary?: string;
  content: RenderNode[];
  prerequisites: RulePrerequisite[];
  effects: RuleEffect[];
  choices: ChoiceDefinition[];
  dependencies: EntityId[];
}
```

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
interface ChoiceDefinition {
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
  optionQuery: CatalogQuery;
  prerequisites: RulePrerequisite[];
}
```

A choice definition describes how candidates are found. It must not embed a permanent complete future candidate list unless the source itself defines a fixed closed set and embedding is part of the normalized contract.

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

## 9. Effects

```ts
type RuleEffect =
  | { type: "add-ability"; ability: Ability; value: number }
  | { type: "set-ability"; ability: Ability; value: number }
  | { type: "add-proficiency"; proficiency: ProficiencyRef }
  | { type: "add-expertise"; skillId: EntityId }
  | { type: "add-language"; languageId: EntityId }
  | { type: "set-movement"; mode: MovementMode; value: number }
  | { type: "add-movement"; mode: MovementMode; value: number }
  | { type: "add-sense"; sense: SenseDefinition }
  | { type: "add-resistance"; damageType: string }
  | { type: "add-immunity"; immunity: string }
  | { type: "set-ac-formula"; formula: ArmorClassFormula }
  | { type: "add-ac"; value: number; condition?: EffectCondition }
  | { type: "grant-spell"; spellId: EntityId; grant: SpellGrant }
  | { type: "grant-resource"; resource: ResourceDefinition }
  | { type: "grant-attack"; attack: AttackDefinition }
  | { type: "grant-feature"; featureId: EntityId };
```

A future mechanic that cannot fit an existing discriminated union requires a formal schema change.

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
  selectedOptionIds: EntityId[];
}
```

This structure follows the useful principle observed in the D&D Beyond sample: retain the selected value and its originating choice/grant. Unlike a hydrated response, do not permanently store all possible candidate options.

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
  features: DerivedFeature[];
  diagnostics: Diagnostic[];
}

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

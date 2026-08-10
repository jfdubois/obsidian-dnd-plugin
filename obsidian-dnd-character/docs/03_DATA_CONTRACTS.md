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
  grants: RuleGrant[];
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
  prerequisites: RulePrerequisite[];
}

type QueryChoiceDefinitionType =
  | "entity"
  | "skill-proficiency"
  | "tool-proficiency"
  | "language"
  | "equipment"
  | "spell"
  | "feature";

interface QueryChoiceDefinition extends ChoiceDefinitionBase {
  type: QueryChoiceDefinitionType;
  minimum: number;
  maximum: number;
  repeatable: boolean;
  optionQuery: CatalogQuery;
}

interface AbilityAllocationChoiceDefinition extends ChoiceDefinitionBase {
  type: "ability-allocation";
  eligibleAbilities: Ability[];
  distributions: AbilityAllocationDistribution[];
}

interface AbilityAllocationDistribution {
  bonuses: number[];
}

interface ClosedOptionChoiceDefinition extends ChoiceDefinitionBase {
  type: "closed-option";
  minimum: number;
  maximum: number;
  repeatable: boolean;
  options: ChoiceOption[];
}

type ChoiceDefinition =
  | QueryChoiceDefinition
  | AbilityAllocationChoiceDefinition
  | ClosedOptionChoiceDefinition;

interface ChoiceOption {
  id: ChoiceOptionId;
  label: string;
  grants: RuleGrant[];
  choices: ChoiceDefinition[];
}

type RuleGrant =
  | { type: "entity"; entityId: EntityId }
  | { type: "effect"; effect: RuleEffect }
  | { type: "item"; itemId: EntityId; quantity: number }
  | { type: "named-item"; name: string; quantity: number }
  | {
      type: "currency";
      denomination: CurrencyDenomination;
      amount: number;
    };

type CurrencyDenomination = "cp" | "sp" | "ep" | "gp" | "pp";

type ChoiceOptionGrant = RuleGrant;
```

Query-backed choices select canonical `EntityId` values. Their semantic meaning comes from `ChoiceDefinition.type`, never from the creator page where they render. They retain `minimum`, `maximum`, `repeatable`, `optionQuery`, and prerequisites; their selections later use the `entity-ids` selected-value variant.

Ability allocation is not an `EntityId` query and does not replace global base ability generation (`standard array`, `point buy`, `manual`, or `rolled`). `bonuses` are magnitudes rather than assignments. Runtime validation requires non-empty, non-duplicated eligible abilities; at least one non-empty distribution; positive integer bonuses; and deterministic rejection or canonicalization of duplicate equivalent distributions. The creator validates actual assignments against one allowed distribution.

`ChoiceOptionId` is a project-owned branded identifier, distinct from `EntityId`, that is deterministic, runtime-validated, catalog-owned, unique within its containing definition, and stable enough to identify a closed option without copying its definition to character state. The builder owns generation and must not derive it from display text alone; it may use its definition identity with a deterministic source-local key, path, or digest consistent with project ID conventions.

`RuleGrant` is the one strict vocabulary for automatic entity consequences and selected closed-option consequences; `ChoiceOptionGrant` is a compatibility alias, not a second union. Its variants are limited to normalized entity, effect, item, named-item, and currency consequences. `entity` references resolve; item and named-item quantities are positive integers; currency amount is a positive integer in a supported denomination, rejecting no-op grants. No raw, generic, or free-form mechanical payload is valid.

`RuleEntity.effects` holds direct automatic mechanics while an entity is active, such as a fixed proficiency where an existing RuleEffect faithfully represents it, movement, senses, ability modifiers, resistances, or capabilities. `RuleEntity.grants` holds automatic non-choice consequences that are not direct effects: granted entities, canonical items, named items, and currency. Do not encode an automatic grant as a fake one-option choice or convert an item/currency grant into an effect. The effect grant variant remains for an effect conditional on a selected option or other grant container; unconditional entity-wide effects belong in `RuleEntity.effects`.

A `named-item` is a concrete mundane/non-catalog inventory object. It is valid only when an authoritative structured source explicitly grants a physical equipment item, canonical `ItemRule` resolution was attempted and did not resolve it, and no additional mechanics must be invented. Runtime validation requires `type === "named-item"`, a string `name` that is trimmed and non-empty, and a positive-integer `quantity`. It rejects empty or whitespace-only names, zero, negative, or fractional quantities, arbitrary raw source objects, HTML, and free-form mechanical metadata. A named-item has exactly `type`, `name`, and `quantity`; it must not carry cost, weight, rarity, category, body slot, attunement, effects, raw source, `special`, or generic metadata.

The builder must attempt existing canonical item resolution first: a structured source item that resolves to a canonical `ItemRule` emits the existing `item` grant; only an unresolved structured physical item with a usable normalized name emits `named-item`; all other cases emit an actionable normalization-coverage diagnostic. `named-item` is never a substitute for skipping canonical resolution and no entity-name exceptions are allowed. The builder translates the verified source value into normalized name and quantity only; raw 5eTools field names (including `special`) and raw DTOs remain builder-only and may appear only in internal diagnostics under existing diagnostic rules.

`named-item` carries no mechanical behavior and is not a narrative-mechanics escape hatch. It never produces AC, attack, damage, proficiency, attunement, charges, resources, ability effects, or rule effects. Mechanics must not be inferred from its name: for example, `vestments` has no implied armor, clothing mechanics, body slot, AC, weight, or value. A future explicit catalog resolution or replacement operation may convert a materialized inventory entry to a canonical catalog item; until then it remains non-mechanical. Synthetic `ItemRule` entities are prohibited for these source-named items because unavailable category, rarity, cost, weight, properties, attunement, or body-slot data would require guessed mechanics.

No raw, generic JSON, string-valued special-equipment, or text mechanical payload is published. Source equipment that cannot normalize as an entity, effect, item, named-item, currency, or nested normalized choice produces an actionable coverage/unsupported diagnostic; narrative may remain normalized `RenderNode` content.

`ChoiceOption.choices` intentionally permits a catalog-owned package to combine fixed grants with subordinate player decisions. Every nested definition has its own `ChoiceDefinitionId` and normal origin/provenance rules; character state never copies its definition. A RuleEntity owns automatic effects/grants; a ChoiceOption owns grants conditional on selection; genuine player selections use query, allocation, or closed-option definitions.

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
  startingGrants: RuleGrant[];
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

`ClassRule.effects` and inherited RuleEntity grants use normal class-active semantics. `startingGrants` and `startingChoices` apply only when `CharacterClassState.isStartingClass === true`; they must not activate merely because a later multiclass level is present. `levels[n].grants` remain progression activations triggered by reaching level n. `LevelGrant` is intentionally separate from RuleGrant: it identifies feature/choice/subclass/ASI/spell/resource activation, not concrete item/entity/currency consequences.

Creator correctness requires usable normalized starting-class coverage in both supported rulesets. A level-one starting class must expose applicable starting proficiencies, saves, starting grants, starting choices, starting-equipment choices, level-one grants/features, and spellcasting/progression data where applicable. A build supporting both rulesets must not silently publish zero usable starting classes for either ruleset; missing coverage is a publication diagnostic. The builder work belongs to P10-CORRECTIVE-I.

The same source-driven rule applies to Species and Background: each selected entity may use direct effects, automatic grants, and choices according to source semantics. Fixed mechanics use effects where supported; fixed entities/items/named physical objects/currency use grants; player selections use choices. The normalized source—not the entity kind or a visual page—decides ownership.

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
  currency: CharacterCurrencyState;
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
  | { type: "entity-ids"; entityIds: EntityId[] }
  | {
      type: "ability-allocation";
      allocations: AbilityAllocationSelection[];
    }
  | { type: "option-ids"; optionIds: ChoiceOptionId[] };

interface AbilityAllocationSelection {
  ability: Ability;
  bonus: number;
}
```

The discriminator and every nested value are runtime-validatable and exhaustive. `entity-ids` contains valid entity IDs with duplicates only where the originating definition permits repetition; its semantic minimum/maximum comes from that definition. `ability-allocation` is non-empty, uses valid abilities with positive integer bonuses and no duplicate ability assignment, and must assign eligible abilities using exactly one allowed distribution. `option-ids` contains valid option IDs, permits duplicates only where `repeatable` allows them, and every selected option must exist in the referenced closed-option definition.

The persisted choice preserves instance identity, choice-definition identity, origin grant/entity identity, and the typed selected value. It never persists candidate entities, eligible abilities, distributions, option definitions, package grants, or nested catalog choices. A parent package selection persists its option ID(s); each active nested choice persists separately with its own instance, definition, origin grant, and selected value. Catalog authority relates the parent option to its child definitions for later consequence/finalization resolution.

When implementation raises the character schema version, a deterministic runtime-validated migration maps each valid legacy `selectedOptionIds: EntityId[]` value losslessly to `{ type: "entity-ids", entityIds: selectedOptionIds }`, preserving `instanceId`, `definitionId`, `originGrantId`, and meaningful selection order. It must reject invalid legacy values with a diagnostic, never silently replace a selection, add candidates, or copy catalog definitions. Migration tests remain mandatory even if no production character currently uses the old schema.

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
interface InventoryItemInstanceBase {
  instanceId: ItemInstanceId;
  quantity: number;
  equipped: boolean;
  containerInstanceId?: ItemInstanceId;
  customName?: string;
  notes?: string;
}

interface CatalogInventoryItemInstance extends InventoryItemInstanceBase {
  type: "catalog-item";
  itemId: EntityId;
  attuned: boolean;
  chargesUsed?: number;
  overrides?: ItemInstanceOverrides;
}

interface NamedInventoryItemInstance extends InventoryItemInstanceBase {
  type: "named-item";
  name: string;
}

type InventoryItemInstance =
  | CatalogInventoryItemInstance
  | NamedInventoryItemInstance;
```

Selecting a closed equipment package is distinct from the resulting authoritative inventory or resource state. The selected `ChoiceOptionId` identifies the catalog package; materialized inventory remains character state. A selected package’s `named-item` grant (for example, `name: "vestments", quantity: 1`) remains catalog-owned until future creator finalization materializes a `NamedInventoryItemInstance` with a new `ItemInstanceId`. That instance is authoritative mutable character state, not a copied catalog entity or a persisted package definition.

Both inventory variants retain quantity, organizational `equipped` state, an optional container relationship, and existing custom-name/notes behavior. A named inventory item has a concrete user-visible `name`, may use `customName` where applicable, and may be placed in a container when inventory supports it. It has no `itemId`, cannot be attuned, has no catalog charges, no `ItemRule` overrides, and does not activate catalog mechanics. `equipped` remains organizational/UI state for named items, not a source of mechanical behavior.

The inventory validator is discriminated and exhaustive: catalog inventory requires `type: "catalog-item"`, a valid `itemId`, and its existing catalog fields; named inventory requires `type: "named-item"`, a trimmed non-empty `name`, and the shared valid base fields, while rejecting catalog-only fields. When the already-planned character schema increment is implemented, every valid legacy inventory object with `itemId` migrates losslessly to the `catalog-item` variant by adding `type: "catalog-item"`; no legacy item becomes `named-item`. Named inventory is introduced only by explicit future operations such as creator package materialization or later-approved user-created custom inventory support. H2 does not increment implementation constants.

Rule evaluation preserves the distinction: `CatalogInventoryItemInstance` may resolve `ItemRule` mechanics when applicable, while `NamedInventoryItemInstance` contributes no catalog `RuleEffects`. Future Phase 12 inventory/equipment work must preserve this boundary; a named item cannot affect AC, attacks, defenses, resources, or other derived values merely because of its name.

Future acceptance coverage must prove canonical source equipment emits `item`, non-canonical structured physical equipment emits valid `named-item`, and named-item grants never retain raw `special` data or generate `RuleEffects`. It must also prove named-item name/quantity validation; lossless legacy migration to `catalog-item`; required `itemId` for catalog inventory; valid named inventory without `itemId`; named-inventory no-attunement; and authoritative named-inventory materialization without copying a package definition.

```ts
interface CharacterCurrencyState {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}
```

`currency` is authoritative character state near inventory/resources, not a mixed inventory entry. Every balance denomination is a non-negative integer; a new character and deterministic migration initialize balances to zero. A positive catalog RuleGrant currency amount defines an automatic or selected consequence; a later transaction adds it without persisting the grant/package definition.

RuleGrant ownership comes from its normalized container: entity grants from the entity, starting grants from the starting Class, and option grants from choice/option plus parent origin. Entity/effect grants remain catalog-derived; item/named-item/currency grants materialize only in a validated atomic transaction. Rerendering/recalculation is disposable and must never duplicate mutable materialization; this is future J/M work. H3 defines fields only: I performs the already-required catalog schema increment, and character migration remains H1/H2 work.

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

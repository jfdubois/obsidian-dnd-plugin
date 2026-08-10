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
type RuleGrantId = Brand<string, "RuleGrantId">;
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
  | { id: RuleGrantId; type: "entity"; entityId: EntityId }
  | { id: RuleGrantId; type: "effect"; effect: RuleEffect }
  | { id: RuleGrantId; type: "item"; itemId: EntityId; quantity: number }
  | { id: RuleGrantId; type: "named-item"; name: string; quantity: number }
  | {
      id: RuleGrantId;
      type: "currency";
      denomination: CurrencyDenomination;
      amount: CurrencyGrantAmount;
    };

type CurrencyDenomination = "cp" | "sp" | "ep" | "gp" | "pp";

type CurrencyGrantAmount =
  | { type: "fixed"; value: number }
  | { type: "dice"; count: number; dieSides: number; multiplier: number };

type ChoiceOptionGrant = RuleGrant;
```

Query-backed choices select canonical `EntityId` values. Their semantic meaning comes from `ChoiceDefinition.type`, never from the creator page where they render. They retain `minimum`, `maximum`, `repeatable`, `optionQuery`, and prerequisites; their selections later use the `entity-ids` selected-value variant.

Ability allocation is not an `EntityId` query and does not replace global base ability generation (`standard array`, `point buy`, `manual`, or `rolled`). `bonuses` are magnitudes rather than assignments. Runtime validation requires non-empty, non-duplicated eligible abilities; at least one non-empty distribution; positive integer bonuses; and deterministic rejection or canonicalization of duplicate equivalent distributions. The creator validates actual assignments against one allowed distribution.

`ChoiceOptionId` is a project-owned branded identifier, distinct from `EntityId`, that is deterministic, runtime-validated, catalog-owned, unique within its containing definition, and stable enough to identify a closed option without copying its definition to character state. The builder owns generation and must not derive it from display text alone; it may use its definition identity with a deterministic source-local key, path, or digest consistent with project ID conventions.

`RuleGrant` is the one strict vocabulary for automatic entity consequences and selected closed-option consequences; `ChoiceOptionGrant` is a compatibility alias, not a second union. Every published grant carries a runtime-validated, catalog-owned `RuleGrantId`, distinct from `EntityId`. The builder deterministically generates it from the owning normalized consequence scope plus a normalized source/path key: `BackgroundRule.grants` uses background origin plus grant path; `ClassRule.startingGrants` uses class origin plus starting-grant path; `ChoiceOption.grants` uses owning definition and option plus grant path; other entity grants use owning entity plus grant path. It is stable for the same normalized source/configuration and unique within its owner, but never derives solely from display text such as a label, item name, or formula. Deferred equipment resolution preserves the same ID whether the stable source/path intent later publishes an `item` or a `named-item`; it must not derive the ID from the final item ID or fallback name alone. The exact generation helper belongs to I; canonical `EntityId` construction is unchanged.

`CurrencyGrantAmount` is the sole authoritative currency amount representation. A `fixed` amount has exactly an integer `value > 0`; a `dice` amount has positive-integer `count`, integer `dieSides >= 2`, and positive-integer `multiplier` (including `1` for an unmultiplied dice amount). No zero/no-op or fractional amount is valid. The nested discriminant deliberately permits only verified fixed, `NdM`, and `NdM × K` structures: it has no modifier, operator, expression, formula, raw, text, AST, or generic-record escape hatch.

The builder translates supported source dice markup into this normalized shape rather than publishing the markup: for example, a 5d4-times-10 starting-gold alternative becomes `{ type: "currency", denomination: "gp", amount: { type: "dice", count: 5, dieSides: 4, multiplier: 10 } }`. Fixed 10 gp similarly uses `{ type: "fixed", value: 10 }`. The catalog never contains source dice tags, raw formula strings, or raw source records. A creator-relevant currency expression outside this bounded structure emits an actionable normalization-coverage diagnostic identifying, where available, entity, ruleset, source, source field/path, normalizer/component, and unsupported expression shape; it is never averaged, rounded, guessed, converted to narrative, silently omitted, or published raw.

Pinned-source inventory for this boundary is intentionally limited to the supported class starting-gold field. No unsupported arithmetic form was observed:

| Source/ruleset | Field | Structured formula | Fits fixed/dice-multiplier contract |
| --- | --- | --- | --- |
| 2014 PHB Barbarian, Cleric, Druid, Fighter, Paladin, Ranger | `startingEquipment.goldAlternative` | `2d4 × 10` or `5d4 × 10` | Yes — dice |
| 2014 PHB Bard, Rogue, Sorcerer, Warlock, Wizard | `startingEquipment.goldAlternative` | `3d4 × 10`, `4d4 × 10`, or `5d4 × 10` | Yes — dice |
| 2014 PHB Monk | `startingEquipment.goldAlternative` | `5d4` | Yes — dice with multiplier `1` |
| 2024 XPHB core classes | `startingEquipment.goldAlternative` | absent | Not applicable |

`RuleEntity.effects` holds direct automatic mechanics while an entity is active, such as a fixed proficiency where an existing RuleEffect faithfully represents it, movement, senses, ability modifiers, resistances, or capabilities. `RuleEntity.grants` holds automatic non-choice consequences that are not direct effects: granted entities, canonical items, named items, and currency. Do not encode an automatic grant as a fake one-option choice or convert an item/currency grant into an effect. The effect grant variant remains for an effect conditional on a selected option or other grant container; unconditional entity-wide effects belong in `RuleEntity.effects`.

A `named-item` is a concrete mundane/non-catalog inventory object. It is valid only when an authoritative structured source explicitly grants a physical equipment item, canonical `ItemRule` resolution was attempted and did not resolve it, and no additional mechanics must be invented. Runtime validation requires `type === "named-item"`, a string `name` that is trimmed and non-empty, and a positive-integer `quantity`. It rejects empty or whitespace-only names, zero, negative, or fractional quantities, arbitrary raw source objects, HTML, and free-form mechanical metadata. A named-item has exactly `type`, `name`, and `quantity`; it must not carry cost, weight, rarity, category, body slot, attunement, effects, raw source, `special`, or generic metadata.

The builder resolves equipment at its builder-owned deferred resolution boundary, after normalized item/reference context is available. An authoritative canonical source reference is **canonical-reference-required**: it must resolve to an existing `ItemRule` and publish `item`, or emit an unresolved-reference failure/diagnostic; it never becomes a named item merely because a display name is available. An explicit structured physical object without such a reference is **physical-name-with-fallback**: the builder attempts only a deterministic governed mapping to an existing `ItemRule`, publishing `item` if it resolves and otherwise publishing a valid named-item. A constructible canonical ID is not proof that the target entity exists. `named-item` is never a substitute for skipping canonical resolution and no entity-name exceptions or fuzzy display-name matching are allowed. The builder translates the verified source value into normalized name and quantity only; raw 5eTools field names (including `special`) and raw DTOs remain builder-only and may appear only in internal diagnostics under existing diagnostic rules.

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

### Equipment groups

`EquipmentGroup` is a finite, catalog-owned, runtime-validated classification used only for the creator-relevant item groups inventoried from pinned 2014/2024 Background and Class starting equipment. It is not a raw 5eTools token and unknown values are rejected:

```ts
type EquipmentGroup =
  | "artisan-tool"
  | "musical-instrument"
  | "gaming-set"
  | "simple-weapon"
  | "simple-melee-weapon"
  | "martial-weapon"
  | "martial-melee-weapon"
  | "arcane-spellcasting-focus"
  | "holy-spellcasting-focus"
  | "druidic-spellcasting-focus";

interface ItemRule {
  kind: "item";
  // Existing ItemRule fields omitted.
  equipmentGroups: EquipmentGroup[];
}

interface EquipmentQuery {
  type: "equipment";
  category?: EquipmentCategory;
  rarity?: EquipmentRarity;
  bodySlot?: EquipmentBodySlot;
  sourceId?: SourceId;
  access?: ContentAccess;
  equipmentGroups?: EquipmentGroup[];
}
```

`ItemRule.equipmentGroups` is required and is `[]` when no inventoried group applies. An item may have multiple groups. If `EquipmentQuery.equipmentGroups` is absent, it imposes no group restriction. If present, a candidate must belong to at least one requested group; every other query restriction remains conjunctive. Query-backed choice definitions retain only this normalized query, never its candidate list or raw source `equipmentType`/`equipmentTypes` values.

The catalog builder maps raw source values only through a governed mapping and classifies items only from structured item-source fields (not display names): the source item type/classification distinguishes artisan tools, musical instruments, gaming sets, and spellcasting foci; structured weapon category/range classification distinguishes simple, simple-melee, martial, and martial-melee weapons; structured focus classification distinguishes arcane, holy, and druidic foci. Unsupported raw equipment-type values, malformed group structures, and a required group that cannot be derived from structured item data produce actionable normalization-coverage diagnostics.

Pinned creator-equipment inventory establishes the complete H5 set:

| Raw source type | Ruleset/origin examples | Normalized group | Structured item classification source |
| --- | --- | --- | --- |
| `toolArtisan` | 2014 Background Folk Hero/Guild Artisan; 2024 Background Artisan; 2024 Monk alternative | `artisan-tool` | item type/classification for artisan tools |
| `instrumentMusical` | 2014/2024 Background Entertainer; 2014 Bard; 2024 Bard/Monk alternative | `musical-instrument` | item type/classification for musical instruments |
| `setGaming` | 2014 Backgrounds and 2024 Guard/Noble/Soldier/Wayfarer | `gaming-set` | item type/classification for gaming sets |
| `weaponSimple` | 2014 Artificer/Barbarian/Bard/Cleric/Druid/Monk/Sorcerer/Warlock | `simple-weapon` | structured weapon category/classification |
| `weaponSimpleMelee` | 2014 Druid/Paladin/Ranger | `simple-melee-weapon` | structured weapon category plus melee classification |
| `weaponMartial` | 2014 Fighter/Paladin | `martial-weapon` | structured weapon category/classification |
| `weaponMartialMelee` | 2014 Barbarian | `martial-melee-weapon` | structured weapon category plus melee classification |
| `focusSpellcastingArcane` | 2014 Sorcerer/Warlock/Wizard | `arcane-spellcasting-focus` | structured spellcasting-focus classification |
| `focusSpellcastingHoly` | 2014 Cleric/Paladin | `holy-spellcasting-focus` | structured spellcasting-focus classification |
| `focusSpellcastingDruidic` | 2014 Druid | `druidic-spellcasting-focus` | structured spellcasting-focus classification |

The verified 2024 Monk `equipmentTypes: ["instrumentMusical", "toolArtisan"]` shape is one query containing both normalized groups, with ordinary restrictions still conjunctive. It is not a raw array persisted to the catalog and does not require a generalized logical-query language.

### Deferred equipment-resolution intent

Before publication, the catalog builder may hold a transient internal equipment-resolution intent containing only the finalization inputs: deterministic `RuleGrantId`, positive quantity, resolution mode, authoritative canonical reference or governed candidate when applicable, validated fallback physical name only when fallback is permitted, owning scope, and source path/provenance for diagnostics. It is builder-only, not a catalog-contract type, not persisted to character data, and must be fully resolved or diagnosed before published catalog-contract validation.

The modes are exact: `canonical-reference-required` means resolve an actual `ItemRule` or fail, with no named-item fallback; `physical-name-with-fallback` means resolve through a deterministic governed mapping if one exists, otherwise publish a valid named-item. Both reject fuzzy matching and metadata invention. Diagnostics distinguish unsupported raw equipment type, broken authoritative canonical reference, malformed physical named item, unavailable item-classification mapping, and unsupported equipment-query shape. Successfully consumed supported equipment must not also emit a generic unmapped-equipment warning.

### Constrained proficiency scopes and queries

H6 extends, rather than replaces, the exact `ProficiencyRef` vocabulary. Existing exact skill, tool, weapon, armor, saving-throw, and initiative forms remain exact canonical references or their existing finite forms. The extension is only for Class source semantics that cannot truthfully be represented by a specific weapon `EntityId` or a kind-only query.

`WeaponCategory` is a finite normalized vocabulary for the verified Class source universe: `"simple" | "martial"`. It is not a raw 5eTools string. `WeaponPropertyRef` reuses the normalized ItemRule weapon-property classification (the ItemRule property vocabulary is refined to this typed value for weapon properties; no second property list is introduced). H6 requires only `"light"` and `"finesse"`, the values observed in the structured XPHB Class filters. Unknown categories or properties diagnose.

```ts
type WeaponProficiencyScope =
  | { type: "weapon-category"; category: WeaponCategory }
  | {
      type: "weapon-filter";
      category: WeaponCategory;
      requiredProperties: WeaponPropertyRef[];
    };

type AddProficiencyTarget = ProficiencyRef | WeaponProficiencyScope;

interface ProficiencyQuery {
  type: "proficiency";
  kind: ProficiencyQueryKind;
  constraint?:
    | { type: "exact-eligible-ids"; eligibleIds: EntityId[] }
    | { type: "proficiency-groups"; groups: ProficiencyGroup[] };
}

type ProficiencyGroup = "artisan-tool" | "musical-instrument";

interface ItemRule {
  // Existing fields omitted.
  weaponCategory?: WeaponCategory;
  properties: WeaponPropertyRef[];
  proficiencyGroups: ProficiencyGroup[];
}
```

`add-proficiency` accepts `AddProficiencyTarget` through a strict discriminated union. A category scope matches every canonical weapon whose `ItemRule.weaponCategory` equals the scope category. A filter scope additionally requires **all** `requiredProperties`. Matching IDs are derived from the current normalized catalog for display, weapon-use checks, and projections; they are never expanded into an authoritative effect or character-state array. The XPHB Rogue structured `Finesse or Light` source is represented by separate fixed scopes for `martial + finesse` and `martial + light` (plus its simple-category scope), preserving its union without adding OR trees or a predicate language. Structured source may create scopes only in catalog-builder; narrative text remains contextual.

The `constraint` is a strict one-of: absent means the existing kind-only query; `exact-eligible-ids` means a candidate has the requested kind **and** a canonical ID in the source-authored allowlist; `proficiency-groups` means a candidate has the requested kind **and** its `proficiencyGroups` intersects the requested groups. Empty, duplicate, malformed, or mixed constraints are invalid. H6 source inventory requires no exact-ID-plus-group combination. The source allowlist is authoritative catalog rule data, not an evaluated candidate cache: every included ID resolves under normal reference-integrity rules or the builder emits an unresolved-reference failure, and names, definitions, candidate results, and raw tokens are never copied into the query.

`ProficiencyGroup` is catalog-owned and semantically separate from `EquipmentGroup`, even where the labels coincide. The canonical selectable target for verified tool proficiency is the existing `ItemRule`; catalog-builder may derive both classifications once from authoritative structured item fields, but `proficiencyGroups` is used only by `ProficiencyQuery` and `equipmentGroups` only by `EquipmentQuery`. Multiple proficiency groups have OR/intersection semantics inside the group constraint. Equipment ownership and tool-proficiency mechanics remain distinct.

Pinned PHB/XPHB Class inventory for this contract is bounded to the following creator-relevant shapes:

| Raw source shape | Ruleset/Class examples | Semantic meaning | Proposed normalized representation |
| --- | --- | --- | --- |
| `startingProficiencies.weapons: ["simple"]` | PHB/XPHB Barbarian, Bard, Cleric, Fighter, Monk, Paladin, Ranger, Sorcerer, Warlock; XPHB Druid/Wizard | Fixed category proficiency | `weapon-category { category: "simple" }` |
| `startingProficiencies.weapons: ["martial"]` | PHB/XPHB Barbarian, Fighter, Paladin, Ranger | Fixed category proficiency | `weapon-category { category: "martial" }` |
| `weaponProficiencies.all.fromFilter: type=martial weapon|property=light` | XPHB Monk | Fixed martial weapon proficiency with Light | `weapon-filter { category: "martial", requiredProperties: ["light"] }` |
| `weaponProficiencies.all.fromFilter: type=martial weapon|property=light;finesse` | XPHB Rogue | Fixed martial weapon proficiency with Finesse **or** Light | Two fixed filter scopes, one for `finesse`, one for `light`; no candidate expansion or generic OR query |
| `startingProficiencies.skills[].choose.from` plus `count` | PHB/XPHB Barbarian, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard | Choose the stated count from the exact source-authored skill list | skill `ProficiencyQuery` with `exact-eligible-ids`; ChoiceDefinition preserves count |
| `startingProficiencies.skills[].any` | PHB/XPHB Bard | Choose from the existing kind-wide skill universe | existing kind-only skill `ProficiencyQuery`; ChoiceDefinition preserves count |
| `toolProficiencies.anyArtisansTool` | PHB/XPHB Monk | Choose stated number of artisan-tool proficiencies | tool `ProficiencyQuery` with `proficiency-groups: ["artisan-tool"]` |
| `toolProficiencies.anyMusicalInstrument` | PHB/XPHB Bard and Monk | Choose stated number of musical-instrument proficiencies | tool `ProficiencyQuery` with `proficiency-groups: ["musical-instrument"]` |
| exact weapon/tool/armor/save fields and exact named tool keys | PHB Bard/Druid/Monk/Rogue and both rulesets generally | Specific canonical proficiency or existing finite form | existing exact `ProficiencyRef` |

Other inventoried Class proficiency fields (`armor`, saving-throw `proficiency`, exact named tools, and narrative display arrays) use existing exact/finite contracts or remain contextual; none requires another H6 query constraint. The builder maps raw category, property, group, and skill-name/reference forms to normalized values only. It diagnoses unknown weapon category, unsupported structured weapon filter, unknown weapon property, unresolved exact skill eligibility reference, unknown tool proficiency group, malformed proficiency-group choice, and unsupported structured proficiency source shape; successfully consumed structures do not also emit generic unmapped diagnostics.

Character persistence remains unchanged by H6: `CharacterChoice.selectedValue` stores only the selected canonical EntityIds for Class skill/tool choices. Eligible IDs, proficiency groups, scope matches, evaluated candidates, and copied ItemRule/SkillRule definitions remain catalog-owned. Catalog schema stays in the pending v2 increment and now includes scoped proficiency targets, constrained `ProficiencyQuery`, and ItemRule proficiency-group/weapon classification; character schema stays in its pending v2 increment with no additional H6 version.

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

`currency` is authoritative character state near inventory/resources, not a mixed inventory entry. Every balance denomination is a non-negative integer; a new character and deterministic migration initialize balances to zero. A positive catalog RuleGrant currency amount defines an automatic or selected consequence; a later transaction adds its fixed value or already-resolved dice integer without persisting the grant/package definition.

RuleGrant ownership comes from its normalized container: entity grants from the entity, starting grants from the starting Class, and option grants from choice/option plus parent origin. Entity/effect grants remain catalog-derived; item/named-item/currency grants materialize only in a validated atomic transaction. A dice definition is catalog data, not a result: future creator draft state maps `RuleGrantId` to an explicitly resolved integer. This correlation is required because the Selection Consequence Model is disposable; it must report a random grant as unresolved or use its existing draft resolution, never call random generation while rendering, recalculating, refreshing diagnostics, changing pages, or opening review.

A selected random currency consequence without a draft resolution is unresolved and blocks final save. Future J implements the explicit resolution command/state behavior using an injectable random-source abstraction suitable for deterministic tests; catalog normalization never rolls. There are no implicit rerolls. A future user-requested reroll, if offered, is an intentional command replacing the draft resolution before finalization. Finalization consumes that existing resolved integer exactly once, so a failed atomic save and retry cannot reroll; it materializes only the integer into `CharacterCurrencyState`. `CharacterDocument` does not copy dice count, die sides, multiplier, raw formula, or catalog grant. I must increment the catalog schema for this finalized RuleGrant structure; the already-required character schema increment remains for H1/H2 typed-choice/currency/inventory migration and needs no dice-formula field.

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

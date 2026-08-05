import type { EntityId, ClassInstanceId, ChoiceInstanceId, ChoiceDefinitionId, ItemInstanceId, CatalogRevision, SourceId } from "@obsidian-dnd/domain";
import { createEntityId, createSourceId, createChoiceInstanceId, createChoiceDefinitionId, createClassInstanceId, createItemInstanceId } from "@obsidian-dnd/domain";
import type { Character } from "@obsidian-dnd/character-contract";
import type { RuleEffect, SpeciesRule, BackgroundRule, ClassRule, ClassFeatureRule, SubclassRule, SubclassFeatureRule, FeatRule, SpellRule, ItemRule } from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup } from "./effect-provenance";

/* ── ID helpers ─────────────────────────────────────────────────── */

export function eid(s: string): EntityId {
  return createEntityId(s);
}

export function sid(s: string): SourceId {
  return createSourceId(s);
}

export function cid(s: string): ClassInstanceId {
  return createClassInstanceId(s);
}

export function iid(s: string): ItemInstanceId {
  return createItemInstanceId(s);
}

export function cii(s: string): ChoiceInstanceId {
  return createChoiceInstanceId(s);
}

export function cdi(s: string): ChoiceDefinitionId {
  return createChoiceDefinitionId(s);
}

/* ── Rule entity factories ──────────────────────────────────────── */

export function makeEffect(type: string, extra: Record<string, unknown> = {}): RuleEffect {
  return {
    automationStatus: "full",
    presentation: { primary: "abilities", secondary: [] },
    origin: { entityId: eid("origin"), sourceId: sid("src-phb"), method: "structured" },
    type,
    ...extra,
  } as unknown as RuleEffect;
}

export function makeSpecies(id: EntityId, effects: RuleEffect[] = []): SpeciesRule {
  return {
    id,
    kind: "species",
    name: "Elf",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    size: "medium",
    speed: 30,
    darkvision: true,
    languageIds: [eid("lang-common")],
    traitDefs: [],
  };
}

export function makeBackground(id: EntityId, effects: RuleEffect[] = []): BackgroundRule {
  return {
    id,
    kind: "background",
    name: "Sage",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    skillProficiencies: [],
  };
}

export function makeClass(id: EntityId, effects: RuleEffect[] = [], extra: Partial<ClassRule> = {}): ClassRule {
  return {
    id,
    kind: "class",
    name: "Rogue",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    hitDie: 8,
    primaryAbilities: ["DEX"],
    savingThrowProficiencies: ["DEX", "INT"],
    startingChoices: [],
    levels: {},
    subclassIds: [],
    ...extra,
  };
}

export function makeClassFeature(id: EntityId, parentId: EntityId, level: number, effects: RuleEffect[] = []): ClassFeatureRule {
  return {
    id,
    kind: "class-feature",
    name: "Feature",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    parentId,
    level,
  };
}

export function makeSubclass(id: EntityId, parentId: EntityId, effects: RuleEffect[] = [], featureIds: EntityId[] = []): SubclassRule {
  return {
    id,
    kind: "subclass",
    name: "Subclass",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    parentId,
    levelRequirement: 3,
    featureIds,
  };
}

export function makeSubclassFeature(id: EntityId, parentId: EntityId, className: string, level: number, effects: RuleEffect[] = []): SubclassFeatureRule {
  return {
    id,
    kind: "subclass-feature",
    name: "Subclass Feature",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    parentId,
    className,
    level,
  };
}

export function makeFeat(id: EntityId, effects: RuleEffect[] = []): FeatRule {
  return {
    id,
    kind: "feat",
    name: "Feat",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
  };
}

export function makeSpell(id: EntityId, effects: RuleEffect[] = []): SpellRule {
  return {
    id,
    kind: "spell",
    name: "Spell",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    school: "evocation",
    level: 0,
    castingTime: "1 action",
    range: "120 ft",
    duration: "instantaneous",
    concentration: false,
    ritual: false,
  };
}

export function makeItem(id: EntityId, effects: RuleEffect[] = [], extra: Partial<ItemRule> = {}): ItemRule {
  return {
    id,
    kind: "item",
    name: "Item",
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects,
    choices: [],
    dependencies: [],
    category: "other",
    rarity: "common",
    requiresAttunement: false,
    bodySlot: undefined,
    weight: 1,
    cost: { amount: 10, unit: "gp" },
    properties: [],
    ...extra,
  };
}

/* ── Character & catalog factories ──────────────────────────────── */

export function makeCharacter(overrides: Partial<Character>): Character {
  return {
    schemaVersion: 1,
    id: "char-1" as Character["id"],
    catalog: { catalogSchemaVersion: 1, createdWithRevision: "rev-1" as CatalogRevision, lastValidatedRevision: "rev-1" as CatalogRevision },
    contentPolicy: { ruleset: "2024" as Character["contentPolicy"]["ruleset"], enabledSourceIds: [] as SourceId[], mode: "snapshot" },
    identity: { name: "Test", playerName: "Player" },
    progression: { classes: [] },
    origins: { speciesId: eid("species-elf"), backgroundId: eid("bg-sage") },
    selections: {},
    abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    spells: { selections: [], spellSlotsUsed: {} },
    inventory: [],
    resources: { currentHp: 10, temporaryHp: 0, deathSaves: { successes: 0, failures: 0 }, hitDiceUsed: {}, featureUses: {}, conditions: [] },
    overrides: {},
    metadata: { createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
    ...overrides,
  };
}

export function makeEmptyCatalog(): CatalogLookup {
  return {
    getSpecies: () => undefined,
    getBackground: () => undefined,
    getClass: () => undefined,
    getClassFeature: () => undefined,
    getSubclass: () => undefined,
    getSubclassFeature: () => undefined,
    getFeat: () => undefined,
    getSpell: () => undefined,
    getItem: () => undefined,
    getOptionalFeature: () => undefined,
    getSkill: () => undefined,
  };
}

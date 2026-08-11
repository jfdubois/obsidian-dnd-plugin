import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createCharacterId,
  createClassInstanceId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
  createItemInstanceId,
  createSourceId,
  createCatalogRevision,
} from "@obsidian-dnd/domain";
import type { Character } from "./character";
import {
  isCharacter,
  createCharacter,
} from "./character";
import { CHARACTER_SCHEMA_VERSION } from "./schema-version";
import { createCharacterIdentity } from "./character-identity";
import { createCharacterCatalogReference } from "./character-catalog";
import { createCharacterClassState } from "./character-class-state";
import { createCharacterChoice } from "./character-choice";
import { createCharacterSpellState } from "./character-spell";
import { createCharacterResourceState } from "./character-resource";

function makeMinimalCharacter(): Character {
  const catalog = createCharacterCatalogReference({
    catalogSchemaVersion: 1,
    createdWithRevision: createCatalogRevision("rev-20240101"),
    lastValidatedRevision: createCatalogRevision("rev-20240101"),
  });

  return createCharacter({
    id: createCharacterId("char-1"),
    catalog,
    contentPolicy: {
      ruleset: "2024",
      enabledSourceIds: [createSourceId("xphb")],
      mode: "snapshot",
    },
    identity: createCharacterIdentity("Aragorn"),
    progression: {
      classes: [
        createCharacterClassState({
          instanceId: createClassInstanceId("cls-1"),
          classId: createEntityId("class:2024:xphb:fighter"),
          level: 5,
          isStartingClass: true,
          hitPointIncreases: [],
        }),
      ],
    },
    origins: {
      speciesId: createEntityId("species:2024:xphb:human"),
      backgroundId: createEntityId("background:2024:xphb:soldier"),
    },
    selections: {},
    abilities: { scores: { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 16 } },
    spells: createCharacterSpellState({
      selections: [],
      spellSlotsUsed: {},
    }),
    inventory: [],
    resources: createCharacterResourceState({
      currentHp: 40,
      temporaryHp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: {},
      featureUses: {},
      conditions: [],
    }),
    overrides: {},
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
  });
}

describe("Character", () => {
  it("accepts valid character", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter(char)).toBe(true);
    expect(char.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
  });

  it("accepts character with selections", () => {
    const char = makeMinimalCharacter();
    char.selections[createChoiceInstanceId("choice-1")] = createCharacterChoice({
      instanceId: createChoiceInstanceId("choice-1"),
      definitionId: createChoiceDefinitionId("choice-def-1"),
      originGrantId: createEntityId("class:2024:xphb:fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("feat:2024:xphb:tough")] },
    });
    expect(isCharacter(char)).toBe(true);
  });

  it("accepts character with inventory", () => {
    const char = makeMinimalCharacter();
    char.inventory.push({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:longsword"),
      quantity: 1,
      equipped: false,
      attuned: false,
    });
    expect(isCharacter(char)).toBe(true);
  });

  it("accepts character with experience points", () => {
    const char = makeMinimalCharacter();
    char.progression.experiencePoints = 15000;
    expect(isCharacter(char)).toBe(true);
  });

  it("rejects character with unsupported schema version", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({ ...char, schemaVersion: 99 })).toBe(false);
  });

  it("rejects character with invalid id", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({ ...char, id: null })).toBe(false);
  });

  it("rejects character with invalid content policy", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({ ...char, contentPolicy: "player-owned" })).toBe(false);
  });

  it("rejects character with null identity", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({ ...char, identity: null })).toBe(false);
  });

  it("rejects character with empty metadata dates", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({ ...char, metadata: { ...char.metadata, createdAt: "" } })).toBe(false);
  });

  it("rejects character with negative experience points", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({
      ...char,
      progression: { ...char.progression, experiencePoints: -1 },
    })).toBe(false);
  });

  it("rejects character with non-entity speciesId", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({
      ...char,
      origins: { ...char.origins, speciesId: null },
    })).toBe(false);
  });

  it("rejects character with invalid choice in selections", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({
      ...char,
      selections: {
        ...char.selections,
        [createChoiceInstanceId("choice-1")]: {},
      },
    })).toBe(false);
  });

  it("rejects character with non-entity condition in resources", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({
      ...char,
      resources: { ...char.resources, conditions: [null] },
    })).toBe(false);
  });

  it("rejects character with invalid ruleset in content policy", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({
      ...char,
      contentPolicy: { ...char.contentPolicy, ruleset: "2016" },
    })).toBe(false);
  });

  it("rejects character with non-snapshot mode", () => {
    const char = makeMinimalCharacter();
    expect(isCharacter({
      ...char,
      contentPolicy: { ...char.contentPolicy, mode: "live" },
    })).toBe(false);
  });
});

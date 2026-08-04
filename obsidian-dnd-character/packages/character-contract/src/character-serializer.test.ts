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
  createCharacter,
} from "./character";
import { CHARACTER_SCHEMA_VERSION } from "./schema-version";
import { createCharacterIdentity } from "./character-identity";
import { createCharacterCatalogReference } from "./character-catalog";
import { createCharacterClassState } from "./character-class-state";
import { createCharacterChoice } from "./character-choice";
import { createCharacterSpellState } from "./character-spell";
import { createCharacterResourceState } from "./character-resource";
import {
  serializeCharacter,
  deserializeCharacter,
  CharacterSerializationError,
} from "./character-serializer";

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

describe("Character serializer", () => {
  describe("serializeCharacter", () => {
    it("produces a valid JSON string", () => {
      const char = makeMinimalCharacter();
      const json = serializeCharacter(char);
      expect(typeof json).toBe("string");
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("preserves schema version in serialized output", () => {
      const char = makeMinimalCharacter();
      const json = serializeCharacter(char);
      const parsed = JSON.parse(json);
      expect(parsed.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
    });

    it("preserves branded IDs as string values", () => {
      const char = makeMinimalCharacter();
      const json = serializeCharacter(char);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe("char-1");
      expect(parsed.origins.speciesId).toBe("species:2024:xphb:human");
      expect(parsed.progression.classes[0].instanceId).toBe("cls-1");
    });

    it("preserves all nested structures", () => {
      const char = makeMinimalCharacter();
      const json = serializeCharacter(char);
      const parsed = JSON.parse(json);
      expect(parsed.identity.name).toBe("Aragorn");
      expect(parsed.contentPolicy.ruleset).toBe("2024");
      expect(parsed.abilities.scores.STR).toBe(15);
      expect(parsed.progression.classes[0].level).toBe(5);
    });
  });

  describe("deserializeCharacter", () => {
    it("round-trips a minimal character", () => {
      const char = makeMinimalCharacter();
      const json = serializeCharacter(char);
      const restored = deserializeCharacter(json);
      expect(restored.id).toBe(char.id);
      expect(restored.schemaVersion).toBe(char.schemaVersion);
      expect(restored.identity.name).toBe(char.identity.name);
    });

    it("round-trips a character with selections", () => {
      const char = makeMinimalCharacter();
      char.selections[createChoiceInstanceId("choice-1")] = createCharacterChoice({
        instanceId: createChoiceInstanceId("choice-1"),
        definitionId: createChoiceDefinitionId("choice-def-1"),
        originGrantId: createEntityId("class:2024:xphb:fighter"),
        selectedOptionIds: [createEntityId("feat:2024:xphb:tough")],
      });
      const json = serializeCharacter(char);
      const restored = deserializeCharacter(json);
      expect(Object.keys(restored.selections).length).toBe(1);
    });

    it("round-trips a character with inventory", () => {
      const char = makeMinimalCharacter();
      char.inventory.push({
        instanceId: createItemInstanceId("item-1"),
        itemId: createEntityId("item:2024:xphb:longsword"),
        quantity: 1,
        equipped: false,
        attuned: false,
      });
      const json = serializeCharacter(char);
      const restored = deserializeCharacter(json);
      expect(restored.inventory.length).toBe(1);
    });

    it("round-trips a character with experience points", () => {
      const char = makeMinimalCharacter();
      char.progression.experiencePoints = 15000;
      const json = serializeCharacter(char);
      const restored = deserializeCharacter(json);
      expect(restored.progression.experiencePoints).toBe(15000);
    });

    it("throws on malformed JSON", () => {
      let thrown: CharacterSerializationError | undefined;
      try {
        deserializeCharacter("{invalid json");
      } catch (err) {
        thrown = err as CharacterSerializationError;
      }
      expect(thrown).toBeInstanceOf(CharacterSerializationError);
      expect(thrown?.reason).toBe("invalid-json");
    });

    it("throws on empty string", () => {
      let thrown: CharacterSerializationError | undefined;
      try {
        deserializeCharacter("");
      } catch (err) {
        thrown = err as CharacterSerializationError;
      }
      expect(thrown).toBeInstanceOf(CharacterSerializationError);
      expect(thrown?.reason).toBe("invalid-json");
    });

    it("throws on invalid schema version", () => {
      const char = makeMinimalCharacter();
      const json = serializeCharacter(char);
      const parsed = JSON.parse(json);
      parsed.schemaVersion = 99;

      let thrown: CharacterSerializationError | undefined;
      try {
        deserializeCharacter(JSON.stringify(parsed));
      } catch (err) {
        thrown = err as CharacterSerializationError;
      }
      expect(thrown).toBeInstanceOf(CharacterSerializationError);
      expect(thrown?.reason).toBe("schema-version-mismatch");
    });

    it("throws on missing required fields", () => {
      const char = makeMinimalCharacter();
      const json = serializeCharacter(char);
      const parsed = JSON.parse(json);
      delete parsed.identity;

      let thrown: CharacterSerializationError | undefined;
      try {
        deserializeCharacter(JSON.stringify(parsed));
      } catch (err) {
        thrown = err as CharacterSerializationError;
      }
      expect(thrown).toBeInstanceOf(CharacterSerializationError);
      expect(thrown?.reason).toBe("invalid-character-structure");
    });

    it("throws on non-object JSON", () => {
      const testCases = ['"just a string"', "42", "null"];
      for (const input of testCases) {
        let thrown: CharacterSerializationError | undefined;
        try {
          deserializeCharacter(input);
        } catch (err) {
          thrown = err as CharacterSerializationError;
        }
        expect(thrown).toBeInstanceOf(CharacterSerializationError);
      }
    });
  });
});

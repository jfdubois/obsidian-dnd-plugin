import { describe, it, expect } from "vitest";
import {
  createEntityId,
} from "@obsidian-dnd/domain";
import {
  isCharacterAbilityState,
  isCharacterResourceState,
  createCharacterResourceState,
  isCharacterOverrides,
} from "./character-resource";

describe("CharacterAbilityState", () => {
  it("accepts valid ability scores", () => {
    expect(isCharacterAbilityState({
      scores: { STR: 10, DEX: 14, CON: 12, INT: 8, WIS: 16, CHA: 11 },
    })).toBe(true);
  });

  it("rejects ability score below 1", () => {
    expect(isCharacterAbilityState({
      scores: { STR: 0, DEX: 14, CON: 12, INT: 8, WIS: 16, CHA: 11 },
    })).toBe(false);
  });

  it("rejects non-integer ability score", () => {
    expect(isCharacterAbilityState({
      scores: { STR: 10.5, DEX: 14, CON: 12, INT: 8, WIS: 16, CHA: 11 },
    })).toBe(false);
  });

  it("rejects invalid ability key", () => {
    expect(isCharacterAbilityState({
      scores: { STR: 10, DEX: 14, CON: 12, INT: 8, WIS: 16, CHA: 11, LUCK: 10 },
    })).toBe(false);
  });
});

describe("CharacterResourceState", () => {
  it("accepts valid resource state", () => {
    const state = createCharacterResourceState({
      currentHp: 30,
      temporaryHp: 5,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: { "d10": 2 },
      featureUses: { "second_wind": 0 },
      conditions: [],
    });
    expect(isCharacterResourceState(state)).toBe(true);
    expect(state.currentHp).toBe(30);
    expect(state.temporaryHp).toBe(5);
  });

  it("accepts resource state with conditions", () => {
    expect(isCharacterResourceState({
      currentHp: 10,
      temporaryHp: 0,
      deathSaves: { successes: 1, failures: 2 },
      hitDiceUsed: {},
      featureUses: {},
      conditions: [createEntityId("condition:2024:xphb:poisoned")],
    })).toBe(true);
  });

  it("rejects resource state with negative current HP", () => {
    expect(isCharacterResourceState({
      currentHp: -1,
      temporaryHp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: {},
      featureUses: {},
      conditions: [],
    })).toBe(false);
  });

  it("rejects resource state with death saves exceeding 3", () => {
    expect(isCharacterResourceState({
      currentHp: 0,
      temporaryHp: 0,
      deathSaves: { successes: 4, failures: 0 },
      hitDiceUsed: {},
      featureUses: {},
      conditions: [],
    })).toBe(false);
  });

  it("rejects resource state with negative hit dice used", () => {
    expect(isCharacterResourceState({
      currentHp: 10,
      temporaryHp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: { "d10": -1 },
      featureUses: {},
      conditions: [],
    })).toBe(false);
  });

  it("rejects resource state with non-entity conditions", () => {
    expect(isCharacterResourceState({
      currentHp: 10,
      temporaryHp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: {},
      featureUses: {},
      conditions: [null],
    })).toBe(false);
  });

  it("factory produces deep copies", () => {
    const conditions = [createEntityId("condition:2024:xphb:poisoned")];
    const state = createCharacterResourceState({
      currentHp: 10,
      temporaryHp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: {},
      featureUses: {},
      conditions,
    });
    expect(state.conditions).not.toBe(conditions);
  });
});

describe("CharacterOverrides", () => {
  it("accepts empty overrides", () => {
    expect(isCharacterOverrides({})).toBe(true);
  });

  it("accepts overrides with ability scores", () => {
    expect(isCharacterOverrides({
      abilityScores: { STR: 12, DEX: 16 },
    })).toBe(true);
  });

  it("rejects overrides with ability score below 1", () => {
    expect(isCharacterOverrides({
      abilityScores: { STR: 0 },
    })).toBe(false);
  });

  it("rejects overrides with invalid ability key", () => {
    expect(isCharacterOverrides({
      abilityScores: { LUCK: 10 },
    })).toBe(false);
  });
});

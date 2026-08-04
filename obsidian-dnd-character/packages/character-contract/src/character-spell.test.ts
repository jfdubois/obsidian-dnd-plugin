import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createClassInstanceId,
} from "@obsidian-dnd/domain";
import {
  isCharacterSpellState,
  createCharacterSpellState,
} from "./character-spell";

describe("CharacterSpellState", () => {
  it("accepts valid spell state", () => {
    const state = createCharacterSpellState({
      selections: [],
      spellSlotsUsed: { 1: 2, 2: 1 },
    });
    expect(isCharacterSpellState(state)).toBe(true);
  });

  it("accepts spell state with pact slots", () => {
    const state = createCharacterSpellState({
      selections: [],
      spellSlotsUsed: {},
      pactSlotsUsed: 3,
    });
    expect(isCharacterSpellState(state)).toBe(true);
    expect(state.pactSlotsUsed).toBe(3);
  });

  it("accepts spell state with selections", () => {
    const state = createCharacterSpellState({
      selections: [
        {
          spellId: createEntityId("spell:2024:xphb:firebolt"),
          acquisition: "known",
        },
      ],
      spellSlotsUsed: { 1: 0 },
    });
    expect(isCharacterSpellState(state)).toBe(true);
  });

  it("rejects spell state with negative spell slots used", () => {
    expect(isCharacterSpellState({
      selections: [],
      spellSlotsUsed: { 1: -1 },
    })).toBe(false);
  });

  it("rejects spell state with non-integer spell slots", () => {
    expect(isCharacterSpellState({
      selections: [],
      spellSlotsUsed: { 1: 1.5 },
    })).toBe(false);
  });

  it("rejects spell state with invalid acquisition type", () => {
    expect(isCharacterSpellState({
      selections: [
        {
          spellId: createEntityId("spell:2024:xphb:firebolt"),
          acquisition: "invalid",
        },
      ],
      spellSlotsUsed: {},
    })).toBe(false);
  });

  it("accepts all valid acquisition types", () => {
    const acquisitions = ["known", "prepared", "always-prepared", "species", "background", "feat", "item"];
    for (const acq of acquisitions) {
      expect(isCharacterSpellState({
        selections: [
          {
            spellId: createEntityId("spell:2024:xphb:firebolt"),
            acquisition: acq,
          },
        ],
        spellSlotsUsed: {},
      })).toBe(true);
    }
  });

  it("rejects spell state with negative pact slots", () => {
    expect(isCharacterSpellState({
      selections: [],
      spellSlotsUsed: {},
      pactSlotsUsed: -1,
    })).toBe(false);
  });

  it("accepts spell selection with class instance and origin grant", () => {
    expect(isCharacterSpellState({
      selections: [
        {
          spellId: createEntityId("spell:2024:xphb:firebolt"),
          classInstanceId: createClassInstanceId("cls-1"),
          originGrantId: createEntityId("class:2024:xphb:wizard"),
          acquisition: "prepared",
        },
      ],
      spellSlotsUsed: {},
    })).toBe(true);
  });
});

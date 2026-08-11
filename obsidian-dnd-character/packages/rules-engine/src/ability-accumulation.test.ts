import { describe, it, expect } from "vitest";
import { calculateAbilityScores } from "./ability-scores";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeSpecies,
  makeBackground,
  makeFeat,
  makeEffect,
  eid,
  cii,
  cdi,
} from "./effect-collection-helpers";

describe("calculateAbilityScores - multi-source accumulation", () => {
  it("accumulates multiple effects on the same ability", () => {
    const speciesEffect = makeEffect("add-ability", { ability: "STR", value: 2 });
    const featEffect = makeEffect("add-ability", { ability: "STR", value: 1 });
    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [speciesEffect]),
      getFeat: () => makeFeat(eid("feat-tough"), [featEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
      selections: {
        [cii("choice-1")]: {
          instanceId: cii("choice-1"),
          definitionId: cdi("def-1"),
          originGrantId: eid("grant-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-tough")] },
        },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const strEntry = result.abilities.find((a) => a.ability === "STR");
    expect(strEntry!.baseScore).toBe(10);
    expect(strEntry!.effectTotal).toBe(3);
    expect(strEntry!.finalScore).toBe(13);
    expect(strEntry!.modifier).toBe(1);
  });

  it("handles effects from multiple sources on different abilities", () => {
    const speciesEffect = makeEffect("add-ability", { ability: "DEX", value: 2 });
    const bgEffect = makeEffect("add-ability", { ability: "INT", value: 1 });
    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [speciesEffect]),
      getBackground: () => makeBackground(eid("bg-sage"), [bgEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const dexEntry = result.abilities.find((a) => a.ability === "DEX");
    expect(dexEntry!.finalScore).toBe(12);
    expect(dexEntry!.modifier).toBe(1);

    const intEntry = result.abilities.find((a) => a.ability === "INT");
    expect(intEntry!.finalScore).toBe(11);
    expect(intEntry!.modifier).toBe(0);

    const strEntry = result.abilities.find((a) => a.ability === "STR");
    expect(strEntry!.finalScore).toBe(10);
    expect(strEntry!.effectTotal).toBe(0);
  });

  it("handles effects that push score across modifier boundaries", () => {
    const speciesEffect = makeEffect("add-ability", { ability: "DEX", value: 2 });
    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [speciesEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 9, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const dexEntry = result.abilities.find((a) => a.ability === "DEX");
    expect(dexEntry!.baseScore).toBe(9);
    expect(dexEntry!.finalScore).toBe(11);
    expect(dexEntry!.modifier).toBe(0);
  });

  it("handles negative effect values (ability reduction)", () => {
    const penaltyEffect = makeEffect("add-ability", { ability: "STR", value: -2 });
    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [penaltyEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 14, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const strEntry = result.abilities.find((a) => a.ability === "STR");
    expect(strEntry!.baseScore).toBe(14);
    expect(strEntry!.effectTotal).toBe(-2);
    expect(strEntry!.finalScore).toBe(12);
    expect(strEntry!.modifier).toBe(1);
  });

  it("ignores non-add-ability effects", () => {
    const nonAbilityEffect = makeEffect("add-proficiency", { proficiency: "athletics" });
    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [nonAbilityEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    for (const entry of result.abilities) {
      expect(entry.effectTotal).toBe(0);
      expect(entry.finalScore).toBe(entry.baseScore);
    }
  });
});

describe("calculateAbilityScores - determinism and structure", () => {
  it("returns abilities in deterministic order", () => {
    const catalog = makeEmptyCatalog();
    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const abilities = result.abilities.map((a) => a.ability);
    expect(abilities).toEqual(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
  });

  it("produces deterministic results across calls", () => {
    const speciesEffect = makeEffect("add-ability", { ability: "STR", value: 2 });
    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [speciesEffect]),
    };
    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result1 = calculateAbilityScores(character, catalog);
    const result2 = calculateAbilityScores(character, catalog);

    expect(result1.abilities).toEqual(result2.abilities);
    expect(result1.abilities[0]!.finalScore).toBe(12);
  });

  it("result abilities array is frozen", () => {
    const catalog = makeEmptyCatalog();
    const character = makeCharacter({});

    const result = calculateAbilityScores(character, catalog);

    expect(Object.isFrozen(result.abilities)).toBe(true);
  });
});

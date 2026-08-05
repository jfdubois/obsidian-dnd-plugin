import { describe, it, expect } from "vitest";
import { calculateAbilityScores } from "./ability-scores";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeSpecies,
  makeBackground,
  makeClass,
  makeEffect,
  eid,
  cid,
} from "./effect-collection-helpers";

describe("calculateAbilityScores - base scores", () => {
  it("returns base scores with zero modifiers when no effects apply", () => {
    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 12, CON: 14, INT: 8, WIS: 16, CHA: 10 },
      },
    });
    const catalog = makeEmptyCatalog();

    const result = calculateAbilityScores(character, catalog);

    expect(result.abilities).toHaveLength(6);

    expect(result.abilities[0]).toEqual({
      ability: "STR",
      baseScore: 10,
      effectTotal: 0,
      finalScore: 10,
      modifier: 0,
    });

    expect(result.abilities[1]).toEqual({
      ability: "DEX",
      baseScore: 12,
      effectTotal: 0,
      finalScore: 12,
      modifier: 1,
    });

    expect(result.abilities[2]).toEqual({
      ability: "CON",
      baseScore: 14,
      effectTotal: 0,
      finalScore: 14,
      modifier: 2,
    });

    expect(result.abilities[3]).toEqual({
      ability: "INT",
      baseScore: 8,
      effectTotal: 0,
      finalScore: 8,
      modifier: -1,
    });

    expect(result.abilities[4]).toEqual({
      ability: "WIS",
      baseScore: 16,
      effectTotal: 0,
      finalScore: 16,
      modifier: 3,
    });

    expect(result.abilities[5]).toEqual({
      ability: "CHA",
      baseScore: 10,
      effectTotal: 0,
      finalScore: 10,
      modifier: 0,
    });
  });

  it("handles extreme high scores (epic)", () => {
    const catalog = makeEmptyCatalog();
    const character = makeCharacter({
      abilities: {
        scores: { STR: 30, DEX: 30, CON: 30, INT: 30, WIS: 30, CHA: 30 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    for (const entry of result.abilities) {
      expect(entry.finalScore).toBe(30);
      expect(entry.modifier).toBe(10);
    }
  });

  it("handles minimum valid score (1)", () => {
    const catalog = makeEmptyCatalog();
    const character = makeCharacter({
      abilities: {
        scores: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    for (const entry of result.abilities) {
      expect(entry.finalScore).toBe(1);
      expect(entry.modifier).toBe(-5);
    }
  });
});

describe("calculateAbilityScores - origin effects", () => {
  it("applies species add-ability effects", () => {
    const speciesEffect = makeEffect("add-ability", { ability: "STR", value: 2 });
    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [speciesEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const strEntry = result.abilities.find((a) => a.ability === "STR");
    expect(strEntry).toBeDefined();
    expect(strEntry!.baseScore).toBe(10);
    expect(strEntry!.effectTotal).toBe(2);
    expect(strEntry!.finalScore).toBe(12);
    expect(strEntry!.modifier).toBe(1);

    const dexEntry = result.abilities.find((a) => a.ability === "DEX");
    expect(dexEntry!.finalScore).toBe(10);
    expect(dexEntry!.effectTotal).toBe(0);
  });

  it("applies background add-ability effects", () => {
    const bgEffect = makeEffect("add-ability", { ability: "INT", value: 1 });
    const catalog = {
      ...makeEmptyCatalog(),
      getBackground: () => makeBackground(eid("bg-sage"), [bgEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const intEntry = result.abilities.find((a) => a.ability === "INT");
    expect(intEntry!.finalScore).toBe(11);
    expect(intEntry!.modifier).toBe(0);
  });

  it("applies class add-ability effects", () => {
    const classEffect = makeEffect("add-ability", { ability: "CON", value: 2 });
    const catalog = {
      ...makeEmptyCatalog(),
      getClass: () => makeClass(eid("class-barbarian"), [classEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
      progression: {
        classes: [
          {
            instanceId: cid("barb-1"),
            classId: eid("class-barbarian"),
            level: 1,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const conEntry = result.abilities.find((a) => a.ability === "CON");
    expect(conEntry!.finalScore).toBe(12);
    expect(conEntry!.modifier).toBe(1);
  });
});

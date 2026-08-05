import { describe, it, expect } from "vitest";
import type { Character } from "@obsidian-dnd/character-contract";
import { calculateArmorClass } from "./armor-class";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeSpecies,
  makeEffect,
  eid,
  cid,
} from "./effect-collection-helpers";
import type { CatalogLookup } from "./effect-provenance";

function buildCatalog(overrides: Partial<CatalogLookup>): CatalogLookup {
  return { ...makeEmptyCatalog(), ...overrides };
}

function makeFighterChar(
  dex: number,
  effects: ReturnType<typeof makeEffect>[],
): [Character, CatalogLookup] {
  const classId = eid("class-fighter");
  return [
    makeCharacter({
      progression: {
        classes: [{ instanceId: cid("f1"), classId, level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: dex, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    }),
    buildCatalog({ getClass: () => makeClass(classId, effects) }),
  ];
}

function makeSpeciesChar(
  dex: number,
  effects: ReturnType<typeof makeEffect>[],
): [Character, CatalogLookup] {
  const speciesId = eid("species-dragonborn");
  return [
    makeCharacter({
      origins: { speciesId, backgroundId: eid("bg-sage") },
      abilities: { scores: { STR: 10, DEX: dex, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    }),
    buildCatalog({ getSpecies: () => makeSpecies(speciesId, effects) }),
  ];
}

/* ── Default DexAcFormula ─────────────────────────────────────────── */

describe("default DexAcFormula", () => {
  it("defaults to 10 + DEX mod", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateArmorClass(char, buildCatalog({}));
    expect(result.total).toBe(12);
    expect(result.formula).toEqual({ type: "dex" });
    expect(result.dexModifier).toBe(2);
    expect(result.dexContribution).toBe(2);
    expect(result.flatBonuses).toBe(0);
  });

  it("handles DEX 10 (mod 0)", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    expect(calculateArmorClass(char, buildCatalog({})).total).toBe(10);
  });

  it("handles negative DEX mod", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 6, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateArmorClass(char, buildCatalog({}));
    expect(result.total).toBe(8);
    expect(result.dexContribution).toBe(-2);
  });
});

/* ── BaseAcFormula ────────────────────────────────────────────────── */

describe("BaseAcFormula", () => {
  it("uses flat base AC ignoring DEX", () => {
    const [char, catalog] = makeSpeciesChar(16, [
      makeEffect("set-ac-formula", { formula: { type: "base", base: 15 } }),
    ]);
    const result = calculateArmorClass(char, catalog);
    expect(result.total).toBe(15);
    expect(result.dexContribution).toBe(0);
  });
});

/* ── DexPlusAcFormula ─────────────────────────────────────────────── */

describe("DexPlusAcFormula", () => {
  it("caps DEX bonus at maxDexBonus", () => {
    const [char, catalog] = makeFighterChar(18, [
      makeEffect("set-ac-formula", { formula: { type: "dex-plus", base: 12, maxDexBonus: 2 } }),
    ]);
    const result = calculateArmorClass(char, catalog);
    expect(result.total).toBe(14); // 12 + min(4, 2)
    expect(result.dexContribution).toBe(2);
  });

  it("uses full DEX bonus when below cap", () => {
    const [char, catalog] = makeFighterChar(14, [
      makeEffect("set-ac-formula", { formula: { type: "dex-plus", base: 12, maxDexBonus: 2 } }),
    ]);
    expect(calculateArmorClass(char, catalog).total).toBe(14); // 12 + min(2, 2)
  });

  it("handles negative DEX", () => {
    const [char, catalog] = makeFighterChar(8, [
      makeEffect("set-ac-formula", { formula: { type: "dex-plus", base: 12, maxDexBonus: 2 } }),
    ]);
    const result = calculateArmorClass(char, catalog);
    expect(result.total).toBe(11); // 12 + min(-1, 2)
    expect(result.dexContribution).toBe(-1);
  });
});

/* ── DexMinusAcFormula ────────────────────────────────────────────── */

describe("DexMinusAcFormula", () => {
  it("floors DEX penalty at dexPenalty", () => {
    const [char, catalog] = makeFighterChar(4, [
      makeEffect("set-ac-formula", { formula: { type: "dex-minus", base: 16, dexPenalty: 1 } }),
    ]);
    const result = calculateArmorClass(char, catalog);
    expect(result.total).toBe(15); // 16 + max(-3, -1)
    expect(result.dexContribution).toBe(-1);
  });

  it("uses full DEX bonus when above floor", () => {
    const [char, catalog] = makeFighterChar(14, [
      makeEffect("set-ac-formula", { formula: { type: "dex-minus", base: 16, dexPenalty: 1 } }),
    ]);
    expect(calculateArmorClass(char, catalog).total).toBe(18); // 16 + max(2, -1)
  });
});

/* ── NaturalAcFormula ─────────────────────────────────────────────── */

describe("NaturalAcFormula", () => {
  it("uses flat natural AC", () => {
    const [char, catalog] = makeSpeciesChar(16, [
      makeEffect("set-ac-formula", { formula: { type: "natural", base: 13 } }),
    ]);
    const result = calculateArmorClass(char, catalog);
    expect(result.total).toBe(13);
    expect(result.formula).toEqual({ type: "natural", base: 13 });
  });
});

/* ── ArmorAcFormula (deferred) ────────────────────────────────────── */

describe("ArmorAcFormula", () => {
  it("returns 0 base (deferred to Phase 12)", () => {
    const [char, catalog] = makeFighterChar(10, [
      makeEffect("set-ac-formula", { formula: { type: "armor" } }),
    ]);
    const result = calculateArmorClass(char, catalog);
    expect(result.formula).toEqual({ type: "armor" });
    expect(result.baseAc).toBe(0);
    expect(result.dexContribution).toBe(0);
  });
});

/* ── Last set-ac-formula wins ─────────────────────────────────────── */

describe("last set-ac-formula wins", () => {
  it("class effect overrides species effect", () => {
    const speciesId = eid("species-dragonborn");
    const classId = eid("class-barbarian");
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(speciesId, [
        makeEffect("set-ac-formula", { formula: { type: "base", base: 13 } }),
      ]),
      getClass: () => makeClass(classId, [
        makeEffect("set-ac-formula", { formula: { type: "dex-plus", base: 11, maxDexBonus: 2 } }),
      ]),
    });
    const char = makeCharacter({
      origins: { speciesId, backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("b1"), classId, level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateArmorClass(char, catalog);
    expect(result.formula.type).toBe("dex-plus");
    expect(result.total).toBe(13); // 11 + min(3, 2)
  });
});

import { describe, it, expect } from "vitest";
import type { Character } from "@obsidian-dnd/character-contract";
import { calculateInitiative } from "./initiative";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeFeat,
  makeEffect,
  eid,
  cid,
  cii,
  cdi,
} from "./effect-collection-helpers";
import type { CatalogLookup } from "./effect-provenance";

function buildCatalog(overrides: Partial<CatalogLookup>): CatalogLookup {
  return { ...makeEmptyCatalog(), ...overrides };
}

function makeFighterChar(
  dex: number,
  level: number,
  effects: ReturnType<typeof makeEffect>[],
): [Character, CatalogLookup] {
  const classId = eid("class-fighter");
  return [
    makeCharacter({
      progression: {
        classes: [{ instanceId: cid("f1"), classId, level, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: dex, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    }),
    buildCatalog({ getClass: () => makeClass(classId, effects) }),
  ];
}

function makeRogueChar(
  dex: number,
  level: number,
  effects: ReturnType<typeof makeEffect>[],
): [Character, CatalogLookup] {
  const classId = eid("class-rogue");
  return [
    makeCharacter({
      progression: {
        classes: [{ instanceId: cid("r1"), classId, level, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: dex, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    }),
    buildCatalog({ getClass: () => makeClass(classId, effects) }),
  ];
}

/* ── Base DEX modifier ─────────────────────────────────────────────── */

describe("base DEX modifier", () => {
  it("uses DEX modifier as base initiative", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateInitiative(char, buildCatalog({}));
    expect(result.dexModifier).toBe(3);
    expect(result.total).toBe(3);
  });

  it("handles DEX 10 (mod 0)", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    expect(calculateInitiative(char, buildCatalog({})).total).toBe(0);
  });

  it("handles negative DEX modifier", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 6, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateInitiative(char, buildCatalog({}));
    expect(result.dexModifier).toBe(-2);
    expect(result.total).toBe(-2);
  });

  it("handles high DEX", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 20, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    expect(calculateInitiative(char, buildCatalog({})).total).toBe(5);
  });
});

/* ── No proficiency, no bonuses ───────────────────────────────────── */

describe("no proficiency, no bonuses", () => {
  it("returns zero flat bonuses when no effects", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateInitiative(char, buildCatalog({}));
    expect(result.isProficient).toBe(false);
    expect(result.flatBonuses).toBe(0);
    expect(result.total).toBe(2);
  });

  it("level 1 character has proficiency bonus 2 in result", () => {
    const [char, catalog] = makeFighterChar(14, 1, []);
    const result = calculateInitiative(char, catalog);
    expect(result.proficiencyBonus).toBe(2);
    expect(result.isProficient).toBe(false);
    expect(result.total).toBe(2); // just DEX mod, no prof applied
  });
});

/* ── Initiative proficiency ───────────────────────────────────────── */

describe("initiative proficiency", () => {
  it("adds proficiency bonus when proficient via class effect", () => {
    const [char, catalog] = makeRogueChar(14, 1, [
      makeEffect("add-proficiency", { proficiency: { kind: "initiative" } }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.isProficient).toBe(true);
    expect(result.proficiencyBonus).toBe(2);
    expect(result.total).toBe(4); // 2 (DEX) + 2 (prof)
  });

  it("uses correct proficiency bonus at level 5", () => {
    const [char, catalog] = makeRogueChar(14, 5, [
      makeEffect("add-proficiency", { proficiency: { kind: "initiative" } }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.proficiencyBonus).toBe(3);
    expect(result.total).toBe(5); // 2 (DEX) + 3 (prof)
  });

  it("does not apply proficiency bonus when not proficient", () => {
    const [char, catalog] = makeFighterChar(14, 1, []);
    const result = calculateInitiative(char, catalog);
    expect(result.isProficient).toBe(false);
    expect(result.total).toBe(2); // just DEX mod
  });

  it("proficiency from non-initiative kind does not count", () => {
    const [char, catalog] = makeFighterChar(14, 1, [
      makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "DEX" } }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.isProficient).toBe(false);
    expect(result.total).toBe(2);
  });
});

/* ── Flat initiative bonuses ──────────────────────────────────────── */

describe("flat initiative bonuses", () => {
  it("adds flat bonus from add-initiative effect", () => {
    const [char, catalog] = makeFighterChar(14, 1, [
      makeEffect("add-initiative", { value: 5 }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.flatBonuses).toBe(5);
    expect(result.total).toBe(7); // 2 (DEX) + 5 (flat)
  });

  it("sums multiple add-initiative effects", () => {
    const [char, catalog] = makeFighterChar(14, 1, [
      makeEffect("add-initiative", { value: 3 }),
      makeEffect("add-initiative", { value: 2 }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.flatBonuses).toBe(5);
    expect(result.total).toBe(7); // 2 (DEX) + 5 (flat)
  });

  it("handles negative initiative bonus", () => {
    const [char, catalog] = makeFighterChar(14, 1, [
      makeEffect("add-initiative", { value: -2 }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.flatBonuses).toBe(-2);
    expect(result.total).toBe(0); // 2 (DEX) + (-2)
  });
});

/* ── Combined effects ─────────────────────────────────────────────── */

describe("combined effects", () => {
  it("combines DEX mod + proficiency + flat bonus", () => {
    const [char, catalog] = makeRogueChar(16, 5, [
      makeEffect("add-proficiency", { proficiency: { kind: "initiative" } }),
      makeEffect("add-initiative", { value: 5 }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.dexModifier).toBe(3);
    expect(result.proficiencyBonus).toBe(3);
    expect(result.isProficient).toBe(true);
    expect(result.flatBonuses).toBe(5);
    expect(result.total).toBe(11); // 3 (DEX) + 3 (prof) + 5 (flat)
  });

  it("handles negative total with combined effects", () => {
    const [char, catalog] = makeFighterChar(4, 1, [
      makeEffect("add-initiative", { value: -5 }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.dexModifier).toBe(-3);
    expect(result.flatBonuses).toBe(-5);
    expect(result.total).toBe(-8); // -3 (DEX) + (-5)
  });

  it("initiative proficiency from feat", () => {
    const featId = eid("feat-observant");
    const charWithFeat = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("f1"), classId: eid("class-fighter"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [featId] },
        },
      },
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const catalogWithFeat = buildCatalog({
      getFeat: () => makeFeat(featId, [
        makeEffect("add-proficiency", { proficiency: { kind: "initiative" } }),
      ]),
    });
    const result = calculateInitiative(charWithFeat, catalogWithFeat);
    expect(result.isProficient).toBe(true);
    expect(result.total).toBe(4); // 2 (DEX) + 2 (prof)
  });
});

/* ── Edge cases ───────────────────────────────────────────────────── */

describe("edge cases", () => {
  it("level 0 character has zero proficiency bonus", () => {
    const char = makeCharacter({
      progression: { classes: [] },
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateInitiative(char, buildCatalog({}));
    expect(result.proficiencyBonus).toBe(0);
    expect(result.total).toBe(2);
  });

  it("max level character has proficiency bonus 8", () => {
    const [char, catalog] = makeRogueChar(14, 30, [
      makeEffect("add-proficiency", { proficiency: { kind: "initiative" } }),
    ]);
    const result = calculateInitiative(char, catalog);
    expect(result.proficiencyBonus).toBe(8);
    expect(result.total).toBe(10); // 2 (DEX) + 8 (prof)
  });

  it("result object is frozen-friendly (no mutation side effects)", () => {
    const char = makeCharacter({
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });
    const result = calculateInitiative(char, buildCatalog({}));
    // Verify all expected fields are present
    expect(result).toHaveProperty("dexModifier");
    expect(result).toHaveProperty("proficiencyBonus");
    expect(result).toHaveProperty("isProficient");
    expect(result).toHaveProperty("flatBonuses");
    expect(result).toHaveProperty("total");
  });
});

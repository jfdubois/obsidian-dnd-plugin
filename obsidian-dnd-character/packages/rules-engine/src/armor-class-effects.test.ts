import { describe, it, expect } from "vitest";
import { calculateArmorClass } from "./armor-class";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeSpecies,
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

/* ── add-ac accumulation ──────────────────────────────────────────── */

describe("calculateArmorClass - add-ac accumulation", () => {
  it("accumulates multiple add-ac effects from different sources", () => {
    const speciesId = eid("species-elf");
    const featId = eid("feat-observant");
    const catalog = buildCatalog({
      getSpecies: () =>
        makeSpecies(speciesId, [makeEffect("add-ac", { value: 1 })]),
      getFeat: () => makeFeat(featId, [makeEffect("add-ac", { value: 2 })]),
    });
    const character = makeCharacter({
      origins: { speciesId, backgroundId: eid("bg-sage") },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [featId] },
        },
      },
      abilities: { scores: { STR: 10, DEX: 12, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateArmorClass(character, catalog);

    expect(result.flatBonuses).toBe(3);
    expect(result.total).toBe(14);
  });

  it("ignores add-ac effects with conditions", () => {
    const featId = eid("feat-shield");
    const catalog = buildCatalog({
      getFeat: () =>
        makeFeat(featId, [
          makeEffect("add-ac", { value: 1 }),
          makeEffect("add-ac", {
            value: 5,
            condition: { type: "equipment", itemIds: [eid("item:shield")] },
          }),
        ]),
    });
    const character = makeCharacter({
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [featId] },
        },
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateArmorClass(character, catalog);

    expect(result.flatBonuses).toBe(1);
    expect(result.total).toBe(11);
  });

  it("handles negative add-ac effects", () => {
    const featId = eid("feat-cursed");
    const catalog = buildCatalog({
      getFeat: () =>
        makeFeat(featId, [makeEffect("add-ac", { value: -2 })]),
    });
    const character = makeCharacter({
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

    const result = calculateArmorClass(character, catalog);

    expect(result.flatBonuses).toBe(-2);
    expect(result.total).toBe(10);
  });
});

/* ── Provenance ───────────────────────────────────────────────────── */

describe("calculateArmorClass - provenance", () => {
  it("includes total level in result", () => {
    const classId = eid("class-rogue");
    const catalog = buildCatalog({
      getClass: () => makeClass(classId, []),
    });
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("rog-1"),
            classId,
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateArmorClass(character, catalog);

    expect(result.totalLevel).toBe(5);
  });

  it("includes total level for multiclass character", () => {
    const fighterId = eid("class-fighter");
    const rogueId = eid("class-rogue");
    const catalog = buildCatalog({
      getClass: (id) => {
        if (id === fighterId) return makeClass(fighterId, []);
        if (id === rogueId) return makeClass(rogueId, []);
        return undefined;
      },
    });
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("fight-1"),
            classId: fighterId,
            level: 3,
            isStartingClass: true,
            hitPointIncreases: [],
          },
          {
            instanceId: cid("rog-1"),
            classId: rogueId,
            level: 2,
            isStartingClass: false,
            hitPointIncreases: [],
          },
        ],
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateArmorClass(character, catalog);

    expect(result.totalLevel).toBe(5);
  });
});

/* ── Combined formula + add-ac ────────────────────────────────────── */

describe("calculateArmorClass - combined formula and bonuses", () => {
  it("combines dex-plus formula with add-ac bonuses", () => {
    const classId = eid("class-fighter");
    const featId = eid("feat-observant");
    const catalog = buildCatalog({
      getClass: () =>
        makeClass(classId, [
          makeEffect("set-ac-formula", {
            formula: { type: "dex-plus", base: 12, maxDexBonus: 2 },
          }),
        ]),
      getFeat: () => makeFeat(featId, [makeEffect("add-ac", { value: 1 })]),
    });
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("fight-1"),
            classId,
            level: 1,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
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

    const result = calculateArmorClass(character, catalog);

    expect(result.baseAc).toBe(14);
    expect(result.flatBonuses).toBe(1);
    expect(result.total).toBe(15);
  });
});

import { describe, it, expect } from "vitest";
import { calculateDefenses } from "./defenses";
import {
  makeCharacter,
  makeEmptyCatalog,
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

/* ── Condition immunities ────────────────────────────────────────── */

describe("calculateDefenses - condition immunities", () => {
  it("detects condition immunity from feat effect", () => {
    const effects = [makeEffect("add-immunity", { immunity: { type: "condition", conditionId: eid("condition:2024:core:poisoned") } })];
    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-poison-resilience"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 4, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-poison-resilience")] },
        },
      },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.conditionImmunities).toEqual([eid("condition:2024:core:poisoned")]);
  });

  it("does not include condition immunities in damage immunities", () => {
    const effects = [makeEffect("add-immunity", { immunity: { type: "condition", conditionId: eid("condition:2024:core:charmed") } })];
    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-anti-charm"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 4, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-anti-charm")] },
        },
      },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.damageImmunities).toEqual([]);
    expect(result.conditionImmunities).toHaveLength(1);
  });
});

/* ── Disease immunity ────────────────────────────────────────────── */

describe("calculateDefenses - disease immunity", () => {
  it("detects disease immunity", () => {
    const effects = [makeEffect("add-immunity", { immunity: { type: "disease" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-undead"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-undead"), backgroundId: eid("bg-sage") },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.hasDiseaseImmunity).toBe(true);
  });

  it("does not set disease immunity when absent", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateDefenses(character, catalog);
    expect(result.hasDiseaseImmunity).toBe(false);
  });
});

/* ── Magical sleep immunity ──────────────────────────────────────── */

describe("calculateDefenses - magical sleep immunity", () => {
  it("detects magical sleep immunity", () => {
    const effects = [makeEffect("add-immunity", { immunity: { type: "magical-sleep" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-elf"), backgroundId: eid("bg-sage") },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.hasMagicalSleepImmunity).toBe(true);
  });

  it("does not set magical sleep immunity when absent", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateDefenses(character, catalog);
    expect(result.hasMagicalSleepImmunity).toBe(false);
  });
});

/* ── Combined immunities ─────────────────────────────────────────── */

describe("calculateDefenses - combined", () => {
  it("collects resistances, damage immunities, and condition immunities together", () => {
    const speciesEffects = [
      makeEffect("add-resistance", { damageType: "cold" }),
      makeEffect("add-immunity", { immunity: { type: "damage", damageType: "poison" } }),
    ];
    const featEffects = [
      makeEffect("add-immunity", { immunity: { type: "condition", conditionId: eid("condition:2024:core:poisoned") } }),
      makeEffect("add-immunity", { immunity: { type: "disease" } }),
    ];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-drow"), speciesEffects),
      getFeat: () => makeFeat(eid("feat-dark-delve"), featEffects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-drow"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 4, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-dark-delve")] },
        },
      },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.resistances).toEqual(["cold"]);
    expect(result.damageImmunities).toEqual(["poison"]);
    expect(result.conditionImmunities).toEqual([eid("condition:2024:core:poisoned")]);
    expect(result.hasDiseaseImmunity).toBe(true);
    expect(result.hasMagicalSleepImmunity).toBe(false);
  });

  it("deduplicates condition immunities", () => {
    const speciesEffects = [makeEffect("add-immunity", { immunity: { type: "condition", conditionId: eid("condition:2024:core:charmed") } })];
    const featEffects = [makeEffect("add-immunity", { immunity: { type: "condition", conditionId: eid("condition:2024:core:charmed") } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), speciesEffects),
      getFeat: () => makeFeat(eid("feat-anti-charm"), featEffects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-elf"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 4, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-anti-charm")] },
        },
      },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.conditionImmunities).toEqual([eid("condition:2024:core:charmed")]);
  });
});

/* ── Determinism ─────────────────────────────────────────────────── */

describe("calculateDefenses - determinism", () => {
  it("same inputs produce identical results", () => {
    const effects = [
      makeEffect("add-resistance", { damageType: "fire" }),
      makeEffect("add-immunity", { immunity: { type: "damage", damageType: "cold" } }),
      makeEffect("add-immunity", { immunity: { type: "disease" } }),
    ];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-dragonborn"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-dragonborn"), backgroundId: eid("bg-sage") },
    });

    const result1 = calculateDefenses(character, catalog);
    const result2 = calculateDefenses(character, catalog);

    expect(result1.resistances).toEqual(result2.resistances);
    expect(result1.damageImmunities).toEqual(result2.damageImmunities);
    expect(result1.conditionImmunities).toEqual(result2.conditionImmunities);
    expect(result1.hasDiseaseImmunity).toBe(result2.hasDiseaseImmunity);
    expect(result1.hasMagicalSleepImmunity).toBe(result2.hasMagicalSleepImmunity);
  });
});

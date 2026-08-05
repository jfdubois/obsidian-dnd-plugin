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

/* ── Empty character baseline ──────────────────────────────────────── */

describe("calculateDefenses - baseline", () => {
  it("returns empty arrays and false flags for character with no effects", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateDefenses(character, catalog);

    expect(result.resistances).toEqual([]);
    expect(result.damageImmunities).toEqual([]);
    expect(result.conditionImmunities).toEqual([]);
    expect(result.hasDiseaseImmunity).toBe(false);
    expect(result.hasMagicalSleepImmunity).toBe(false);
  });

  it("returns frozen arrays", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateDefenses(character, catalog);

    expect(Object.isFrozen(result.resistances)).toBe(true);
    expect(Object.isFrozen(result.damageImmunities)).toBe(true);
    expect(Object.isFrozen(result.conditionImmunities)).toBe(true);
  });
});

/* ── Resistances ─────────────────────────────────────────────────── */

describe("calculateDefenses - resistances", () => {
  it("detects single resistance from species effect", () => {
    const effects = [makeEffect("add-resistance", { damageType: "fire" })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-dragonborn"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-dragonborn"), backgroundId: eid("bg-sage") },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.resistances).toEqual(["fire"]);
  });

  it("detects multiple resistances sorted alphabetically", () => {
    const effects = [
      makeEffect("add-resistance", { damageType: "lightning" }),
      makeEffect("add-resistance", { damageType: "fire" }),
      makeEffect("add-resistance", { damageType: "cold" }),
    ];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-dragonborn"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-dragonborn"), backgroundId: eid("bg-sage") },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.resistances).toEqual(["cold", "fire", "lightning"]);
  });

  it("deduplicates identical resistances from multiple sources", () => {
    const speciesEffects = [makeEffect("add-resistance", { damageType: "fire" })];
    const featEffects = [makeEffect("add-resistance", { damageType: "fire" })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-dragonborn"), speciesEffects),
      getFeat: () => makeFeat(eid("feat-fire-lore"), featEffects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-dragonborn"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 4, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedOptionIds: [eid("feat-fire-lore")],
        },
      },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.resistances).toEqual(["fire"]);
  });
});

/* ── Damage immunities ───────────────────────────────────────────── */

describe("calculateDefenses - damage immunities", () => {
  it("detects damage immunity from species effect", () => {
    const effects = [makeEffect("add-immunity", { immunity: { type: "damage", damageType: "poison" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-undead"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-undead"), backgroundId: eid("bg-sage") },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.damageImmunities).toEqual(["poison"]);
  });

  it("does not include damage immunities in resistances", () => {
    const effects = [makeEffect("add-immunity", { immunity: { type: "damage", damageType: "fire" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-fire-genie"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-fire-genie"), backgroundId: eid("bg-sage") },
    });

    const result = calculateDefenses(character, catalog);
    expect(result.damageImmunities).toEqual(["fire"]);
    expect(result.resistances).toEqual([]);
  });
});

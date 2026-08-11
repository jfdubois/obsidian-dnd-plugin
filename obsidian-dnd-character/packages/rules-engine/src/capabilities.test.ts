import { describe, it, expect } from "vitest";
import { calculateCapabilities } from "./defenses";
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

describe("calculateCapabilities - baseline", () => {
  it("returns all false for character with no effects", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateCapabilities(character, catalog);

    expect(result.noBreathingRequired).toBe(false);
    expect(result.noFoodRequired).toBe(false);
    expect(result.noWaterRequired).toBe(false);
    expect(result.noSleepRequired).toBe(false);
    expect(result.waterBreathing).toBe(false);
  });
});

/* ── Individual capability types ───────────────────────────────── */

describe("calculateCapabilities - no breathing required", () => {
  it("detects no-breathing-required capability", () => {
    const effects = [makeEffect("add-capability", { capability: { type: "no-breathing-required" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-undead"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-undead"), backgroundId: eid("bg-sage") },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noBreathingRequired).toBe(true);
  });

  it("does not set no-breathing-required when absent", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateCapabilities(character, catalog);
    expect(result.noBreathingRequired).toBe(false);
  });
});

describe("calculateCapabilities - no food required", () => {
  it("detects no-food-required capability from feat", () => {
    const effects = [makeEffect("add-capability", { capability: { type: "no-food-required" } })];
    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-ascetic"), effects),
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
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-ascetic")] },
        },
      },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noFoodRequired).toBe(true);
  });
});

describe("calculateCapabilities - no water required", () => {
  it("detects no-water-required capability", () => {
    const effects = [makeEffect("add-capability", { capability: { type: "no-water-required" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-fiend"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-fiend"), backgroundId: eid("bg-sage") },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noWaterRequired).toBe(true);
  });
});

describe("calculateCapabilities - no sleep required", () => {
  it("detects no-sleep-required capability", () => {
    const effects = [makeEffect("add-capability", { capability: { type: "no-sleep-required" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-elf"), backgroundId: eid("bg-sage") },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noSleepRequired).toBe(true);
  });
});

describe("calculateCapabilities - water breathing", () => {
  it("detects water-breathing capability", () => {
    const effects = [makeEffect("add-capability", { capability: { type: "water-breathing" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-merfolk"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-merfolk"), backgroundId: eid("bg-sage") },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.waterBreathing).toBe(true);
  });
});

/* ── Combined capabilities ─────────────────────────────────────── */

describe("calculateCapabilities - combined", () => {
  it("detects multiple capabilities from different sources", () => {
    const speciesEffects = [
      makeEffect("add-capability", { capability: { type: "no-breathing-required" } }),
      makeEffect("add-capability", { capability: { type: "no-sleep-required" } }),
    ];
    const featEffects = [
      makeEffect("add-capability", { capability: { type: "no-food-required" } }),
      makeEffect("add-capability", { capability: { type: "no-water-required" } }),
    ];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-undead"), speciesEffects),
      getFeat: () => makeFeat(eid("feat-ascetic"), featEffects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-undead"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 4, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-ascetic")] },
        },
      },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noBreathingRequired).toBe(true);
    expect(result.noFoodRequired).toBe(true);
    expect(result.noWaterRequired).toBe(true);
    expect(result.noSleepRequired).toBe(true);
    expect(result.waterBreathing).toBe(false);
  });

  it("capability flags are independent (one true does not set others)", () => {
    const effects = [makeEffect("add-capability", { capability: { type: "water-breathing" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-merfolk"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-merfolk"), backgroundId: eid("bg-sage") },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.waterBreathing).toBe(true);
    expect(result.noBreathingRequired).toBe(false);
    expect(result.noFoodRequired).toBe(false);
    expect(result.noWaterRequired).toBe(false);
    expect(result.noSleepRequired).toBe(false);
  });
});

/* ── Deduplication ───────────────────────────────────────────────── */

describe("calculateCapabilities - deduplication", () => {
  it("duplicate capability from multiple sources still sets flag once", () => {
    const speciesEffects = [makeEffect("add-capability", { capability: { type: "no-sleep-required" } })];
    const featEffects = [makeEffect("add-capability", { capability: { type: "no-sleep-required" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), speciesEffects),
      getFeat: () => makeFeat(eid("feat-ascetic"), featEffects),
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
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-ascetic")] },
        },
      },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noSleepRequired).toBe(true);
  });
});

/* ── Determinism ─────────────────────────────────────────────────── */

describe("calculateCapabilities - determinism", () => {
  it("same inputs produce identical results", () => {
    const effects = [
      makeEffect("add-capability", { capability: { type: "no-breathing-required" } }),
      makeEffect("add-capability", { capability: { type: "water-breathing" } }),
    ];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-merfolk"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-merfolk"), backgroundId: eid("bg-sage") },
    });

    const result1 = calculateCapabilities(character, catalog);
    const result2 = calculateCapabilities(character, catalog);

    expect(result1.noBreathingRequired).toBe(result2.noBreathingRequired);
    expect(result1.noFoodRequired).toBe(result2.noFoodRequired);
    expect(result1.noWaterRequired).toBe(result2.noWaterRequired);
    expect(result1.noSleepRequired).toBe(result2.noSleepRequired);
    expect(result1.waterBreathing).toBe(result2.waterBreathing);
  });
});

/* ── Unrelated effects do not affect capabilities ────────────────── */

describe("calculateCapabilities - unrelated effects", () => {
  it("add-resistance effects do not set any capability flags", () => {
    const effects = [makeEffect("add-resistance", { damageType: "fire" })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-dragonborn"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-dragonborn"), backgroundId: eid("bg-sage") },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noBreathingRequired).toBe(false);
    expect(result.noFoodRequired).toBe(false);
    expect(result.noWaterRequired).toBe(false);
    expect(result.noSleepRequired).toBe(false);
    expect(result.waterBreathing).toBe(false);
  });

  it("add-immunity effects do not set any capability flags", () => {
    const effects = [makeEffect("add-immunity", { immunity: { type: "disease" } })];
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-undead"), effects),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-undead"), backgroundId: eid("bg-sage") },
    });

    const result = calculateCapabilities(character, catalog);
    expect(result.noBreathingRequired).toBe(false);
    expect(result.noFoodRequired).toBe(false);
    expect(result.noWaterRequired).toBe(false);
    expect(result.noSleepRequired).toBe(false);
    expect(result.waterBreathing).toBe(false);
  });
});

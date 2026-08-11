import { describe, it, expect } from "vitest";
import { calculateMovementSenses } from "./movement-senses";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeSpecies,
  makeFeat,
  makeSpell,
  makeEffect,
  eid,
  cid,
} from "./effect-collection-helpers";
import type { CatalogLookup } from "./effect-provenance";

function buildCatalog(overrides: Partial<CatalogLookup>): CatalogLookup {
  return { ...makeEmptyCatalog(), ...overrides };
}

/* ── add-sense effects ───────────────────────────────────────────────── */

describe("calculateMovementSenses - add-sense", () => {
  it("add-sense grants truesight", () => {
    const feat = makeFeat(eid("feat-true-seeing"), [
      makeEffect("add-sense", { sense: { type: "truesight", range: 30 } }),
    ]);
    const catalog = buildCatalog({
      getFeat: () => feat,
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("pal-1"), classId: eid("class-paladin"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-true-seeing")] },
        },
      },
    });

    const result = calculateMovementSenses(character, catalog);

    const ts = result.senses.find((e) => e.kind === "truesight")!;
    expect(ts.range).toBe(30);
    expect(ts.hasSense).toBe(true);
  });

  it("multiple senses of same kind take maximum range", () => {
    const spell = makeSpell(eid("spell-darkness-1"), [
      makeEffect("add-sense", { sense: { type: "darkvision", range: 60 } }),
    ]);
    const species = makeSpecies(eid("species-drow"), []);
    const catalog = buildCatalog({
      getSpecies: () => ({ ...species, darkvision: true, darkvisionRange: 100 }),
      getSpell: () => spell,
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-drow"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [
          { spellId: eid("spell-darkness-1"), acquisition: "known" },
        ],
        spellSlotsUsed: {},
      },
    });

    // With species darkvision 100 and spell adding 60, max should be 100
    const result = calculateMovementSenses(character, catalog);
    const dv = result.senses.find((e) => e.kind === "darkvision")!;
    expect(dv.range).toBe(100); // max(100 species, 60 spell)
  });

  it("blindsense maps to blindsight kind", () => {
    const feat = makeFeat(eid("feat-keen-senses"), [
      makeEffect("add-sense", { sense: { type: "blindsense", range: 10 } }),
    ]);
    const catalog = buildCatalog({
      getFeat: () => feat,
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("monk-1"), classId: eid("class-monk"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-keen-senses")] },
        },
      },
    });

    const result = calculateMovementSenses(character, catalog);

    const bs = result.senses.find((e) => e.kind === "blindsight")!;
    expect(bs.range).toBe(10);
    expect(bs.hasSense).toBe(true);
  });

  it("generic sense type is not tracked in standard senses", () => {
    const feat = makeFeat(eid("feat-eaveshear"), [
      makeEffect("add-sense", { sense: { type: "generic", name: "Eaveshear", range: 120 } }),
    ]);
    const catalog = buildCatalog({
      getFeat: () => feat,
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("elf-1"), classId: eid("class-warrior"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-eaveshear")] },
        },
      },
    });

    const result = calculateMovementSenses(character, catalog);

    // All standard senses should be empty
    for (const entry of result.senses) {
      expect(entry.range).toBe(0);
      expect(entry.hasSense).toBe(false);
    }
  });
});

/* ── Movement edge cases ─────────────────────────────────────────────── */

describe("calculateMovementSenses - movement edge cases", () => {
  it("burrow movement mode is not tracked in standard movement", () => {
    const feat = makeFeat(eid("feat-mole"), [
      makeEffect("add-movement", { mode: "burrow", value: 30 }),
    ]);
    const catalog = buildCatalog({
      getFeat: () => feat,
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-mole")] },
        },
      },
    });

    const result = calculateMovementSenses(character, catalog);

    // All standard movement types should be empty (burrow is not tracked)
    for (const entry of result.movement) {
      expect(entry.speed).toBe(0);
      expect(entry.hasMovement).toBe(false);
    }
  });

  it("negative add-movement reduces walk speed", () => {
    const spell = makeSpell(eid("spell-slow"), [
      makeEffect("add-movement", { mode: "walk", value: -10 }),
    ]);
    const species = makeSpecies(eid("species-human"), []);
    const catalog = buildCatalog({
      getSpecies: () => species,
      getSpell: () => spell,
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-human"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [{ spellId: eid("spell-slow"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
    });

    const result = calculateMovementSenses(character, catalog);

    const walk = result.movement.find((e) => e.kind === "walk")!;
    expect(walk.speed).toBe(20); // 30 base - 10
  });
});

/* ── Combined movement and senses ────────────────────────────────────── */

describe("calculateMovementSenses - combined", () => {
  it("returns both movement and senses from species and effects", () => {
    const feat = makeFeat(eid("feat-aerial"), [
      makeEffect("add-movement", { mode: "fly", value: 30 }),
      makeEffect("add-sense", { sense: { type: "tremorsense", range: 10 } }),
    ]);
    const species = makeSpecies(eid("species-drow"), []);
    const catalog = buildCatalog({
      getSpecies: () => ({ ...species, darkvision: true, darkvisionRange: 120 }),
      getFeat: () => feat,
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-drow"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-aerial")] },
        },
      },
    });

    const result = calculateMovementSenses(character, catalog);

    // Walk from species
    const walk = result.movement.find((e) => e.kind === "walk")!;
    expect(walk.speed).toBe(30);
    expect(walk.hasMovement).toBe(true);

    // Fly from feat
    const fly = result.movement.find((e) => e.kind === "fly")!;
    expect(fly.speed).toBe(30);
    expect(fly.hasMovement).toBe(true);

    // Darkvision from species
    const dv = result.senses.find((e) => e.kind === "darkvision")!;
    expect(dv.range).toBe(120);
    expect(dv.hasSense).toBe(true);

    // Tremorsense from feat
    const ts = result.senses.find((e) => e.kind === "tremorsense")!;
    expect(ts.range).toBe(10);
    expect(ts.hasSense).toBe(true);

    // Unused types
    const climb = result.movement.find((e) => e.kind === "climb")!;
    expect(climb.hasMovement).toBe(false);
    const truesight = result.senses.find((e) => e.kind === "truesight")!;
    expect(truesight.hasSense).toBe(false);
  });
});

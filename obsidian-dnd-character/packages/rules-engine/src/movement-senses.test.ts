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

/* ── Baseline tests ──────────────────────────────────────────────────── */

describe("calculateMovementSenses - baseline", () => {
  it("returns zero speeds and ranges for character with no species", () => {
    const character = makeCharacter({
      origins: { speciesId: eid("species-missing"), backgroundId: eid("bg-sage") },
    });
    const catalog = buildCatalog({});

    const result = calculateMovementSenses(character, catalog);

    expect(result.movement).toHaveLength(4);
    for (const entry of result.movement) {
      expect(entry.speed).toBe(0);
      expect(entry.hasMovement).toBe(false);
    }
    expect(result.senses).toHaveLength(4);
    for (const entry of result.senses) {
      expect(entry.range).toBe(0);
      expect(entry.hasSense).toBe(false);
    }
  });

  it("uses correct movement order (walk, climb, fly, swim)", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateMovementSenses(character, catalog);

    const kinds = result.movement.map((e) => e.kind);
    expect(kinds).toEqual(["walk", "climb", "fly", "swim"]);
  });

  it("uses correct sense order (darkvision, blindsight, tremorsense, truesight)", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateMovementSenses(character, catalog);

    const kinds = result.senses.map((e) => e.kind);
    expect(kinds).toEqual(["darkvision", "blindsight", "tremorsense", "truesight"]);
  });
});

/* ── Walk speed from species ─────────────────────────────────────────── */

describe("calculateMovementSenses - species walk speed", () => {
  it("uses species base speed for walk", () => {
    const species = makeSpecies(eid("species-human"), []);
    // makeSpecies defaults speed to 30
    const catalog = buildCatalog({
      getSpecies: () => species,
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-human"), backgroundId: eid("bg-sage") },
    });

    const result = calculateMovementSenses(character, catalog);

    const walk = result.movement.find((e) => e.kind === "walk")!;
    expect(walk.speed).toBe(30);
    expect(walk.hasMovement).toBe(true);
  });

  it("uses species darkvision range when available", () => {
    const species = makeSpecies(eid("species-dwarf"), []);
    // Override darkvisionRange
    const catalog = buildCatalog({
      getSpecies: () => ({ ...species, darkvisionRange: 60 }),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-dwarf"), backgroundId: eid("bg-sage") },
    });

    const result = calculateMovementSenses(character, catalog);

    const dv = result.senses.find((e) => e.kind === "darkvision")!;
    expect(dv.range).toBe(60);
    expect(dv.hasSense).toBe(true);
  });

  it("does not set darkvision if species has darkvision=false", () => {
    const species = makeSpecies(eid("species-human"), []);
    const catalog = buildCatalog({
      getSpecies: () => ({ ...species, darkvision: false }),
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-human"), backgroundId: eid("bg-sage") },
    });

    const result = calculateMovementSenses(character, catalog);

    const dv = result.senses.find((e) => e.kind === "darkvision")!;
    expect(dv.range).toBe(0);
    expect(dv.hasSense).toBe(false);
  });
});

/* ── add-movement effects ────────────────────────────────────────────── */

describe("calculateMovementSenses - add-movement", () => {
  it("add-movement adds to walk speed", () => {
    const feat = makeFeat(eid("feat-mobile"), [
      makeEffect("add-movement", { mode: "walk", value: 10 }),
    ]);
    const species = makeSpecies(eid("species-human"), []);
    const catalog = buildCatalog({
      getSpecies: () => species,
      getFeat: () => feat,
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-human"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-mobile")] },
        },
      },
    });

    const result = calculateMovementSenses(character, catalog);

    const walk = result.movement.find((e) => e.kind === "walk")!;
    expect(walk.speed).toBe(40); // 30 base + 10
  });

  it("add-movement grants fly speed when no base exists", () => {
    const spell = makeSpell(eid("spell-wind-walk"), [
      makeEffect("add-movement", { mode: "fly", value: 30 }),
    ]);
    const catalog = buildCatalog({
      getSpell: () => spell,
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [{ spellId: eid("spell-wind-walk"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
    });

    const result = calculateMovementSenses(character, catalog);

    const fly = result.movement.find((e) => e.kind === "fly")!;
    expect(fly.speed).toBe(30);
    expect(fly.hasMovement).toBe(true);
  });

  it("multiple add-movement effects accumulate", () => {
    const feat = makeFeat(eid("feat-haste"), [
      makeEffect("add-movement", { mode: "walk", value: 10 }),
    ]);
    const spell = makeSpell(eid("spell-haste"), [
      makeEffect("add-movement", { mode: "walk", value: 30 }),
    ]);
    const species = makeSpecies(eid("species-gnome"), []);
    const catalog = buildCatalog({
      getSpecies: () => species,
      getFeat: () => feat,
      getSpell: () => spell,
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-gnome"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-haste")] },
        },
      },
      spells: {
        selections: [{ spellId: eid("spell-haste"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
    });

    const result = calculateMovementSenses(character, catalog);

    const walk = result.movement.find((e) => e.kind === "walk")!;
    expect(walk.speed).toBe(70); // 30 base + 10 feat + 30 spell
  });
});

/* ── set-movement effects ────────────────────────────────────────────── */

describe("calculateMovementSenses - set-movement", () => {
  it("set-movement overrides walk speed", () => {
    const feat = makeFeat(eid("feat-slow"), [
      makeEffect("set-movement", { mode: "walk", value: 15 }),
    ]);
    const species = makeSpecies(eid("species-human"), []);
    const catalog = buildCatalog({
      getSpecies: () => species,
      getFeat: () => feat,
    });

    const character = makeCharacter({
      origins: { speciesId: eid("species-human"), backgroundId: eid("bg-sage") },
      progression: {
        classes: [{ instanceId: cid("war-1"), classId: eid("class-warrior"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        ["choice-feat-1" as never]: {
          instanceId: eid("choice-feat-1") as never,
          definitionId: eid("def-feat-1") as never,
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-slow")] },
        },
      },
    });

    const result = calculateMovementSenses(character, catalog);

    const walk = result.movement.find((e) => e.kind === "walk")!;
    expect(walk.speed).toBe(15); // set-movement overrides
  });
});

import { describe, it, expect } from "vitest";
import { calculateProficiencies } from "./proficiencies";
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
import type { CatalogLookup } from "./effect-provenance";

function buildCatalog(overrides: Partial<CatalogLookup>): CatalogLookup {
  return { ...makeEmptyCatalog(), ...overrides };
}

/* ── Deduplication ───────────────────────────────────────────────── */

describe("calculateProficiencies - deduplication", () => {
  it("deduplicates same armor from multiple sources", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "armor", category: "light" },
    });
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), [effect]),
      getClass: () => makeClass(eid("class-rogue"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.armors).toHaveLength(1);
    const [first] = result.armors;
    expect(first!.category).toBe("light");
  });

  it("deduplicates same skill from multiple sources", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:perception") },
    });
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), [effect]),
      getBackground: () => makeBackground(eid("bg-sage"), [effect]),
    });

    const character = makeCharacter({});

    const result = calculateProficiencies(character, catalog);

    expect(result.skills).toHaveLength(1);
  });
});

/* ── Proficiency bonus integration ───────────────────────────────── */

describe("calculateProficiencies - proficiency bonus integration", () => {
  it("uses correct proficiency bonus at level 1", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
    });
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.totalLevel).toBe(1);
    expect(result.proficiencyBonus).toBe(2);
    const [first] = result.skills;
    expect(first!.effectiveBonus).toBe(2);
  });

  it("uses correct proficiency bonus at level 5", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
    });
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 5, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.totalLevel).toBe(5);
    expect(result.proficiencyBonus).toBe(3);
    const [first] = result.skills;
    expect(first!.effectiveBonus).toBe(3);
  });

  it("uses zero bonus for level 0 character", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
    });
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), [effect]),
    });

    const character = makeCharacter({});

    const result = calculateProficiencies(character, catalog);

    expect(result.totalLevel).toBe(0);
    expect(result.proficiencyBonus).toBe(0);
    const [first] = result.skills;
    expect(first!.effectiveBonus).toBe(0);
  });
});

/* ── Non-proficiency effects ignored ─────────────────────────────── */

describe("calculateProficiencies - ignores unrelated effects", () => {
  it("ignores add-ability effects", () => {
    const effect = makeEffect("add-ability", { ability: "STR", value: 2 });
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), [effect]),
    });

    const character = makeCharacter({});

    const result = calculateProficiencies(character, catalog);

    expect(result.armors).toEqual([]);
    expect(result.weapons).toEqual([]);
    expect(result.tools).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.savingThrows).toEqual([]);
  });
});

/* ── Determinism ─────────────────────────────────────────────────── */

describe("calculateProficiencies - determinism", () => {
  it("returns frozen arrays", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "armor", category: "light" },
    });
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(Object.isFrozen(result.armors)).toBe(true);
    expect(Object.isFrozen(result.weapons)).toBe(true);
    expect(Object.isFrozen(result.tools)).toBe(true);
    expect(Object.isFrozen(result.skills)).toBe(true);
    expect(Object.isFrozen(result.savingThrows)).toBe(true);
  });

  it("produces identical results across calls", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
    });
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result1 = calculateProficiencies(character, catalog);
    const result2 = calculateProficiencies(character, catalog);

    expect(result1.skills).toEqual(result2.skills);
    expect(result1.armors).toEqual(result2.armors);
  });
});

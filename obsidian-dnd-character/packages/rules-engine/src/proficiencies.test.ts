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

/* ── Empty character baseline ────────────────────────────────────── */

describe("calculateProficiencies - no proficiencies", () => {
  it("returns empty arrays when no proficiency effects exist", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateProficiencies(character, catalog);

    expect(result.totalLevel).toBe(0);
    expect(result.proficiencyBonus).toBe(0);
    expect(result.armors).toEqual([]);
    expect(result.weapons).toEqual([]);
    expect(result.tools).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.savingThrows).toEqual([]);
  });
});

/* ── Armor proficiencies ─────────────────────────────────────────── */

describe("calculateProficiencies - armor", () => {
  it("collects light armor proficiency from class", () => {
    const armorEffect = makeEffect("add-proficiency", {
      proficiency: { kind: "armor", category: "light" },
    });
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [armorEffect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.armors).toHaveLength(1);
    expect(result.armors[0]).toEqual({
      category: "light",
      hasExpertise: false,
      effectiveBonus: 2,
    });
  });

  it("collects multiple armor categories", () => {
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "light" } }),
      makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "medium" } }),
      makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "shield" } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-fighter"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("fig-1"), classId: eid("class-fighter"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.armors).toHaveLength(3);
    const [first, second, third] = result.armors;
    expect(first!.category).toBe("light");
    expect(second!.category).toBe("medium");
    expect(third!.category).toBe("shield");
  });

  it("sorts armor categories in deterministic order", () => {
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "heavy" } }),
      makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "light" } }),
      makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "shield" } }),
      makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "medium" } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-paladin"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("pal-1"), classId: eid("class-paladin"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.armors.map((a) => a.category)).toEqual(["light", "medium", "heavy", "shield"]);
  });
});

/* ── Weapon proficiencies ────────────────────────────────────────── */

describe("calculateProficiencies - weapons", () => {
  it("collects weapon proficiency from class", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "weapon", weaponId: eid("wpn-longsword") },
    });
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-fighter"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("fig-1"), classId: eid("class-fighter"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0]).toEqual({
      weaponId: eid("wpn-longsword"),
      hasExpertise: false,
      effectiveBonus: 2,
    });
  });
});

/* ── Tool proficiencies ──────────────────────────────────────────── */

describe("calculateProficiencies - tools", () => {
  it("collects tool proficiency from background", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "tool", toolId: eid("tool-calligraphers-packs") },
    });
    const catalog = buildCatalog({
      getBackground: () => makeBackground(eid("bg-sage"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]).toEqual({
      toolId: eid("tool-calligraphers-packs"),
      hasExpertise: false,
      effectiveBonus: 2,
    });
  });
});

/* ── Skill proficiencies ─────────────────────────────────────────── */

describe("calculateProficiencies - skills", () => {
  it("collects skill proficiency from species", () => {
    const effect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:perception") },
    });
    const catalog = buildCatalog({
      getSpecies: () => makeSpecies(eid("species-elf"), [effect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]).toEqual({
      skillId: eid("skill:2024:core:perception"),
      hasExpertise: false,
      effectiveBonus: 2,
    });
  });
});

/* ── Saving throw proficiencies ──────────────────────────────────── */

describe("calculateProficiencies - saving throws", () => {
  it("collects saving throw proficiency from class", () => {
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "DEX" } }),
      makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "INT" } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.savingThrows).toHaveLength(2);
    const [first, second] = result.savingThrows;
    expect(first!.ability).toBe("DEX");
    expect(second!.ability).toBe("INT");
  });
});

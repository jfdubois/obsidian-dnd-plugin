import { describe, it, expect } from "vitest";
import { calculateSkills } from "./skills";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeEffect,
  eid,
  sid,
  cid,
} from "./effect-collection-helpers";
import type { CatalogLookup } from "./effect-provenance";
import type { SkillRule } from "@obsidian-dnd/catalog-contract";

function buildCatalog(overrides: Partial<CatalogLookup>): CatalogLookup {
  return { ...makeEmptyCatalog(), ...overrides };
}

function makeSkill(id: string, ability: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"): SkillRule {
  return {
    id: eid(id),
    kind: "skill",
    name: id,
    sourceId: sid("src-phb"),
    ruleset: "2024",
    access: "core",
    content: [],
    abilityScore: ability,
  };
}

/* ── Passive values ────────────────────────────────────────────────── */

describe("calculateSkills - passive values", () => {
  it("calculates passive perception", () => {
    const perceptionId = "skill:2024:core:perception";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(perceptionId) } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
      getSkill: () => makeSkill(perceptionId, "WIS"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 5, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 16, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.passive.passivePerception).toBe(16);
    expect(result.passive.passiveInvestigation).toBeNull();
  });

  it("calculates passive investigation", () => {
    const investigationId = "skill:2024:core:investigation";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(investigationId) } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-wizard"), effects),
      getSkill: () => makeSkill(investigationId, "INT"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 5, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 16, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.passive.passiveInvestigation).toBe(16);
    expect(result.passive.passivePerception).toBeNull();
  });

  it("calculates both passive values when both skills are proficient", () => {
    const perceptionId = "skill:2024:core:perception";
    const investigationId = "skill:2024:core:investigation";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(perceptionId) } }),
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(investigationId) } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
      getSkill: () => makeSkill(perceptionId, "WIS"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 5, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 16, WIS: 16, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.passive.passivePerception).toBe(16);
    expect(result.passive.passiveInvestigation).toBe(16);
  });

  it("does not calculate passive for non-passive skills", () => {
    const stealthId = "skill:2024:core:stealth";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(stealthId) } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
      getSkill: () => makeSkill(stealthId, "DEX"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 5, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.passive.passivePerception).toBeNull();
    expect(result.passive.passiveInvestigation).toBeNull();
  });
});

/* ── Deterministic ordering ────────────────────────────────────────── */

describe("calculateSkills - ordering", () => {
  it("returns skills in deterministic alphabetical order by skill ID", () => {
    const acrobaticsId = "skill:2024:core:acrobatics";
    const stealthId = "skill:2024:core:stealth";
    const athleticsId = "skill:2024:core:athletics";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(stealthId) } }),
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(athleticsId) } }),
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(acrobaticsId) } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
      getSkill: () => makeSkill(acrobaticsId, "DEX"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 16, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills.map((s) => s.skillId)).toEqual(
      [eid(acrobaticsId), eid(athleticsId), eid(stealthId)]
    );
  });
});

import { describe, it, expect } from "vitest";
import { calculateSkills } from "./skills";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeBackground,
  makeFeat,
  makeEffect,
  eid,
  sid,
  cid,
  cii,
  cdi,
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

/* ── Empty character baseline ──────────────────────────────────────── */

describe("calculateSkills - baseline", () => {
  it("returns empty skills for character with no proficiency effects", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateSkills(character, catalog);

    expect(result.totalLevel).toBe(0);
    expect(result.proficiencyBonus).toBe(0);
    expect(result.skills).toHaveLength(0);
    expect(result.passive.passivePerception).toBeNull();
    expect(result.passive.passiveInvestigation).toBeNull();
  });
});

/* ── Proficiency detection ─────────────────────────────────────────── */

describe("calculateSkills - proficiency", () => {
  it("detects proficiency from class effects", () => {
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
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.totalLevel).toBe(3);
    expect(result.proficiencyBonus).toBe(2);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.skillId).toBe(eid(stealthId));
    expect(result.skills[0]?.ability).toBe("DEX");
    expect(result.skills[0]?.isProficient).toBe(true);
    expect(result.skills[0]?.hasExpertise).toBe(false);
    expect(result.skills[0]?.abilityModifier).toBe(2);
    expect(result.skills[0]?.proficiencyBonus).toBe(2);
    expect(result.skills[0]?.total).toBe(4);
  });

  it("detects proficiency from background effects", () => {
    const historyId = "skill:2024:core:history";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(historyId) } }),
    ];
    const catalog = buildCatalog({
      getBackground: () => makeBackground(eid("bg-sage"), effects),
      getSkill: () => makeSkill(historyId, "INT"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 16, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.skillId).toBe(eid(historyId));
    expect(result.skills[0]?.ability).toBe("INT");
    expect(result.skills[0]?.abilityModifier).toBe(3);
    expect(result.skills[0]?.proficiencyBonus).toBe(2);
    expect(result.skills[0]?.total).toBe(5);
  });

  it("detects proficiency from feat effects", () => {
    const athleticsId = "skill:2024:core:athletics";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(athleticsId) } }),
    ];
    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-skilled"), effects),
      getSkill: () => makeSkill(athleticsId, "STR"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-skilled")] },
        },
      },
      abilities: { scores: { STR: 16, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.skillId).toBe(eid(athleticsId));
    expect(result.skills[0]?.ability).toBe("STR");
    expect(result.skills[0]?.abilityModifier).toBe(3);
  });

  it("skips skills not found in catalog", () => {
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid("skill-missing") } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
      getSkill: () => undefined,
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills).toHaveLength(0);
  });
});

/* ── Expertise ─────────────────────────────────────────────────────── */

describe("calculateSkills - expertise", () => {
  it("doubles proficiency bonus with expertise", () => {
    const stealthId = "skill:2024:core:stealth";
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(stealthId) } }),
      makeEffect("add-expertise", { skillId: eid(stealthId) }),
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

    expect(result.proficiencyBonus).toBe(3);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.hasExpertise).toBe(true);
    expect(result.skills[0]?.proficiencyBonus).toBe(6);
    expect(result.skills[0]?.abilityModifier).toBe(3);
    expect(result.skills[0]?.total).toBe(9);
  });

  it("no expertise bonus without expertise effect", () => {
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

    expect(result.skills[0]?.hasExpertise).toBe(false);
    expect(result.skills[0]?.proficiencyBonus).toBe(3);
    expect(result.skills[0]?.total).toBe(6);
  });
});

/* ── Higher level proficiency bonus ────────────────────────────────── */

describe("calculateSkills - proficiency bonus scaling", () => {
  it("uses higher proficiency bonus at level 17", () => {
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
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 17, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.proficiencyBonus).toBe(6);
    expect(result.skills[0]?.proficiencyBonus).toBe(6);
    expect(result.skills[0]?.abilityModifier).toBe(3);
    expect(result.skills[0]?.total).toBe(9);
  });
});

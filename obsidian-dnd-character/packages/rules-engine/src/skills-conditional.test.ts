import { describe, it, expect } from "vitest";
import { calculateSkills } from "./skills";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeSpell,
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

/* ── Conditional effects ───────────────────────────────────────────── */

describe("calculateSkills - conditional effects", () => {
  it("applies advantage from a conditional effect", () => {
    const stealthId = "skill:2024:core:stealth";
    const classEffects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(stealthId) } }),
    ];
    const spellEffects = [
      makeEffect("conditional-roll-mode", {
        rollType: "ability-check",
        mode: "advantage",
        predicate: { type: "skill", skillId: eid(stealthId) },
      }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), classEffects),
      getSpell: () => makeSpell(eid("spell-invisibility"), spellEffects),
      getSkill: () => makeSkill(stealthId, "DEX"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [{ spellId: eid("spell-invisibility"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.conditionals).toHaveLength(1);
    expect(result.skills[0]?.conditionals[0]?.mode).toBe("advantage");
  });

  it("applies disadvantage from a conditional effect", () => {
    const perceptionId = "skill:2024:core:perception";
    const classEffects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(perceptionId) } }),
    ];
    const spellEffects = [
      makeEffect("conditional-roll-mode", {
        rollType: "ability-check",
        mode: "disadvantage",
        predicate: { type: "skill", skillId: eid(perceptionId) },
      }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), classEffects),
      getSpell: () => makeSpell(eid("spell-blindness"), spellEffects),
      getSkill: () => makeSkill(perceptionId, "WIS"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [{ spellId: eid("spell-blindness"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
      abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 14, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.conditionals).toHaveLength(1);
    expect(result.skills[0]?.conditionals[0]?.mode).toBe("disadvantage");
  });

  it("advantage and disadvantage cancel to normal", () => {
    const stealthId = "skill:2024:core:stealth";
    const classEffects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(stealthId) } }),
    ];
    const spellAdv = [
      makeEffect("conditional-roll-mode", {
        rollType: "ability-check",
        mode: "advantage",
        predicate: { type: "skill", skillId: eid(stealthId) },
      }),
    ];
    const spellDis = [
      makeEffect("conditional-roll-mode", {
        rollType: "ability-check",
        mode: "disadvantage",
        predicate: { type: "skill", skillId: eid(stealthId) },
      }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), classEffects),
      getSpell: (id: string) =>
        id === eid("spell-adv") ? makeSpell(eid("spell-adv"), spellAdv) : makeSpell(eid("spell-dis"), spellDis),
      getSkill: () => makeSkill(stealthId, "DEX"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [
          { spellId: eid("spell-adv"), acquisition: "known" },
          { spellId: eid("spell-dis"), acquisition: "known" },
        ],
        spellSlotsUsed: {},
      },
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.conditionals).toHaveLength(2);
    const modes = result.skills[0]?.conditionals.map((c) => c.mode) ?? [];
    expect(modes).toContain("advantage");
    expect(modes).toContain("disadvantage");
  });

  it("multiple advantages resolve to advantage", () => {
    const stealthId = "skill:2024:core:stealth";
    const classEffects = [
      makeEffect("add-proficiency", { proficiency: { kind: "skill", entityId: eid(stealthId) } }),
    ];
    const spellAdv1 = [
      makeEffect("conditional-roll-mode", {
        rollType: "ability-check",
        mode: "advantage",
        predicate: { type: "skill", skillId: eid(stealthId) },
      }),
    ];
    const spellAdv2 = [
      makeEffect("conditional-roll-mode", {
        rollType: "ability-check",
        mode: "advantage",
        predicate: { type: "skill", skillId: eid(stealthId) },
      }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), classEffects),
      getSpell: (id: string) =>
        id === eid("spell-adv1") ? makeSpell(eid("spell-adv1"), spellAdv1) : makeSpell(eid("spell-adv2"), spellAdv2),
      getSkill: () => makeSkill(stealthId, "DEX"),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [
          { spellId: eid("spell-adv1"), acquisition: "known" },
          { spellId: eid("spell-adv2"), acquisition: "known" },
        ],
        spellSlotsUsed: {},
      },
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSkills(character, catalog);

    expect(result.skills[0]?.conditionals.every((c) => c.mode === "advantage")).toBe(true);
  });
});

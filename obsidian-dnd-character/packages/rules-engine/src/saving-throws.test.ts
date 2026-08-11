import { describe, it, expect } from "vitest";
import { calculateSavingThrows } from "./saving-throws";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeFeat,
  makeSpell,
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

describe("calculateSavingThrows - baseline", () => {
  it("returns zero totals for level-0 character with no effects", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateSavingThrows(character, catalog);

    expect(result.totalLevel).toBe(0);
    expect(result.proficiencyBonus).toBe(0);
    expect(result.savingThrows).toHaveLength(6);

    for (const entry of result.savingThrows) {
      expect(entry.modifier).toBe(0);
      expect(entry.isProficient).toBe(false);
      expect(entry.proficiencyBonus).toBe(0);
      expect(entry.total).toBe(0);
      expect(entry.conditionals).toEqual([]);
    }
  });

  it("uses correct ability order (STR, DEX, CON, INT, WIS, CHA)", () => {
    const character = makeCharacter({});
    const catalog = buildCatalog({});

    const result = calculateSavingThrows(character, catalog);

    const abilities = result.savingThrows.map((e) => e.ability);
    expect(abilities).toEqual(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
  });
});

/* ── Proficiency detection ─────────────────────────────────────────── */

describe("calculateSavingThrows - proficiency", () => {
  it("detects proficiency from class effects", () => {
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "DEX" } }),
      makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "INT" } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 10, DEX: 14, CON: 10, INT: 16, WIS: 10, CHA: 10 } },
    });

    const result = calculateSavingThrows(character, catalog);

    expect(result.totalLevel).toBe(3);
    expect(result.proficiencyBonus).toBe(2);

    const dex = result.savingThrows.find((e) => e.ability === "DEX")!;
    expect(dex.isProficient).toBe(true);
    expect(dex.proficiencyBonus).toBe(2);
    expect(dex.modifier).toBe(2);
    expect(dex.total).toBe(4);

    const str = result.savingThrows.find((e) => e.ability === "STR")!;
    expect(str.isProficient).toBe(false);
    expect(str.proficiencyBonus).toBe(0);
    expect(str.modifier).toBe(0);
    expect(str.total).toBe(0);
  });

  it("uses higher proficiency bonus at higher levels", () => {
    const effects = [
      makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "STR" } }),
    ];
    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-barbarian"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("bar-1"), classId: eid("class-barbarian"), level: 9, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: { scores: { STR: 18, DEX: 10, CON: 14, INT: 8, WIS: 12, CHA: 10 } },
    });

    const result = calculateSavingThrows(character, catalog);

    expect(result.proficiencyBonus).toBe(4);
    const str = result.savingThrows.find((e) => e.ability === "STR")!;
    expect(str.isProficient).toBe(true);
    expect(str.modifier).toBe(4);
    expect(str.proficiencyBonus).toBe(4);
    expect(str.total).toBe(8);
  });
});

/* ── Conditional save effects ──────────────────────────────────────── */

describe("calculateSavingThrows - conditionals", () => {
  it("detects advantage from feat conditional-roll-mode with ability predicate", () => {
    const advEffect = makeEffect("conditional-roll-mode", {
      rollType: "saving-throw",
      mode: "advantage",
      predicate: { type: "ability", ability: "DEX" },
    });
    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-lucky"), [advEffect]),
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
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-lucky")] },
        },
      },
      abilities: { scores: { STR: 10, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
    });

    const result = calculateSavingThrows(character, catalog);

    const dex = result.savingThrows.find((e) => e.ability === "DEX")!;
    expect(dex.conditionals).toHaveLength(1);
    expect(dex.conditionals[0]?.mode).toBe("advantage");
    expect(dex.conditionals[0]?.predicate).toEqual({ type: "ability", ability: "DEX" });

    const str = result.savingThrows.find((e) => e.ability === "STR")!;
    expect(str.conditionals).toEqual([]);
  });

  it("detects disadvantage from spell conditional-roll-mode", () => {
    const disEffect = makeEffect("conditional-roll-mode", {
      rollType: "saving-throw",
      mode: "disadvantage",
      predicate: { type: "concentration" },
    });
    const catalog = buildCatalog({
      getSpell: () => makeSpell(eid("spell-bane"), [disEffect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      spells: {
        selections: [{ spellId: eid("spell-bane"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
    });

    const result = calculateSavingThrows(character, catalog);

    // Concentration predicate applies to all saving throws
    for (const entry of result.savingThrows) {
      expect(entry.conditionals).toHaveLength(1);
      expect(entry.conditionals[0]?.mode).toBe("disadvantage");
      expect(entry.conditionals[0]?.predicate).toEqual({ type: "concentration" });
    }
  });

  it("ignores skill predicates for saving throws", () => {
    const skillEffect = makeEffect("conditional-roll-mode", {
      rollType: "saving-throw",
      mode: "advantage",
      predicate: { type: "skill", skillId: eid("skill-stealth") },
    });
    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-skilled"), [skillEffect]),
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
    });

    const result = calculateSavingThrows(character, catalog);

    for (const entry of result.savingThrows) {
      expect(entry.conditionals).toEqual([]);
    }
  });

  it("collects multiple conditionals on same save", () => {
    const advEffect = makeEffect("conditional-roll-mode", {
      rollType: "saving-throw",
      mode: "advantage",
      predicate: { type: "ability", ability: "CON" },
    });
    const disEffect = makeEffect("conditional-roll-mode", {
      rollType: "saving-throw",
      mode: "disadvantage",
      predicate: { type: "damage-type", damageType: "fire" },
    });
    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-tough"), [advEffect]),
      getSpell: () => makeSpell(eid("spell-vulnerability"), [disEffect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("wiz-1"), classId: eid("class-wizard"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-tough")] },
        },
      },
      spells: {
        selections: [{ spellId: eid("spell-vulnerability"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
    });

    const result = calculateSavingThrows(character, catalog);

    const con = result.savingThrows.find((e) => e.ability === "CON")!;
    expect(con.conditionals).toHaveLength(2);
    expect(con.conditionals[0]?.mode).toBe("advantage");
    expect(con.conditionals[1]?.mode).toBe("disadvantage");
  });
});

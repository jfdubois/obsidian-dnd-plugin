import { describe, it, expect } from "vitest";
import type { Character } from "@obsidian-dnd/character-contract";
import { calculateAttacks } from "./attacks";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeEffect,
  eid,
  cid,
} from "./effect-collection-helpers";
import type { CatalogLookup } from "./effect-provenance";
import {
  createAttackDefinition,
  createSimpleDamageDefinition,
  createDiceExpression,
  createMeleeRange,
  createRangedRange,
} from "@obsidian-dnd/catalog-contract";

function buildCatalog(overrides: Partial<CatalogLookup>): CatalogLookup {
  return { ...makeEmptyCatalog(), ...overrides };
}

function makeFighterChar(
  abilities: Partial<Character["abilities"]["scores"]> = {},
  level: number = 1,
  effects: ReturnType<typeof makeEffect>[],
): [Character, CatalogLookup] {
  const classId = eid("class-fighter");
  return [
    makeCharacter({
      progression: {
        classes: [{ instanceId: cid("f1"), classId, level, isStartingClass: true, hitPointIncreases: [] }],
      },
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10, ...abilities },
      },
      inventory: [],
    }),
    buildCatalog({ getClass: () => makeClass(classId, effects) }),
  ];
}

/* ── No attacks ──────────────────────────────────────────────────────── */

describe("no attacks", () => {
  it("returns empty array with no grant-attack effects", () => {
    const char = makeCharacter({});
    const result = calculateAttacks(char, buildCatalog({}));
    expect(result.attacks).toEqual([]);
    expect(result.proficiencyBonus).toBe(0);
    expect(result.totalLevel).toBe(0);
  });

  it("returns empty array when class has no attack effects", () => {
    const [char, catalog] = makeFighterChar({}, 1, [
      makeEffect("add-ability", { ability: "STR", value: 2 }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result.attacks).toEqual([]);
  });
});

/* ── Single melee attack ─────────────────────────────────────────────── */

describe("single melee attack", () => {
  it("collects a melee grant-attack effect", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result.attacks).toHaveLength(1);
    expect(result.attacks[0]!.name).toBe("Longsword");
  });

  it("melee attack uses STR modifier", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const attack = result.attacks[0]!;
    expect(attack.ability).toBe("STR");
    expect(attack.abilityModifier).toBe(3);
  });

  it("melee attack includes proficiency bonus", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const attack = result.attacks[0]!;
    expect(attack.isProficient).toBe(true);
    expect(attack.proficiencyBonus).toBe(2);
    expect(attack.attackBonus).toBe(5); // 3 (STR) + 2 (prof)
  });

  it("melee attack damage includes ability modifier", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const damage = result.attacks[0]!.damage[0]!;
    expect(damage.dice.count).toBe(1);
    expect(damage.dice.sides).toBe(8);
    expect(damage.damageType).toBe("slashing");
    expect(damage.abilityModifier).toBe(3);
    expect(damage.totalModifier).toBe(3);
  });

  it("melee attack range is parsed correctly", () => {
    const [char, catalog] = makeFighterChar({}, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const range = result.attacks[0]!.range;
    expect(range.kind).toBe("melee");
    expect(range.reach).toBe(5);
  });
});

/* ── Ranged attack ───────────────────────────────────────────────────── */

describe("ranged attack", () => {
  it("ranged attack uses DEX modifier", () => {
    const [char, catalog] = makeFighterChar({ DEX: 14 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Shortbow",
          createSimpleDamageDefinition(createDiceExpression(1, 6, 0), "piercing"),
          createRangedRange(80, 320),
          ["ammunition"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const attack = result.attacks[0]!;
    expect(attack.ability).toBe("DEX");
    expect(attack.abilityModifier).toBe(2);
    expect(attack.attackBonus).toBe(4); // 2 (DEX) + 2 (prof)
  });

  it("ranged attack range is parsed correctly", () => {
    const [char, catalog] = makeFighterChar({}, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Shortbow",
          createSimpleDamageDefinition(createDiceExpression(1, 6, 0), "piercing"),
          createRangedRange(80, 320),
          ["ammunition"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const range = result.attacks[0]!.range;
    expect(range.kind).toBe("ranged");
    expect(range.normalRange).toBe(80);
    expect(range.maxRange).toBe(320);
  });
});

/* ── Multiple attacks ────────────────────────────────────────────────── */

describe("multiple attacks", () => {
  it("collects multiple grant-attack effects", () => {
    const [char, catalog] = makeFighterChar({ STR: 16, DEX: 14 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Dagger",
          createSimpleDamageDefinition(createDiceExpression(1, 4, 0), "piercing"),
          createRangedRange(20, 60),
          ["finesse", "thrown", "light"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result.attacks).toHaveLength(2);
    expect(result.attacks[0]!.name).toBe("Longsword");
    expect(result.attacks[1]!.name).toBe("Dagger");
  });

  it("each attack calculates independently", () => {
    const [char, catalog] = makeFighterChar({ STR: 16, DEX: 14 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Shortbow",
          createSimpleDamageDefinition(createDiceExpression(1, 6, 0), "piercing"),
          createRangedRange(80, 320),
          ["ammunition"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    // Longsword: STR 16 (mod 3) + prof 2 = 5
    expect(result.attacks[0]!.attackBonus).toBe(5);
    expect(result.attacks[0]!.ability).toBe("STR");
    // Shortbow: DEX 14 (mod 2) + prof 2 = 4
    expect(result.attacks[1]!.attackBonus).toBe(4);
    expect(result.attacks[1]!.ability).toBe("DEX");
  });
});

/* ── Proficiency scaling ─────────────────────────────────────────────── */

describe("proficiency scaling", () => {
  it("uses correct proficiency bonus at level 5", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 5, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result.proficiencyBonus).toBe(3);
    expect(result.attacks[0]!.proficiencyBonus).toBe(3);
    expect(result.attacks[0]!.attackBonus).toBe(6); // 3 (STR) + 3 (prof)
  });

  it("uses correct proficiency bonus at level 17", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 17, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result.proficiencyBonus).toBe(6);
    expect(result.attacks[0]!.attackBonus).toBe(9); // 3 (STR) + 6 (prof)
  });
});

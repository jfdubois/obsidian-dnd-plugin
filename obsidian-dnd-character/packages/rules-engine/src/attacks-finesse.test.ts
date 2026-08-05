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
  createMultiDamageDefinition,
  createDiceExpression,
  createMeleeRange,
  createTouchRange,
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

/* ── Finesse attack ──────────────────────────────────────────────────── */

describe("finesse attack", () => {
  it("finesse uses higher of STR or DEX", () => {
    const [char, catalog] = makeFighterChar({ STR: 10, DEX: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Rapier",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "piercing"),
          createMeleeRange(5),
          ["finesse"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const attack = result.attacks[0]!;
    expect(attack.ability).toBe("DEX");
    expect(attack.abilityModifier).toBe(3);
  });

  it("finesse uses STR when higher", () => {
    const [char, catalog] = makeFighterChar({ STR: 18, DEX: 10 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Rapier",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "piercing"),
          createMeleeRange(5),
          ["finesse"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const attack = result.attacks[0]!;
    expect(attack.ability).toBe("STR");
    expect(attack.abilityModifier).toBe(4);
  });

  it("finesse uses DEX when tied", () => {
    const [char, catalog] = makeFighterChar({ STR: 14, DEX: 14 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Rapier",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "piercing"),
          createMeleeRange(5),
          ["finesse"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const attack = result.attacks[0]!;
    expect(attack.ability).toBe("DEX");
  });
});

/* ── Touch attack ────────────────────────────────────────────────────── */

describe("touch attack", () => {
  it("touch attack uses DEX modifier", () => {
    const [char, catalog] = makeFighterChar({ DEX: 14 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Shocking Grasp",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "lightning"),
          createTouchRange(),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const attack = result.attacks[0]!;
    expect(attack.ability).toBe("DEX");
    expect(attack.abilityModifier).toBe(2);
  });

  it("touch attack range has no reach/range values", () => {
    const [char, catalog] = makeFighterChar({}, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Touch",
          createSimpleDamageDefinition(createDiceExpression(1, 4, 0), "necrotic"),
          createTouchRange(),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const range = result.attacks[0]!.range;
    expect(range.kind).toBe("touch");
    expect(range.reach).toBeUndefined();
    expect(range.normalRange).toBeUndefined();
  });
});

/* ── Multi-damage attacks ────────────────────────────────────────────── */

describe("multi-damage attacks", () => {
  it("multi-damage creates multiple damage instances", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Maul",
          createMultiDamageDefinition([
            { dice: createDiceExpression(1, 6, 0), damageType: "bludgeoning" },
            { dice: createDiceExpression(1, 6, 0), damageType: "piercing" },
          ]),
          createMeleeRange(10),
          ["heavy", "two-handed"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const damage = result.attacks[0]!.damage;
    expect(damage).toHaveLength(2);
    expect(damage[0]!.damageType).toBe("bludgeoning");
    expect(damage[1]!.damageType).toBe("piercing");
  });

  it("multi-damage applies ability modifier to each instance", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Maul",
          createMultiDamageDefinition([
            { dice: createDiceExpression(1, 6, 0), damageType: "bludgeoning" },
            { dice: createDiceExpression(1, 6, 0), damageType: "piercing" },
          ]),
          createMeleeRange(10),
          ["heavy", "two-handed"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const damage = result.attacks[0]!.damage;
    expect(damage[0]!.abilityModifier).toBe(3);
    expect(damage[1]!.abilityModifier).toBe(3);
  });
});

/* ── Attack definition modifier ──────────────────────────────────────── */

describe("attack definition modifier", () => {
  it("includes dice modifier from attack definition", () => {
    const [char, catalog] = makeFighterChar({ STR: 16 }, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Magic Sword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 3), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    const damage = result.attacks[0]!.damage[0]!;
    expect(damage.dice.modifier).toBe(3);
    expect(damage.abilityModifier).toBe(3);
    expect(damage.totalModifier).toBe(6); // 3 (ability) + 3 (dice mod)
  });
});

/* ── Attack properties preserved ─────────────────────────────────────── */

describe("attack properties", () => {
  it("preserves attack properties from definition", () => {
    const [char, catalog] = makeFighterChar({}, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Greatsword",
          createSimpleDamageDefinition(createDiceExpression(2, 6, 0), "slashing"),
          createMeleeRange(5),
          ["heavy", "two-handed"],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result.attacks[0]!.properties).toContain("heavy");
    expect(result.attacks[0]!.properties).toContain("two-handed");
  });

  it("preserves custom properties", () => {
    const [char, catalog] = makeFighterChar({}, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Special Weapon",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "force"),
          createMeleeRange(5),
          [{ type: "custom", name: "magical" }],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result.attacks[0]!.properties).toHaveLength(1);
    expect(result.attacks[0]!.properties[0]).toEqual({ type: "custom", name: "magical" });
  });
});

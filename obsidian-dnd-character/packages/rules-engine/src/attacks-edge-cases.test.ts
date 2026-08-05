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

/* ── Negative ability modifiers ──────────────────────────────────────── */

describe("negative ability modifiers", () => {
  it("handles negative STR modifier for melee attack", () => {
    const [char, catalog] = makeFighterChar({ STR: 6 }, 1, [
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
    expect(attack.abilityModifier).toBe(-2);
    expect(attack.attackBonus).toBe(0); // -2 (STR) + 2 (prof)
  });

  it("handles negative damage modifier", () => {
    const [char, catalog] = makeFighterChar({ STR: 6 }, 1, [
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
    expect(damage.abilityModifier).toBe(-2);
    expect(damage.totalModifier).toBe(-2);
  });
});

/* ── Determinism ─────────────────────────────────────────────────────── */

describe("determinism", () => {
  it("same inputs always produce identical snapshot", () => {
    const [char, catalog] = makeFighterChar({ STR: 16, DEX: 14 }, 3, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Longsword",
          createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);

    const result1 = calculateAttacks(char, catalog);
    const result2 = calculateAttacks(char, catalog);

    expect(result1).toEqual(result2);
    expect(result1.attacks[0]!.attackBonus).toBe(result2.attacks[0]!.attackBonus);
    expect(result1.proficiencyBonus).toBe(result2.proficiencyBonus);
  });
});

/* ── Result structure ────────────────────────────────────────────────── */

describe("result structure", () => {
  it("result contains all expected fields", () => {
    const [char, catalog] = makeFighterChar({}, 1, [
      makeEffect("grant-attack", {
        attack: createAttackDefinition(
          "Test",
          createSimpleDamageDefinition(createDiceExpression(1, 6, 0), "slashing"),
          createMeleeRange(5),
          [],
        ),
      }),
    ]);
    const result = calculateAttacks(char, catalog);
    expect(result).toHaveProperty("attacks");
    expect(result).toHaveProperty("proficiencyBonus");
    expect(result).toHaveProperty("totalLevel");

    const attack = result.attacks[0]!;
    expect(attack).toHaveProperty("name");
    expect(attack).toHaveProperty("range");
    expect(attack).toHaveProperty("properties");
    expect(attack).toHaveProperty("ability");
    expect(attack).toHaveProperty("abilityModifier");
    expect(attack).toHaveProperty("proficiencyBonus");
    expect(attack).toHaveProperty("isProficient");
    expect(attack).toHaveProperty("attackBonus");
    expect(attack).toHaveProperty("damage");
  });
});

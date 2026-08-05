import { describe, it, expect } from "vitest";
import { calculateResources } from "./resources";
import { makeEffect } from "./effect-collection-helpers";
import type { RuleEffect } from "@obsidian-dnd/catalog-contract";

/* ── Test helpers ─────────────────────────────────────────────────── */

const defaultAbilities: Record<string, number> = {
  STR: 10,
  DEX: 10,
  CON: 10,
  INT: 10,
  WIS: 10,
  CHA: 10,
};

const defaultLevel = 1;

/* ── Empty effects baseline ─────────────────────────────────────── */

describe("calculateResources - baseline", () => {
  it("returns empty result for no effects", () => {
    const result = calculateResources([], defaultLevel, defaultAbilities);

    expect(result.resources).toEqual([]);
    expect(result.explanations).toEqual([]);
  });

  it("returns empty result when effects are not grant-resource", () => {
    const effects: RuleEffect[] = [
      makeEffect("add-ability", { ability: "STR", value: 2 }),
      makeEffect("add-resistance", { damageType: "fire" }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources).toEqual([]);
    expect(result.explanations).toEqual([]);
  });

  it("returns frozen arrays", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(Object.isFrozen(result.resources)).toBe(true);
    expect(Object.isFrozen(result.explanations)).toBe(true);
  });
});

/* ── Fixed value formula ────────────────────────────────────────── */

describe("calculateResources - fixed value", () => {
  it("computes fixed value resource", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]!.name).toBe("Rage");
    expect(result.resources[0]!.maximum).toBe(3);
    expect(result.resources[0]!.recovery).toBe("long-rest");
    expect(result.resources[0]!.explanation).toBe("Rage: fixed(3) = 3");
  });

  it("computes fixed value of zero", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Bonus",
          maximum: { type: "fixed", value: 0 },
          recovery: { type: "none" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources[0]!.maximum).toBe(0);
  });
});

/* ── Level-based value formula ──────────────────────────────────── */

describe("calculateResources - level-based value", () => {
  it("computes level-based value", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Ki points",
          maximum: { type: "level-based", multiplier: 2 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, 5, defaultAbilities);

    expect(result.resources[0]!.name).toBe("Ki points");
    expect(result.resources[0]!.maximum).toBe(10);
    expect(result.resources[0]!.explanation).toBe("Ki points: level(5) * 2 = 10");
  });

  it("returns 0 for level-based at level 0", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Ki points",
          maximum: { type: "level-based", multiplier: 2 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, 0, defaultAbilities);

    expect(result.resources[0]!.maximum).toBe(0);
  });
});

/* ── Ability-based value formula ────────────────────────────────── */

describe("calculateResources - ability-based value", () => {
  it("computes ability-based value with positive modifier", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "ability-based", ability: "STR" },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, { ...defaultAbilities, STR: 18 });

    expect(result.resources[0]!.maximum).toBe(4);
    expect(result.resources[0]!.explanation).toBe("Rage: STR mod(4) = 4");
  });

  it("computes ability-based value with zero modifier", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "ability-based", ability: "STR" },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources[0]!.maximum).toBe(0);
  });

  it("computes ability-based value with negative modifier", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "ability-based", ability: "STR" },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, { ...defaultAbilities, STR: 4 });

    expect(result.resources[0]!.maximum).toBe(-3);
  });

  it("defaults to score 10 for missing ability", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "ability-based", ability: "STR" },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, {});

    expect(result.resources[0]!.maximum).toBe(0);
  });
});

/* ── Sum value formula ──────────────────────────────────────────── */

describe("calculateResources - sum formula", () => {
  it("computes sum of fixed and level-based", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Second Wind",
          maximum: {
            type: "sum",
            operands: [
              { type: "fixed", value: 1 },
              { type: "level-based", multiplier: 1 },
            ],
          },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, 5, defaultAbilities);

    expect(result.resources[0]!.maximum).toBe(6);
    expect(result.resources[0]!.explanation).toBe("Second Wind: sum(fixed(1) + level(5) * 1) = 6");
  });

  it("computes sum of ability-based and fixed", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Action Surge",
          maximum: {
            type: "sum",
            operands: [
              { type: "ability-based", ability: "CON" },
              { type: "fixed", value: 1 },
            ],
          },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, { ...defaultAbilities, CON: 16 });

    expect(result.resources[0]!.maximum).toBe(4);
  });

  it("computes nested sum formula", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Complex Resource",
          maximum: {
            type: "sum",
            operands: [
              { type: "fixed", value: 1 },
              {
                type: "sum",
                operands: [
                  { type: "level-based", multiplier: 2 },
                  { type: "fixed", value: 3 },
                ],
              },
            ],
          },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, 4, defaultAbilities);

    // 1 + (4*2 + 3) = 1 + 11 = 12
    expect(result.resources[0]!.maximum).toBe(12);
  });
});

/* ── Multiple resources ─────────────────────────────────────────── */

describe("calculateResources - multiple resources", () => {
  it("handles multiple different resources", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "ability-based", ability: "STR" },
          recovery: { type: "long-rest" },
        },
      }),
      makeEffect("grant-resource", {
        resource: {
          name: "Ki points",
          maximum: { type: "level-based", multiplier: 2 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, 5, { ...defaultAbilities, STR: 16 });

    expect(result.resources).toHaveLength(2);
    // Sorted by name
    expect(result.resources[0]!.name).toBe("Ki points");
    expect(result.resources[0]!.maximum).toBe(10);
    expect(result.resources[1]!.name).toBe("Rage");
    expect(result.resources[1]!.maximum).toBe(3);
  });

  it("resources are sorted by name", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Zephyr",
          maximum: { type: "fixed", value: 1 },
          recovery: { type: "none" },
        },
      }),
      makeEffect("grant-resource", {
        resource: {
          name: "Alpha",
          maximum: { type: "fixed", value: 2 },
          recovery: { type: "none" },
        },
      }),
      makeEffect("grant-resource", {
        resource: {
          name: "Beta",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "none" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources.map((r) => r.name)).toEqual(["Alpha", "Beta", "Zephyr"]);
  });
});

/* ── Resource deduplication ─────────────────────────────────────── */

describe("calculateResources - deduplication", () => {
  it("deduplicates resources by name keeping highest maximum", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "long-rest" },
        },
      }),
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 5 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]!.name).toBe("Rage");
    expect(result.resources[0]!.maximum).toBe(5);
  });

  it("keeps first entry when maximums are equal", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "long-rest" },
        },
      }),
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "short-rest", amountRecovered: 1 },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]!.maximum).toBe(3);
    // First entry is kept since maximums are equal
    expect(result.resources[0]!.recovery).toBe("long-rest");
  });
});

/* ── Recovery types ─────────────────────────────────────────────── */

describe("calculateResources - recovery types", () => {
  it("preserves short-rest recovery", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Action Surge",
          maximum: { type: "fixed", value: 1 },
          recovery: { type: "short-rest", amountRecovered: 1 },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources[0]!.recovery).toBe("short-rest");
  });

  it("preserves long-rest recovery", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Ki points",
          maximum: { type: "level-based", multiplier: 2 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources[0]!.recovery).toBe("long-rest");
  });

  it("preserves no-recovery", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Second Wind",
          maximum: { type: "fixed", value: 1 },
          recovery: { type: "none" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources[0]!.recovery).toBe("no-recovery");
  });

  it("preserves custom recovery", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Spell Slots",
          maximum: { type: "fixed", value: 5 },
          recovery: { type: "custom", description: "Recovered on level up" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.resources[0]!.recovery).toBe("custom");
  });
});

/* ── Determinism ────────────────────────────────────────────────── */

describe("calculateResources - determinism", () => {
  it("same input produces same output", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "ability-based", ability: "STR" },
          recovery: { type: "long-rest" },
        },
      }),
      makeEffect("grant-resource", {
        resource: {
          name: "Ki points",
          maximum: { type: "level-based", multiplier: 2 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const abilities = { ...defaultAbilities, STR: 16 };
    const level = 5;

    const result1 = calculateResources(effects, level, abilities);
    const result2 = calculateResources(effects, level, abilities);

    expect(result1.resources).toEqual(result2.resources);
    expect(result1.explanations).toEqual(result2.explanations);
  });
});

/* ── Explanations ───────────────────────────────────────────────── */

describe("calculateResources - explanations", () => {
  it("generates explanation for each resource", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, defaultLevel, defaultAbilities);

    expect(result.explanations).toHaveLength(1);
    expect(result.explanations[0]).toBe("Rage: fixed(3) = 3");
  });

  it("generates explanations for multiple resources", () => {
    const effects: RuleEffect[] = [
      makeEffect("grant-resource", {
        resource: {
          name: "Rage",
          maximum: { type: "fixed", value: 3 },
          recovery: { type: "long-rest" },
        },
      }),
      makeEffect("grant-resource", {
        resource: {
          name: "Ki points",
          maximum: { type: "level-based", multiplier: 2 },
          recovery: { type: "long-rest" },
        },
      }),
    ];

    const result = calculateResources(effects, 5, defaultAbilities);

    expect(result.explanations).toHaveLength(2);
    expect(result.explanations).toContain("Rage: fixed(3) = 3");
    expect(result.explanations).toContain("Ki points: level(5) * 2 = 10");
  });
});

import { describe, it, expect } from "vitest";
import {
  isItemCost,
  isItemRule,
  createItemCost,
  createItemRule,
  type ItemCost,
  type ItemRule,
} from "./entity-item";
import {
  createEntityId,
  createChoiceDefinitionId,
  createSourceId,
  type EntityId,
  type ChoiceDefinitionId,
  type SourceId,
} from "@obsidian-dnd/domain";
import type { ChoiceDefinition } from "./choice-definition";
import { createChoiceDefinition } from "./choice-definition";
import type { RulePrerequisite } from "./prerequisite";
import { createAbilityScorePrerequisite } from "./prerequisite";
import type { RuleEffect } from "./effect";
import { createAddAbilityEffect } from "./effect";
import type { RenderNode } from "./render-node";
import { createRenderParagraph } from "./render-node";
import { createEntityQuery } from "./query";

let eidCounter = 0;
function makeEntityId(): EntityId {
  return createEntityId(`test-item-${++eidCounter}`);
}

let cidCounter = 0;
function makeChoiceId(): ChoiceDefinitionId {
  return createChoiceDefinitionId(`test-choice-${++cidCounter}`);
}

let sidCounter = 0;
function makeSourceId(): SourceId {
  return createSourceId(`test-source-${++sidCounter}`);
}

function makeMinimalChoiceDefinition(): ChoiceDefinition {
  return createChoiceDefinition(
    makeChoiceId(),
    "Test Choice",
    "entity",
    1,
    1,
    false,
    createEntityQuery("class-feature"),
    [],
  );
}

function makeMinimalPrerequisite(): RulePrerequisite {
  return createAbilityScorePrerequisite("STR", 8);
}

function makeMinimalEffect(): RuleEffect {
  return createAddAbilityEffect("STR", 2);
}

function makeMinimalRenderNode(): RenderNode {
  return createRenderParagraph("Item description.");
}

describe("isItemCost", () => {
  it("returns true for a valid cost", () => {
    const cost = createItemCost(10, "gp");
    expect(isItemCost(cost)).toBe(true);
  });

  it("returns true for zero amount", () => {
    const cost = createItemCost(0, "gp");
    expect(isItemCost(cost)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isItemCost(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isItemCost(undefined)).toBe(false);
  });

  it("returns false for negative amount", () => {
    expect(isItemCost({ amount: -1, unit: "gp" })).toBe(false);
  });

  it("returns false for non-numeric amount", () => {
    expect(isItemCost({ amount: "ten", unit: "gp" })).toBe(false);
  });

  it("returns false for missing amount", () => {
    expect(isItemCost({ unit: "gp" })).toBe(false);
  });

  it("returns false for empty unit", () => {
    expect(isItemCost({ amount: 10, unit: "" })).toBe(false);
  });

  it("returns false for missing unit", () => {
    expect(isItemCost({ amount: 10 })).toBe(false);
  });

  it("returns false for non-string unit", () => {
    expect(isItemCost({ amount: 10, unit: 123 })).toBe(false);
  });
});

describe("isItemRule", () => {
  function makeMinimalItemRule(): ItemRule {
    return createItemRule(
      makeEntityId(),
      "Dagger",
      makeSourceId(),
      "2024",
      "core",
      "weapon",
      ["light", "thrown"],
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
  }

  it("returns true for a valid item rule", () => {
    expect(isItemRule(makeMinimalItemRule())).toBe(true);
  });

  it("returns true with all optional fields", () => {
    const rule = createItemRule(
      makeEntityId(),
      "Ring of Protection",
      makeSourceId(),
      "2024",
      "source",
      "other",
      ["wondrous"],
      true,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      130,
      "Wondrous item, ring (requires attunement)",
      "rare",
      createItemCost(0, "gp"),
      0,
      "ring",
    );
    expect(isItemRule(rule)).toBe(true);
  });

  it("returns true with common rarity", () => {
    const rule = createItemRule(
      makeEntityId(),
      "Dagger",
      makeSourceId(),
      "2024",
      "core",
      "weapon",
      ["light", "thrown"],
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      undefined,
      undefined,
      "common",
    );
    expect(isItemRule(rule)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isItemRule(null)).toBe(false);
  });

  it("returns false for wrong kind", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).kind = "spell";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for empty name", () => {
    const rule = makeMinimalItemRule();
    rule.name = "";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for empty sourceId", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).sourceId = "";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid ruleset", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).ruleset = "5e";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid access", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).access = "premium";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for page below 1", () => {
    const rule = makeMinimalItemRule();
    rule.page = 0;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for missing legacy", () => {
    const rule = makeMinimalItemRule();
    delete (rule as unknown as Record<string, unknown>).legacy;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for non-array content", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).content = "not-array";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid render node in content", () => {
    const rule = makeMinimalItemRule();
    rule.content = [{} as RenderNode];
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for non-array prerequisites", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).prerequisites = "not-array";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid prerequisite", () => {
    const rule = makeMinimalItemRule();
    rule.prerequisites = [{} as RulePrerequisite];
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for non-array effects", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).effects = "not-array";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid effect", () => {
    const rule = makeMinimalItemRule();
    rule.effects = [{} as RuleEffect];
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for non-array choices", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).choices = "not-array";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid choice", () => {
    const rule = makeMinimalItemRule();
    rule.choices = [{} as ChoiceDefinition];
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for non-array dependencies", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).dependencies = "not-array";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for empty string dependency", () => {
    const rule = makeMinimalItemRule();
    rule.dependencies = ["" as EntityId];
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid category", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).category = "vehicle";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for missing category", () => {
    const rule = makeMinimalItemRule();
    delete (rule as unknown as Record<string, unknown>).category;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid rarity", () => {
    const rule = makeMinimalItemRule();
    rule.rarity = "mythic" as never;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid cost", () => {
    const rule = makeMinimalItemRule();
    rule.cost = {} as ItemCost;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for negative weight", () => {
    const rule = makeMinimalItemRule();
    rule.weight = -1;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for invalid bodySlot", () => {
    const rule = makeMinimalItemRule();
    rule.bodySlot = "neck" as never;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for non-array properties", () => {
    const rule = makeMinimalItemRule();
    (rule as unknown as Record<string, unknown>).properties = "not-array";
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for non-string in properties", () => {
    const rule = makeMinimalItemRule();
    rule.properties = ["light", 123 as never];
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for missing properties", () => {
    const rule = makeMinimalItemRule();
    delete (rule as unknown as Record<string, unknown>).properties;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for missing requiresAttunement", () => {
    const rule = makeMinimalItemRule();
    delete (rule as unknown as Record<string, unknown>).requiresAttunement;
    expect(isItemRule(rule)).toBe(false);
  });

  it("returns false for summary as non-string", () => {
    const rule = makeMinimalItemRule();
    rule.summary = 123 as never;
    expect(isItemRule(rule)).toBe(false);
  });
});

describe("createItemCost", () => {
  it("creates cost correctly", () => {
    const cost = createItemCost(10, "gp");
    expect(cost.amount).toBe(10);
    expect(cost.unit).toBe("gp");
    expect(isItemCost(cost)).toBe(true);
  });
});

describe("createItemRule", () => {
  it("creates rule with all required fields", () => {
    const rule = createItemRule(
      makeEntityId(),
      "Dagger",
      makeSourceId(),
      "2024",
      "core",
      "weapon",
      ["light", "thrown"],
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(rule.kind).toBe("item");
    expect(rule.name).toBe("Dagger");
    expect(rule.category).toBe("weapon");
    expect(rule.properties).toEqual(["light", "thrown"]);
    expect(rule.requiresAttunement).toBe(false);
    expect(rule.rarity).toBeUndefined();
    expect(rule.cost).toBeUndefined();
    expect(rule.weight).toBeUndefined();
    expect(rule.bodySlot).toBeUndefined();
    expect(rule.legacy).toBe(false);
    expect(isItemRule(rule)).toBe(true);
  });

  it("creates rule with all optional fields", () => {
    const rule = createItemRule(
      makeEntityId(),
      "Ring of Protection",
      makeSourceId(),
      "2024",
      "source",
      "other",
      ["wondrous"],
      true,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      130,
      "Wondrous item, ring (requires attunement)",
      "rare",
      createItemCost(0, "gp"),
      0,
      "ring",
    );
    expect(rule.page).toBe(130);
    expect(rule.summary).toBe("Wondrous item, ring (requires attunement)");
    expect(rule.rarity).toBe("rare");
    expect(rule.cost).toEqual({ amount: 0, unit: "gp" });
    expect(rule.weight).toBe(0);
    expect(rule.bodySlot).toBe("ring");
    expect(rule.requiresAttunement).toBe(true);
    expect(isItemRule(rule)).toBe(true);
  });

  it("copies arrays defensively", () => {
    const content = [makeMinimalRenderNode()];
    const prereqs: RulePrerequisite[] = [makeMinimalPrerequisite()];
    const effects: RuleEffect[] = [makeMinimalEffect()];
    const choices: ChoiceDefinition[] = [makeMinimalChoiceDefinition()];
    const deps: EntityId[] = [makeEntityId()];
    const properties: string[] = ["light", "thrown"];

    const rule = createItemRule(
      makeEntityId(),
      "Test",
      makeSourceId(),
      "2024",
      "core",
      "weapon",
      properties,
      false,
      content,
      prereqs,
      effects,
      choices,
      deps,
      false,
    );

    expect(rule.content).not.toBe(content);
    expect(rule.prerequisites).not.toBe(prereqs);
    expect(rule.effects).not.toBe(effects);
    expect(rule.choices).not.toBe(choices);
    expect(rule.dependencies).not.toBe(deps);
    expect(rule.properties).not.toBe(properties);
  });
});

/* ── Round-trip tests ──────────────────────────────────────────── */

describe("round-trip", () => {
  it("ItemCost round-trips", () => {
    const cost = createItemCost(10, "gp");
    expect(isItemCost(cost)).toBe(true);
  });

  it("ItemRule round-trips with minimal fields", () => {
    const rule = createItemRule(
      makeEntityId(),
      "Dagger",
      makeSourceId(),
      "2024",
      "core",
      "weapon",
      ["light", "thrown"],
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(isItemRule(rule)).toBe(true);
  });

  it("ItemRule round-trips with full data", () => {
    const rule = createItemRule(
      makeEntityId(),
      "Ring of Protection",
      makeSourceId(),
      "2024",
      "source",
      "other",
      ["wondrous"],
      true,
      [makeMinimalRenderNode()],
      [makeMinimalPrerequisite()],
      [makeMinimalEffect()],
      [makeMinimalChoiceDefinition()],
      [makeEntityId()],
      false,
      130,
      "Wondrous item, ring (requires attunement)",
      "rare",
      createItemCost(0, "gp"),
      0,
      "ring",
    );
    expect(isItemRule(rule)).toBe(true);
  });
});

/* ── Invalid input rejection tests ─────────────────────────────── */

describe("invalid input rejection", () => {
  describe("isItemCost rejects", () => {
    it("null", () => {
      expect(isItemCost(null)).toBe(false);
    });

    it("undefined", () => {
      expect(isItemCost(undefined)).toBe(false);
    });

    it("string", () => {
      expect(isItemCost("not an object")).toBe(false);
    });

    it("number", () => {
      expect(isItemCost(42)).toBe(false);
    });

    it("array", () => {
      expect(isItemCost([])).toBe(false);
    });

    it("missing amount", () => {
      expect(isItemCost({ unit: "gp" })).toBe(false);
    });

    it("missing unit", () => {
      expect(isItemCost({ amount: 10 })).toBe(false);
    });

    it("wrong type for amount", () => {
      expect(isItemCost({ amount: "ten", unit: "gp" })).toBe(false);
    });
  });

  describe("isItemRule rejects", () => {
    it("null", () => {
      expect(isItemRule(null)).toBe(false);
    });

    it("undefined", () => {
      expect(isItemRule(undefined)).toBe(false);
    });

    it("string", () => {
      expect(isItemRule("not an object")).toBe(false);
    });

    it("number", () => {
      expect(isItemRule(42)).toBe(false);
    });

    it("array", () => {
      expect(isItemRule([])).toBe(false);
    });

    it("missing id", () => {
      expect(isItemRule({ kind: "item", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], category: "weapon" as const, properties: [], requiresAttunement: false })).toBe(false);
    });

    it("missing name", () => {
      expect(isItemRule({ id: makeEntityId(), kind: "item", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], category: "weapon" as const, properties: [], requiresAttunement: false })).toBe(false);
    });

    it("missing category", () => {
      expect(isItemRule({ id: makeEntityId(), kind: "item", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], properties: [], requiresAttunement: false })).toBe(false);
    });

    it("missing properties", () => {
      expect(isItemRule({ id: makeEntityId(), kind: "item", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], category: "weapon" as const, requiresAttunement: false })).toBe(false);
    });

    it("missing requiresAttunement", () => {
      expect(isItemRule({ id: makeEntityId(), kind: "item", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], category: "weapon" as const, properties: [] })).toBe(false);
    });
  });
});

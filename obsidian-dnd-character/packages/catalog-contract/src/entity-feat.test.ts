import { describe, it, expect } from "vitest";
import {
  isFeatRule,
  createFeatRule,
  type FeatRule,
} from "./entity-feat";
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
  return createEntityId(`test-feat-${++eidCounter}`);
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
  return createRenderParagraph("Feat description.");
}

describe("isFeatRule", () => {
  function makeMinimalFeatRule(): FeatRule {
    return createFeatRule(
      makeEntityId(),
      "Tough",
      makeSourceId(),
      "2024",
      "core",
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
  }

  it("returns true for a valid feat rule", () => {
    expect(isFeatRule(makeMinimalFeatRule())).toBe(true);
  });

  it("returns true with ability prerequisite", () => {
    const rule = createFeatRule(
      makeEntityId(),
      "Great Weapon Master",
      makeSourceId(),
      "2024",
      "core",
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      50,
      "Deal extra damage at the cost of accuracy.",
      "STR",
      20,
    );
    expect(isFeatRule(rule)).toBe(true);
  });

  it("returns true with only abilityScorePrerequisite", () => {
    const rule = createFeatRule(
      makeEntityId(),
      "Observant",
      makeSourceId(),
      "2024",
      "core",
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      undefined,
      undefined,
      "INT",
      undefined,
    );
    expect(isFeatRule(rule)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isFeatRule(null)).toBe(false);
  });

  it("returns false for wrong kind", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).kind = "spell";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for empty name", () => {
    const rule = makeMinimalFeatRule();
    rule.name = "";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for empty sourceId", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).sourceId = "";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for invalid ruleset", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).ruleset = "5e";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for invalid access", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).access = "premium";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for page below 1", () => {
    const rule = makeMinimalFeatRule();
    rule.page = 0;
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for missing legacy", () => {
    const rule = makeMinimalFeatRule();
    delete (rule as unknown as Record<string, unknown>).legacy;
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for non-array content", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).content = "not-array";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for invalid render node in content", () => {
    const rule = makeMinimalFeatRule();
    rule.content = [{} as RenderNode];
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for non-array prerequisites", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).prerequisites = "not-array";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for invalid prerequisite", () => {
    const rule = makeMinimalFeatRule();
    rule.prerequisites = [{} as RulePrerequisite];
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for non-array effects", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).effects = "not-array";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for invalid effect", () => {
    const rule = makeMinimalFeatRule();
    rule.effects = [{} as RuleEffect];
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for non-array choices", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).choices = "not-array";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for invalid choice", () => {
    const rule = makeMinimalFeatRule();
    rule.choices = [{} as ChoiceDefinition];
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for non-array dependencies", () => {
    const rule = makeMinimalFeatRule();
    (rule as unknown as Record<string, unknown>).dependencies = "not-array";
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for empty string dependency", () => {
    const rule = makeMinimalFeatRule();
    rule.dependencies = ["" as EntityId];
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for invalid abilityScorePrerequisite", () => {
    const rule = makeMinimalFeatRule();
    rule.abilityScorePrerequisite = "not-ability" as never;
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for negative abilityMinScore", () => {
    const rule = makeMinimalFeatRule();
    rule.abilityMinScore = -1;
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for abilityMinScore below 1", () => {
    const rule = makeMinimalFeatRule();
    rule.abilityMinScore = 0;
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for non-integer abilityMinScore", () => {
    const rule = makeMinimalFeatRule();
    rule.abilityMinScore = 10.5;
    expect(isFeatRule(rule)).toBe(false);
  });

  it("returns false for summary as non-string", () => {
    const rule = makeMinimalFeatRule();
    rule.summary = 123 as never;
    expect(isFeatRule(rule)).toBe(false);
  });
});

describe("createFeatRule", () => {
  it("creates rule with all required fields", () => {
    const rule = createFeatRule(
      makeEntityId(),
      "Tough",
      makeSourceId(),
      "2024",
      "core",
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(rule.kind).toBe("feat");
    expect(rule.name).toBe("Tough");
    expect(rule.abilityScorePrerequisite).toBeUndefined();
    expect(rule.abilityMinScore).toBeUndefined();
    expect(rule.legacy).toBe(false);
    expect(isFeatRule(rule)).toBe(true);
  });

  it("creates rule with all optional fields", () => {
    const rule = createFeatRule(
      makeEntityId(),
      "Great Weapon Master",
      makeSourceId(),
      "2024",
      "core",
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      50,
      "Deal extra damage at the cost of accuracy.",
      "STR",
      20,
    );
    expect(rule.page).toBe(50);
    expect(rule.summary).toBe("Deal extra damage at the cost of accuracy.");
    expect(rule.abilityScorePrerequisite).toBe("STR");
    expect(rule.abilityMinScore).toBe(20);
    expect(isFeatRule(rule)).toBe(true);
  });

  it("copies arrays defensively", () => {
    const content = [makeMinimalRenderNode()];
    const prereqs: RulePrerequisite[] = [makeMinimalPrerequisite()];
    const effects: RuleEffect[] = [makeMinimalEffect()];
    const choices: ChoiceDefinition[] = [makeMinimalChoiceDefinition()];
    const deps: EntityId[] = [makeEntityId()];

    const rule = createFeatRule(
      makeEntityId(),
      "Test",
      makeSourceId(),
      "2024",
      "core",
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
  });
});

/* ── Round-trip tests ──────────────────────────────────────────── */

describe("round-trip", () => {
  it("FeatRule round-trips with minimal fields", () => {
    const rule = createFeatRule(
      makeEntityId(),
      "Tough",
      makeSourceId(),
      "2024",
      "core",
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(isFeatRule(rule)).toBe(true);
  });

  it("FeatRule round-trips with full data", () => {
    const rule = createFeatRule(
      makeEntityId(),
      "Great Weapon Master",
      makeSourceId(),
      "2024",
      "core",
      [makeMinimalRenderNode()],
      [makeMinimalPrerequisite()],
      [makeMinimalEffect()],
      [makeMinimalChoiceDefinition()],
      [makeEntityId()],
      false,
      50,
      "Deal extra damage at the cost of accuracy.",
      "STR",
      20,
    );
    expect(isFeatRule(rule)).toBe(true);
  });
});

/* ── Invalid input rejection tests ─────────────────────────────── */

describe("invalid input rejection", () => {
  describe("isFeatRule rejects", () => {
    it("null", () => {
      expect(isFeatRule(null)).toBe(false);
    });

    it("undefined", () => {
      expect(isFeatRule(undefined)).toBe(false);
    });

    it("string", () => {
      expect(isFeatRule("not an object")).toBe(false);
    });

    it("number", () => {
      expect(isFeatRule(42)).toBe(false);
    });

    it("array", () => {
      expect(isFeatRule([])).toBe(false);
    });

    it("missing id", () => {
      expect(isFeatRule({ kind: "feat", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [] })).toBe(false);
    });

    it("missing name", () => {
      expect(isFeatRule({ id: makeEntityId(), kind: "feat", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [] })).toBe(false);
    });
  });
});

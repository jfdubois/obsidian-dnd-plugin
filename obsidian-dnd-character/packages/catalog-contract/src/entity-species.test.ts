import { describe, it, expect } from "vitest";
import {
  isTraitDefinition,
  isSpeciesRule,
  createTraitDefinition,
  createSpeciesRule,
  type TraitDefinition,
  type SpeciesRule,
} from "./entity-species";
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

/* ── Helpers ─────────────────────────────────────────────────── */

let eidCounter = 0;
function makeEntityId(): EntityId {
  return createEntityId(`test-species-${++eidCounter}`);
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
  return createRenderParagraph("Species description.");
}

function makeMinimalTraitDefinition(): TraitDefinition {
  return createTraitDefinition("Darkvision", [makeMinimalRenderNode()]);
}

/* ── Tests: TraitDefinition validator ────────────────────────── */

describe("isTraitDefinition", () => {
  it("returns true for a valid trait definition", () => {
    const trait = makeMinimalTraitDefinition();
    expect(isTraitDefinition(trait)).toBe(true);
  });

  it("returns true with empty content", () => {
    const trait = createTraitDefinition("Keen Hearing", []);
    expect(isTraitDefinition(trait)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isTraitDefinition(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTraitDefinition(undefined)).toBe(false);
  });

  it("returns false for empty name", () => {
    expect(isTraitDefinition({ name: "", content: [] })).toBe(false);
  });

  it("returns false for missing name", () => {
    expect(isTraitDefinition({ content: [] })).toBe(false);
  });

  it("returns false for missing content", () => {
    expect(isTraitDefinition({ name: "Trait" })).toBe(false);
  });

  it("returns false for non-array content", () => {
    expect(isTraitDefinition({ name: "Trait", content: "not-array" })).toBe(false);
  });

  it("returns false for invalid render node in content", () => {
    expect(isTraitDefinition({ name: "Trait", content: [{}] })).toBe(false);
  });

  it("returns false for name as non-string", () => {
    expect(isTraitDefinition({ name: 123, content: [] })).toBe(false);
  });
});

/* ── Tests: SpeciesRule validator ────────────────────────────── */

describe("isSpeciesRule", () => {
  function makeMinimalSpeciesRule(): SpeciesRule {
    return createSpeciesRule(
      makeEntityId(),
      "Human",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      false,
      [],
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
  }

  it("returns true for a valid species rule", () => {
    expect(isSpeciesRule(makeMinimalSpeciesRule())).toBe(true);
  });

  it("returns true with all optional fields", () => {
    const rule = createSpeciesRule(
      makeEntityId(),
      "Elf",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      true,
      [makeEntityId()],
      [makeMinimalTraitDefinition()],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      10,
      "Graceful and long-lived.",
      60,
    );
    expect(isSpeciesRule(rule)).toBe(true);
  });

  it("returns true with darkvision and range", () => {
    const rule = createSpeciesRule(
      makeEntityId(),
      "Dwarf",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      25,
      true,
      [makeEntityId()],
      [makeMinimalTraitDefinition()],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      undefined,
      undefined,
      120,
    );
    expect(isSpeciesRule(rule)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSpeciesRule(null)).toBe(false);
  });

  it("returns false for wrong kind", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).kind = "background";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for empty name", () => {
    const rule = makeMinimalSpeciesRule();
    rule.name = "";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for empty sourceId", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).sourceId = "";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for invalid ruleset", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).ruleset = "5e";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for invalid access", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).access = "premium";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for page below 1", () => {
    const rule = makeMinimalSpeciesRule();
    rule.page = 0;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for missing legacy", () => {
    const rule = makeMinimalSpeciesRule();
    delete (rule as unknown as Record<string, unknown>).legacy;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-array content", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).content = "not-array";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for invalid render node in content", () => {
    const rule = makeMinimalSpeciesRule();
    rule.content = [{} as RenderNode];
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-array prerequisites", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).prerequisites = "not-array";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for invalid prerequisite", () => {
    const rule = makeMinimalSpeciesRule();
    rule.prerequisites = [{} as RulePrerequisite];
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-array effects", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).effects = "not-array";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for invalid effect", () => {
    const rule = makeMinimalSpeciesRule();
    rule.effects = [{} as RuleEffect];
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-array choices", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).choices = "not-array";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for invalid choice", () => {
    const rule = makeMinimalSpeciesRule();
    rule.choices = [{} as ChoiceDefinition];
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-array dependencies", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).dependencies = "not-array";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for empty string dependency", () => {
    const rule = makeMinimalSpeciesRule();
    rule.dependencies = ["" as EntityId];
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for empty size", () => {
    const rule = makeMinimalSpeciesRule();
    rule.size = "";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for missing size", () => {
    const rule = makeMinimalSpeciesRule();
    delete (rule as unknown as Record<string, unknown>).size;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for negative speed", () => {
    const rule = makeMinimalSpeciesRule();
    rule.speed = -5;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-integer speed", () => {
    const rule = makeMinimalSpeciesRule();
    rule.speed = 30.5;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for missing speed", () => {
    const rule = makeMinimalSpeciesRule();
    delete (rule as unknown as Record<string, unknown>).speed;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for missing darkvision", () => {
    const rule = makeMinimalSpeciesRule();
    delete (rule as unknown as Record<string, unknown>).darkvision;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for negative darkvisionRange", () => {
    const rule = makeMinimalSpeciesRule();
    rule.darkvisionRange = -10;
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-array languageIds", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).languageIds = "not-array";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for empty string languageId", () => {
    const rule = makeMinimalSpeciesRule();
    rule.languageIds = ["" as EntityId];
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for non-array traitDefs", () => {
    const rule = makeMinimalSpeciesRule();
    (rule as unknown as Record<string, unknown>).traitDefs = "not-array";
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for invalid traitDef", () => {
    const rule = makeMinimalSpeciesRule();
    rule.traitDefs = [{} as TraitDefinition];
    expect(isSpeciesRule(rule)).toBe(false);
  });

  it("returns false for summary as non-string", () => {
    const rule = makeMinimalSpeciesRule();
    rule.summary = 123 as never;
    expect(isSpeciesRule(rule)).toBe(false);
  });
});

/* ── Tests: Factories ────────────────────────────────────────── */

describe("createTraitDefinition", () => {
  it("creates trait with content copy", () => {
    const content = [makeMinimalRenderNode()];
    const trait = createTraitDefinition("Darkvision", content);
    expect(trait.name).toBe("Darkvision");
    expect(trait.content).not.toBe(content);
    expect(trait.content.length).toBe(1);
    expect(isTraitDefinition(trait)).toBe(true);
  });

  it("creates trait with empty content", () => {
    const trait = createTraitDefinition("Nimble Escape", []);
    expect(trait.content).toEqual([]);
    expect(isTraitDefinition(trait)).toBe(true);
  });
});

describe("createSpeciesRule", () => {
  it("creates rule with all required fields", () => {
    const rule = createSpeciesRule(
      makeEntityId(),
      "Human",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      false,
      [],
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(rule.kind).toBe("species");
    expect(rule.name).toBe("Human");
    expect(rule.size).toBe("Medium");
    expect(rule.speed).toBe(30);
    expect(rule.darkvision).toBe(false);
    expect(rule.darkvisionRange).toBeUndefined();
    expect(rule.languageIds).toEqual([]);
    expect(rule.traitDefs).toEqual([]);
    expect(rule.legacy).toBe(false);
    expect(isSpeciesRule(rule)).toBe(true);
  });

  it("creates rule with all optional fields", () => {
    const languages = [makeEntityId()];
    const traits = [makeMinimalTraitDefinition()];
    const rule = createSpeciesRule(
      makeEntityId(),
      "Elf",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      true,
      languages,
      traits,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      10,
      "Graceful and long-lived.",
      60,
    );
    expect(rule.page).toBe(10);
    expect(rule.summary).toBe("Graceful and long-lived.");
    expect(rule.darkvision).toBe(true);
    expect(rule.darkvisionRange).toBe(60);
    expect(rule.languageIds).toEqual(languages);
    expect(rule.traitDefs).toHaveLength(1);
    expect(isSpeciesRule(rule)).toBe(true);
  });

  it("copies arrays defensively", () => {
    const content = [makeMinimalRenderNode()];
    const prereqs: RulePrerequisite[] = [makeMinimalPrerequisite()];
    const effects: RuleEffect[] = [makeMinimalEffect()];
    const choices: ChoiceDefinition[] = [makeMinimalChoiceDefinition()];
    const deps: EntityId[] = [makeEntityId()];
    const langs: EntityId[] = [makeEntityId()];
    const traits: TraitDefinition[] = [makeMinimalTraitDefinition()];

    const rule = createSpeciesRule(
      makeEntityId(),
      "Test",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      false,
      langs,
      traits,
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
    expect(rule.languageIds).not.toBe(langs);
    expect(rule.traitDefs).not.toBe(traits);
  });

  it("deep-copies trait definitions", () => {
    const originalTrait = makeMinimalTraitDefinition();
    const traits = [originalTrait];
    const rule = createSpeciesRule(
      makeEntityId(),
      "Test",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      false,
      [],
      traits,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    const copiedTrait = rule.traitDefs[0];
    expect(copiedTrait).not.toBe(originalTrait);
    if (copiedTrait) {
      expect(copiedTrait.content).not.toBe(originalTrait.content);
    }
  });
});

/* ── Round-trip tests ──────────────────────────────────────────── */

describe("round-trip", () => {
  it("TraitDefinition round-trips", () => {
    const trait = createTraitDefinition("Darkvision", [makeMinimalRenderNode()]);
    expect(isTraitDefinition(trait)).toBe(true);
  });

  it("SpeciesRule round-trips with minimal fields", () => {
    const rule = createSpeciesRule(
      makeEntityId(),
      "Human",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      false,
      [],
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(isSpeciesRule(rule)).toBe(true);
  });

  it("SpeciesRule round-trips with full data", () => {
    const rule = createSpeciesRule(
      makeEntityId(),
      "Elf",
      makeSourceId(),
      "2024",
      "core",
      "Medium",
      30,
      true,
      [makeEntityId()],
      [makeMinimalTraitDefinition()],
      [makeMinimalRenderNode()],
      [makeMinimalPrerequisite()],
      [makeMinimalEffect()],
      [makeMinimalChoiceDefinition()],
      [makeEntityId()],
      false,
      10,
      "Graceful and long-lived.",
      60,
    );
    expect(isSpeciesRule(rule)).toBe(true);
  });
});

/* ── Invalid input rejection tests ─────────────────────────────── */

describe("invalid input rejection", () => {
  describe("isTraitDefinition rejects", () => {
    it("null", () => {
      expect(isTraitDefinition(null)).toBe(false);
    });

    it("undefined", () => {
      expect(isTraitDefinition(undefined)).toBe(false);
    });

    it("string", () => {
      expect(isTraitDefinition("not an object")).toBe(false);
    });

    it("number", () => {
      expect(isTraitDefinition(42)).toBe(false);
    });

    it("array", () => {
      expect(isTraitDefinition([])).toBe(false);
    });

    it("missing name", () => {
      expect(isTraitDefinition({ content: [] })).toBe(false);
    });

    it("missing content", () => {
      expect(isTraitDefinition({ name: "Trait" })).toBe(false);
    });

    it("wrong type for name", () => {
      expect(isTraitDefinition({ name: 123, content: [] })).toBe(false);
    });
  });

  describe("isSpeciesRule rejects", () => {
    it("null", () => {
      expect(isSpeciesRule(null)).toBe(false);
    });

    it("undefined", () => {
      expect(isSpeciesRule(undefined)).toBe(false);
    });

    it("string", () => {
      expect(isSpeciesRule("not an object")).toBe(false);
    });

    it("number", () => {
      expect(isSpeciesRule(42)).toBe(false);
    });

    it("array", () => {
      expect(isSpeciesRule([])).toBe(false);
    });

    it("missing id", () => {
      expect(isSpeciesRule({ kind: "species", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], size: "Medium", speed: 30, darkvision: false, languageIds: [], traitDefs: [] })).toBe(false);
    });

    it("missing name", () => {
      expect(isSpeciesRule({ id: makeEntityId(), kind: "species", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], size: "Medium", speed: 30, darkvision: false, languageIds: [], traitDefs: [] })).toBe(false);
    });

    it("missing size", () => {
      expect(isSpeciesRule({ id: makeEntityId(), kind: "species", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], speed: 30, darkvision: false, languageIds: [], traitDefs: [] })).toBe(false);
    });

    it("missing speed", () => {
      expect(isSpeciesRule({ id: makeEntityId(), kind: "species", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], size: "Medium", darkvision: false, languageIds: [], traitDefs: [] })).toBe(false);
    });

    it("missing darkvision", () => {
      expect(isSpeciesRule({ id: makeEntityId(), kind: "species", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], size: "Medium", speed: 30, languageIds: [], traitDefs: [] })).toBe(false);
    });
  });
});

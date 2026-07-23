import { describe, it, expect } from "vitest";
import {
  isBackgroundRule,
  createBackgroundRule,
  type BackgroundRule,
} from "./entity-background";
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
  return createEntityId(`test-background-${++eidCounter}`);
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
  return createRenderParagraph("Background description.");
}

/* ── Tests: BackgroundRule validator ─────────────────────────── */

describe("isBackgroundRule", () => {
  function makeMinimalBackgroundRule(): BackgroundRule {
    return createBackgroundRule(
      makeEntityId(),
      "Acolyte",
      makeSourceId(),
      "2024",
      "core",
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
  }

  it("returns true for a valid background rule", () => {
    expect(isBackgroundRule(makeMinimalBackgroundRule())).toBe(true);
  });

  it("returns true with all optional fields", () => {
    const rule = createBackgroundRule(
      makeEntityId(),
      "Acolyte",
      makeSourceId(),
      "2024",
      "core",
      [makeEntityId()],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      12,
      "You have spent your life in the service of a temple.",
      makeEntityId(),
    );
    expect(isBackgroundRule(rule)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isBackgroundRule(null)).toBe(false);
  });

  it("returns false for wrong kind", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).kind = "species";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for empty name", () => {
    const rule = makeMinimalBackgroundRule();
    rule.name = "";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for empty sourceId", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).sourceId = "";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for invalid ruleset", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).ruleset = "5e";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for invalid access", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).access = "premium";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for page below 1", () => {
    const rule = makeMinimalBackgroundRule();
    rule.page = 0;
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for missing legacy", () => {
    const rule = makeMinimalBackgroundRule();
    delete (rule as unknown as Record<string, unknown>).legacy;
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for non-array content", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).content = "not-array";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for invalid render node in content", () => {
    const rule = makeMinimalBackgroundRule();
    rule.content = [{} as RenderNode];
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for non-array prerequisites", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).prerequisites = "not-array";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for invalid prerequisite", () => {
    const rule = makeMinimalBackgroundRule();
    rule.prerequisites = [{} as RulePrerequisite];
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for non-array effects", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).effects = "not-array";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for invalid effect", () => {
    const rule = makeMinimalBackgroundRule();
    rule.effects = [{} as RuleEffect];
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for non-array choices", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).choices = "not-array";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for invalid choice", () => {
    const rule = makeMinimalBackgroundRule();
    rule.choices = [{} as ChoiceDefinition];
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for non-array dependencies", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).dependencies = "not-array";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for empty string dependency", () => {
    const rule = makeMinimalBackgroundRule();
    rule.dependencies = ["" as EntityId];
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for non-array skillProficiencies", () => {
    const rule = makeMinimalBackgroundRule();
    (rule as unknown as Record<string, unknown>).skillProficiencies = "not-array";
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for empty string skillProficiency", () => {
    const rule = makeMinimalBackgroundRule();
    rule.skillProficiencies = ["" as EntityId];
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for missing skillProficiencies", () => {
    const rule = makeMinimalBackgroundRule();
    delete (rule as unknown as Record<string, unknown>).skillProficiencies;
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for invalid featureId", () => {
    const rule = makeMinimalBackgroundRule();
    rule.featureId = "" as EntityId;
    expect(isBackgroundRule(rule)).toBe(false);
  });

  it("returns false for summary as non-string", () => {
    const rule = makeMinimalBackgroundRule();
    rule.summary = 123 as never;
    expect(isBackgroundRule(rule)).toBe(false);
  });
});

/* ── Tests: Factory ──────────────────────────────────────────── */

describe("createBackgroundRule", () => {
  it("creates rule with all required fields", () => {
    const rule = createBackgroundRule(
      makeEntityId(),
      "Acolyte",
      makeSourceId(),
      "2024",
      "core",
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(rule.kind).toBe("background");
    expect(rule.name).toBe("Acolyte");
    expect(rule.skillProficiencies).toEqual([]);
    expect(rule.featureId).toBeUndefined();
    expect(rule.legacy).toBe(false);
    expect(isBackgroundRule(rule)).toBe(true);
  });

  it("creates rule with all optional fields", () => {
    const skills = [makeEntityId()];
    const featureId = makeEntityId();
    const rule = createBackgroundRule(
      makeEntityId(),
      "Acolyte",
      makeSourceId(),
      "2024",
      "core",
      skills,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      12,
      "You have spent your life in the service of a temple.",
      featureId,
    );
    expect(rule.page).toBe(12);
    expect(rule.summary).toBe("You have spent your life in the service of a temple.");
    expect(rule.skillProficiencies).toEqual(skills);
    expect(rule.featureId).toBe(featureId);
    expect(isBackgroundRule(rule)).toBe(true);
  });

  it("copies arrays defensively", () => {
    const content = [makeMinimalRenderNode()];
    const prereqs: RulePrerequisite[] = [makeMinimalPrerequisite()];
    const effects: RuleEffect[] = [makeMinimalEffect()];
    const choices: ChoiceDefinition[] = [makeMinimalChoiceDefinition()];
    const deps: EntityId[] = [makeEntityId()];
    const skills: EntityId[] = [makeEntityId()];

    const rule = createBackgroundRule(
      makeEntityId(),
      "Test",
      makeSourceId(),
      "2024",
      "core",
      skills,
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
    expect(rule.skillProficiencies).not.toBe(skills);
  });
});

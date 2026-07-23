import { describe, it, expect } from "vitest";
import {
  isLevelGrant,
  isSpellLevelGrant,
  isSpellcastingProgression,
  isLevelDefinition,
  isClassRule,
  createFeatureGrant,
  createChoiceGrant,
  createSubclassChoiceGrant,
  createAbilityScoreImprovementGrant,
  createSpellProgressionGrant,
  createResourceProgressionGrant,
  createSpellLevelGrant,
  createSpellcastingProgression,
  createLevelDefinition,
  createClassRule,
  type LevelGrant,
  type SpellcastingProgression,
  type LevelDefinition,
  type ClassRule,
} from "./class-progression";
import {
  createEntityId,
  createChoiceDefinitionId,
  createResourceId,
  createSourceId,
  type EntityId,
  type ChoiceDefinitionId,
  type ResourceId,
  type SourceId,
  type Ability,
} from "@obsidian-dnd/domain";
import type { ChoiceDefinition } from "./choice-definition";
import { createChoiceDefinition } from "./choice-definition";
import type { RulePrerequisite } from "./prerequisite";
import { createAbilityScorePrerequisite } from "./prerequisite";
import type { RuleEffect } from "./effect";
import { createAddAbilityEffect } from "./effect";
import type { RenderNode } from "./render-node";
import { createRenderParagraph } from "./render-node";
import { createFixedValueFormula } from "./effect";
import { createEntityQuery } from "./query";

/* ── Helpers ─────────────────────────────────────────────────── */

let eidCounter = 0;
function makeEntityId(): EntityId {
  return createEntityId(`test-class-${++eidCounter}`);
}

let cidCounter = 0;
function makeChoiceId(): ChoiceDefinitionId {
  return createChoiceDefinitionId(`test-choice-${++cidCounter}`);
}

let ridCounter = 0;
function makeResourceId(): ResourceId {
  return createResourceId(`test-resource-${++ridCounter}`);
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
  return createRenderParagraph("Class description.");
}

function makeMinimalLevels(): Record<number, LevelDefinition> {
  return {
    1: createLevelDefinition(1, [
      createFeatureGrant(makeEntityId()),
    ]),
  };
}

/* ── Tests: LevelGrant validators ────────────────────────────── */

describe("isLevelGrant", () => {
  it("returns true for a valid feature grant", () => {
    const grant = createFeatureGrant(makeEntityId());
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("returns true for a valid choice grant", () => {
    const grant = createChoiceGrant(makeChoiceId());
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("returns true for a valid subclass-choice grant", () => {
    const grant = createSubclassChoiceGrant(makeChoiceId());
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("returns true for a valid ability-score-improvement grant", () => {
    const grant = createAbilityScoreImprovementGrant(makeChoiceId());
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("returns true for a valid spell-progression grant", () => {
    const grant = createSpellProgressionGrant(
      createSpellLevelGrant(1, 2),
    );
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("returns true for a valid resource-progression grant", () => {
    const grant = createResourceProgressionGrant(
      makeResourceId(),
      createFixedValueFormula(6),
    );
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isLevelGrant(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isLevelGrant(undefined)).toBe(false);
  });

  it("returns false for a plain object without type", () => {
    expect(isLevelGrant({})).toBe(false);
  });

  it("returns false for an unknown discriminant", () => {
    expect(isLevelGrant({ type: "unknown" })).toBe(false);
  });

  it("returns false for feature grant with missing featureId", () => {
    expect(isLevelGrant({ type: "feature" })).toBe(false);
  });

  it("returns false for feature grant with empty featureId", () => {
    expect(isLevelGrant({ type: "feature", featureId: "" })).toBe(false);
  });

  it("returns false for choice grant with missing choiceDefinitionId", () => {
    expect(isLevelGrant({ type: "choice" })).toBe(false);
  });

  it("returns false for spell-progression with invalid progression", () => {
    expect(isLevelGrant({ type: "spell-progression", progression: null })).toBe(false);
  });

  it("returns false for resource-progression with missing resourceId", () => {
    expect(isLevelGrant({ type: "resource-progression", maximum: createFixedValueFormula(6) })).toBe(false);
  });

  it("returns false for resource-progression with missing maximum", () => {
    expect(isLevelGrant({ type: "resource-progression", resourceId: makeResourceId() })).toBe(false);
  });
});

/* ── Tests: SpellLevelGrant validator ────────────────────────── */

describe("isSpellLevelGrant", () => {
  it("returns true for a valid grant", () => {
    const grant = createSpellLevelGrant(1, 4);
    expect(isSpellLevelGrant(grant)).toBe(true);
  });

  it("returns true with optional slotsPerRest", () => {
    const grant = createSpellLevelGrant(1, 4, { short: 1, long: 2 });
    expect(isSpellLevelGrant(grant)).toBe(true);
  });

  it("returns true for cantrip-level (spellLevel 0)", () => {
    const grant = createSpellLevelGrant(0, 3);
    expect(isSpellLevelGrant(grant)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSpellLevelGrant(null)).toBe(false);
  });

  it("returns false for negative spellLevel", () => {
    expect(isSpellLevelGrant({ spellLevel: -1, slots: 2 })).toBe(false);
  });

  it("returns false for negative slots", () => {
    expect(isSpellLevelGrant({ spellLevel: 1, slots: -1 })).toBe(false);
  });

  it("returns false for non-integer spellLevel", () => {
    expect(isSpellLevelGrant({ spellLevel: 1.5, slots: 2 })).toBe(false);
  });

  it("returns false for non-integer slots", () => {
    expect(isSpellLevelGrant({ spellLevel: 1, slots: 2.5 })).toBe(false);
  });

  it("returns false for invalid slotsPerRest", () => {
    expect(isSpellLevelGrant({ spellLevel: 1, slots: 2, slotsPerRest: { short: -1, long: 2 } })).toBe(false);
  });

  it("returns false for missing spellLevel", () => {
    expect(isSpellLevelGrant({ slots: 2 })).toBe(false);
  });

  it("returns false for missing slots", () => {
    expect(isSpellLevelGrant({ spellLevel: 1 })).toBe(false);
  });
});

/* ── Tests: SpellcastingProgression validator ────────────────── */

describe("isSpellcastingProgression", () => {
  it("returns true for a valid progression", () => {
    const prog = createSpellcastingProgression(1, {
      1: createSpellLevelGrant(1, 2),
    });
    expect(isSpellcastingProgression(prog)).toBe(true);
  });

  it("returns true for empty spellLevels", () => {
    const prog = createSpellcastingProgression(0, {});
    expect(isSpellcastingProgression(prog)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSpellcastingProgression(null)).toBe(false);
  });

  it("returns false for negative casterLevel", () => {
    expect(isSpellcastingProgression({ casterLevel: -1, spellLevels: {} })).toBe(false);
  });

  it("returns false for non-integer casterLevel", () => {
    expect(isSpellcastingProgression({ casterLevel: 1.5, spellLevels: {} })).toBe(false);
  });

  it("returns false for invalid spellLevels entry", () => {
    expect(isSpellcastingProgression({ casterLevel: 1, spellLevels: { 1: "invalid" } })).toBe(false);
  });

  it("returns false for spellLevels as array", () => {
    expect(isSpellcastingProgression({ casterLevel: 1, spellLevels: [] })).toBe(false);
  });

  it("returns false for missing casterLevel", () => {
    expect(isSpellcastingProgression({ spellLevels: {} })).toBe(false);
  });

  it("returns false for missing spellLevels", () => {
    expect(isSpellcastingProgression({ casterLevel: 1 })).toBe(false);
  });
});

/* ── Tests: LevelDefinition validator ────────────────────────── */

describe("isLevelDefinition", () => {
  it("returns true for a valid definition", () => {
    const def = createLevelDefinition(1, [createFeatureGrant(makeEntityId())]);
    expect(isLevelDefinition(def)).toBe(true);
  });

  it("returns true with empty grants array", () => {
    const def = createLevelDefinition(1, []);
    expect(isLevelDefinition(def)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isLevelDefinition(null)).toBe(false);
  });

  it("returns false for level below 1", () => {
    expect(isLevelDefinition({ level: 0, grants: [] })).toBe(false);
  });

  it("returns false for non-integer level", () => {
    expect(isLevelDefinition({ level: 1.5, grants: [] })).toBe(false);
  });

  it("returns false for invalid grant in array", () => {
    expect(isLevelDefinition({ level: 1, grants: [{}] })).toBe(false);
  });

  it("returns false for missing level", () => {
    expect(isLevelDefinition({ grants: [] })).toBe(false);
  });

  it("returns false for missing grants", () => {
    expect(isLevelDefinition({ level: 1 })).toBe(false);
  });
});

/* ── Tests: ClassRule validator ──────────────────────────────── */

describe("isClassRule", () => {
  function makeMinimalClassRule(): ClassRule {
    return createClassRule(
      makeEntityId(),
      "Test Class",
      makeSourceId(),
      "2024",
      "core",
      8,
      ["STR"],
      ["STR", "CON"],
      [],
      makeMinimalLevels(),
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
  }

  it("returns true for a valid class rule", () => {
    expect(isClassRule(makeMinimalClassRule())).toBe(true);
  });

  it("returns true with optional fields", () => {
    const rule = makeMinimalClassRule();
    rule.page = 10;
    rule.summary = "A test class.";
    rule.spellcasting = createSpellcastingProgression(1, {
      1: createSpellLevelGrant(1, 2),
    });
    rule.startingChoices = [makeMinimalChoiceDefinition()];
    rule.prerequisites = [makeMinimalPrerequisite()];
    rule.effects = [makeMinimalEffect()];
    rule.choices = [makeMinimalChoiceDefinition()];
    rule.dependencies = [makeEntityId()];
    rule.subclassIds = [makeEntityId()];
    expect(isClassRule(rule)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isClassRule(null)).toBe(false);
  });

  it("returns false for wrong kind", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).kind = "subclass";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for empty name", () => {
    const rule = makeMinimalClassRule();
    rule.name = "";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for empty sourceId", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).sourceId = "";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid ruleset", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).ruleset = "5e";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid access", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).access = "premium";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for page below 1", () => {
    const rule = makeMinimalClassRule();
    rule.page = 0;
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for missing legacy", () => {
    const rule = makeMinimalClassRule();
    delete (rule as unknown as Record<string, unknown>).legacy;
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for non-array content", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).content = "not-array";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid render node in content", () => {
    const rule = makeMinimalClassRule();
    rule.content = [{} as RenderNode];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for non-array prerequisites", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).prerequisites = "not-array";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid prerequisite", () => {
    const rule = makeMinimalClassRule();
    rule.prerequisites = [{} as RulePrerequisite];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for non-array effects", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).effects = "not-array";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid effect", () => {
    const rule = makeMinimalClassRule();
    rule.effects = [{} as RuleEffect];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for non-array choices", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).choices = "not-array";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid choice", () => {
    const rule = makeMinimalClassRule();
    rule.choices = [{} as ChoiceDefinition];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for non-array dependencies", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).dependencies = "not-array";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for empty string dependency", () => {
    const rule = makeMinimalClassRule();
    rule.dependencies = ["" as EntityId];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for hitDie below 1", () => {
    const rule = makeMinimalClassRule();
    rule.hitDie = 0;
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for non-integer hitDie", () => {
    const rule = makeMinimalClassRule();
    rule.hitDie = 1.5;
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for empty primaryAbilities", () => {
    const rule = makeMinimalClassRule();
    rule.primaryAbilities = [];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid ability in primaryAbilities", () => {
    const rule = makeMinimalClassRule();
    rule.primaryAbilities = ["not-ability" as never];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid ability in savingThrowProficiencies", () => {
    const rule = makeMinimalClassRule();
    rule.savingThrowProficiencies = ["not-ability" as never];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid startingChoice", () => {
    const rule = makeMinimalClassRule();
    rule.startingChoices = [{} as ChoiceDefinition];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for non-object levels", () => {
    const rule = makeMinimalClassRule();
    (rule as unknown as Record<string, unknown>).levels = "not-object";
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid level definition in levels", () => {
    const rule = makeMinimalClassRule();
    rule.levels = { 1: {} as LevelDefinition };
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for empty string subclassId", () => {
    const rule = makeMinimalClassRule();
    rule.subclassIds = ["" as EntityId];
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for invalid spellcasting", () => {
    const rule = makeMinimalClassRule();
    rule.spellcasting = {} as SpellcastingProgression;
    expect(isClassRule(rule)).toBe(false);
  });

  it("returns false for summary as non-string", () => {
    const rule = makeMinimalClassRule();
    rule.summary = 123 as never;
    expect(isClassRule(rule)).toBe(false);
  });
});

/* ── Tests: Factories ────────────────────────────────────────── */

describe("LevelGrant factories", () => {
  it("createFeatureGrant produces valid grant", () => {
    const grant = createFeatureGrant(makeEntityId());
    expect(grant.type).toBe("feature");
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("createChoiceGrant produces valid grant", () => {
    const grant = createChoiceGrant(makeChoiceId());
    expect(grant.type).toBe("choice");
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("createSubclassChoiceGrant produces valid grant", () => {
    const grant = createSubclassChoiceGrant(makeChoiceId());
    expect(grant.type).toBe("subclass-choice");
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("createAbilityScoreImprovementGrant produces valid grant", () => {
    const grant = createAbilityScoreImprovementGrant(makeChoiceId());
    expect(grant.type).toBe("ability-score-improvement");
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("createSpellProgressionGrant produces valid grant", () => {
    const slg = createSpellLevelGrant(1, 2);
    const grant = createSpellProgressionGrant(slg);
    expect(grant.type).toBe("spell-progression");
    expect(grant.progression).toBe(slg);
    expect(isLevelGrant(grant)).toBe(true);
  });

  it("createResourceProgressionGrant produces valid grant", () => {
    const vf = createFixedValueFormula(6);
    const grant = createResourceProgressionGrant(makeResourceId(), vf);
    expect(grant.type).toBe("resource-progression");
    expect(grant.maximum).toBe(vf);
    expect(isLevelGrant(grant)).toBe(true);
  });
});

describe("createSpellLevelGrant", () => {
  it("creates grant without slotsPerRest", () => {
    const grant = createSpellLevelGrant(3, 3);
    expect(grant.spellLevel).toBe(3);
    expect(grant.slots).toBe(3);
    expect(grant.slotsPerRest).toBeUndefined();
  });

  it("creates grant with slotsPerRest", () => {
    const grant = createSpellLevelGrant(3, 3, { short: 1, long: 2 });
    expect(grant.slotsPerRest).toEqual({ short: 1, long: 2 });
  });
});

describe("createSpellcastingProgression", () => {
  it("creates progression correctly", () => {
    const prog = createSpellcastingProgression(5, {
      1: createSpellLevelGrant(1, 4),
      2: createSpellLevelGrant(2, 3),
    });
    expect(prog.casterLevel).toBe(5);
    expect(Object.keys(prog.spellLevels)).toEqual(["1", "2"]);
  });
});

describe("createLevelDefinition", () => {
  it("creates definition with grants copy", () => {
    const grants: LevelGrant[] = [createFeatureGrant(makeEntityId())];
    const def = createLevelDefinition(3, grants);
    expect(def.level).toBe(3);
    expect(def.grants).not.toBe(grants);
    expect(def.grants.length).toBe(1);
  });
});

describe("createClassRule", () => {
  it("creates rule with all fields", () => {
    const levels = makeMinimalLevels();
    const rule = createClassRule(
      makeEntityId(),
      "Fighter",
      makeSourceId(),
      "2024",
      "core",
      10,
      ["STR"],
      ["STR", "CON"],
      [],
      levels,
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(rule.kind).toBe("class");
    expect(rule.name).toBe("Fighter");
    expect(rule.hitDie).toBe(10);
    expect(rule.primaryAbilities).toEqual(["STR"]);
    expect(rule.savingThrowProficiencies).toEqual(["STR", "CON"]);
    expect(rule.legacy).toBe(false);
    expect(rule.spellcasting).toBeUndefined();
    expect(isClassRule(rule)).toBe(true);
  });

  it("creates rule with optional spellcasting", () => {
    const spellcasting = createSpellcastingProgression(1, {
      1: createSpellLevelGrant(1, 2),
    });
    const rule = createClassRule(
      makeEntityId(),
      "Wizard",
      makeSourceId(),
      "2024",
      "core",
      6,
      ["INT"],
      ["INT", "WIS"],
      [],
      makeMinimalLevels(),
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      undefined,
      undefined,
      spellcasting,
    );
    expect(rule.spellcasting).toBe(spellcasting);
    expect(isClassRule(rule)).toBe(true);
  });

  it("creates rule with page and summary", () => {
    const rule = createClassRule(
      makeEntityId(),
      "Bard",
      makeSourceId(),
      "2024",
      "core",
      6,
      ["CHA"],
      ["DEX", "CHA"],
      [],
      makeMinimalLevels(),
      [],
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      52,
      "Master of the bardic arts.",
    );
    expect(rule.page).toBe(52);
    expect(rule.summary).toBe("Master of the bardic arts.");
    expect(isClassRule(rule)).toBe(true);
  });

  it("copies arrays defensively", () => {
    const content = [makeMinimalRenderNode()];
    const prereqs: RulePrerequisite[] = [makeMinimalPrerequisite()];
    const effects: RuleEffect[] = [makeMinimalEffect()];
    const choices: ChoiceDefinition[] = [makeMinimalChoiceDefinition()];
    const deps: EntityId[] = [makeEntityId()];
    const primary: Ability[] = ["STR"];
    const saves: Ability[] = ["STR", "CON"];
    const starting: ChoiceDefinition[] = [];
    const subclass: EntityId[] = [];

    const rule = createClassRule(
      makeEntityId(),
      "Test",
      makeSourceId(),
      "2024",
      "core",
      8,
      primary,
      saves,
      starting,
      makeMinimalLevels(),
      subclass,
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
    expect(rule.primaryAbilities).not.toBe(primary);
    expect(rule.savingThrowProficiencies).not.toBe(saves);
    expect(rule.subclassIds).not.toBe(subclass);
  });
});

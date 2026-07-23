import { describe, it, expect } from "vitest";
import {
  isSpellRule,
  createSpellRule,
  type SpellRule,
} from "./entity-spell";
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
  return createEntityId(`test-spell-${++eidCounter}`);
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
  return createRenderParagraph("Spell description.");
}

describe("isSpellRule", () => {
  function makeMinimalSpellRule(): SpellRule {
    return createSpellRule(
      makeEntityId(),
      "Firebolt",
      makeSourceId(),
      "2024",
      "core",
      "evocation",
      0,
      "1 action",
      "120 feet",
      "Instantaneous",
      false,
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
  }

  it("returns true for a valid spell rule", () => {
    expect(isSpellRule(makeMinimalSpellRule())).toBe(true);
  });

  it("returns true with all optional fields", () => {
    const rule = createSpellRule(
      makeEntityId(),
      "Fireball",
      makeSourceId(),
      "2024",
      "core",
      "evocation",
      3,
      "1 action",
      "150 feet",
      "Instantaneous",
      false,
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      220,
      "A bright streak flashes from your pointing finger.",
      [makeMinimalRenderNode()],
    );
    expect(isSpellRule(rule)).toBe(true);
  });

  it("returns true for cantrip (level 0)", () => {
    expect(isSpellRule(makeMinimalSpellRule())).toBe(true);
  });

  it("returns true with concentration and ritual", () => {
    const rule = createSpellRule(
      makeEntityId(),
      "Detect Magic",
      makeSourceId(),
      "2024",
      "core",
      "divination",
      1,
      "1 action",
      "Self",
      "Concentration, up to 10 minutes",
      true,
      true,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(isSpellRule(rule)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSpellRule(null)).toBe(false);
  });

  it("returns false for wrong kind", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).kind = "feat";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for empty name", () => {
    const rule = makeMinimalSpellRule();
    rule.name = "";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for empty sourceId", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).sourceId = "";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for invalid ruleset", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).ruleset = "5e";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for invalid access", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).access = "premium";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for page below 1", () => {
    const rule = makeMinimalSpellRule();
    rule.page = 0;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing legacy", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).legacy;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for non-array content", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).content = "not-array";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for invalid render node in content", () => {
    const rule = makeMinimalSpellRule();
    rule.content = [{} as RenderNode];
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for non-array prerequisites", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).prerequisites = "not-array";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for invalid prerequisite", () => {
    const rule = makeMinimalSpellRule();
    rule.prerequisites = [{} as RulePrerequisite];
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for non-array effects", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).effects = "not-array";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for invalid effect", () => {
    const rule = makeMinimalSpellRule();
    rule.effects = [{} as RuleEffect];
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for non-array choices", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).choices = "not-array";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for invalid choice", () => {
    const rule = makeMinimalSpellRule();
    rule.choices = [{} as ChoiceDefinition];
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for non-array dependencies", () => {
    const rule = makeMinimalSpellRule();
    (rule as unknown as Record<string, unknown>).dependencies = "not-array";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for empty string dependency", () => {
    const rule = makeMinimalSpellRule();
    rule.dependencies = ["" as EntityId];
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for empty school", () => {
    const rule = makeMinimalSpellRule();
    rule.school = "";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing school", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).school;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for negative level", () => {
    const rule = makeMinimalSpellRule();
    rule.level = -1;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for non-integer level", () => {
    const rule = makeMinimalSpellRule();
    rule.level = 1.5;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing level", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).level;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for empty castingTime", () => {
    const rule = makeMinimalSpellRule();
    rule.castingTime = "";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing castingTime", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).castingTime;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for empty range", () => {
    const rule = makeMinimalSpellRule();
    rule.range = "";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing range", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).range;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for empty duration", () => {
    const rule = makeMinimalSpellRule();
    rule.duration = "";
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing duration", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).duration;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing concentration", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).concentration;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for missing ritual", () => {
    const rule = makeMinimalSpellRule();
    delete (rule as unknown as Record<string, unknown>).ritual;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for non-array higherLevelEffects", () => {
    const rule = makeMinimalSpellRule();
    rule.higherLevelEffects = "not-array" as never;
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for invalid render node in higherLevelEffects", () => {
    const rule = makeMinimalSpellRule();
    rule.higherLevelEffects = [{} as RenderNode];
    expect(isSpellRule(rule)).toBe(false);
  });

  it("returns false for summary as non-string", () => {
    const rule = makeMinimalSpellRule();
    rule.summary = 123 as never;
    expect(isSpellRule(rule)).toBe(false);
  });
});

describe("createSpellRule", () => {
  it("creates rule with all required fields", () => {
    const rule = createSpellRule(
      makeEntityId(),
      "Firebolt",
      makeSourceId(),
      "2024",
      "core",
      "evocation",
      0,
      "1 action",
      "120 feet",
      "Instantaneous",
      false,
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(rule.kind).toBe("spell");
    expect(rule.name).toBe("Firebolt");
    expect(rule.school).toBe("evocation");
    expect(rule.level).toBe(0);
    expect(rule.castingTime).toBe("1 action");
    expect(rule.range).toBe("120 feet");
    expect(rule.duration).toBe("Instantaneous");
    expect(rule.concentration).toBe(false);
    expect(rule.ritual).toBe(false);
    expect(rule.higherLevelEffects).toBeUndefined();
    expect(rule.legacy).toBe(false);
    expect(isSpellRule(rule)).toBe(true);
  });

  it("creates rule with all optional fields", () => {
    const higherLevel = [makeMinimalRenderNode()];
    const rule = createSpellRule(
      makeEntityId(),
      "Fireball",
      makeSourceId(),
      "2024",
      "core",
      "evocation",
      3,
      "1 action",
      "150 feet",
      "Instantaneous",
      false,
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
      220,
      "A bright streak flashes from your pointing finger.",
      higherLevel,
    );
    expect(rule.page).toBe(220);
    expect(rule.summary).toBe("A bright streak flashes from your pointing finger.");
    expect(rule.higherLevelEffects).toEqual(higherLevel);
    expect(isSpellRule(rule)).toBe(true);
  });

  it("copies arrays defensively", () => {
    const content = [makeMinimalRenderNode()];
    const prereqs: RulePrerequisite[] = [makeMinimalPrerequisite()];
    const effects: RuleEffect[] = [makeMinimalEffect()];
    const choices: ChoiceDefinition[] = [makeMinimalChoiceDefinition()];
    const deps: EntityId[] = [makeEntityId()];
    const higherLevel = [makeMinimalRenderNode()];

    const rule = createSpellRule(
      makeEntityId(),
      "Test",
      makeSourceId(),
      "2024",
      "core",
      "evocation",
      0,
      "1 action",
      "Self",
      "Instantaneous",
      false,
      false,
      content,
      prereqs,
      effects,
      choices,
      deps,
      false,
      undefined,
      undefined,
      higherLevel,
    );

    expect(rule.content).not.toBe(content);
    expect(rule.prerequisites).not.toBe(prereqs);
    expect(rule.effects).not.toBe(effects);
    expect(rule.choices).not.toBe(choices);
    expect(rule.dependencies).not.toBe(deps);
    expect(rule.higherLevelEffects).not.toBe(higherLevel);
  });
});

/* ── Round-trip tests ──────────────────────────────────────────── */

describe("round-trip", () => {
  it("SpellRule round-trips with minimal fields", () => {
    const rule = createSpellRule(
      makeEntityId(),
      "Firebolt",
      makeSourceId(),
      "2024",
      "core",
      "evocation",
      0,
      "1 action",
      "120 feet",
      "Instantaneous",
      false,
      false,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(isSpellRule(rule)).toBe(true);
  });

  it("SpellRule round-trips with full data", () => {
    const rule = createSpellRule(
      makeEntityId(),
      "Fireball",
      makeSourceId(),
      "2024",
      "core",
      "evocation",
      3,
      "1 action",
      "150 feet",
      "Instantaneous",
      false,
      false,
      [makeMinimalRenderNode()],
      [makeMinimalPrerequisite()],
      [makeMinimalEffect()],
      [makeMinimalChoiceDefinition()],
      [makeEntityId()],
      false,
      220,
      "A bright streak flashes from your pointing finger.",
      [makeMinimalRenderNode()],
    );
    expect(isSpellRule(rule)).toBe(true);
  });

  it("SpellRule round-trips with concentration and ritual", () => {
    const rule = createSpellRule(
      makeEntityId(),
      "Detect Magic",
      makeSourceId(),
      "2024",
      "core",
      "divination",
      1,
      "1 action",
      "Self",
      "Concentration, up to 10 minutes",
      true,
      true,
      [makeMinimalRenderNode()],
      [],
      [],
      [],
      [],
      false,
    );
    expect(isSpellRule(rule)).toBe(true);
  });
});

/* ── Invalid input rejection tests ─────────────────────────────── */

describe("invalid input rejection", () => {
  describe("isSpellRule rejects", () => {
    it("null", () => {
      expect(isSpellRule(null)).toBe(false);
    });

    it("undefined", () => {
      expect(isSpellRule(undefined)).toBe(false);
    });

    it("string", () => {
      expect(isSpellRule("not an object")).toBe(false);
    });

    it("number", () => {
      expect(isSpellRule(42)).toBe(false);
    });

    it("array", () => {
      expect(isSpellRule([])).toBe(false);
    });

    it("missing id", () => {
      expect(isSpellRule({ kind: "spell", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], school: "evocation", level: 0, castingTime: "1 action", range: "Self", duration: "Instantaneous", concentration: false, ritual: false })).toBe(false);
    });

    it("missing school", () => {
      expect(isSpellRule({ id: makeEntityId(), kind: "spell", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], level: 0, castingTime: "1 action", range: "Self", duration: "Instantaneous", concentration: false, ritual: false })).toBe(false);
    });

    it("missing level", () => {
      expect(isSpellRule({ id: makeEntityId(), kind: "spell", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], school: "evocation", castingTime: "1 action", range: "Self", duration: "Instantaneous", concentration: false, ritual: false })).toBe(false);
    });

    it("missing castingTime", () => {
      expect(isSpellRule({ id: makeEntityId(), kind: "spell", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], school: "evocation", level: 0, range: "Self", duration: "Instantaneous", concentration: false, ritual: false })).toBe(false);
    });

    it("missing concentration", () => {
      expect(isSpellRule({ id: makeEntityId(), kind: "spell", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], school: "evocation", level: 0, castingTime: "1 action", range: "Self", duration: "Instantaneous", ritual: false })).toBe(false);
    });

    it("missing ritual", () => {
      expect(isSpellRule({ id: makeEntityId(), kind: "spell", name: "Test", sourceId: makeSourceId(), ruleset: "2024" as const, access: "core" as const, legacy: false, content: [], prerequisites: [], effects: [], choices: [], dependencies: [], school: "evocation", level: 0, castingTime: "1 action", range: "Self", duration: "Instantaneous", concentration: false })).toBe(false);
    });
  });
});

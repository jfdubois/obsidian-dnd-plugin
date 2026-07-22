import { describe, it, expect } from "vitest";
import {
  isRulePrerequisite,
  createAbilityScorePrerequisite,
  createLevelPrerequisite,
  createEntitySelectionPrerequisite,
  type RulePrerequisite,
} from "./prerequisite";
import { createEntityId } from "@obsidian-dnd/domain";

describe("RulePrerequisite", () => {
  /* ── Positive: ability-score ──────────────────────────────────── */

  it("validator accepts ability-score with valid ability and minimumValue", () => {
    const prereq: unknown = { type: "ability-score", ability: "STR", minimumValue: 15 };
    expect(isRulePrerequisite(prereq)).toBe(true);
  });

  it("validator accepts ability-score for each ability", () => {
    for (const ability of ["STR", "DEX", "CON", "INT", "WIS", "CHA"]) {
      const prereq: unknown = { type: "ability-score", ability, minimumValue: 13 };
      expect(isRulePrerequisite(prereq)).toBe(true);
    }
  });

  it("validator accepts ability-score with minimumValue 1", () => {
    const prereq: unknown = { type: "ability-score", ability: "CHA", minimumValue: 1 };
    expect(isRulePrerequisite(prereq)).toBe(true);
  });

  /* ── Positive: level ─────────────────────────────────────────── */

  it("validator accepts level with minimumLevel 1", () => {
    const prereq: unknown = { type: "level", minimumLevel: 1 };
    expect(isRulePrerequisite(prereq)).toBe(true);
  });

  it("validator accepts level with higher minimumLevel", () => {
    const prereq: unknown = { type: "level", minimumLevel: 20 };
    expect(isRulePrerequisite(prereq)).toBe(true);
  });

  /* ── Positive: entity-selection ──────────────────────────────── */

  it("validator accepts entity-selection with valid entityId", () => {
    const prereq: unknown = { type: "entity-selection", entityId: "class:2024:xphb:fighter" };
    expect(isRulePrerequisite(prereq)).toBe(true);
  });

  /* ── Negative: ability-score ──────────────────────────────────── */

  it("validator rejects ability-score with missing ability", () => {
    const prereq: unknown = { type: "ability-score", minimumValue: 15 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with invalid ability", () => {
    const prereq: unknown = { type: "ability-score", ability: "LUK", minimumValue: 15 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with non-string ability", () => {
    const prereq: unknown = { type: "ability-score", ability: 42, minimumValue: 15 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with missing minimumValue", () => {
    const prereq: unknown = { type: "ability-score", ability: "STR" };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with non-number minimumValue", () => {
    const prereq: unknown = { type: "ability-score", ability: "STR", minimumValue: "15" };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with minimumValue 0", () => {
    const prereq: unknown = { type: "ability-score", ability: "STR", minimumValue: 0 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with negative minimumValue", () => {
    const prereq: unknown = { type: "ability-score", ability: "STR", minimumValue: -3 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with NaN minimumValue", () => {
    const prereq: unknown = { type: "ability-score", ability: "STR", minimumValue: NaN };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects ability-score with Infinity minimumValue", () => {
    const prereq: unknown = { type: "ability-score", ability: "STR", minimumValue: Infinity };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  /* ── Negative: level ─────────────────────────────────────────── */

  it("validator rejects level with missing minimumLevel", () => {
    const prereq: unknown = { type: "level" };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects level with non-number minimumLevel", () => {
    const prereq: unknown = { type: "level", minimumLevel: "3" };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects level with minimumLevel 0", () => {
    const prereq: unknown = { type: "level", minimumLevel: 0 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects level with negative minimumLevel", () => {
    const prereq: unknown = { type: "level", minimumLevel: -1 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects level with NaN minimumLevel", () => {
    const prereq: unknown = { type: "level", minimumLevel: NaN };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  /* ── Negative: entity-selection ──────────────────────────────── */

  it("validator rejects entity-selection with missing entityId", () => {
    const prereq: unknown = { type: "entity-selection" };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects entity-selection with empty entityId", () => {
    const prereq: unknown = { type: "entity-selection", entityId: "" };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects entity-selection with non-string entityId", () => {
    const prereq: unknown = { type: "entity-selection", entityId: 42 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  /* ── Negative: unknown type ──────────────────────────────────── */

  it("validator rejects unknown type string", () => {
    const prereq: unknown = { type: "feature", featureId: "something" };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects missing type", () => {
    const prereq: unknown = { ability: "STR", minimumValue: 15 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  it("validator rejects non-string type", () => {
    const prereq: unknown = { type: 123 };
    expect(isRulePrerequisite(prereq)).toBe(false);
  });

  /* ── Negative: type boundaries ───────────────────────────────── */

  it("validator rejects null", () => {
    expect(isRulePrerequisite(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isRulePrerequisite(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isRulePrerequisite("ability-score")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isRulePrerequisite(42)).toBe(false);
  });

  it("validator rejects boolean", () => {
    expect(isRulePrerequisite(true)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isRulePrerequisite([])).toBe(false);
  });

  it("validator rejects empty object", () => {
    expect(isRulePrerequisite({})).toBe(false);
  });
});

describe("factories", () => {
  it("createAbilityScorePrerequisite produces valid prerequisite", () => {
    const prereq = createAbilityScorePrerequisite("STR", 15);
    expect(isRulePrerequisite(prereq)).toBe(true);
    expect(prereq.type).toBe("ability-score");
    expect(prereq.ability).toBe("STR");
    expect(prereq.minimumValue).toBe(15);
  });

  it("createLevelPrerequisite produces valid prerequisite", () => {
    const prereq = createLevelPrerequisite(3);
    expect(isRulePrerequisite(prereq)).toBe(true);
    expect(prereq.type).toBe("level");
    expect(prereq.minimumLevel).toBe(3);
  });

  it("createEntitySelectionPrerequisite produces valid prerequisite", () => {
    const entityId = createEntityId("class:2024:xphb:fighter");
    const prereq = createEntitySelectionPrerequisite(entityId);
    expect(isRulePrerequisite(prereq)).toBe(true);
    expect(prereq.type).toBe("entity-selection");
    expect(prereq.entityId).toBe(entityId);
  });
});

describe("round-trip", () => {
  it("all variants round-trip through validator", () => {
    const prerequisites: RulePrerequisite[] = [
      createAbilityScorePrerequisite("STR", 15),
      createAbilityScorePrerequisite("DEX", 13),
      createAbilityScorePrerequisite("CON", 1),
      createLevelPrerequisite(1),
      createLevelPrerequisite(3),
      createLevelPrerequisite(20),
      createEntitySelectionPrerequisite(createEntityId("class:2024:xphb:fighter")),
      createEntitySelectionPrerequisite(createEntityId("species:2024:xphb:elf")),
    ];

    for (const prereq of prerequisites) {
      expect(isRulePrerequisite(prereq)).toBe(true);
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  isRuleset,
  RULESETS,
  isRuleEntityKind,
  RULE_ENTITY_KINDS,
  isAbility,
  ABILITIES,
  isContentAccess,
  CONTENT_ACCESSES,
  isSourceCategory,
  SOURCE_CATEGORIES,
  isDiagnosticSeverity,
  DIAGNOSTIC_SEVERITIES,
  type Ruleset,
  type RuleEntityKind,
  type Ability,
  type SourceCategory,
  type DiagnosticSeverity,
} from "./enums";

describe("Ruleset", () => {
  it("accepts 2014", () => {
    expect(isRuleset("2014")).toBe(true);
  });

  it("accepts 2024", () => {
    expect(isRuleset("2024")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isRuleset("2025")).toBe(false);
    expect(isRuleset("5e")).toBe(false);
    expect(isRuleset("")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isRuleset(null)).toBe(false);
    expect(isRuleset(undefined)).toBe(false);
    expect(isRuleset(2024)).toBe(false);
    expect(isRuleset(true)).toBe(false);
  });

  it("RULESETS contains exactly the valid values", () => {
    expect(RULESETS).toEqual(["2014", "2024"]);
    for (const r of RULESETS) {
      expect(isRuleset(r)).toBe(true);
    }
  });

  it("type is exhaustive over RULESETS", () => {
    const rulesets: Ruleset[] = RULESETS as Ruleset[];
    expect(rulesets.length).toBe(2);
  });
});

describe("RuleEntityKind", () => {
  const expectedKinds: RuleEntityKind[] = [
    "species",
    "background",
    "class",
    "subclass",
    "class-feature",
    "subclass-feature",
    "feat",
    "spell",
    "item",
    "optional-feature",
    "skill",
    "language",
  ];

  it("accepts all defined kinds", () => {
    for (const kind of expectedKinds) {
      expect(isRuleEntityKind(kind)).toBe(true);
    }
  });

  it("rejects unknown kinds", () => {
    expect(isRuleEntityKind("monster")).toBe(false);
    expect(isRuleEntityKind("hazard")).toBe(false);
    expect(isRuleEntityKind("")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isRuleEntityKind(null)).toBe(false);
    expect(isRuleEntityKind(1)).toBe(false);
  });

  it("RULE_ENTITY_KINDS matches expected kinds", () => {
    expect(RULE_ENTITY_KINDS).toEqual(expectedKinds);
  });
});

describe("Ability", () => {
  const expectedAbilities: Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

  it("accepts all six abilities", () => {
    for (const a of expectedAbilities) {
      expect(isAbility(a)).toBe(true);
    }
  });

  it("rejects unknown ability strings", () => {
    expect(isAbility("LCK")).toBe(false);
    expect(isAbility("str")).toBe(false);
    expect(isAbility("Strength")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isAbility(null)).toBe(false);
    expect(isAbility(1)).toBe(false);
  });

  it("ABILITIES contains exactly six entries", () => {
    expect(ABILITIES).toEqual(expectedAbilities);
    expect(ABILITIES.length).toBe(6);
  });
});

describe("ContentAccess", () => {
  it("accepts core", () => {
    expect(isContentAccess("core")).toBe(true);
  });

  it("accepts source", () => {
    expect(isContentAccess("source")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isContentAccess("free")).toBe(false);
    expect(isContentAccess("premium")).toBe(false);
  });

  it("CONTENT_ACCESSES matches valid values", () => {
    expect(CONTENT_ACCESSES).toEqual(["core", "source"]);
  });
});

describe("SourceCategory", () => {
  const expectedCategories: SourceCategory[] = [
    "core",
    "supplement",
    "setting",
    "adventure",
    "other",
  ];

  it("accepts all defined categories", () => {
    for (const c of expectedCategories) {
      expect(isSourceCategory(c)).toBe(true);
    }
  });

  it("rejects unknown categories", () => {
    expect(isSourceCategory("homebrew")).toBe(false);
    expect(isSourceCategory("")).toBe(false);
  });

  it("SOURCE_CATEGORIES matches expected", () => {
    expect(SOURCE_CATEGORIES).toEqual(expectedCategories);
  });
});

describe("DiagnosticSeverity", () => {
  const expectedSeverities: DiagnosticSeverity[] = ["info", "warning", "error"];

  it("accepts all defined severities", () => {
    for (const s of expectedSeverities) {
      expect(isDiagnosticSeverity(s)).toBe(true);
    }
  });

  it("rejects unknown severities", () => {
    expect(isDiagnosticSeverity("critical")).toBe(false);
    expect(isDiagnosticSeverity("debug")).toBe(false);
  });

  it("DIAGNOSTIC_SEVERITIES matches expected", () => {
    expect(DIAGNOSTIC_SEVERITIES).toEqual(expectedSeverities);
  });
});

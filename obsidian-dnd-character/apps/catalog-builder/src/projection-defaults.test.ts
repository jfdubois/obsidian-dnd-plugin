import { describe, expect, it } from "vitest";
import type { RuleEffectType, SheetProjection } from "@obsidian-dnd/catalog-contract";
import { RULE_EFFECT_TYPES } from "@obsidian-dnd/catalog-contract";
import {
  DEFAULT_PROJECTIONS,
  getDefaultProjection,
  createDefaultEffectPresentation,
  validateProjectionAssignment,
  validateDefaultProjections,
  isMechanicProjection,
} from "./projection-defaults";

describe("DEFAULT_PROJECTIONS", () => {
  it("contains a projection for every rule effect type", () => {
    for (const effectType of RULE_EFFECT_TYPES) {
      const projection = DEFAULT_PROJECTIONS.get(effectType);
      expect(projection).toBeDefined();
      expect(projection?.effectType).toBe(effectType);
    }
  });

  it("is frozen", () => {
    expect(Object.isFrozen(DEFAULT_PROJECTIONS)).toBe(true);
  });

  it("maps add-ability to abilities projection", () => {
    const projection = DEFAULT_PROJECTIONS.get("add-ability");
    expect(projection).toMatchObject({
      effectType: "add-ability",
      primary: "abilities",
      secondary: [],
    });
  });

  it("maps add-proficiency to proficiencies projection", () => {
    const projection = DEFAULT_PROJECTIONS.get("add-proficiency");
    expect(projection).toMatchObject({
      effectType: "add-proficiency",
      primary: "proficiencies",
      secondary: [],
    });
  });

  it("maps set-ac-formula to armor-class projection", () => {
    const projection = DEFAULT_PROJECTIONS.get("set-ac-formula");
    expect(projection).toMatchObject({
      effectType: "set-ac-formula",
      primary: "armor-class",
      secondary: [],
    });
  });

  it("maps grant-spell to spellcasting projection", () => {
    const projection = DEFAULT_PROJECTIONS.get("grant-spell");
    expect(projection).toMatchObject({
      effectType: "grant-spell",
      primary: "spellcasting",
      secondary: [],
    });
  });

  it("maps grant-attack to attacks with actions secondary", () => {
    const projection = DEFAULT_PROJECTIONS.get("grant-attack");
    expect(projection).toMatchObject({
      effectType: "grant-attack",
      primary: "attacks",
      secondary: ["actions"],
    });
  });

  it("maps conditional-roll-mode to saving-throws with skills secondary", () => {
    const projection = DEFAULT_PROJECTIONS.get("conditional-roll-mode");
    expect(projection).toMatchObject({
      effectType: "conditional-roll-mode",
      primary: "saving-throws",
      secondary: ["skills"],
    });
  });

  it("maps add-immunity to defenses projection", () => {
    const projection = DEFAULT_PROJECTIONS.get("add-immunity");
    expect(projection).toMatchObject({
      effectType: "add-immunity",
      primary: "defenses",
      secondary: [],
    });
  });

  it("maps grant-resource to resources projection", () => {
    const projection = DEFAULT_PROJECTIONS.get("grant-resource");
    expect(projection).toMatchObject({
      effectType: "grant-resource",
      primary: "resources",
      secondary: [],
    });
  });
});

describe("getDefaultProjection", () => {
  it("returns the correct projection for known effect types", () => {
    const projection = getDefaultProjection("add-ability");
    expect(projection).not.toBeUndefined();
    expect(projection?.primary).toBe("abilities");
  });

  it("returns undefined for unknown effect types", () => {
    const projection = getDefaultProjection("unknown-effect" as RuleEffectType);
    expect(projection).toBeUndefined();
  });
});

describe("createDefaultEffectPresentation", () => {
  it("creates a valid effect presentation for known effect types", () => {
    const presentation = createDefaultEffectPresentation("add-ability");
    expect(presentation).toEqual({
      primary: "abilities",
      secondary: [],
    });
  });

  it("creates effect presentation with secondary projections", () => {
    const presentation = createDefaultEffectPresentation("grant-attack");
    expect(presentation).toEqual({
      primary: "attacks",
      secondary: ["actions"],
    });
  });

  it("returns undefined for unknown effect types", () => {
    const presentation = createDefaultEffectPresentation("unknown-effect" as RuleEffectType);
    expect(presentation).toBeUndefined();
  });

  it("returns a valid EffectPresentation matching the catalog-contract type", () => {
    const presentation = createDefaultEffectPresentation("add-ability");
    expect(presentation).not.toBeUndefined();
    expect(Array.isArray(presentation?.secondary)).toBe(true);
    expect(presentation?.primary).toBe("abilities");
  });
});

describe("validateProjectionAssignment", () => {
  it("returns valid for correct assignments", () => {
    const result = validateProjectionAssignment(
      "add-ability",
      "abilities",
      [],
    );
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.projection).toMatchObject({
      effectType: "add-ability",
      primary: "abilities",
      secondary: [],
    });
  });

  it("accepts assignments with valid secondary projections", () => {
    const result = validateProjectionAssignment(
      "grant-attack",
      "attacks",
      ["actions"],
    );
    expect(result.valid).toBe(true);
  });

  it("rejects unknown effect type", () => {
    const result = validateProjectionAssignment(
      "unknown-effect" as RuleEffectType,
      "abilities",
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNKNOWN_EFFECT_TYPE",
      severity: "error",
    });
  });

  it("rejects invalid primary projection", () => {
    const result = validateProjectionAssignment(
      "add-ability",
      "invalid-projection" as unknown as SheetProjection,
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRIMARY_PROJECTION",
      severity: "error",
    });
  });

  it("rejects invalid secondary projection", () => {
    const result = validateProjectionAssignment(
      "add-ability",
      "abilities",
      ["invalid-projection" as unknown as SheetProjection] as readonly SheetProjection[],
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_SECONDARY_PROJECTION",
      severity: "error",
    });
  });

  it("detects duplicate projections", () => {
    const result = validateProjectionAssignment(
      "add-ability",
      "abilities",
      ["abilities"],
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "DUPLICATE_PROJECTION",
      severity: "warning",
    });
  });

  it("returns frozen results", () => {
    const result = validateProjectionAssignment("add-ability", "abilities", []);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    if (result.projection) {
      expect(Object.isFrozen(result.projection)).toBe(true);
      expect(Object.isFrozen(result.projection.secondary)).toBe(true);
    }
  });
});

describe("validateDefaultProjections", () => {
  it("returns no diagnostics for the built-in defaults", () => {
    const diagnostics = validateDefaultProjections();
    expect(diagnostics).toEqual([]);
  });
});

describe("isMechanicProjection", () => {
  it("accepts valid projections", () => {
    expect(isMechanicProjection({
      effectType: "add-ability",
      primary: "abilities",
      secondary: [],
    })).toBe(true);
  });

  it("rejects projections with invalid effect type", () => {
    expect(isMechanicProjection({
      effectType: "invalid",
      primary: "abilities",
      secondary: [],
    })).toBe(false);
  });

  it("rejects projections with invalid primary", () => {
    expect(isMechanicProjection({
      effectType: "add-ability",
      primary: "invalid",
      secondary: [],
    })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isMechanicProjection(null)).toBe(false);
    expect(isMechanicProjection(undefined)).toBe(false);
    expect(isMechanicProjection("add-ability")).toBe(false);
  });
});

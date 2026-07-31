import { describe, it, expect } from "vitest";
import { resolveReferences } from "./reference-resolver";
import {
  eid,
  makeSpecies, makeBackground, makeClass, makeSubclass,
  makeClassFeature, makeFeat, makeSpell, makeSkill, makeLanguage,
} from "./reference-resolver-helpers";

/* ── Tests: empty & basic ───────────────────────────────────────── */

describe("resolveReferences", () => {
  it("returns empty result for empty input", () => {
    const result = resolveReferences({ entities: [] });
    expect(result.links).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it("returns frozen result objects", () => {
    const result = resolveReferences({ entities: [] });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.links)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });
});

/* ── Tests: species ─────────────────────────────────────────────── */

describe("resolveReferences - species", () => {
  it("resolves species languageIds to existing languages", () => {
    const lang = makeLanguage("lang:common", "Common");
    const species = makeSpecies("species:human", "Human", ["lang:common"]);

    const result = resolveReferences({ entities: [lang, species] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(1);
    const link = result.links[0]!;
    expect(link.sourceId).toBe(eid("species:human"));
    expect(link.sourceKind).toBe("species");
    expect(link.field).toBe("languageIds");
    expect(link.targetId).toBe(eid("lang:common"));
    expect(link.resolved).toBe(true);
  });

  it("diagnoses broken species languageIds", () => {
    const species = makeSpecies("species:elf", "Elf", ["lang:celestial"]);

    const result = resolveReferences({ entities: [species] });
    expect(result.links).toEqual([]);
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_LANGUAGE_REF");
    expect(diag.missingId).toBe(eid("lang:celestial"));
  });
});

/* ── Tests: background ──────────────────────────────────────────── */

describe("resolveReferences - background", () => {
  it("resolves background skillProficiencies and featureId", () => {
    const skill = makeSkill("skill:athletics", "Athletics");
    const cls = makeClass("class:fighter", "Fighter");
    const feature = makeClassFeature("feat:rank", "Military Rank", "class:fighter");
    const bg = makeBackground("bg:soldier", "Soldier", ["skill:athletics"], "feat:rank");

    const result = resolveReferences({ entities: [skill, cls, feature, bg] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(3);
  });

  it("diagnoses broken background featureId", () => {
    const bg = makeBackground("bg:soldier", "Soldier", [], "feat:missing");

    const result = resolveReferences({ entities: [bg] });
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_BACKGROUND_FEATURE_REF");
  });
});

/* ── Tests: class ───────────────────────────────────────────────── */

describe("resolveReferences - class", () => {
  it("resolves class subclassIds and level feature grants", () => {
    const subclass = makeSubclass("subclass:champion", "Champion", "class:fighter");
    const feature = makeClassFeature("feat:secondwind", "Second Wind", "class:fighter");
    const cls = makeClass(
      "class:fighter", "Fighter",
      ["subclass:champion"],
      [{ level: 1, featureId: "feat:secondwind" }],
    );

    const result = resolveReferences({ entities: [subclass, feature, cls] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(4);
  });

  it("diagnoses broken class subclassIds", () => {
    const cls = makeClass("class:fighter", "Fighter", ["subclass:missing"]);

    const result = resolveReferences({ entities: [cls] });
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_SUBCLASS_REF");
  });

  it("diagnoses broken level feature grant", () => {
    const cls = makeClass(
      "class:fighter", "Fighter", [],
      [{ level: 1, featureId: "feat:missing" }],
    );

    const result = resolveReferences({ entities: [cls] });
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_FEATURE_REF");
  });
});

/* ── Tests: common fields ───────────────────────────────────────── */

describe("resolveReferences - common fields", () => {
  it("resolves common dependencies field", () => {
    const feat = makeFeat("feat:tough", "Tough");
    const spell = makeSpell("spell:firebolt", "Firebolt", ["feat:tough"]);

    const result = resolveReferences({ entities: [feat, spell] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(1);
    const link = result.links[0]!;
    expect(link.field).toBe("dependencies");
  });

  it("diagnoses broken dependencies", () => {
    const spell = makeSpell("spell:firebolt", "Firebolt", ["feat:missing"]);

    const result = resolveReferences({ entities: [spell] });
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_DEPENDENCY_REF");
  });
});

/* ── Tests: mixed & determinism ─────────────────────────────────── */

describe("resolveReferences - mixed catalog", () => {
  it("handles mixed entity types in a single catalog", () => {
    const lang = makeLanguage("lang:common", "Common");
    const skill = makeSkill("skill:athletics", "Athletics");
    const cls = makeClass("class:fighter", "Fighter");
    const sub = makeSubclass("subclass:champion", "Champion", "class:fighter");
    const feat = makeClassFeature("feat:secondwind", "Second Wind", "class:fighter");
    const species = makeSpecies("species:human", "Human", ["lang:common"]);
    const bg = makeBackground("bg:soldier", "Soldier", ["skill:athletics"]);

    const result = resolveReferences({
      entities: [lang, skill, cls, sub, feat, species, bg],
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(4);
  });

  it("sorts links deterministically", () => {
    const lang1 = makeLanguage("lang:a", "A");
    const lang2 = makeLanguage("lang:b", "B");
    const species = makeSpecies("species:human", "Human", ["lang:b", "lang:a"]);

    const result = resolveReferences({ entities: [lang1, lang2, species] });
    const link0 = result.links[0]!;
    const link1 = result.links[1]!;
    expect(link0.targetId).toBe(eid("lang:a"));
    expect(link1.targetId).toBe(eid("lang:b"));
  });

  it("sorts diagnostics deterministically", () => {
    const species = makeSpecies("species:elf", "Elf", ["lang:z", "lang:a"]);

    const result = resolveReferences({ entities: [species] });
    const diag0 = result.diagnostics[0]!;
    const diag1 = result.diagnostics[1]!;
    expect(diag0.missingId).toBe(eid("lang:a"));
    expect(diag1.missingId).toBe(eid("lang:z"));
  });
});

import { describe, it, expect } from "vitest";
import {
  createAbilityScorePrerequisite,
  createEntitySelectionPrerequisite,
} from "@obsidian-dnd/catalog-contract";
import { resolveReferences } from "./reference-resolver";
import {
  eid, EMPTY,
  makeSubclass, makeClassFeature, makeSubclassFeature,
  makeFeat, makeSpell, makeClass, makeLanguage, makeSpecies,
  makeSkill, makeBackground,
} from "./reference-resolver-helpers";

/* ── Tests: subclass ────────────────────────────────────────────── */

describe("resolveReferences - subclass", () => {
  it("resolves subclass parentId and featureIds", () => {
    const cls = makeClass("class:fighter", "Fighter");
    const feat = makeSubclassFeature("feat:champion1", "Champion Feature", "subclass:champion");
    const sub = makeSubclass("subclass:champion", "Champion", "class:fighter", ["feat:champion1"]);

    const result = resolveReferences({ entities: [cls, feat, sub] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(3);
  });

  it("diagnoses broken subclass parentId", () => {
    const sub = makeSubclass("subclass:champion", "Champion", "class:missing");

    const result = resolveReferences({ entities: [sub] });
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_PARENT_REF");
  });
});

/* ── Tests: class-feature ───────────────────────────────────────── */

describe("resolveReferences - class-feature", () => {
  it("resolves class-feature parentId", () => {
    const cls = makeClass("class:fighter", "Fighter");
    const feat = makeClassFeature("feat:secondwind", "Second Wind", "class:fighter");

    const result = resolveReferences({ entities: [cls, feat] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(1);
    const link = result.links[0]!;
    expect(link.field).toBe("parentId");
  });

  it("diagnoses broken class-feature parentId", () => {
    const feat = makeClassFeature("feat:secondwind", "Second Wind", "class:missing");

    const result = resolveReferences({ entities: [feat] });
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_PARENT_REF");
  });
});

/* ── Tests: subclass-feature ────────────────────────────────────── */

describe("resolveReferences - subclass-feature", () => {
  it("resolves subclass-feature parentId", () => {
    const cls = makeClass("class:fighter", "Fighter");
    const sub = makeSubclass("subclass:champion", "Champion", "class:fighter");
    const feat = makeSubclassFeature("feat:champion1", "Champion Feature", "subclass:champion");

    const result = resolveReferences({ entities: [cls, sub, feat] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(2);
    const subclassFeatureLink = result.links.find((l) => l.sourceKind === "subclass-feature");
    expect(subclassFeatureLink).toBeDefined();
    expect(subclassFeatureLink!.field).toBe("parentId");
  });
});

/* ── Tests: prerequisites ───────────────────────────────────────── */

describe("resolveReferences - prerequisites", () => {
  it("resolves entity-selection prerequisites", () => {
    const feat = makeFeat("feat:heavyarmor", "Heavy Armor Master");
    const spell = makeSpell(
      "spell:shield", "Shield", EMPTY,
      [createEntitySelectionPrerequisite(eid("feat:heavyarmor"))],
    );

    const result = resolveReferences({ entities: [feat, spell] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toHaveLength(1);
    const link = result.links[0]!;
    expect(link.field).toBe("prerequisites[].entityId");
  });

  it("diagnoses broken entity-selection prerequisites", () => {
    const spell = makeSpell(
      "spell:shield", "Shield", EMPTY,
      [createEntitySelectionPrerequisite(eid("feat:missing"))],
    );

    const result = resolveReferences({ entities: [spell] });
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("BROKEN_PREREQUISITE_REF");
  });

  it("ignores non-entity-selection prerequisites", () => {
    const spell = makeSpell(
      "spell:firebolt", "Firebolt", EMPTY,
      [createAbilityScorePrerequisite("INT", 13)],
    );

    const result = resolveReferences({ entities: [spell] });
    expect(result.diagnostics).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it("deduplicates identical references from the same source", () => {
    const feat = makeFeat("feat:tough", "Tough");
    const spell = makeSpell(
      "spell:shield", "Shield", ["feat:tough"],
      [createEntitySelectionPrerequisite(eid("feat:tough"))],
    );

    const result = resolveReferences({ entities: [feat, spell] });
    expect(result.links).toHaveLength(2);
    expect(result.diagnostics).toEqual([]);
  });
});

/* ── Tests: extractors ──────────────────────────────────────────── */

describe("resolveReferences - extractors", () => {
  it("extracts species language references", () => {
    const lang = makeLanguage("lang:common", "Common");
    const species = makeSpecies("species:human", "Human", ["lang:common"]);

    const result = resolveReferences({ entities: [lang, species] });
    const link = result.links[0]!;
    expect(link.field).toBe("languageIds");
  });

  it("extracts background skill and feature references", () => {
    const skill = makeSkill("skill:athletics", "Athletics");
    const cls = makeClass("class:fighter", "Fighter");
    const feature = makeClassFeature("feat:rank", "Military Rank", "class:fighter");
    const bg = makeBackground("bg:soldier", "Soldier", ["skill:athletics"], "feat:rank");

    const result = resolveReferences({ entities: [skill, cls, feature, bg] });
    const fields = result.links.map((l) => l.field);
    expect(fields).toContain("skillProficiencies");
    expect(fields).toContain("featureId");
  });

  it("extracts class subclass and level grant references", () => {
    const subclass = makeSubclass("subclass:champion", "Champion", "class:fighter");
    const feature = makeClassFeature("feat:secondwind", "Second Wind", "class:fighter");
    const cls = makeClass(
      "class:fighter", "Fighter",
      ["subclass:champion"],
      [{ level: 1, featureId: "feat:secondwind" }],
    );

    const result = resolveReferences({ entities: [subclass, feature, cls] });
    const fields = result.links.map((l) => l.field);
    expect(fields).toContain("subclassIds");
    expect(fields).toContain("levels[].featureId");
  });
});

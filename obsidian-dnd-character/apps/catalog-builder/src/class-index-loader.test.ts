import { describe, expect, it } from "vitest";
import type { RawRecord, ValidatedFileEnvelope, ValidatedCollection } from "./raw-boundary";
import type { CopyResolverContext } from "./copy-resolver";
import { loadClassIndex } from "./class-index-loader";

/* ── Helpers ───────────────────────────────────────────────────── */

/**
 * Creates a PHB (2014) class record with pinned 5eTools shapes:
 * - hd: { number, faces }
 * - proficiency: ["str", "con"] (saving throws + primary abilities)
 */
function classRec2014(
  source: string,
  name = "Fighter",
  hdFaces = 10,
  proficiency: string[] = ["str", "con"],
  rem: Record<string, unknown> = {},
): RawRecord {
  return {
    name,
    source,
    remaining: {
      hd: { number: 1, faces: hdFaces },
      proficiency,
      ...rem,
    },
  };
}

/**
 * Creates an XPHB (2024) class record with pinned 5eTools shapes:
 * - hd: { number, faces }
 * - primaryAbility: [{ str: true, cha: true }]
 * - proficiencies: [{ name: "...", type: "saving_throw", ability: "str" }]
 */
function classRec2024(
  source: string,
  name = "Fighter",
  hdFaces = 10,
  primaryAbility: Record<string, boolean>[] = [{ str: true }],
  proficiencies: Array<{ name: string; type: string; ability: string }> = [
    { name: "Athletics", type: "saving_throw", ability: "str" },
    { name: "Endurance", type: "saving_throw", ability: "con" },
  ],
  rem: Record<string, unknown> = {},
): RawRecord {
  return {
    name,
    source,
    remaining: {
      hd: { number: 1, faces: hdFaces },
      primaryAbility,
      proficiencies,
      ...rem,
    },
  };
}

/**
 * Legacy helper for test fixtures that use old field names.
 */
function classRecLegacy(
  source: string,
  name = "Fighter",
  hitdie = 10,
  primaryability: string[] = ["STR"],
  savingthrows: string[] = ["STR", "CON"],
  rem: Record<string, unknown> = {},
): RawRecord {
  return {
    name,
    source,
    remaining: {
      hitdie,
      primaryability,
      savingthrows,
      ...rem,
    },
  };
}

function subclassRec(
  source: string,
  name = "Champion",
  parent = "Fighter",
  rem: Record<string, unknown> = {},
): RawRecord {
  return {
    name,
    source,
    remaining: {
      parent,
      ...rem,
    },
  };
}

const ctx = {
  knownPinnedSources: new Set(["PHB", "XPHB", "XGtE", "ERLW", "DMG", "MM"]),
};

const emptyCopyContext: CopyResolverContext = {
  validatedFiles: {},
};

const emptyValidatedFiles: Record<string, ValidatedFileEnvelope> = {};

function makeValidatedFiles(records: RawRecord[]): Record<string, ValidatedFileEnvelope> {
  const collection: ValidatedCollection = {
    entityKind: "class",
    records,
    recordCount: records.length,
  };
  const envelope: ValidatedFileEnvelope = {
    filePath: "data/classes/PHB.json",
    collections: [collection],
    totalRecords: records.length,
  };
  return { "data/classes/PHB.json": envelope };
}

/* ── loadClassIndex - empty input ──────────────────────────────── */

describe("loadClassIndex - empty input", () => {
  it("returns empty result for no validated files", () => {
    const r = loadClassIndex({
      validatedFiles: emptyValidatedFiles,
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    expect(r.summary.totalRecords).toBe(0);
    expect(r.summary.indexedClasses).toBe(0);
  });

  it("result is frozen", () => {
    const r = loadClassIndex({
      validatedFiles: emptyValidatedFiles,
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.classes)).toBe(true);
    expect(Object.isFrozen(r.diagnostics)).toBe(true);
    expect(Object.isFrozen(r.summary)).toBe(true);
  });
});

/* ── loadClassIndex - positive indexing ────────────────────────── */

describe("loadClassIndex - positive indexing", () => {
  it("indexes a PHB class with pinned 5eTools shapes", () => {
    const fighter = classRec2014("PHB", "Fighter", 10, ["str", "con"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.name).toBe("Fighter");
    expect(entry.source).toBe("PHB");
    expect(entry.ruleset).toBe("2014");
    expect(entry.isSubclass).toBe(false);
    expect(entry.hitDie).toBe(10);
    expect(entry.primaryAbilities).toEqual(["STR", "CON"]);
    expect(entry.savingThrowProficiencies).toEqual(["STR", "CON"]);
  });

  it("indexes an XPHB class with pinned 5eTools shapes", () => {
    const fighter = classRec2024("XPHB", "Fighter", 10, [{ str: true }], [
      { name: "Athletics", type: "saving_throw", ability: "str" },
      { name: "Endurance", type: "saving_throw", ability: "con" },
    ]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.name).toBe("Fighter");
    expect(entry.source).toBe("XPHB");
    expect(entry.ruleset).toBe("2024");
    expect(entry.hitDie).toBe(10);
    expect(entry.primaryAbilities).toEqual(["STR"]);
    expect(entry.savingThrowProficiencies).toEqual(["STR", "CON"]);
  });

  it("indexes an XPHB caster class with multi-ability primaryAbility", () => {
    const cleric = classRec2024("XPHB", "Cleric", 8, [{ wis: true, cha: true }], [
      { name: "Insight", type: "saving_throw", ability: "wis" },
      { name: "Persuasion", type: "saving_throw", ability: "cha" },
    ]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([cleric]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.primaryAbilities).toEqual(["WIS", "CHA"]);
    expect(entry.savingThrowProficiencies).toEqual(["WIS", "CHA"]);
  });

  it("identifies subclass by parent field", () => {
    const champion = subclassRec("PHB", "Champion", "Fighter");
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([champion]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.isSubclass).toBe(true);
    expect(entry.parentId).toBe("Fighter");
  });

  it("base class has no parent", () => {
    const fighter = classRec2014("PHB", "Fighter", 10, ["str", "con"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.isSubclass).toBe(false);
    expect(entry.parentId).toBeUndefined();
  });

  it("indexes multiple classes", () => {
    const fighter = classRec2014("PHB", "Fighter", 10, ["str", "con"]);
    const wizard = classRec2014("PHB", "Wizard", 6, ["int", "wis"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter, wizard]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(2);
    expect(r.summary.baseClasses).toBe(2);
    expect(r.summary.subclasses).toBe(0);
  });

  it("summary counts base and subclass correctly", () => {
    const fighter = classRec2014("PHB", "Fighter", 10, ["str", "con"]);
    const champion = subclassRec("PHB", "Champion", "Fighter");
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter, champion]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.summary.baseClasses).toBe(1);
    expect(r.summary.subclasses).toBe(1);
    expect(r.summary.indexedClasses).toBe(2);
  });

  it("falls back to legacy field names when pinned shapes missing", () => {
    const fighter = classRecLegacy("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.hitDie).toBe(10);
    expect(entry.primaryAbilities).toEqual(["STR"]);
    expect(entry.savingThrowProficiencies).toEqual(["STR", "CON"]);
  });
});

/* ── loadClassIndex - excluded sources ─────────────────────────── */

describe("loadClassIndex - excluded sources", () => {
  it("excludes non-PHB/XPHB sources with diagnostic", () => {
    const artificer = classRecLegacy("XGtE", "Artificer", 8, ["INT"], ["INT", "CON"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([artificer]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(0);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.code).toBe("EXCLUDED_SOURCE");
    expect(r.summary.excludedRecords).toBe(1);
  });

  it("unknown source emits UNKNOWN_SOURCE diagnostic", () => {
    const fake = classRecLegacy("FAKE", "FakeClass", 8, ["STR"], ["STR"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fake]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(0);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.code).toBe("UNKNOWN_SOURCE");
  });
});

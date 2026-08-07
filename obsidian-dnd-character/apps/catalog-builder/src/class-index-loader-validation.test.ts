import { describe, expect, it } from "vitest";
import type { RawRecord, ValidatedFileEnvelope, ValidatedCollection } from "./raw-boundary";
import type { CopyResolverContext } from "./copy-resolver";
import { loadClassIndex } from "./class-index-loader";

/* ── Helpers ───────────────────────────────────────────────────── */

/**
 * Creates a PHB (2014) class record with pinned 5eTools shapes.
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
 * Creates an XPHB (2024) class record with pinned 5eTools shapes.
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

function rec(source: string, name = "Test Class", rem: Record<string, unknown> = {}): RawRecord {
  return { name, source, remaining: rem };
}

const ctx = {
  knownPinnedSources: new Set(["PHB", "XPHB", "XGtE", "ERLW", "DMG", "MM"]),
};

const emptyCopyContext: CopyResolverContext = {
  validatedFiles: {},
};

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

/* ── loadClassIndex - field validation ─────────────────────────── */

describe("loadClassIndex - field validation", () => {
  it("diagnoses missing hitdie with pinned 5eTools shapes", () => {
    const noHitdie = rec("PHB", "NoHitdie", {
      proficiency: ["str", "con"],
    });
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([noHitdie]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.hitDie).toBeUndefined();
    const diag = entry.diagnostics.find((d) => d.code === "MISSING_HIT_DIE");
    expect(diag).toBeDefined();
  });

  it("diagnoses missing primary abilities for 2014 class", () => {
    const noPrimary = rec("PHB", "NoPrimary", {
      hd: { number: 1, faces: 10 },
    });
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([noPrimary]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.primaryAbilities).toEqual([]);
    const diag = entry.diagnostics.find((d) => d.code === "MISSING_PRIMARY_ABILITIES");
    expect(diag).toBeDefined();
  });

  it("diagnoses missing saving throw proficiencies for 2014 class", () => {
    const noSaving = rec("PHB", "NoSaving", {
      hd: { number: 1, faces: 10 },
      proficiency: ["str"],
    });
    // proficiency is present, so saving throws should be extracted
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([noSaving]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.savingThrowProficiencies).toEqual(["STR"]);
  });

  it("diagnoses missing primary abilities for 2024 class", () => {
    const noPrimary = rec("XPHB", "NoPrimary", {
      hd: { number: 1, faces: 10 },
      proficiencies: [{ name: "Athletics", type: "saving_throw", ability: "str" }],
    });
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([noPrimary]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.primaryAbilities).toEqual([]);
    const diag = entry.diagnostics.find((d) => d.code === "MISSING_PRIMARY_ABILITIES");
    expect(diag).toBeDefined();
  });

  it("diagnoses missing saving throws for 2024 class", () => {
    const noSaving = rec("XPHB", "NoSaving", {
      hd: { number: 1, faces: 10 },
      primaryAbility: [{ str: true }],
    });
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([noSaving]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    const entry = r.classes[0]!;
    expect(entry.savingThrowProficiencies).toEqual([]);
    const diag = entry.diagnostics.find((d) => d.code === "MISSING_SAVING_THROW_PROFICIENCIES");
    expect(diag).toBeDefined();
  });

  it("extracts hit die from hd.faces in pinned 5eTools shape", () => {
    const fighter = classRec2014("PHB", "Fighter", 10, ["str", "con"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    expect(r.classes[0]!.hitDie).toBe(10);
  });

  it("extracts hit die from hd.faces for XPHB class", () => {
    const fighter = classRec2024("XPHB", "Fighter", 10);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    expect(r.classes[0]!.hitDie).toBe(10);
  });
});

/* ── loadClassIndex - entry immutability ───────────────────────── */

describe("loadClassIndex - entry immutability", () => {
  it("indexed entry is frozen", () => {
    const fighter = classRecLegacy("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    expect(Object.isFrozen(r.classes[0])).toBe(true);
  });

  it("entry diagnostics array is frozen", () => {
    const fighter = classRecLegacy("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    expect(Object.isFrozen(r.classes[0]!.diagnostics)).toBe(true);
  });

  it("entry primaryAbilities array is frozen", () => {
    const fighter = classRecLegacy("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    expect(Object.isFrozen(r.classes[0]!.primaryAbilities)).toBe(true);
  });
});

/* ── loadClassIndex - canonical ID generation ──────────────────── */

describe("loadClassIndex - canonical ID generation", () => {
  it("generates canonical ID for PHB class", () => {
    const fighter = classRecLegacy("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    expect(r.classes[0]?.id).toContain("class");
    expect(r.classes[0]?.id).toContain("fighter");
  });

  it("generates canonical ID for XPHB class", () => {
    const fighter = classRecLegacy("XPHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
    const r = loadClassIndex({
      validatedFiles: makeValidatedFiles([fighter]),
      copyResolverContext: emptyCopyContext,
      sourceScopeContext: ctx,
      entityKind: "class",
    });
    expect(r.classes).toHaveLength(1);
    expect(r.classes[0]?.id).toContain("class");
    expect(r.classes[0]?.id).toContain("fighter");
  });
});

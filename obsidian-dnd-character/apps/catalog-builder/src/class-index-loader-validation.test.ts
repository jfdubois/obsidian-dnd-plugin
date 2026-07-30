import { describe, expect, it } from "vitest";
import type { RawRecord, ValidatedFileEnvelope, ValidatedCollection } from "./raw-boundary";
import type { CopyResolverContext } from "./copy-resolver";
import { loadClassIndex } from "./class-index-loader";

/* ── Helpers ───────────────────────────────────────────────────── */

function classRec(
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
  it("diagnoses missing hitdie", () => {
    const noHitdie = rec("PHB", "NoHitdie", {
      primaryability: ["STR"],
      savingthrows: ["STR"],
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

  it("diagnoses missing primary abilities", () => {
    const noPrimary = rec("PHB", "NoPrimary", {
      hitdie: 10,
      savingthrows: ["STR"],
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

  it("diagnoses missing saving throw proficiencies", () => {
    const noSaving = rec("PHB", "NoSaving", {
      hitdie: 10,
      primaryability: ["STR"],
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
});

/* ── loadClassIndex - entry immutability ───────────────────────── */

describe("loadClassIndex - entry immutability", () => {
  it("indexed entry is frozen", () => {
    const fighter = classRec("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
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
    const fighter = classRec("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
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
    const fighter = classRec("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
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
    const fighter = classRec("PHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
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
    const fighter = classRec("XPHB", "Fighter", 10, ["STR"], ["STR", "CON"]);
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

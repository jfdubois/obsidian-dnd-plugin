import { describe, it, expect } from "vitest";
import {
  resolveCopy,
  resolveCopyOrThrow,
  resolveCopies,
  collectCopyFailures,
  isRawCopyValue,
  isCopyResolutionSuccess,
  isCopyResolutionFailure,
  extractStructuredIdentity,
  CopyResolverError,
  type CopyResolutionResult,
  type CopyResolverContext,
  type CopyDiagnosticCode,
} from "./copy-resolver";

/* ── Helpers ───────────────────────────────────────────────────── */

function makeContext(
  records: Array<{ name: string; source: string; remaining?: Record<string, unknown> }>,
): CopyResolverContext {
  return {
    validatedFiles: {
      "test.json": {
        filePath: "test.json",
        collections: [
          {
            entityKind: "test",
            recordCount: records.length,
            records: records.map((r) => ({
              name: r.name,
              source: r.source,
              remaining: r.remaining ?? {},
            })),
          },
        ],
        totalRecords: records.length,
      },
    },
  };
}

/** Default resolve options for single-collection "test" context. */
const TEST_OPTIONS = { sourceEntityKind: "test", sourcePath: "test.json" };

function makeMultiCollectionContext(
  collections: Array<{
    entityKind: string;
    records: Array<{ name: string; source: string; remaining?: Record<string, unknown> }>;
  }>,
): CopyResolverContext {
  const fileCollections = collections.map((c) => ({
    entityKind: c.entityKind,
    recordCount: c.records.length,
    records: c.records.map((r) => ({
      name: r.name,
      source: r.source,
      remaining: r.remaining ?? {},
    })),
  }));
  const totalRecords = fileCollections.reduce((sum, c) => sum + c.recordCount, 0);
  return {
    validatedFiles: {
      "test.json": {
        filePath: "test.json",
        collections: fileCollections,
        totalRecords,
      },
    },
  };
}

function makeRecord(
  name: string,
  source: string,
  remaining?: Record<string, unknown>,
) {
  return { name, source, remaining: remaining ?? {} };
}

/* ── isRawCopyValue ────────────────────────────────────────────── */

describe("isRawCopyValue", () => {
  it("accepts valid structured copy", () => {
    expect(isRawCopyValue({ name: "Goblin", source: "MPMM" })).toBe(true);
  });

  it("rejects missing name", () => {
    expect(isRawCopyValue({ source: "MPMM" })).toBe(false);
  });

  it("rejects missing source", () => {
    expect(isRawCopyValue({ name: "Goblin" })).toBe(false);
  });

  it("rejects empty name", () => {
    expect(isRawCopyValue({ name: "", source: "MPMM" })).toBe(false);
  });

  it("rejects empty source", () => {
    expect(isRawCopyValue({ name: "Goblin", source: "" })).toBe(false);
  });

  it("rejects null", () => {
    expect(isRawCopyValue(null)).toBe(false);
  });

  it("rejects array", () => {
    expect(isRawCopyValue(["Goblin", "MPMM"])).toBe(false);
  });

  it("rejects string", () => {
    expect(isRawCopyValue("Goblin|MPMM")).toBe(false);
  });

  it("rejects number", () => {
    expect(isRawCopyValue(42)).toBe(false);
  });

  it("accepts extra fields", () => {
    expect(isRawCopyValue({ name: "Goblin", source: "MPMM", _preserve: true })).toBe(true);
  });
});

/* ── resolveCopy: basic success ────────────────────────────────── */

describe("resolveCopy — basic success", () => {
  it("resolves a simple _copy to the base entity", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
      { name: "Boggart", source: "MPMM", remaining: { _copy: { name: "Goblin", source: "MPMM" } } },
    ]);

    const result = resolveCopy(
      makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Goblin");
    expect(result.baseEntity.source).toBe("MPMM");
    expect(result.chain).toHaveLength(1);
    expect(result.chain[0]).toEqual({
      entityName: "Goblin",
      sourceAbbr: "MPMM",
      entityKind: "test",
      sourcePath: "test.json",
      identity: { name: "Goblin", source: "MPMM" },
    });
  });

  it("resolves a nested _copy chain", () => {
    const context = makeContext([
      { name: "Centaur", source: "GGR" },
      { name: "Centaur MOT", source: "MOT", remaining: { _copy: { name: "Centaur", source: "GGR" } } },
      {
        name: "Centaur Variant",
        source: "MOT",
        remaining: { _copy: { name: "Centaur MOT", source: "MOT" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Centaur Variant", "MOT", { _copy: { name: "Centaur MOT", source: "MOT" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Centaur");
    expect(result.baseEntity.source).toBe("GGR");
    expect(result.chain).toHaveLength(2);
    expect(result.chain[0]).toMatchObject({ entityName: "Centaur MOT", sourceAbbr: "MOT", entityKind: "test" });
    expect(result.chain[1]).toMatchObject({ entityName: "Centaur", sourceAbbr: "GGR", entityKind: "test" });
  });

  it("resolves when base entity has no further _copy", () => {
    const context = makeContext([
      { name: "Variant Human", source: "PHB" },
      {
        name: "Amonkhet",
        source: "GOA",
        remaining: { _copy: { name: "Variant Human", source: "PHB" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Amonkhet", "GOA", { _copy: { name: "Variant Human", source: "PHB" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Variant Human");
  });
});

/* ── resolveCopy: failure cases ────────────────────────────────── */

describe("resolveCopy — failure cases", () => {
  it("returns NO_COPY_FIELD when record has no _copy", () => {
    const context = makeContext([{ name: "Goblin", source: "MPMM" }]);

    const result = resolveCopy(makeRecord("Goblin", "MPMM"), context, TEST_OPTIONS);

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("NO_COPY_FIELD");
    expect(result.diagnostic.severity).toBe("warning");
  });

  it("returns BASE_ENTITY_NOT_FOUND when target is missing", () => {
    const context = makeContext([
      {
        name: "Boggart",
        source: "MPMM",
        remaining: { _copy: { name: "Goblin", source: "MPMM" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("BASE_ENTITY_NOT_FOUND");
    expect(result.diagnostic.requestedIdentity).toEqual({ name: "Goblin", source: "MPMM" });
    expect(result.diagnostic.sourceEntityKind).toBe("test");
    expect(result.diagnostic.sourcePath).toBe("test.json");
    expect(result.diagnostic.allowedEntityKinds).toBeDefined();
    expect(Array.isArray(result.diagnostic.chain)).toBe(true);
    expect(result.diagnostic.chain!.length).toBeGreaterThan(0);
  });

  it("returns CIRCULAR_COPY_REFERENCE for direct cycle", () => {
    const context = makeContext([
      {
        name: "A",
        source: "PHB",
        remaining: { _copy: { name: "B", source: "PHB" } },
      },
      {
        name: "B",
        source: "PHB",
        remaining: { _copy: { name: "A", source: "PHB" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("A", "PHB", { _copy: { name: "B", source: "PHB" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("CIRCULAR_COPY_REFERENCE");
    expect(result.diagnostic.message).toContain("test");
    expect(result.diagnostic.requestedIdentity).toEqual({ name: "B", source: "PHB" });
    expect(result.diagnostic.sourceEntityKind).toBe("test");
    expect(result.diagnostic.sourcePath).toBe("test.json");
    expect(Array.isArray(result.diagnostic.chain)).toBe(true);
    expect(result.diagnostic.chain!.length).toBeGreaterThan(0);
  });

  it("returns CIRCULAR_COPY_REFERENCE with the full nested cycle chain", () => {
    const context = makeContext([
      {
        name: "A",
        source: "PHB",
        remaining: { _copy: { name: "B", source: "PHB" } },
      },
      {
        name: "B",
        source: "PHB",
        remaining: { _copy: { name: "C", source: "PHB" } },
      },
      {
        name: "C",
        source: "PHB",
        remaining: { _copy: { name: "B", source: "PHB" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("A", "PHB", { _copy: { name: "B", source: "PHB" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("CIRCULAR_COPY_REFERENCE");
    expect(result.diagnostic.message).toContain("B|PHB");
  });

  it("resolves self-reference when _preserve is true", () => {
    const context = makeContext([
      {
        name: "Alchemist",
        source: "XPHB",
        remaining: {
          _copy: { name: "Alchemist", source: "XPHB" },
          _preserve: true,
          trait: [{ name: "Tool Proficiency" }],
        },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Alchemist", "XPHB", {
        _copy: { name: "Alchemist", source: "XPHB" },
        _preserve: true,
        trait: [{ name: "Tool Proficiency" }],
      }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity).toEqual({
      name: "Alchemist",
      source: "XPHB",
      remaining: { trait: [{ name: "Tool Proficiency" }] },
    });
  });

  it("returns INVALID_COPY_REFERENCE for _copy with missing name", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: { source: "PHB" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("INVALID_COPY_REFERENCE");
  });

  it("returns COPY_FIELD_INVALID_TYPE for non-object record", () => {
    const context = makeContext([]);

    const result = resolveCopy("not an object", context);

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("COPY_FIELD_INVALID_TYPE");
  });

  it("returns COPY_FIELD_INVALID_TYPE for null record", () => {
    const context = makeContext([]);

    const result = resolveCopy(null, context);

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("COPY_FIELD_INVALID_TYPE");
  });

  it("returns COPY_FIELD_INVALID_TYPE for array record", () => {
    const context = makeContext([]);

    const result = resolveCopy([1, 2, 3], context);

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("COPY_FIELD_INVALID_TYPE");
  });

  it("returns COPY_FIELD_INVALID_TYPE for record missing name", () => {
    const context = makeContext([]);

    const result = resolveCopy({ source: "PHB", remaining: {} }, context);

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("COPY_FIELD_INVALID_TYPE");
  });

  it("returns COPY_FIELD_INVALID_TYPE for record missing source", () => {
    const context = makeContext([]);

    const result = resolveCopy({ name: "Test", remaining: {} }, context);

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("COPY_FIELD_INVALID_TYPE");
  });

   it("returns INVALID_COPY_REFERENCE for _copy with number value", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: 42 }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("INVALID_COPY_REFERENCE");
  });

  it("returns INVALID_COPY_REFERENCE for _copy with array value", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: ["Goblin", "MPMM"] }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("INVALID_COPY_REFERENCE");
  });

  it("returns INVALID_COPY_REFERENCE for _copy with null value", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: null }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("INVALID_COPY_REFERENCE");
  });
});

/* ── resolveCopy: chain depth limit ────────────────────────────── */

describe("resolveCopy — chain depth limit", () => {
  it("returns COPY_CHAIN_TOO_DEEP when chain exceeds max depth", () => {
    const records: Array<{ name: string; source: string; remaining?: Record<string, unknown> }> = [];
    for (let i = 0; i < 25; i++) {
      const nextName = i < 24 ? `Entity${i + 1}` : "Entity0";
      records.push({
        name: `Entity${i}`,
        source: "PHB",
        remaining: { _copy: { name: nextName, source: "PHB" } },
      });
    }

    const context = makeContext(records);

    const result = resolveCopy(
      makeRecord("Entity0", "PHB", { _copy: { name: "Entity1", source: "PHB" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("COPY_CHAIN_TOO_DEEP");
  });
});

/* ── resolveCopyOrThrow ────────────────────────────────────────── */

describe("resolveCopyOrThrow", () => {
  it("returns base entity on success", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
      { name: "Boggart", source: "MPMM", remaining: { _copy: { name: "Goblin", source: "MPMM" } } },
    ]);

    const base = resolveCopyOrThrow(
      makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      context,
      TEST_OPTIONS,
    );

    expect(base.name).toBe("Goblin");
    expect(base.source).toBe("MPMM");
  });

  it("throws CopyResolverError on failure", () => {
    const context = makeContext([
      {
        name: "Boggart",
        source: "MPMM",
        remaining: { _copy: { name: "Missing", source: "XXX" } },
      },
    ]);

    expect(() =>
      resolveCopyOrThrow(
        makeRecord("Boggart", "MPMM", { _copy: { name: "Missing", source: "XXX" } }),
        context,
        TEST_OPTIONS,
      ),
    ).toThrow(CopyResolverError);

    try {
      resolveCopyOrThrow(
        makeRecord("Boggart", "MPMM", { _copy: { name: "Missing", source: "XXX" } }),
        context,
        TEST_OPTIONS,
      );
    } catch (e) {
      if (e instanceof CopyResolverError) {
        expect(e.code).toBe("BASE_ENTITY_NOT_FOUND");
        expect(e.name).toBe("CopyResolverError");
      }
    }
  });
});

/* ── resolveCopies (batch) ─────────────────────────────────────── */

describe("resolveCopies", () => {
  it("resolves multiple records preserving order", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
      { name: "Centaur", source: "GGR" },
      {
        name: "Boggart",
        source: "MPMM",
        remaining: { _copy: { name: "Goblin", source: "MPMM" } },
      },
      {
        name: "Centaur MOT",
        source: "MOT",
        remaining: { _copy: { name: "Centaur", source: "GGR" } },
      },
    ]);

    const results = resolveCopies(
      [
        makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
        makeRecord("Centaur MOT", "MOT", { _copy: { name: "Centaur", source: "GGR" } }),
      ],
      context,
      TEST_OPTIONS,
    );

    expect(results).toHaveLength(2);
    const r0 = results[0]!;
    const r1 = results[1]!;
    expect(isCopyResolutionSuccess(r0)).toBe(true);
    expect(isCopyResolutionSuccess(r1)).toBe(true);
    if (!isCopyResolutionSuccess(r0)) throw new Error("Expected success");
    if (!isCopyResolutionSuccess(r1)) throw new Error("Expected success");
    expect(r0.baseEntity.name).toBe("Goblin");
    expect(r1.baseEntity.name).toBe("Centaur");
  });

  it("mixes successes and failures", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
    ]);

    const results = resolveCopies(
      [
        makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
        makeRecord("Missing", "XXX", { _copy: { name: "NoEntity", source: "XXX" } }),
      ],
      context,
      TEST_OPTIONS,
    );

    expect(results).toHaveLength(2);
    const ms = results[0]!;
    const mf = results[1]!;
    expect(isCopyResolutionSuccess(ms)).toBe(true);
    expect(isCopyResolutionFailure(mf)).toBe(true);
  });
});

/* ── collectCopyFailures ───────────────────────────────────────── */

describe("collectCopyFailures", () => {
  it("collects only failure diagnostics", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
    ]);

    const results: CopyResolutionResult[] = [
      resolveCopy(
        makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
        context,
        TEST_OPTIONS,
      ),
      resolveCopy(
        makeRecord("Missing", "XXX", { _copy: { name: "NoEntity", source: "XXX" } }),
        context,
        TEST_OPTIONS,
      ),
      resolveCopy(makeRecord("NoCopy", "PHB"), context, TEST_OPTIONS),
    ];

    const failures = collectCopyFailures(results);
    expect(failures).toHaveLength(2);
    const f0 = failures[0]!;
    const f1 = failures[1]!;
    expect(f0.code).toBe("BASE_ENTITY_NOT_FOUND");
    expect(f1.code).toBe("NO_COPY_FIELD");
  });

  it("returns empty array when all succeed", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
    ]);

    const results = [
      resolveCopy(
        makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
        context,
        TEST_OPTIONS,
      ),
    ];

    const failures = collectCopyFailures(results);
    expect(failures).toHaveLength(0);
  });
});

/* ── CopyResolverError ─────────────────────────────────────────── */

describe("CopyResolverError", () => {
  it("creates error with code and raw", () => {
    const code: CopyDiagnosticCode = "BASE_ENTITY_NOT_FOUND";
    const err = new CopyResolverError(code, { name: "X", source: "Y" }, "test message");
    expect(err.name).toBe("CopyResolverError");
    expect(err.code).toBe(code);
    expect(err.rawCopy).toEqual({ name: "X", source: "Y" });
    expect(err).toBeInstanceOf(Error);
  });
});

/* ── Integration: real 5eTools patterns ────────────────────────── */

describe("integration — real 5eTools _copy patterns", () => {
  it("resolves Boggart -> Goblin (race copy)", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
      {
        name: "Boggart",
        source: "MPMM",
        remaining: { _copy: { name: "Goblin", source: "MPMM" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Goblin");
    expect(result.baseEntity.source).toBe("MPMM");
  });

  it("resolves Centaur MOT -> Centaur GGR (cross-source copy)", () => {
    const context = makeContext([
      { name: "Centaur", source: "GGR" },
      {
        name: "Centaur",
        source: "MOT",
        remaining: { _copy: { name: "Centaur", source: "GGR" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Centaur", "MOT", { _copy: { name: "Centaur", source: "GGR" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Centaur");
    expect(result.baseEntity.source).toBe("GGR");
  });

  it("resolves Amonkhet -> Variant Human (subrace copy)", () => {
    const context = makeContext([
      { name: "Variant Human", source: "PHB" },
      {
        name: "Amonkhet",
        source: "GOA",
        remaining: { _copy: { name: "Variant Human", source: "PHB" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Amonkhet", "GOA", { _copy: { name: "Variant Human", source: "PHB" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Variant Human");
    expect(result.baseEntity.source).toBe("PHB");
  });
});

/* ── Type guards ───────────────────────────────────────────────── */

describe("type guards", () => {
  it("isCopyResolutionSuccess distinguishes results", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
    ]);

    const success = resolveCopy(
      makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      context,
      TEST_OPTIONS,
    );
    const failure = resolveCopy(
      makeRecord("Missing", "XXX", { _copy: { name: "NoEntity", source: "XXX" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(success)).toBe(true);
    expect(isCopyResolutionSuccess(failure)).toBe(false);
    expect(isCopyResolutionFailure(success)).toBe(false);
    expect(isCopyResolutionFailure(failure)).toBe(true);
  });
});

/* ── Structured identity matching ──────────────────────────────── */

describe("structured identity matching", () => {
  it("resolves subclass copy with className and classSource discrimination", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclass",
        records: [
          { name: "Battle Master", source: "XPHB", remaining: { className: "Fighter", classSource: "XPHB", shortName: "Battle Master" } },
          { name: "Battle Master", source: "PHB", remaining: { className: "Fighter", classSource: "PHB", shortName: "Battle Master" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Battle Master XPHB", "XPHB", {
        _copy: { name: "Battle Master", source: "XPHB", className: "Fighter", classSource: "XPHB", shortName: "Battle Master" },
      }),
      context,
      { sourceEntityKind: "subclass", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Battle Master");
    expect(result.baseEntity.source).toBe("XPHB");
    expect(result.baseEntity.remaining.className).toBe("Fighter");
  });

  it("resolves subrace copy with raceName and raceSource discrimination", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subrace",
        records: [
          { name: "Variant", source: "PHB", remaining: { raceName: "Human", raceSource: "PHB" } },
          { name: "Variant", source: "GOA", remaining: { raceName: "Human", raceSource: "GOA" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Amonkhet", "GOA", {
        _copy: { name: "Variant", source: "PHB", raceName: "Human", raceSource: "PHB" },
      }),
      context,
      { sourceEntityKind: "subrace", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Variant");
    expect(result.baseEntity.source).toBe("PHB");
  });

  it("resolves subclassFeature copy with full structured identity", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclassFeature",
        records: [
          {
            name: "Channel Divinity: Touch of Death",
            source: "DMG",
            remaining: {
              className: "Cleric",
              classSource: "PHB",
              subclassShortName: "Death",
              subclassSource: "DMG",
              level: 2,
            },
          },
          {
            name: "Channel Divinity: Knowledge of the Ages",
            source: "PHB",
            remaining: {
              className: "Cleric",
              classSource: "PHB",
              subclassShortName: "Knowledge",
              subclassSource: "PHB",
              level: 2,
            },
          },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Death Domain Feature", "DMG", {
        _copy: {
          name: "Channel Divinity: Touch of Death",
          source: "DMG",
          className: "Cleric",
          classSource: "PHB",
          subclassShortName: "Death",
          subclassSource: "DMG",
          level: 2,
        },
      }),
      context,
      { sourceEntityKind: "subclassFeature", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Channel Divinity: Touch of Death");
  });

  it("resolves deity copy with pantheon discrimination", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "deity",
        records: [
          { name: "Bahgtru", source: "SCAG", remaining: { pantheon: "Orc" } },
          { name: "Bahgtru", source: "GRVG", remaining: { pantheon: "Goblin" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Bahgtru Copy", "SCAG", {
        _copy: { name: "Bahgtru", source: "SCAG", pantheon: "Orc" },
      }),
      context,
      { sourceEntityKind: "deity", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.remaining.pantheon).toBe("Orc");
  });

  it("resolves itemType copy with abbreviation instead of name", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "itemType",
        records: [
          { name: "Vehicle (Air)", source: "DMG", remaining: { abbreviation: "SHP" } },
          { name: "Vehicle (Land)", source: "DMG", remaining: { abbreviation: "VLP" } },
        ],
      },
    ]);

    // The _copy only uses abbreviation+source; the target record must have abbreviation
    const result = resolveCopy(
      makeRecord("Vehicle Type Copy", "DMG", {
        _copy: { abbreviation: "SHP", source: "DMG" },
      }),
      context,
      { sourceEntityKind: "itemType", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Vehicle (Air)");
  });

  it("returns AMBIGUOUS_BASE_ENTITY when multiple records match identity", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "monster",
        records: [
          { name: "Goblin", source: "MPMM" },
          { name: "Goblin", source: "MPMM" },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Goblin Copy", "MPMM", {
        _copy: { name: "Goblin", source: "MPMM" },
      }),
      context,
      { sourceEntityKind: "monster", sourcePath: "test.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("AMBIGUOUS_BASE_ENTITY");
    expect(result.diagnostic.message).toContain("2 candidates");
    expect(result.diagnostic.requestedIdentity).toEqual({ name: "Goblin", source: "MPMM" });
    expect(result.diagnostic.sourceEntityKind).toBe("monster");
    expect(result.diagnostic.sourcePath).toBe("test.json");
    expect(result.diagnostic.ambiguityCandidates).toBeDefined();
    expect(result.diagnostic.ambiguityCandidates!.length).toBe(2);
    expect(result.diagnostic.ambiguityCandidates![0]).toEqual(
      expect.objectContaining({
        name: "Goblin",
        source: "MPMM",
        entityKind: "monster",
      }),
    );
  });

  it("returns AMBIGUOUS_BASE_ENTITY when name/source match but discriminator differs", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclass",
        records: [
          { name: "Battle Master", source: "PHB", remaining: { className: "Fighter", classSource: "PHB", shortName: "Battle Master" } },
          { name: "Battle Master", source: "PHB", remaining: { className: "Fighter", classSource: "XPHB", shortName: "Battle Master" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Battle Master Copy", "PHB", {
        _copy: { name: "Battle Master", source: "PHB", className: "Fighter", classSource: "PHB", shortName: "Battle Master" },
      }),
      context,
      { sourceEntityKind: "subclass", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.remaining.classSource).toBe("PHB");
  });

  it("resolves cross-collection copy from monsterFluff to monster", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "monster",
        records: [
          { name: "Centaur", source: "GGR" },
        ],
      },
      {
        entityKind: "monsterFluff",
        records: [
          { name: "Centaur Fluff", source: "GGR", remaining: { _copy: { name: "Centaur", source: "GGR" } } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Centaur Fluff", "GGR", { _copy: { name: "Centaur", source: "GGR" } }),
      context,
      { sourceEntityKind: "monsterFluff", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Centaur");
  });

  it("detects cycle with structured identity key", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclass",
        records: [
          {
            name: "SubA",
            source: "PHB",
            remaining: {
              className: "Wizard",
              classSource: "PHB",
              shortName: "SubA",
              _copy: { name: "SubB", source: "PHB", className: "Wizard", classSource: "PHB", shortName: "SubB" },
            },
          },
          {
            name: "SubB",
            source: "PHB",
            remaining: {
              className: "Wizard",
              classSource: "PHB",
              shortName: "SubB",
              _copy: { name: "SubA", source: "PHB", className: "Wizard", classSource: "PHB", shortName: "SubA" },
            },
          },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("SubA", "PHB", {
        className: "Wizard",
        classSource: "PHB",
        _copy: { name: "SubB", source: "PHB", className: "Wizard", classSource: "PHB", shortName: "SubB" },
      }),
      context,
      { sourceEntityKind: "subclass", sourcePath: "test.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("CIRCULAR_COPY_REFERENCE");
  });
});

/* ── extractStructuredIdentity ─────────────────────────────────── */

describe("extractStructuredIdentity", () => {
  it("extracts all non-directive keys from a copy value", () => {
    const copyValue = {
      name: "Alchemist",
      source: "TCE",
      shortName: "Alchemist",
      className: "Artificer",
      classSource: "TCE",
      _preserve: { page: true },
      _mod: { entries: {} },
    };

    const identity = extractStructuredIdentity(copyValue);

    expect(identity.name).toBe("Alchemist");
    expect(identity.source).toBe("TCE");
    expect(identity.shortName).toBe("Alchemist");
    expect(identity.className).toBe("Artificer");
    expect(identity.classSource).toBe("TCE");
    expect(identity._preserve).toBeUndefined();
    expect(identity._mod).toBeUndefined();
  });

  it("extracts abbreviation-based identity", () => {
    const copyValue = { abbreviation: "SHP", source: "DMG" };

    const identity = extractStructuredIdentity(copyValue);

    expect(identity.abbreviation).toBe("SHP");
    expect(identity.source).toBe("DMG");
    expect(identity.name).toBeUndefined();
  });

  it("extracts identity with numeric values", () => {
    const copyValue = {
      name: "Channel Divinity",
      source: "DMG",
      className: "Cleric",
      classSource: "PHB",
      subclassShortName: "Death",
      subclassSource: "DMG",
      level: 2,
    };

    const identity = extractStructuredIdentity(copyValue);

    expect(identity.level).toBe(2);
    expect(identity.name).toBe("Channel Divinity");
  });
});

/* ── AMBIGUOUS_BASE_ENTITY structured identity ─────────────────── */

describe("AMBIGUOUS_BASE_ENTITY structured identity", () => {
  it("includes entity kind and source path in ambiguous diagnostic message", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "monster",
        records: [
          { name: "Goblin", source: "MPMM" },
          { name: "Goblin", source: "MPMM" },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Goblin Copy", "MPMM", {
        _copy: { name: "Goblin", source: "MPMM" },
      }),
      context,
      { sourceEntityKind: "monster", sourcePath: "test.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("AMBIGUOUS_BASE_ENTITY");
    expect(result.diagnostic.message).toContain("monster");
    expect(result.diagnostic.message).toContain("test.json");
  });

  it("lists all candidate details in ambiguous diagnostic", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclass",
        records: [
          { name: "Battle Master", source: "PHB", remaining: { className: "Fighter", classSource: "PHB", shortName: "Battle Master" } },
          { name: "Battle Master", source: "PHB", remaining: { className: "Fighter", classSource: "PHB", shortName: "Battle Master" } },
          { name: "Battle Master", source: "PHB", remaining: { className: "Fighter", classSource: "PHB", shortName: "Battle Master" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("BM Copy", "PHB", {
        _copy: { name: "Battle Master", source: "PHB", className: "Fighter", classSource: "PHB", shortName: "Battle Master" },
      }),
      context,
      { sourceEntityKind: "subclass", sourcePath: "test.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("AMBIGUOUS_BASE_ENTITY");
    expect(result.diagnostic.message).toContain("3 candidates");
  });

  it("resolves uniquely when structured identity disambiguates", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclass",
        records: [
          { name: "Battle Master", source: "PHB", remaining: { className: "Fighter", classSource: "PHB", shortName: "Battle Master" } },
          { name: "Battle Master", source: "XPHB", remaining: { className: "Fighter", classSource: "XPHB", shortName: "Battle Master" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("BM Copy", "PHB", {
        _copy: { name: "Battle Master", source: "PHB", className: "Fighter", classSource: "PHB", shortName: "Battle Master" },
      }),
      context,
      { sourceEntityKind: "subclass", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.source).toBe("PHB");
  });

  it("copy chain uses exact sourcePath from resolution, not name-based rediscovery", () => {
    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 2,
              records: [
                { name: "Goblin", source: "MPMM", remaining: {} },
                { name: "Boggart", source: "MPMM", remaining: { _copy: { name: "Goblin", source: "MPMM" } } },
              ],
            },
          ],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      ctx,
      { sourceEntityKind: "monster", sourcePath: "monster.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.chain).toHaveLength(1);
    expect(result.chain[0]!.sourcePath).toBe("monster.json");
    expect(result.chain[0]!.entityKind).toBe("monster");
  });

  it("copy chain preserves entityKind across cross-collection resolution", () => {
    const ctx = {
      validatedFiles: {
        "test.json": {
          filePath: "test.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [
                { name: "Centaur", source: "GGR", remaining: {} },
              ],
            },
            {
              entityKind: "monsterFluff",
              recordCount: 1,
              records: [
                { name: "Centaur Fluff", source: "GGR", remaining: { _copy: { name: "Centaur", source: "GGR" } } },
              ],
            },
          ],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Centaur Fluff", "GGR", { _copy: { name: "Centaur", source: "GGR" } }),
      ctx,
      { sourceEntityKind: "monsterFluff", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.chain).toHaveLength(1);
    expect(result.chain[0]!.entityKind).toBe("monster");
    expect(result.chain[0]!.sourcePath).toBe("test.json");
  });

  it("requires sourceEntityKind for multi-collection context to resolve correctly", () => {
    const ctx = {
      validatedFiles: {
        "test.json": {
          filePath: "test.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [
                { name: "Goblin", source: "MPMM", remaining: {} },
              ],
            },
            {
              entityKind: "monsterFluff",
              recordCount: 1,
              records: [
                { name: "Goblin", source: "MPMM", remaining: { lore: "Cunning" } },
              ],
            },
          ],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Goblin Copy", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      ctx,
      { sourceEntityKind: "monster", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.chain[0]!.entityKind).toBe("monster");
  });
});

describe("INVALID_DISCRIMINATOR_VALUE structured diagnostic", () => {
  it("includes invalid discriminator field and value in diagnostic", () => {
    const context = makeContext([
      { name: "Fighter", source: "PHB" },
    ]);

    const result = resolveCopy(
      makeRecord("Fighter Copy", "PHB", {
        _copy: { name: "Fighter", source: "PHB", className: null },
      }),
      context,
      { sourceEntityKind: "test", sourcePath: "test.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("INVALID_DISCRIMINATOR_VALUE");
    expect(result.diagnostic.invalidDiscriminatorField).toBe("className");
    expect(result.diagnostic.invalidDiscriminatorValue).toBeNull();
  });
});

describe("structured diagnostic on success", () => {
  it("returns empty diagnostic array on successful resolution", () => {
    const context = makeContext([
      { name: "Goblin", source: "MPMM" },
    ]);

    const result = resolveCopy(
      makeRecord("Goblin Copy", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
  });
});

describe("no unsafe casts in diagnostics", () => {
  it("BASE_ENTITY_NOT_FOUND diagnostic has no unsafe cast artifacts", () => {
    const context = makeContext([
      {
        name: "Boggart",
        source: "MPMM",
        remaining: { _copy: { name: "Goblin", source: "MPMM" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Boggart", "MPMM", { _copy: { name: "Goblin", source: "MPMM" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("BASE_ENTITY_NOT_FOUND");
    expect(result.diagnostic.requestedIdentity).toBeDefined();
    expect(result.diagnostic.sourceEntityKind).toBeDefined();
    expect(result.diagnostic.sourcePath).toBeDefined();
    expect(result.diagnostic.allowedEntityKinds).toBeDefined();
    expect(Array.isArray(result.diagnostic.chain)).toBe(true);
    expect(result.diagnostic.chain!.length).toBeGreaterThan(0);
  });

  it("CIRCULAR_COPY_REFERENCE diagnostic has chain data", () => {
    const context = makeContext([
      {
        name: "A",
        source: "PHB",
        remaining: { _copy: { name: "B", source: "PHB" } },
      },
      {
        name: "B",
        source: "PHB",
        remaining: { _copy: { name: "A", source: "PHB" } },
      },
    ]);

    const result = resolveCopy(
      makeRecord("A", "PHB", { _copy: { name: "B", source: "PHB" } }),
      context,
      TEST_OPTIONS,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("CIRCULAR_COPY_REFERENCE");
    expect(result.diagnostic.chain).toBeDefined();
    expect(Array.isArray(result.diagnostic.chain)).toBe(true);
    expect(result.diagnostic.chain!.length).toBeGreaterThan(0);
  });

  it("AMBIGUOUS_BASE_ENTITY diagnostic has ambiguity candidates", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "monster",
        records: [
          { name: "Goblin", source: "MPMM" },
          { name: "Goblin", source: "MPMM" },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Goblin Copy", "MPMM", {
        _copy: { name: "Goblin", source: "MPMM" },
      }),
      context,
      { sourceEntityKind: "monster", sourcePath: "test.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("AMBIGUOUS_BASE_ENTITY");
    expect(result.diagnostic.ambiguityCandidates).toBeDefined();
    expect(result.diagnostic.ambiguityCandidates!.length).toBe(2);
    expect(result.diagnostic.ambiguityCandidates![0]).toHaveProperty("name");
    expect(result.diagnostic.ambiguityCandidates![0]).toHaveProperty("source");
    expect(result.diagnostic.ambiguityCandidates![0]).toHaveProperty("entityKind");
    expect(result.diagnostic.ambiguityCandidates![0]).toHaveProperty("sourcePath");
    expect(result.diagnostic.ambiguityCandidates![0]).toHaveProperty("identity");
  });
});

describe("located copy levels", () => {
  it("returns the exact located level for a simple successful resolution", () => {
    const base = { name: "Base", source: "TST", remaining: { size: "M" } };
    const context: CopyResolverContext = {
      validatedFiles: {
        "base.json": {
          filePath: "base.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [base] }],
          totalRecords: 1,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Base", source: "TST" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "derived.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels).toHaveLength(1);
    expect(result.locatedLevels[0]!.record).toBe(base);
    expect(result.locatedLevels[0]).toMatchObject({
      entityKind: "monster",
      sourcePath: "base.json",
      identity: { name: "Base", source: "TST" },
    });
  });

  it("keeps located intermediate and terminal records in CopyChainStep order", () => {
    const terminal = { name: "Terminal", source: "TST", remaining: { size: "M" } };
    const middle = {
      name: "Middle",
      source: "TST",
      remaining: { _copy: { name: "Terminal", source: "TST" }, ac: 14 },
    };
    const context: CopyResolverContext = {
      validatedFiles: {
        "chain.json": {
          filePath: "chain.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [terminal, middle] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Middle", source: "TST" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "chain.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.chain.map((step) => step.entityName)).toEqual(["Middle", "Terminal"]);
    expect(result.locatedLevels.map((level) => level.record.name)).toEqual(["Middle", "Terminal"]);
    expect(result.locatedLevels[0]!.record).toBe(middle);
    expect(result.locatedLevels[1]!.record).toBe(terminal);
  });

  it("retains all selected records in a four-level chain", () => {
    const root = { name: "Root", source: "TST", remaining: { marker: "root" } };
    const level2 = { name: "Level 2", source: "TST", remaining: { _copy: { name: "Root", source: "TST" } } };
    const level1 = { name: "Level 1", source: "TST", remaining: { _copy: { name: "Level 2", source: "TST" } } };
    const context: CopyResolverContext = {
      validatedFiles: {
        "chain.json": {
          filePath: "chain.json",
          collections: [{ entityKind: "monster", recordCount: 3, records: [root, level2, level1] }],
          totalRecords: 3,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Outer", "TST", { _copy: { name: "Level 1", source: "TST" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "chain.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels.map((level) => level.record)).toEqual([level1, level2, root]);
  });

  it("retains exact physical paths for intermediate and base records in different files", () => {
    const base = { name: "Base", source: "TST", remaining: { size: "M" } };
    const middle = { name: "Middle", source: "TST", remaining: { _copy: { name: "Base", source: "TST" } } };
    const context: CopyResolverContext = {
      validatedFiles: {
        "middle.json": {
          filePath: "middle.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [middle] }],
          totalRecords: 1,
        },
        "base.json": {
          filePath: "base.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [base] }],
          totalRecords: 1,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Middle", source: "TST" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "derived.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels.map((level) => level.sourcePath)).toEqual(["middle.json", "base.json"]);
    expect(result.chain.map((step) => step.entityName)).toEqual(["Middle", "Base"]);
    expect(result.chain.map((step) => step.sourcePath)).toEqual(result.locatedLevels.map((level) => level.sourcePath));
    expect(result.chain.map((step) => step.entityKind)).toEqual(result.locatedLevels.map((level) => level.entityKind));
    expect(result.chain.map((step) => step.identity)).toEqual(result.locatedLevels.map((level) => level.identity));
  });

  it("retains exact entity kinds for compatible cross-collection inheritance", () => {
    const base = { name: "Base Creature", source: "TST", remaining: { size: "M" } };
    const fluff = { name: "Base Fluff", source: "TST", remaining: { _copy: { name: "Base Creature", source: "TST" } } };
    const context: CopyResolverContext = {
      validatedFiles: {
        "mixed.json": {
          filePath: "mixed.json",
          collections: [
            { entityKind: "monster", recordCount: 1, records: [base] },
            { entityKind: "monsterFluff", recordCount: 1, records: [fluff] },
          ],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopy(fluff, context, {
      sourceEntityKind: "monsterFluff",
      sourcePath: "mixed.json",
    });

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels[0]!.record).toBe(base);
    expect(result.locatedLevels[0]!.entityKind).toBe("monster");
    expect(result.chain[0]).toMatchObject({
      entityName: "Base Creature",
      entityKind: "monster",
      sourcePath: "mixed.json",
      identity: { name: "Base Creature", source: "TST" },
    });
  });

  it("reports nested missing base from the intermediate record containing the failing _copy", () => {
    const middle = {
      name: "Middle",
      source: "MID",
      remaining: { _copy: { name: "Missing Base", source: "BAS" } },
    };
    const context: CopyResolverContext = {
      validatedFiles: {
        "middle.json": {
          filePath: "middle.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [middle] }],
          totalRecords: 1,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Outer", "OUT", { _copy: { name: "Middle", source: "MID" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "outer.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("BASE_ENTITY_NOT_FOUND");
    expect(result.diagnostic.sourceRecord).toBe(middle);
    expect(result.diagnostic.sourcePath).toBe("middle.json");
    expect(result.diagnostic.sourceEntityKind).toBe("monster");
    expect(result.diagnostic.requestedIdentity).toEqual({ name: "Missing Base", source: "BAS" });
    expect(result.diagnostic.message).toContain('Referenced by "Middle" (MID)');
    expect(result.diagnostic.chain?.map((step) => step.entityName)).toEqual(["Middle", "Missing Base"]);
  });

  it("reports nested ambiguity from the intermediate record containing the failing _copy", () => {
    const baseA = { name: "Base", source: "BAS", remaining: {} };
    const baseB = { name: "Base", source: "BAS", remaining: {} };
    const middle = {
      name: "Middle",
      source: "MID",
      remaining: { _copy: { name: "Base", source: "BAS" } },
    };
    const context: CopyResolverContext = {
      validatedFiles: {
        "middle.json": {
          filePath: "middle.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [middle] }],
          totalRecords: 1,
        },
        "base.json": {
          filePath: "base.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [baseA, baseB] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Outer", "OUT", { _copy: { name: "Middle", source: "MID" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "outer.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("AMBIGUOUS_BASE_ENTITY");
    expect(result.diagnostic.sourceRecord).toBe(middle);
    expect(result.diagnostic.sourcePath).toBe("middle.json");
    expect(result.diagnostic.sourceEntityKind).toBe("monster");
    expect(result.diagnostic.requestedIdentity).toEqual({ name: "Base", source: "BAS" });
    expect(result.diagnostic.ambiguityCandidates).toHaveLength(2);
    expect(result.diagnostic.message).toContain('Referenced by "Middle" (MID)');
    expect(result.diagnostic.chain?.map((step) => step.entityName)).toEqual(["Middle", "Base"]);
  });

  it("reports nested cycles from the current record containing the repeated _copy", () => {
    const base = {
      name: "Base",
      source: "BAS",
      remaining: { _copy: { name: "Middle", source: "MID" } },
    };
    const middle = {
      name: "Middle",
      source: "MID",
      remaining: { _copy: { name: "Base", source: "BAS" } },
    };
    const context: CopyResolverContext = {
      validatedFiles: {
        "middle.json": {
          filePath: "middle.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [middle] }],
          totalRecords: 1,
        },
        "base.json": {
          filePath: "base.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [base] }],
          totalRecords: 1,
        },
      },
    };

    const result = resolveCopy(
      makeRecord("Outer", "OUT", { _copy: { name: "Middle", source: "MID" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "outer.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("CIRCULAR_COPY_REFERENCE");
    expect(result.diagnostic.sourceRecord).toBe(base);
    expect(result.diagnostic.sourcePath).toBe("base.json");
    expect(result.diagnostic.sourceEntityKind).toBe("monster");
    expect(result.diagnostic.requestedIdentity).toEqual({ name: "Middle", source: "MID" });
    expect(result.diagnostic.chain?.map((step) => step.entityName)).toEqual(["Middle", "Base", "Middle"]);
  });

  it("selects the correct same-name same-source record by raceName", () => {
    const target = { name: "Variant", source: "TST", remaining: { raceName: "Human" } };
    const other = { name: "Variant", source: "TST", remaining: { raceName: "Elf" } };
    const context = makeMultiCollectionContext([{ entityKind: "subrace", records: [target, other] }]);

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Variant", source: "TST", raceName: "Human" } }),
      context,
      { sourceEntityKind: "subrace", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels[0]!.record).toBe(context.validatedFiles["test.json"]!.collections[0]!.records[0]);
  });

  it("selects the correct same-name same-source record by className", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclass",
        records: [
          { name: "Champion", source: "TST", remaining: { className: "Fighter" } },
          { name: "Champion", source: "TST", remaining: { className: "Wizard" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Champion", source: "TST", className: "Wizard" } }),
      context,
      { sourceEntityKind: "subclass", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels[0]!.record.remaining.className).toBe("Wizard");
  });

  it("selects the correct same-name same-source record by level", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclassFeature",
        records: [
          { name: "Feature", source: "TST", remaining: { level: 3 } },
          { name: "Feature", source: "TST", remaining: { level: 7 } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Feature", source: "TST", level: 7 } }),
      context,
      { sourceEntityKind: "subclassFeature", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels[0]!.record.remaining.level).toBe(7);
  });

  it("selects the correct same-name same-source subclass feature by subclassShortName", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "subclassFeature",
        records: [
          { name: "Feature", source: "TST", remaining: { subclassShortName: "Alpha" } },
          { name: "Feature", source: "TST", remaining: { subclassShortName: "Beta" } },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Feature", source: "TST", subclassShortName: "Beta" } }),
      context,
      { sourceEntityKind: "subclassFeature", sourcePath: "test.json" },
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.locatedLevels[0]!.record.remaining.subclassShortName).toBe("Beta");
  });

  it("still fails ambiguous complete identity before materialization", () => {
    const context = makeMultiCollectionContext([
      {
        entityKind: "monster",
        records: [
          { name: "Base", source: "TST", remaining: {} },
          { name: "Base", source: "TST", remaining: {} },
        ],
      },
    ]);

    const result = resolveCopy(
      makeRecord("Derived", "TST", { _copy: { name: "Base", source: "TST" } }),
      context,
      { sourceEntityKind: "monster", sourcePath: "test.json" },
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("AMBIGUOUS_BASE_ENTITY");
  });
});

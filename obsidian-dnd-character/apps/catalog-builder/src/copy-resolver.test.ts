import { describe, it, expect } from "vitest";
import {
  resolveCopy,
  resolveCopyOrThrow,
  resolveCopies,
  collectCopyFailures,
  isRawCopyValue,
  isCopyResolutionSuccess,
  isCopyResolutionFailure,
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
        entityKind: "test",
        recordCount: records.length,
        records: records.map((r) => ({
          name: r.name,
          source: r.source,
          remaining: r.remaining ?? {},
        })),
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
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Goblin");
    expect(result.baseEntity.source).toBe("MPMM");
    expect(result.chain).toHaveLength(1);
    expect(result.chain[0]).toEqual({ entityName: "Goblin", sourceAbbr: "MPMM" });
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
    );

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected success");
    expect(result.baseEntity.name).toBe("Centaur");
    expect(result.baseEntity.source).toBe("GGR");
    expect(result.chain).toHaveLength(2);
    expect(result.chain[0]).toEqual({ entityName: "Centaur MOT", sourceAbbr: "MOT" });
    expect(result.chain[1]).toEqual({ entityName: "Centaur", sourceAbbr: "GGR" });
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

    const result = resolveCopy(makeRecord("Goblin", "MPMM"), context);

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
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("BASE_ENTITY_NOT_FOUND");
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
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("CIRCULAR_COPY_REFERENCE");
  });

  it("returns CIRCULAR_COPY_REFERENCE for self-reference", () => {
    const context = makeContext([
      {
        name: "Alchemist",
        source: "XPHB",
        remaining: { _copy: { name: "Alchemist", source: "XPHB" }, _preserve: true },
      },
    ]);

    const result = resolveCopy(
      makeRecord("Alchemist", "XPHB", { _copy: { name: "Alchemist", source: "XPHB" }, _preserve: true }),
      context,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("CIRCULAR_COPY_REFERENCE");
  });

  it("returns INVALID_COPY_REFERENCE for _copy with missing name", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: { source: "PHB" } }),
      context,
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

  it("returns UNPARSEABLE_COPY_REFERENCE for _copy with number value", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: 42 }),
      context,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("UNPARSEABLE_COPY_REFERENCE");
  });

  it("returns UNPARSEABLE_COPY_REFERENCE for _copy with array value", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: ["Goblin", "MPMM"] }),
      context,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("UNPARSEABLE_COPY_REFERENCE");
  });

  it("returns UNPARSEABLE_COPY_REFERENCE for _copy with null value", () => {
    const context = makeContext([]);

    const result = resolveCopy(
      makeRecord("Test", "PHB", { _copy: null }),
      context,
    );

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected failure");
    expect(result.diagnostic.code).toBe("UNPARSEABLE_COPY_REFERENCE");
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
      ),
    ).toThrow(CopyResolverError);

    try {
      resolveCopyOrThrow(
        makeRecord("Boggart", "MPMM", { _copy: { name: "Missing", source: "XXX" } }),
        context,
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
      ),
      resolveCopy(
        makeRecord("Missing", "XXX", { _copy: { name: "NoEntity", source: "XXX" } }),
        context,
      ),
      resolveCopy(makeRecord("NoCopy", "PHB"), context),
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
    );
    const failure = resolveCopy(
      makeRecord("Missing", "XXX", { _copy: { name: "NoEntity", source: "XXX" } }),
      context,
    );

    expect(isCopyResolutionSuccess(success)).toBe(true);
    expect(isCopyResolutionSuccess(failure)).toBe(false);
    expect(isCopyResolutionFailure(success)).toBe(false);
    expect(isCopyResolutionFailure(failure)).toBe(true);
  });
});

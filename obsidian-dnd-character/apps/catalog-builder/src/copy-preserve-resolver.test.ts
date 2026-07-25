import { describe, expect, it } from "vitest";
import {
  isCopyResolutionFailure,
  isCopyResolutionSuccess,
  resolveCopy,
  type CopyResolverContext,
} from "./copy-resolver";
import { resolveCopyWithMods, type CopyModRawRecord } from "./mod-copy-resolver";

function makeContext(records: CopyModRawRecord[]): CopyResolverContext {
  return {
    validatedFiles: {
      "preserve.json": {
        filePath: "preserve.json",
        collections: [
          {
            entityKind: "test",
            recordCount: records.length,
            records,
          },
        ],
        totalRecords: records.length,
      },
    },
  };
}

function makeRecord(
  name: string,
  source: string,
  remaining: Record<string, unknown>,
): CopyModRawRecord {
  return { name, source, remaining };
}

describe("_preserve copy resolution", () => {
  it("resolves representative race, background, and class preserve records without name exceptions", () => {
    const samples = [
      { name: "Boggart", source: "MPMM", marker: "race" },
      { name: "Rewarded", source: "BMT", marker: "background" },
      { name: "Alchemist", source: "XPHB", marker: "class" },
    ];

    for (const sample of samples) {
      const record = makeRecord(sample.name, sample.source, {
        _copy: { name: sample.name, source: sample.source },
        _preserve: true,
        marker: sample.marker,
      });

      const result = resolveCopy(record, makeContext([record]));

      expect(isCopyResolutionSuccess(result)).toBe(true);
      if (!isCopyResolutionSuccess(result)) throw new Error("Expected preserve resolution to succeed");
      expect(result.baseEntity).toEqual({
        name: sample.name,
        source: sample.source,
        remaining: { marker: sample.marker },
      });
    }
  });

  it("resolves a self-referential _copy with _preserve true to the record's own data", () => {
    const preserved = makeRecord("Alchemist", "XPHB", {
      _copy: { name: "Alchemist", source: "XPHB" },
      _preserve: true,
      entries: ["Preserved entry."],
      sourceRef: "kept",
    });

    const result = resolveCopy(preserved, makeContext([preserved]));

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected preserve resolution to succeed");
    expect(result.chain).toEqual([{ entityName: "Alchemist", sourceAbbr: "XPHB" }]);
    expect(result.baseEntity).toEqual({
      name: "Alchemist",
      source: "XPHB",
      remaining: {
        entries: ["Preserved entry."],
        sourceRef: "kept",
      },
    });
  });

  it("rejects malformed _preserve payloads with contextual diagnostics", () => {
    const malformed = makeRecord("Alchemist", "XPHB", {
      _copy: { name: "Alchemist", source: "XPHB" },
      _preserve: { mode: "keep" },
    });

    const result = resolveCopy(malformed, makeContext([malformed]));

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected preserve resolution to fail");
    expect(result.diagnostic).toMatchObject({
      code: "INVALID_PRESERVE_VALUE",
      severity: "error",
      sourceRecord: malformed,
      rawCopy: { mode: "keep" },
    });
    expect(result.diagnostic.message).toContain("Alchemist");
    expect(result.diagnostic.message).toContain("XPHB");
    expect(result.diagnostic.message).toContain("_preserve");
  });

  it("keeps ordinary _copy resolution behavior unchanged", () => {
    const base = makeRecord("Goblin", "MPMM", { trait: [{ name: "Nimble Escape" }] });
    const variant = makeRecord("Boggart", "MPMM", {
      _copy: { name: "Goblin", source: "MPMM" },
    });

    const result = resolveCopy(variant, makeContext([base, variant]));

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error("Expected copy resolution to succeed");
    expect(result.baseEntity).toBe(base);
    expect(result.chain).toEqual([{ entityName: "Goblin", sourceAbbr: "MPMM" }]);
  });

  it("keeps missing base diagnostics for non-preserve copies", () => {
    const variant = makeRecord("Boggart", "MPMM", {
      _copy: { name: "Missing", source: "XXX" },
    });

    const result = resolveCopy(variant, makeContext([variant]));

    expect(isCopyResolutionFailure(result)).toBe(true);
    if (!isCopyResolutionFailure(result)) throw new Error("Expected missing base failure");
    expect(result.diagnostic.code).toBe("BASE_ENTITY_NOT_FOUND");
  });

  it("applies _mod to a cloned preserve-resolved record without mutating the source record", () => {
    const preserved = makeRecord("Alchemist", "XPHB", {
      _copy: {
        name: "Alchemist",
        source: "XPHB",
        _mod: {
          trait: { mode: "appendArr", items: { name: "Experimental Elixir" } },
        },
      },
      _preserve: true,
      trait: [{ name: "Tool Proficiency" }],
    });

    const result = resolveCopyWithMods(preserved, makeContext([preserved]), {
      sourcePath: "preserve.json",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected preserve _mod resolution to succeed");
    expect(result.record).toEqual({
      name: "Alchemist",
      source: "XPHB",
      remaining: {
        trait: [{ name: "Tool Proficiency" }, { name: "Experimental Elixir" }],
      },
    });
    expect(preserved.remaining).toEqual({
      _copy: {
        name: "Alchemist",
        source: "XPHB",
        _mod: {
          trait: { mode: "appendArr", items: { name: "Experimental Elixir" } },
        },
      },
      _preserve: true,
      trait: [{ name: "Tool Proficiency" }],
    });
  });
});

import { describe, expect, it } from "vitest";
import type { CopyResolverContext } from "./copy-resolver";
import {
  createResolvedRecordDebugFixture,
  type ResolvedRecordDebugFixture,
} from "./resolved-record-debug-fixtures";

type TestRecord = {
  readonly name: string;
  readonly source: string;
  readonly remaining: Record<string, unknown>;
};

function makeContext(
  sourcePath: string,
  entityKind: string,
  records: TestRecord[],
): CopyResolverContext {
  return {
    validatedFiles: {
      [sourcePath]: {
        filePath: sourcePath,
        collections: [
          {
            entityKind,
            recordCount: records.length,
            records,
          },
        ],
        totalRecords: records.length,
      },
    },
  };
}

function fixtureOrThrow(result: ReturnType<typeof createResolvedRecordDebugFixture>): ResolvedRecordDebugFixture {
  if (!result.ok) {
    throw new Error(`Expected debug fixture, got ${result.diagnostics[0]?.code ?? "unknown"}`);
  }
  return result.fixture;
}

describe("createResolvedRecordDebugFixture", () => {
  it("emits source path, structured identity, and field inventory for direct records", () => {
    const record: TestRecord = {
      name: "Human",
      source: "PHB",
      remaining: { entries: ["Adaptable"], page: 29 },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(record, makeContext("race.json", "race", [record])),
    );

    expect(fixture.sourcePath).toBe("race.json");
    expect(fixture.identity).toEqual({ entityKind: "race", name: "Human", source: "PHB" });
    expect(fixture.inheritanceChain).toEqual([]);
    expect(fixture.resolvedFieldInventory).toEqual({
      envelope: ["name", "source"],
      remaining: ["entries", "page"],
      all: ["name", "source", "entries", "page"],
    });
    expect(fixture.resolvedRecord).toEqual(record);
  });

  it("emits ordered inheritance chain and resolved base inventory for _copy records", () => {
    const base: TestRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { entries: ["Charge"], size: "M" },
    };
    const middle: TestRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: { _copy: { name: "Centaur", source: "GGR" } },
    };
    const variant: TestRecord = {
      name: "Centaur Variant",
      source: "MOT",
      remaining: { _copy: { name: "Centaur MOT", source: "MOT" } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        variant,
        makeContext("race.json", "race", [base, middle, variant]),
      ),
    );

    expect(fixture.identity).toEqual({
      entityKind: "race",
      name: "Centaur Variant",
      source: "MOT",
    });
    expect(fixture.inheritanceChain).toEqual([
      {
        entityKind: "race",
        entityName: "Centaur MOT",
        sourceAbbr: "MOT",
        sourcePath: "race.json",
        identity: { entityKind: "race", name: "Centaur MOT", source: "MOT" },
      },
      {
        entityKind: "race",
        entityName: "Centaur",
        sourceAbbr: "GGR",
        sourcePath: "race.json",
        identity: { entityKind: "race", name: "Centaur", source: "GGR" },
      },
    ]);
    expect(fixture.resolvedRecord).toEqual({
      name: "Centaur Variant",
      source: "MOT",
      remaining: { entries: ["Charge"], size: "M" },
    });
    expect(fixture.resolvedFieldInventory.remaining).toEqual(["entries", "size"]);
  });

  it("applies _mod to a cloned resolved record and inventories the result", () => {
    const base: TestRecord = {
      name: "Base Background",
      source: "TST",
      remaining: {
        entries: [{ name: "Old Feature", entries: ["Old text."] }],
        skillProficiencies: [{ survival: true }],
      },
    };
    const variant: TestRecord = {
      name: "Variant Background",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base Background",
          source: "TST",
          _mod: {
            entries: {
              mode: "appendArr",
              items: { name: "New Feature", entries: ["New text."] },
            },
          },
        },
      },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        variant,
        makeContext("background.json", "background", [base, variant]),
      ),
    );

    expect(fixture.resolvedRecord.remaining.entries).toEqual([
      { name: "Old Feature", entries: ["Old text."] },
      { name: "New Feature", entries: ["New text."] },
    ]);
    expect(fixture.resolvedFieldInventory.remaining).toEqual([
      "entries",
      "skillProficiencies",
    ]);
    expect(base.remaining.entries).toEqual([{ name: "Old Feature", entries: ["Old text."] }]);
  });

  it("returns an actionable diagnostic instead of a fixture when source path is unknown", () => {
    const record: TestRecord = {
      name: "Detached",
      source: "TST",
      remaining: { entries: ["Not loaded"] },
    };

    const result = createResolvedRecordDebugFixture(record, {
      validatedFiles: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected missing source path diagnostic");
    expect(result.diagnostics[0]).toMatchObject({
      code: "SOURCE_PATH_NOT_FOUND",
      identity: { name: "Detached", source: "TST" },
    });
    expect(result.diagnostics[0]!.message).toContain("Could not locate source path");
  });

  it("keeps copy cycle failures diagnostic-only and includes the cycle chain", () => {
    const a: TestRecord = {
      name: "A",
      source: "TST",
      remaining: { _copy: { name: "B", source: "TST" } },
    };
    const b: TestRecord = {
      name: "B",
      source: "TST",
      remaining: { _copy: { name: "A", source: "TST" } },
    };

    const result = createResolvedRecordDebugFixture(
      a,
      makeContext("class.json", "class", [a, b]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected cycle diagnostic");
    expect(result.diagnostics[0]).toMatchObject({
      code: "COPY_RESOLUTION_FAILED",
      sourcePath: "class.json",
      identity: { name: "A", source: "TST" },
      copyDiagnostic: { code: "CIRCULAR_COPY_REFERENCE" },
    });
    expect(result.diagnostics[0]!.message).toContain("B|TST [class] -> A|TST [class] -> B|TST [class]");
  });

  it("confines raw resolved fields to cloned catalog-builder fixture payloads", () => {
    const base: TestRecord = {
      name: "Wizard",
      source: "PHB",
      remaining: {
        classFeatures: ["Spellcasting|Wizard|PHB|1"],
        entries: [{ name: "Spellcasting", entries: ["Magic."] }],
      },
    };
    const variant: TestRecord = {
      name: "Wizard Debug Copy",
      source: "TST",
      remaining: { _copy: { name: "Wizard", source: "PHB" } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        variant,
        makeContext("class.json", "class", [base, variant]),
      ),
    );
    const classFeatures = fixture.resolvedRecord.remaining.classFeatures;

    expect(classFeatures).toEqual(["Spellcasting|Wizard|PHB|1"]);
    if (!Array.isArray(classFeatures)) throw new Error("Expected class feature array");
    classFeatures.push("Mutated|Wizard|PHB|2");
    expect(base.remaining.classFeatures).toEqual(["Spellcasting|Wizard|PHB|1"]);
    expect(variant.remaining).toEqual({ _copy: { name: "Wizard", source: "PHB" } });
  });
});

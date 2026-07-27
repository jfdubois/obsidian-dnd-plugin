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
      createResolvedRecordDebugFixture(
        record,
        makeContext("race.json", "race", [record]),
        { sourcePath: "race.json", sourceEntityKind: "race" },
      ),
    );

    expect(fixture.sourcePath).toBe("race.json");
    expect(fixture.identity).toEqual({
      entityKind: "race",
      name: "Human",
      source: "PHB",
      entries: ["Adaptable"],
      page: 29,
    });
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
        { sourcePath: "race.json", sourceEntityKind: "race" },
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
        { sourcePath: "background.json", sourceEntityKind: "background" },
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
    }, {
      sourcePath: "missing.json",
      sourceEntityKind: "race",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected missing source path diagnostic");
    expect(result.diagnostics[0]).toMatchObject({
      code: "SOURCE_PATH_NOT_FOUND",
      identity: { name: "Detached", source: "TST" },
    });
    expect(result.diagnostics[0]!.message).toContain("not found in validated files");
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
      { sourcePath: "class.json", sourceEntityKind: "class" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected cycle diagnostic");
    expect(result.diagnostics[0]).toMatchObject({
      code: "COPY_RESOLUTION_FAILED",
      sourcePath: "class.json",
      sourceEntityKind: "class",
      identity: { name: "A", source: "TST" },
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
        { sourcePath: "class.json", sourceEntityKind: "class" },
      ),
    );
    const classFeatures = fixture.resolvedRecord.remaining.classFeatures;

    expect(classFeatures).toEqual(["Spellcasting|Wizard|PHB|1"]);
    if (!Array.isArray(classFeatures)) throw new Error("Expected class feature array");
    classFeatures.push("Mutated|Wizard|PHB|2");
    expect(base.remaining.classFeatures).toEqual(["Spellcasting|Wizard|PHB|1"]);
    expect(variant.remaining).toEqual({ _copy: { name: "Wizard", source: "PHB" } });
  });

  it("uses exact CopyChainStep entityKind and sourcePath in inheritance chain (not rediscovered)", () => {
    const base: TestRecord = {
      name: "Goblin",
      source: "MPMM",
      remaining: { size: "S" },
    };
    const variant: TestRecord = {
      name: "Boggart",
      source: "MPMM",
      remaining: { _copy: { name: "Goblin", source: "MPMM" } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        variant,
        makeContext("monster.json", "monster", [base, variant]),
        { sourcePath: "monster.json", sourceEntityKind: "monster" },
      ),
    );

    expect(fixture.inheritanceChain).toHaveLength(1);
    const step = fixture.inheritanceChain[0]!;
    expect(step.entityKind).toBe("monster");
    expect(step.sourcePath).toBe("monster.json");
    expect(step.entityName).toBe("Goblin");
    expect(step.sourceAbbr).toBe("MPMM");
  });

  it("preserves CopyChainStep sourcePath across multi-step chains", () => {
    const base: TestRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { size: "L" },
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
        makeContext("monster.json", "monster", [base, middle, variant]),
        { sourcePath: "monster.json", sourceEntityKind: "monster" },
      ),
    );

    expect(fixture.inheritanceChain).toHaveLength(2);
    expect(fixture.inheritanceChain[0]!.sourcePath).toBe("monster.json");
    expect(fixture.inheritanceChain[1]!.sourcePath).toBe("monster.json");
    expect(fixture.inheritanceChain[0]!.entityKind).toBe("monster");
    expect(fixture.inheritanceChain[1]!.entityKind).toBe("monster");
  });

  it("returns diagnostic with sourcePath when copy resolution fails", () => {
    const variant: TestRecord = {
      name: "Missing Base",
      source: "TST",
      remaining: { _copy: { name: "NonExistent", source: "XXX" } },
    };

    const result = createResolvedRecordDebugFixture(
      variant,
      makeContext("monster.json", "monster", [variant]),
      { sourcePath: "monster.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.diagnostics[0]).toMatchObject({
      code: "COPY_RESOLUTION_FAILED",
      sourcePath: "monster.json",
      identity: { name: "Missing Base", source: "TST" },
    });
  });

  it("accepts explicit sourcePath option and uses it as location", () => {
    const record: TestRecord = {
      name: "Human",
      source: "PHB",
      remaining: { entries: ["Adaptable"] },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        record,
        makeContext("race.json", "race", [record]),
        { sourcePath: "race.json", sourceEntityKind: "race" },
      ),
    );

    expect(fixture.sourcePath).toBe("race.json");
    expect(fixture.identity.entityKind).toBe("race");
  });

  it("identity matches exact entityKind from source location, not name-based lookup", () => {
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
        "monsterFluff.json": {
          filePath: "monsterFluff.json",
          collections: [
            {
              entityKind: "monsterFluff",
              recordCount: 1,
              records: [
                { name: "Goblin", source: "MPMM", remaining: { lore: "Cunning creature" } },
              ],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const variant: TestRecord = {
      name: "Boggart",
      source: "MPMM",
      remaining: { _copy: { name: "Goblin", source: "MPMM" } },
    };

    const result = createResolvedRecordDebugFixture(variant, ctx, { sourcePath: "monster.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.fixture.identity.entityKind).toBe("monster");
    expect(result.fixture.sourcePath).toBe("monster.json");
  });

  it("debug fixture resolved record is independent from source records", () => {
    const base: TestRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [{ name: "Original" }] },
    };
    const variant: TestRecord = {
      name: "Variant",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        variant,
        makeContext("monster.json", "monster", [base, variant]),
        { sourcePath: "monster.json", sourceEntityKind: "monster" },
      ),
    );

    const traits = fixture.resolvedRecord.remaining.trait as { name: string }[];
    if (!Array.isArray(traits)) throw new Error("Expected trait array");
    traits.push({ name: "Injected" });

    expect(base.remaining.trait).toEqual([{ name: "Original" }]);
    expect(variant.remaining).toEqual({ _copy: { name: "Base", source: "TST" } });
  });

  it("detects ambiguity when multiple records share the same structured identity", () => {
    const sharedEntries = ["Variant"];
    const a: TestRecord = {
      name: "Human",
      source: "PHB",
      remaining: { entries: sharedEntries },
    };
    const b: TestRecord = {
      name: "Human",
      source: "PHB",
      remaining: { entries: sharedEntries },
    };

    const result = createResolvedRecordDebugFixture(
      a,
      makeContext("race.json", "race", [a, b]),
      { sourcePath: "race.json", sourceEntityKind: "race" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ambiguity diagnostic");
    expect(result.diagnostics[0]).toMatchObject({
      code: "SOURCE_RECORD_AMBIGUOUS",
      sourcePath: "race.json",
      sourceEntityKind: "race",
      identity: { name: "Human", source: "PHB" },
    });
    expect(result.diagnostics[0]!.candidates).toHaveLength(2);
    expect(result.diagnostics[0]!.message).toContain("Ambiguous match");
  });

  it("distinguishes records by discriminator fields (raceName)", () => {
    const base: TestRecord = {
      name: "Custom Origin",
      source: "TST",
      remaining: { raceName: "Human", entries: ["Base"] },
    };
    const variantElf: TestRecord = {
      name: "Custom Origin",
      source: "TST",
      remaining: { raceName: "Elf", entries: ["Elf variant"] },
    };
    const user: TestRecord = {
      name: "User Origin",
      source: "TST",
      remaining: { _copy: { name: "Custom Origin", source: "TST", raceName: "Elf" } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        user,
        makeContext("origin.json", "origin", [base, variantElf, user]),
        { sourcePath: "origin.json", sourceEntityKind: "origin" },
      ),
    );

    expect(fixture.resolvedRecord.remaining.entries).toEqual(["Elf variant"]);
  });

  it("distinguishes records by discriminator fields (className and level)", () => {
    const base1: TestRecord = {
      name: "Feat Feature",
      source: "TST",
      remaining: { className: "Fighter", level: 1, entries: ["Fighter 1"] },
    };
    const base2: TestRecord = {
      name: "Feat Feature",
      source: "TST",
      remaining: { className: "Fighter", level: 2, entries: ["Fighter 2"] },
    };
    const user: TestRecord = {
      name: "User Feat",
      source: "TST",
      remaining: { _copy: { name: "Feat Feature", source: "TST", className: "Fighter", level: 2 } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        user,
        makeContext("classFeature.json", "classFeature", [base1, base2, user]),
        { sourcePath: "classFeature.json", sourceEntityKind: "classFeature" },
      ),
    );

    expect(fixture.resolvedRecord.remaining.entries).toEqual(["Fighter 2"]);
  });

  it("rejects record from wrong sourcePath even with matching name and source", () => {
    const ctx = {
      validatedFiles: {
        "race.json": {
          filePath: "race.json",
          collections: [
            {
              entityKind: "race",
              recordCount: 1,
              records: [
                { name: "Human", source: "PHB", remaining: { entries: ["Correct"] } },
              ],
            },
          ],
          totalRecords: 1,
        },
        "other.json": {
          filePath: "other.json",
          collections: [
            {
              entityKind: "race",
              recordCount: 1,
              records: [
                { name: "Human", source: "PHB", remaining: { entries: ["Wrong file"] } },
              ],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const record: TestRecord = {
      name: "Human",
      source: "PHB",
      remaining: { entries: ["Correct"] },
    };

    const result = createResolvedRecordDebugFixture(
      record,
      ctx,
      { sourcePath: "other.json", sourceEntityKind: "race" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.diagnostics[0]).toMatchObject({
      code: "SOURCE_RECORD_NOT_FOUND",
    });
  });

  it("preserves complete structured identity in terminal base for direct records", () => {
    const record: TestRecord = {
      name: "Dragonborn",
      source: "PHB",
      remaining: { raceName: "Dragonborn", entries: ["Draconic Ancestry"] },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        record,
        makeContext("race.json", "race", [record]),
        { sourcePath: "race.json", sourceEntityKind: "race" },
      ),
    );

    expect(fixture.terminalBase.identity).toMatchObject({
      source: "PHB",
    });
    expect(fixture.terminalBase.name).toBe("Dragonborn");
    expect(fixture.terminalBase.sourcePath).toBe("race.json");
  });

  it("preserves complete structured identity in chain step identities", () => {
    const base: TestRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { entries: ["Charge"] },
    };
    const variant: TestRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: { _copy: { name: "Centaur", source: "GGR" } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        variant,
        makeContext("race.json", "race", [base, variant]),
        { sourcePath: "race.json", sourceEntityKind: "race" },
      ),
    );

    expect(fixture.inheritanceChain).toHaveLength(1);
    const step = fixture.inheritanceChain[0]!;
    expect(step.identity.source).toBe("GGR");
    expect(step.identity.entityKind).toBe("race");
  });

  it("does not fall back to name+source match when structured identity differs", () => {
    const base: TestRecord = {
      name: "Feature",
      source: "TST",
      remaining: { className: "Wizard", entries: ["Wizard Feature"] },
    };
    const wrong: TestRecord = {
      name: "Feature",
      source: "TST",
      remaining: { className: "Fighter", entries: ["Fighter Feature"] },
    };
    const user: TestRecord = {
      name: "User Feature",
      source: "TST",
      remaining: { _copy: { name: "Feature", source: "TST", className: "Wizard" } },
    };

    const fixture = fixtureOrThrow(
      createResolvedRecordDebugFixture(
        user,
        makeContext("classFeature.json", "classFeature", [base, wrong, user]),
        { sourcePath: "classFeature.json", sourceEntityKind: "classFeature" },
      ),
    );

    expect(fixture.resolvedRecord.remaining.entries).toEqual(["Wizard Feature"]);
  });
});

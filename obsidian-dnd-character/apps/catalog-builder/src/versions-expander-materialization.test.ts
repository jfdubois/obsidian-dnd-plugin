import { describe, expect, it } from "vitest";
import type { RawRecord, ValidatedCollection, ValidatedFileEnvelope } from "./raw-boundary";
import { expandVersions, expandVersionsInFile } from "./versions-expander";

function envelope(
  filePath: string,
  collections: readonly ValidatedCollection[],
): ValidatedFileEnvelope {
  const clonedCollections = collections.map((collection) => ({
    entityKind: collection.entityKind,
    records: [...collection.records],
    recordCount: collection.records.length,
  }));
  return {
    filePath,
    collections: clonedCollections,
    totalRecords: clonedCollections.reduce((sum, collection) => sum + collection.recordCount, 0),
  };
}

function collection(entityKind: string, records: readonly RawRecord[]): ValidatedCollection {
  return {
    entityKind,
    records: [...records],
    recordCount: records.length,
  };
}

describe("version materialization characterization", () => {
  it("keeps direct null deleted after materialization", () => {
    const base: RawRecord = {
      name: "Troll",
      source: "MM",
      remaining: {
        senses: ["darkvision 60 ft."],
        _versions: [{ name: "Troll Whelp", source: "TST", senses: null }],
      },
    };

    const result = expandVersionsInFile(envelope("bestiary.json", [collection("monster", [base])]), "bestiary.json");

    expect(result.ok).toBe(true);
    expect(result.records[1]?.remaining).not.toHaveProperty("senses");
  });

  it("uses parent discriminator fields when selecting the version base", () => {
    const levelOne: RawRecord = {
      name: "Arcane Burst",
      source: "TST",
      remaining: {
        className: "Wizard",
        classSource: "PHB",
        level: 1,
        entries: ["level one"],
      },
    };
    const levelTwo: RawRecord = {
      name: "Arcane Burst",
      source: "TST",
      remaining: {
        className: "Wizard",
        classSource: "PHB",
        level: 2,
        entries: ["level two"],
        _versions: [{ name: "Arcane Burst Revised", source: "TST" }],
      },
    };

    const result = expandVersionsInFile(
      envelope("class-wizard.json", [collection("classFeature", [levelOne, levelTwo])]),
      "class-wizard.json",
    );

    expect(result.ok).toBe(true);
    expect(result.records[2]?.remaining.entries).toEqual(["level two"]);
  });

  it("materializes a version of a record whose original has a nested _copy", () => {
    const root: RawRecord = {
      name: "Root Spirit",
      source: "TST",
      remaining: { trait: [{ name: "Root" }], speed: 30 },
    };
    const parent: RawRecord = {
      name: "Parent Spirit",
      source: "TST",
      remaining: {
        _copy: {
          name: "Root Spirit",
          source: "TST",
          _mod: { trait: { mode: "appendArr", items: { name: "Parent" } } },
        },
        _versions: [{ name: "Version Spirit", source: "TST", speed: 40 }],
      },
    };

    const result = expandVersionsInFile(
      envelope("bestiary.json", [collection("monster", [root, parent])]),
      "bestiary.json",
    );

    expect(result.ok).toBe(true);
    expect(result.records[2]).toMatchObject({
      name: "Version Spirit",
      source: "TST",
      remaining: {
        trait: [{ name: "Root" }, { name: "Parent" }],
        speed: 40,
      },
    });
  });

  it("resolves a nested base located in another physical file through expandVersions", () => {
    const root: RawRecord = {
      name: "Remote Root",
      source: "TST",
      remaining: { entries: ["remote"] },
    };
    const parent: RawRecord = {
      name: "Remote Parent",
      source: "TST",
      remaining: {
        _copy: { name: "Remote Root", source: "TST" },
        _versions: [{ name: "Remote Version", source: "TST" }],
      },
    };

    const result = expandVersions({
      "base.json": envelope("base.json", [collection("monster", [root])]),
      "derived.json": envelope("derived.json", [collection("monster", [parent])]),
    });

    const records = result.validatedFiles["derived.json"]?.collections[0]?.records;
    expect(result.ok).toBe(true);
    expect(records?.[1]?.remaining.entries).toEqual(["remote"]);
  });

  it("does not select a same-name/source record from another collection", () => {
    const race: RawRecord = {
      name: "Shared",
      source: "TST",
      remaining: {
        entries: ["race"],
        _versions: [{ name: "Shared Version", source: "TST" }],
      },
    };
    const subrace: RawRecord = {
      name: "Shared",
      source: "TST",
      remaining: { entries: ["subrace"] },
    };

    const result = expandVersions({
      "races.json": envelope("races.json", [
        collection("race", [race]),
        collection("subrace", [subrace]),
      ]),
    });

    expect(result.ok).toBe(true);
    expect(result.validatedFiles["races.json"]?.collections[0]?.records[1]?.remaining.entries).toEqual(["race"]);
  });

  it("applies a version _preserve directive once and removes it from output", () => {
    const base: RawRecord = {
      name: "Preserved Monster",
      source: "TST",
      remaining: {
        hasToken: true,
        _versions: [
          {
            name: "Preserved Monster Variant",
            source: "TST",
            _preserve: { hasToken: true },
          },
        ],
      },
    };

    const result = expandVersionsInFile(envelope("bestiary.json", [collection("monster", [base])]), "bestiary.json");

    expect(result.ok).toBe(true);
    expect(result.records[1]?.remaining.hasToken).toBe(true);
    expect(result.records[1]?.remaining).not.toHaveProperty("_preserve");
  });
});

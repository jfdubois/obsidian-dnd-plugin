import { describe, expect, it } from "vitest";
import type { RawRecord, ValidatedCollection, ValidatedFileEnvelope } from "./raw-boundary";
import { expandVersions, expandVersionsInFile } from "./versions-expander";

function col(entityKind: string, records: readonly RawRecord[]): ValidatedCollection {
  return { entityKind, records: [...records], recordCount: records.length };
}

function env(filePath: string, collections: readonly ValidatedCollection[]): ValidatedFileEnvelope {
  return {
    filePath,
    collections: collections.map((collection) => ({
      entityKind: collection.entityKind,
      records: [...collection.records],
      recordCount: collection.records.length,
    })),
    totalRecords: collections.reduce((sum, collection) => sum + collection.recordCount, 0),
  };
}

function names(result: ReturnType<typeof expandVersions>, filePath: string, kind: string): string[] {
  return result.validatedFiles[filePath]!.collections
    .find((collection) => collection.entityKind === kind)!
    .records
    .map((record) => record.name);
}

describe("version expansion identity and materialization", () => {
  it("preserves direct false and overlays arrays and objects", () => {
    const result = expandVersionsInFile(
      env("bestiary.json", [
        col("monster", [{
          name: "Switch",
          source: "TST",
          remaining: {
            flag: true,
            action: [{ name: "Old" }],
            hp: { average: 10 },
            _versions: [{
              name: "Switch Variant",
              source: "TST",
              flag: false,
              action: [{ name: "New" }],
              hp: { average: 20 },
            }],
          },
        }]),
      ]),
      "bestiary.json",
    );

    expect(result.ok).toBe(true);
    expect(result.records[1]?.remaining).toMatchObject({
      flag: false,
      action: [{ name: "New" }],
      hp: { average: 20 },
    });
  });

  it("executes version _mod exactly once", () => {
    const result = expandVersionsInFile(
      env("bestiary.json", [
        col("monster", [{
          name: "Mod Base",
          source: "TST",
          remaining: {
            trait: [{ name: "Base" }],
            _versions: [{
              name: "Mod Version",
              source: "TST",
              _mod: { trait: { mode: "appendArr", items: { name: "Added" } } },
            }],
          },
        }]),
      ]),
      "bestiary.json",
    );

    expect(result.ok).toBe(true);
    expect(result.records[1]?.remaining.trait).toEqual([{ name: "Base" }, { name: "Added" }]);
  });

  it("uses structured identity fields to select a same-name/source base", () => {
    const low: RawRecord = {
      name: "Shared Feature",
      source: "TST",
      remaining: { className: "Wizard", classSource: "PHB", level: 1, entries: ["low"] },
    };
    const high: RawRecord = {
      name: "Shared Feature",
      source: "TST",
      remaining: {
        className: "Wizard",
        classSource: "PHB",
        level: 3,
        entries: ["high"],
        _versions: [{ name: "Shared Feature Revised", source: "TST" }],
      },
    };

    const result = expandVersions({ "class.json": env("class.json", [col("classFeature", [low, high])]) });

    expect(result.ok).toBe(true);
    expect(result.validatedFiles["class.json"]?.collections[0]?.records[2]?.remaining.entries).toEqual(["high"]);
  });

  it("uses race parent discriminators", () => {
    const hill: RawRecord = {
      name: "Legacy Trait",
      source: "TST",
      remaining: { raceName: "Dwarf", raceSource: "PHB", entries: ["dwarf"] },
    };
    const high: RawRecord = {
      name: "Legacy Trait",
      source: "TST",
      remaining: {
        raceName: "Elf",
        raceSource: "PHB",
        entries: ["elf"],
        _versions: [{ name: "Legacy Trait Variant", source: "TST" }],
      },
    };

    const result = expandVersions({ "races.json": env("races.json", [col("raceFeature", [hill, high])]) });

    expect(result.ok).toBe(true);
    expect(result.validatedFiles["races.json"]?.collections[0]?.records[2]?.remaining.entries).toEqual(["elf"]);
  });

  it("uses class, subclass, and level discriminators", () => {
    const champion: RawRecord = {
      name: "Maneuver",
      source: "TST",
      remaining: {
        className: "Fighter",
        classSource: "PHB",
        subclassShortName: "Champion",
        subclassSource: "PHB",
        level: 3,
        entries: ["champion"],
      },
    };
    const battleMaster: RawRecord = {
      name: "Maneuver",
      source: "TST",
      remaining: {
        className: "Fighter",
        classSource: "PHB",
        subclassShortName: "Battle Master",
        subclassSource: "PHB",
        level: 3,
        entries: ["battle master"],
        _versions: [{ name: "Maneuver Revised", source: "TST" }],
      },
    };

    const result = expandVersions({
      "subclass.json": env("subclass.json", [col("subclassFeature", [champion, battleMaster])]),
    });

    expect(result.ok).toBe(true);
    expect(result.validatedFiles["subclass.json"]?.collections[0]?.records[2]?.remaining.entries).toEqual(["battle master"]);
  });

  it("uses shortName, subclassName, abbreviation, and pantheon shared discriminators", () => {
    const shortBase: RawRecord = {
      name: "Order",
      source: "TST",
      remaining: { shortName: "Alpha", entries: ["alpha"] },
    };
    const shortVersioned: RawRecord = {
      name: "Order",
      source: "TST",
      remaining: {
        shortName: "Beta",
        entries: ["beta"],
        _versions: [{ name: "Order Revised", source: "TST" }],
      },
    };
    const subclassBase: RawRecord = {
      name: "Feature",
      source: "TST",
      remaining: { subclassName: "Open Hand", subclassSource: "PHB", level: 3, entries: ["open hand"] },
    };
    const subclassVersioned: RawRecord = {
      name: "Feature",
      source: "TST",
      remaining: {
        subclassName: "Shadow",
        subclassSource: "PHB",
        level: 3,
        entries: ["shadow"],
        _versions: [{ name: "Feature Revised", source: "TST" }],
      },
    };
    const deityBase: RawRecord = {
      name: "Apollo",
      source: "TST",
      remaining: { pantheon: "Greek", entries: ["greek"] },
    };
    const deityVersioned: RawRecord = {
      name: "Apollo",
      source: "TST",
      remaining: {
        pantheon: "Roman",
        entries: ["roman"],
        _versions: [{ name: "Apollo Revised", source: "TST" }],
      },
    };
    const languageBase: RawRecord = {
      name: "Common",
      source: "TST",
      remaining: { abbreviation: "C", entries: ["common"] },
    };
    const languageVersioned: RawRecord = {
      name: "Common",
      source: "TST",
      remaining: {
        abbreviation: "RC",
        entries: ["rare common"],
        _versions: [{ name: "Common Revised", source: "TST" }],
      },
    };

    const result = expandVersions({
      "mixed.json": env("mixed.json", [
        col("class", [shortBase, shortVersioned]),
        col("subclassFeature", [subclassBase, subclassVersioned]),
        col("deity", [deityBase, deityVersioned]),
        col("language", [languageBase, languageVersioned]),
      ]),
    });

    expect(result.ok).toBe(true);
    expect(result.validatedFiles["mixed.json"]?.collections[0]?.records[2]?.remaining.entries).toEqual(["beta"]);
    expect(result.validatedFiles["mixed.json"]?.collections[1]?.records[2]?.remaining.entries).toEqual(["shadow"]);
    expect(result.validatedFiles["mixed.json"]?.collections[2]?.records[2]?.remaining.entries).toEqual(["roman"]);
    expect(result.validatedFiles["mixed.json"]?.collections[3]?.records[2]?.remaining.entries).toEqual(["rare common"]);
  });

  it("automatically uses a newly shared scalar discriminator without a version allowlist change", () => {
    const oldShape: RawRecord = {
      name: "Same",
      source: "TST",
      remaining: { futureScalarDiscriminator: "old", entries: ["old"] },
    };
    const newShape: RawRecord = {
      name: "Same",
      source: "TST",
      remaining: {
        futureScalarDiscriminator: "new",
        entries: ["new"],
        _versions: [{ name: "Same Revised", source: "TST" }],
      },
    };

    const result = expandVersions({
      "future.json": env("future.json", [col("monster", [oldShape, newShape])]),
    });

    expect(result.ok).toBe(true);
    expect(result.validatedFiles["future.json"]?.collections[0]?.records[2]?.remaining.entries).toEqual(["new"]);
  });

  it("still fails ambiguous complete identities", () => {
    const first: RawRecord = {
      name: "Same",
      source: "TST",
      remaining: { entries: ["first"] },
    };
    const second: RawRecord = {
      name: "Same",
      source: "TST",
      remaining: {
        entries: ["second"],
        _versions: [{ name: "Same Revised", source: "TST" }],
      },
    };

    const result = expandVersions({
      "ambiguous.json": env("ambiguous.json", [col("monster", [first, second])]),
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "VERSION_COPY_FAILED",
      materializationCode: "AMBIGUOUS_BASE_ENTITY",
    });
  });

  it("keeps multi-collection files separated with correct counts", () => {
    const result = expandVersions({
      "mixed.json": env("mixed.json", [
        col("race", [{ name: "A", source: "TST", remaining: { _versions: [{ name: "A2", source: "TST" }] } }]),
        col("feat", [{ name: "B", source: "TST", remaining: { _versions: [{ name: "B2", source: "TST" }] } }]),
      ]),
    });

    expect(result.ok).toBe(true);
    expect(names(result, "mixed.json", "race")).toEqual(["A", "A2"]);
    expect(names(result, "mixed.json", "feat")).toEqual(["B", "B2"]);
    expect(result.validatedFiles["mixed.json"]?.totalRecords).toBe(4);
  });

  it("retains structured diagnostics for failed nested resolution", () => {
    const result = expandVersions({
      "derived.json": env("derived.json", [
        col("monster", [{
          name: "Outer",
          source: "TST",
          remaining: {
            _copy: { name: "Missing", source: "TST" },
            _versions: [{ name: "Outer Version", source: "TST" }],
          },
        }]),
      ]),
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "VERSION_COPY_FAILED",
      materializationCode: "BASE_ENTITY_NOT_FOUND",
      versionIndex: 0,
      versionName: "Outer Version",
      versionSource: "TST",
      requestedIdentity: { name: "Missing", source: "TST" },
      fieldTarget: "_copy",
    });
    expect(result.diagnostics[0]?.inheritanceChain?.length).toBeGreaterThan(0);
  });

  it("rejects malformed version objects with strict validation", () => {
    class VersionLike {
      public name = "Classy";
      public source = "TST";
    }

    const result = expandVersionsInFile(
      env("races.json", [
        col("race", [{
          name: "Strict Base",
          source: "TST",
          remaining: { _versions: [new VersionLike(), new Date(), ["bad"]] },
        }]),
      ]),
      "races.json",
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.versionIndex)).toEqual([0, 1, 2]);
    expect(result.diagnostics.every((diagnostic) => diagnostic.code === "INVALID_VERSION_RECORD")).toBe(true);
  });

  it("removes consumed directives and leaves inputs unchanged", () => {
    const base: RawRecord = {
      name: "Clean Base",
      source: "TST",
      remaining: {
        hasToken: true,
        trait: [],
        _versions: [{
          name: "Clean Version",
          source: "TST",
          _preserve: { hasToken: true },
          _mod: { trait: { mode: "appendArr", items: { name: "Added" } } },
        }],
      },
    };
    const input = { "clean.json": env("clean.json", [col("monster", [base])]) };
    const before = structuredClone(input);

    const result = expandVersions(input);

    expect(input).toEqual(before);
    expect(result.ok).toBe(true);
    expect(result.validatedFiles["clean.json"]?.collections[0]?.records[1]?.remaining).toEqual({
      hasToken: true,
      trait: [{ name: "Added" }],
    });
  });
});

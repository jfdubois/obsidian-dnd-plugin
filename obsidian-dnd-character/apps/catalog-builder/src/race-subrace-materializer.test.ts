import { beforeAll, describe, expect, it } from "vitest";
import { loadRawJsonFiles } from "./raw-loader";
import { validateRawBoundary } from "./raw-boundary";
import type { RawRecord, ValidatedCollection, ValidatedFileEnvelope } from "./raw-boundary";
import { materializeSubraceWithParent } from "./race-subrace-materializer";
import { expandVersions } from "./versions-expander";

const FIVEETOOLS_PATH = "/home/jdubois/Documents/Projects/obsidian-dnd-plugin/external/5etools-src";

function record(name: string, source: string, remaining: Record<string, unknown> = {}): RawRecord {
  return { name, source, remaining };
}

function collection(entityKind: string, records: RawRecord[], sourceRole?: ValidatedCollection["sourceRole"]): ValidatedCollection {
  return { entityKind, records, recordCount: records.length, sourceRole };
}

function envelope(filePath: string, collections: ValidatedCollection[], sourceRole?: ValidatedFileEnvelope["sourceRole"]): ValidatedFileEnvelope {
  return { filePath, collections, totalRecords: collections.reduce((sum, it) => sum + it.recordCount, 0), sourceRole };
}

function context(files: Record<string, ValidatedFileEnvelope>) {
  return { validatedFiles: files };
}

function expandSingle(parent: RawRecord, subrace: RawRecord) {
  return expandVersions({
    "races.json": envelope("races.json", [
      collection("race", [parent]),
      collection("subrace", [subrace]),
    ]),
  });
}

describe("materializeSubraceWithParent", () => {
  it("selects parent race by exact raceName/raceSource", () => {
    const parent = record("Elf", "PHB", { speed: 30 });
    const result = materializeSubraceWithParent(
      record("High", "TST", { raceName: "Elf", raceSource: "PHB" }),
      context({ "races.json": envelope("races.json", [collection("race", [parent, record("Elf", "ALT", { speed: 25 })])]) }),
      "races.json",
    );
    expect(result.ok && result.record.remaining.speed).toBe(30);
  });

  it("selects a canonical parent race in another physical file", () => {
    const result = materializeSubraceWithParent(
      record("Cavern", "TST", { raceName: "Dwarf", raceSource: "PHB" }),
      context({ "races.json": envelope("races.json", [collection("subrace", [])]), "other.json": envelope("other.json", [collection("race", [record("Dwarf", "PHB", { darkvision: 60 })])]) }),
      "races.json",
    );
    expect(result.ok && result.trace.parentRace.sourcePath).toBe("other.json");
  });

  it("ignores platform augmentation parent candidates", () => {
    const result = materializeSubraceWithParent(
      record("Aug", "TST", { raceName: "Human", raceSource: "PHB" }),
      context({ "foundry.json": envelope("foundry.json", [collection("race", [record("Human", "PHB")], "platform-augmentation")], "platform-augmentation") }),
      "races.json",
    );
    expect(!result.ok && result.diagnostics[0]!.code).toBe("PARENT_RACE_NOT_FOUND");
    expect(!result.ok && result.diagnostics[0]!.ineligibleCandidates).toHaveLength(1);
  });

  it("reports ambiguous canonical parent races", () => {
    const sub = record("High", "TST", { raceName: "Elf", raceSource: "PHB" });
    const result = materializeSubraceWithParent(sub, context({
      "a.json": envelope("a.json", [collection("race", [record("Elf", "PHB")])]),
      "b.json": envelope("b.json", [collection("race", [record("Elf", "PHB")])]),
    }), "races.json");
    expect(!result.ok && result.diagnostics[0]!.code).toBe("PARENT_RACE_AMBIGUOUS");
  });

  it("reports malformed and missing parent references", () => {
    const malformed = materializeSubraceWithParent(record("Bad", "TST"), context({}), "races.json");
    const missing = materializeSubraceWithParent(record("Lost", "TST", { raceName: "Elf", raceSource: "PHB" }), context({}), "races.json");
    expect(!malformed.ok && malformed.diagnostics[0]!.code).toBe("MALFORMED_PARENT_DISCRIMINATOR");
    expect(!missing.ok && missing.diagnostics[0]!.code).toBe("PARENT_RACE_NOT_FOUND");
  });

  it("materializes parent and subrace _copy chains before merging", () => {
    const baseRace = record("Base", "TST", { entries: [{ name: "Base Trait" }], speed: 30 });
    const copiedRace = record("Parent", "TST", { _copy: { name: "Base", source: "TST" }, darkvision: 60 });
    const baseSub = record("Template", "TST", { raceName: "Parent", raceSource: "TST", entries: [{ name: "Sub Trait" }] });
    const sub = record("Variant", "TST", { raceName: "Parent", raceSource: "TST", _copy: { name: "Template", source: "TST", raceName: "Parent", raceSource: "TST" }, toolProficiencies: [{ smith: true }] });
    const result = materializeSubraceWithParent(sub, context({ "races.json": envelope("races.json", [collection("race", [baseRace, copiedRace]), collection("subrace", [baseSub, sub])]) }), "races.json");
    expect(result.ok ? { ok: true } : result).toEqual({ ok: true });
    expect(result.ok && result.record.remaining.entries).toEqual([{ name: "Base Trait" }, { name: "Sub Trait" }]);
    expect(result.ok && result.record.remaining.darkvision).toBe(60);
    expect(result.ok && result.record.remaining.toolProficiencies).toEqual([{ smith: true }]);
  });

  it("follows upstream direct-field merge behavior", () => {
    const parent = record("Parent", "TST", {
      ability: [{ str: 2 }], entries: [{ name: "A" }], traitTags: ["base"], languageProficiencies: [{ common: true }],
      skillProficiencies: [{ perception: true }], speed: { walk: 30 }, darkvision: 60, size: ["M"], resist: ["fire"],
      additionalSpells: [{ known: { "1": ["a"] } }], age: { mature: 20 }, flag: true, nullable: "x",
    });
    const sub = record("Sub", "TST", {
      raceName: "Parent", raceSource: "TST", ability: [{ dex: 1 }], entries: [{ name: "B" }],
      traitTags: ["sub"], languageProficiencies: [{ elvish: true }], skillProficiencies: [{ stealth: true }],
      speed: { walk: 35 }, darkvision: null, size: ["S"], resist: ["cold"], additionalSpells: [{ known: { "1": ["b"] } }],
      age: null, flag: false, nullable: null,
    });
    const result = materializeSubraceWithParent(sub, context({ "races.json": envelope("races.json", [collection("race", [parent])]) }), "races.json");
    expect(result.ok && result.record.remaining).toMatchObject({
      ability: [{ str: 2, dex: 1 }], entries: [{ name: "A" }, { name: "B" }], traitTags: ["base", "sub"],
      languageProficiencies: [{ common: true }, { elvish: true }], skillProficiencies: [{ perception: true, stealth: true }],
      speed: { walk: 35 }, size: ["S"], resist: ["cold"], additionalSpells: [{ known: { "1": ["b"] } }], flag: false,
    });
    expect(result.ok && "darkvision" in result.record.remaining).toBe(false);
    expect(result.ok && "age" in result.record.remaining).toBe(false);
  });
});

describe("subrace version expansion after parent merge", () => {
  it("applies _mod once against inherited parent entries and strips directives", () => {
    const result = expandSingle(
      record("Dragon", "TST", { entries: [{ name: "Breath Weapon" }], arr: ["a"] }),
      record("Blood", "TST", { raceName: "Dragon", raceSource: "TST", _versions: [{ name: "Black", source: "TST", _mod: { entries: { mode: "replaceArr", replace: "Breath Weapon", items: { name: "Breath Weapon", entries: ["acid"] } } } }] }),
    );
    const subrace = result.validatedFiles["races.json"]!.collections.find((it) => it.entityKind === "subrace")!;
    expect(result.ok).toBe(true);
    expect(subrace.records[1]!.remaining.entries).toEqual([{ name: "Breath Weapon", entries: ["acid"] }]);
    for (const key of ["_copy", "_mod", "_preserve", "_templates", "_versions", "_abstract", "_implementations", "_variables"]) {
      expect(subrace.records[1]!.remaining[key]).toBeUndefined();
    }
  });

  it("expands abstract subrace versions once per implementation and keeps collections separate", () => {
    const result = expandSingle(
      record("Half", "TST", { entries: [{ name: "Skill Versatility" }] }),
      record("Variant", "TST", { raceName: "Half", raceSource: "TST", _versions: [{ _abstract: { name: "{{n}}", source: "TST", _mod: { entries: { mode: "replaceArr", replace: "Skill Versatility", items: { name: "{{n}} Trait" } } } }, _implementations: [{ _variables: { n: "A" } }, { _variables: { n: "B" } }] }] }),
    );
    const race = result.validatedFiles["races.json"]!.collections.find((it) => it.entityKind === "race")!;
    const subrace = result.validatedFiles["races.json"]!.collections.find((it) => it.entityKind === "subrace")!;
    expect(race.records).toHaveLength(1);
    expect(subrace.records.map((it) => it.name)).toEqual(["Half (Variant)", "A", "B"]);
    expect(result.validatedFiles["races.json"]!.totalRecords).toBe(4);
  });

  it("leaves input records unchanged", () => {
    const parent = record("P", "TST", { entries: [{ name: "A" }] });
    const sub = record("S", "TST", { raceName: "P", raceSource: "TST", _versions: [{ name: "V", source: "TST" }] });
    expandSingle(parent, sub);
    expect(parent.remaining).toEqual({ entries: [{ name: "A" }] });
    expect(sub.remaining._versions).toBeDefined();
  });
});

describe("pinned 5eTools subrace regressions", () => {
  let files: ReturnType<typeof validateRawBoundary>["validatedFiles"];
  beforeAll(() => { files = validateRawBoundary(loadRawJsonFiles(FIVEETOOLS_PATH).files).validatedFiles; });

  it("materializes Dragonborn (Draconblood; Black)|EGW with inherited Breath Weapon", () => {
    const result = expandVersions({ "races.json": files["races.json"]! });
    const subrace = result.validatedFiles["races.json"]!.collections.find((it) => it.entityKind === "subrace")!;
    const black = subrace.records.find((it) => it.name === "Dragonborn (Draconblood; Black)" && it.source === "EGW")!;
    expect(result.diagnostics.some((it) => it.recordName === "Draconblood" && it.code === "SUBRACE_VERSION_FAILURE_AFTER_MERGE")).toBe(false);
    expect(JSON.stringify(black.remaining.entries)).toContain("Breath Weapon");
  });

  it("materializes Half-Elf SCAG subrace family versions against inherited entries", () => {
    const result = expandVersions({ "races.json": files["races.json"]! });
    const subrace = result.validatedFiles["races.json"]!.collections.find((it) => it.entityKind === "subrace")!;
    const variant = subrace.records.find((it) => it.name === "Half-Elf (Variant; Aquatic Elf Descent)" && it.source === "SCAG")!;
    expect(result.diagnostics.some((it) => it.recordName === "Variant; Aquatic Elf Descent" && it.code === "SUBRACE_VERSION_FAILURE_AFTER_MERGE")).toBe(false);
    expect(JSON.stringify(variant.remaining.entries)).toContain("Skill Versatility");
  });
});

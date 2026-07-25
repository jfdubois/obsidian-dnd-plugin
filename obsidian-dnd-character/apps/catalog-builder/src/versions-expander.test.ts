import { describe, expect, it } from "vitest";
import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary";
import { expandVersions, expandVersionsInFile } from "./versions-expander";

function makeEnvelope(record: RawRecord): ValidatedFileEnvelope {
  return {
    filePath: "races.json",
    collections: [
      {
        entityKind: "race",
        records: [record],
        recordCount: 1,
      },
    ],
    totalRecords: 1,
  };
}

describe("expandVersionsInFile", () => {
  it("expands _versions into concrete records with _mod applied", () => {
    const parent: RawRecord = {
      name: "Aasimar",
      source: "MPMM",
      remaining: {
        entries: [
          { name: "Celestial Revelation", entries: ["Choose a revelation."] },
          { name: "Other Trait", entries: ["Kept."] },
        ],
        ability: [{ cha: 2 }],
        _versions: [
          {
            name: "Aasimar; Necrotic Shroud",
            source: "MPMM",
            _mod: {
              entries: {
                mode: "replaceArr",
                replace: "Celestial Revelation",
                items: {
                  name: "Celestial Revelation (Necrotic Shroud)",
                  entries: ["Frighten nearby creatures."],
                },
              },
            },
          },
          {
            name: "Aasimar; Radiant Soul",
            source: "MPMM",
            ability: [{ cha: 1, wis: 1 }],
            _mod: {
              entries: {
                mode: "appendArr",
                items: {
                  name: "Radiant Soul",
                  entries: ["Gain a flying speed."],
                },
              },
            },
          },
        ],
      },
    };

    const result = expandVersionsInFile(makeEnvelope(parent), "races.json");

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.records).toEqual([
      {
        name: "Aasimar",
        source: "MPMM",
        remaining: {
          entries: [
            { name: "Celestial Revelation", entries: ["Choose a revelation."] },
            { name: "Other Trait", entries: ["Kept."] },
          ],
          ability: [{ cha: 2 }],
        },
      },
      {
        name: "Aasimar; Necrotic Shroud",
        source: "MPMM",
        remaining: {
          entries: [
            {
              name: "Celestial Revelation (Necrotic Shroud)",
              entries: ["Frighten nearby creatures."],
            },
            { name: "Other Trait", entries: ["Kept."] },
          ],
          ability: [{ cha: 2 }],
        },
      },
      {
        name: "Aasimar; Radiant Soul",
        source: "MPMM",
        remaining: {
          entries: [
            { name: "Celestial Revelation", entries: ["Choose a revelation."] },
            { name: "Other Trait", entries: ["Kept."] },
            { name: "Radiant Soul", entries: ["Gain a flying speed."] },
          ],
          ability: [{ cha: 1, wis: 1 }],
        },
      },
    ]);
    expect(parent.remaining._versions).toBeDefined();
    expect(parent.remaining.entries).toEqual([
      { name: "Celestial Revelation", entries: ["Choose a revelation."] },
      { name: "Other Trait", entries: ["Kept."] },
    ]);
  });

  it("reports malformed _versions payloads with actionable record diagnostics", () => {
    const result = expandVersionsInFile(
      makeEnvelope({
        name: "Malformed Race",
        source: "TST",
        remaining: { _versions: { name: "Not an array", source: "TST" } },
      }),
      "races.json",
    );

    expect(result.ok).toBe(false);
    expect(result.records).toEqual([
      { name: "Malformed Race", source: "TST", remaining: {} },
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_VERSIONS_PAYLOAD",
      sourcePath: "races.json",
      entityKind: "race",
      recordName: "Malformed Race",
      recordSource: "TST",
      rawPayload: { name: "Not an array", source: "TST" },
    });
  });

  it("reports malformed version records with index and raw payload", () => {
    const result = expandVersionsInFile(
      makeEnvelope({
        name: "Base Race",
        source: "TST",
        remaining: { _versions: [{ name: "", source: "TST" }] },
      }),
      "races.json",
    );

    expect(result.ok).toBe(false);
    expect(result.records).toEqual([{ name: "Base Race", source: "TST", remaining: {} }]);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_VERSION_RECORD",
      sourcePath: "races.json",
      entityKind: "race",
      recordName: "Base Race",
      recordSource: "TST",
      versionIndex: 0,
      rawPayload: { name: "", source: "TST" },
    });
  });

  it("reports malformed version _mod diagnostics with field, mode, and raw payload", () => {
    const result = expandVersionsInFile(
      makeEnvelope({
        name: "Base Race",
        source: "TST",
        remaining: {
          entries: [{ name: "Original" }],
          _versions: [
            {
              name: "Broken Version",
              source: "TST",
              _mod: { entries: { mode: "appendArr" } },
            },
          ],
        },
      }),
      "races.json",
    );

    expect(result.ok).toBe(false);
    expect(result.records).toEqual([
      {
        name: "Base Race",
        source: "TST",
        remaining: { entries: [{ name: "Original" }] },
      },
    ]);
    expect(result.diagnostics[0]).toMatchObject({
      code: "VERSION_MOD_FAILED",
      sourcePath: "races.json",
      entityKind: "race",
      recordName: "Base Race",
      recordSource: "TST",
      versionIndex: 0,
      fieldTarget: "entries",
      mode: "appendArr",
      rawPayload: { mode: "appendArr" },
    });
  });
});

describe("expandVersions", () => {
  it("expands every validated file and updates record counts", () => {
    const result = expandVersions({
      "races.json": makeEnvelope({
        name: "Base Race",
        source: "TST",
        remaining: {
          speed: 30,
          _versions: [{ name: "Variant Race", source: "TST", speed: 35 }],
        },
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.validatedFiles["races.json"]).toEqual({
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          recordCount: 2,
          records: [
            { name: "Base Race", source: "TST", remaining: { speed: 30 } },
            { name: "Variant Race", source: "TST", remaining: { speed: 35 } },
          ],
        },
      ],
      totalRecords: 2,
    });
  });

  /* ── Collection separation tests ─────────────────────────────── */

  it("preserves collection separation: race and subrace remain distinct after expansion", () => {
    const envelope: ValidatedFileEnvelope = {
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          records: [
            {
              name: "Human",
              source: "PHB",
              remaining: {
                speed: 30,
                _versions: [{ name: "Variant Human", source: "PHB", speed: 35 }],
              },
            },
          ],
          recordCount: 1,
        },
        {
          entityKind: "subrace",
          records: [
            {
              name: "High Elf",
              source: "PHB",
              remaining: {
                speed: 30,
                _versions: [{ name: "Wood Elf", source: "PHB", speed: 35 }],
              },
            },
          ],
          recordCount: 1,
        },
      ],
      totalRecords: 2,
    };

    const result = expandVersions({ "races.json": envelope });

    expect(result.ok).toBe(true);
    const expanded = result.validatedFiles["races.json"];
    expect(expanded!.collections.length).toBe(2);

    const raceCol = expanded!.collections.find((c) => c.entityKind === "race");
    const subraceCol = expanded!.collections.find((c) => c.entityKind === "subrace");

    expect(raceCol).toBeDefined();
    expect(raceCol!.recordCount).toBe(2);
    expect(raceCol!.records.map((r) => r.name)).toEqual(["Human", "Variant Human"]);

    expect(subraceCol).toBeDefined();
    expect(subraceCol!.recordCount).toBe(2);
    expect(subraceCol!.records.map((r) => r.name)).toEqual(["High Elf", "Wood Elf"]);

    expect(expanded!.totalRecords).toBe(4);
  });

  it("versioned race records remain in race collection", () => {
    const envelope: ValidatedFileEnvelope = {
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          records: [
            {
              name: "Elf",
              source: "PHB",
              remaining: {
                _versions: [{ name: "Dark Elf", source: "PHB" }],
              },
            },
          ],
          recordCount: 1,
        },
        {
          entityKind: "subrace",
          records: [
            {
              name: "High Elf",
              source: "PHB",
              remaining: {},
            },
          ],
          recordCount: 1,
        },
      ],
      totalRecords: 2,
    };

    const result = expandVersions({ "races.json": envelope });
    const expanded = result.validatedFiles["races.json"];

    const raceCol = expanded!.collections.find((c) => c.entityKind === "race");
    expect(raceCol!.records.map((r) => r.name)).toEqual(["Elf", "Dark Elf"]);

    const subraceCol = expanded!.collections.find((c) => c.entityKind === "subrace");
    expect(subraceCol!.records.map((r) => r.name)).toEqual(["High Elf"]);
  });

  it("versioned subrace records remain in subrace collection", () => {
    const envelope: ValidatedFileEnvelope = {
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          records: [
            { name: "Dwarf", source: "PHB", remaining: {} },
          ],
          recordCount: 1,
        },
        {
          entityKind: "subrace",
          records: [
            {
              name: "Hill Dwarf",
              source: "PHB",
              remaining: {
                _versions: [{ name: "Mountain Dwarf", source: "PHB" }],
              },
            },
          ],
          recordCount: 1,
        },
      ],
      totalRecords: 2,
    };

    const result = expandVersions({ "races.json": envelope });
    const expanded = result.validatedFiles["races.json"];

    const raceCol = expanded!.collections.find((c) => c.entityKind === "race");
    expect(raceCol!.records.map((r) => r.name)).toEqual(["Dwarf"]);

    const subraceCol = expanded!.collections.find((c) => c.entityKind === "subrace");
    expect(subraceCol!.records.map((r) => r.name)).toEqual(["Hill Dwarf", "Mountain Dwarf"]);
  });

  it("class file keeps class, subclass, classFeature, and subclassFeature separate", () => {
    const envelope: ValidatedFileEnvelope = {
      filePath: "class-barbarian.json",
      collections: [
        {
          entityKind: "class",
          records: [
            {
              name: "Barbarian",
              source: "PHB",
              remaining: {
                _versions: [{ name: "Barbarian (UA)", source: "UA" }],
              },
            },
          ],
          recordCount: 1,
        },
        {
          entityKind: "subclass",
          records: [
            {
              name: "Berserker",
              source: "PHB",
              remaining: {
                _versions: [{ name: "Berserker (UA)", source: "UA" }],
              },
            },
          ],
          recordCount: 1,
        },
        {
          entityKind: "classFeature",
          records: [
            { name: "Rage", source: "PHB", remaining: {} },
          ],
          recordCount: 1,
        },
        {
          entityKind: "subclassFeature",
          records: [
            { name: "Frenzy", source: "PHB", remaining: {} },
          ],
          recordCount: 1,
        },
      ],
      totalRecords: 4,
    };

    const result = expandVersions({ "class-barbarian.json": envelope });
    const expanded = result.validatedFiles["class-barbarian.json"];

    expect(expanded!.collections.length).toBe(4);

    const classCol = expanded!.collections.find((c) => c.entityKind === "class");
    expect(classCol!.records.map((r) => r.name)).toEqual(["Barbarian", "Barbarian (UA)"]);

    const subclassCol = expanded!.collections.find((c) => c.entityKind === "subclass");
    expect(subclassCol!.records.map((r) => r.name)).toEqual(["Berserker", "Berserker (UA)"]);

    const classFeatureCol = expanded!.collections.find((c) => c.entityKind === "classFeature");
    expect(classFeatureCol!.records.map((r) => r.name)).toEqual(["Rage"]);

    const subclassFeatureCol = expanded!.collections.find((c) => c.entityKind === "subclassFeature");
    expect(subclassFeatureCol!.records.map((r) => r.name)).toEqual(["Frenzy"]);

    expect(expanded!.totalRecords).toBe(6);
  });

  it("empty collections remain empty after expansion", () => {
    const envelope: ValidatedFileEnvelope = {
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          records: [
            { name: "Human", source: "PHB", remaining: {} },
          ],
          recordCount: 1,
        },
        {
          entityKind: "subrace",
          records: [],
          recordCount: 0,
        },
      ],
      totalRecords: 1,
    };

    const result = expandVersions({ "races.json": envelope });
    const expanded = result.validatedFiles["races.json"];

    const raceCol = expanded!.collections.find((c) => c.entityKind === "race");
    expect(raceCol!.recordCount).toBe(1);

    const subraceCol = expanded!.collections.find((c) => c.entityKind === "subrace");
    expect(subraceCol!.recordCount).toBe(0);
    expect(subraceCol!.records).toEqual([]);
  });

  it("non-versioned records remain unchanged", () => {
    const originalRecord: RawRecord = {
      name: "Human",
      source: "PHB",
      remaining: { speed: 30, size: "Medium" },
    };

    const envelope: ValidatedFileEnvelope = {
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          records: [originalRecord],
          recordCount: 1,
        },
      ],
      totalRecords: 1,
    };

    const result = expandVersions({ "races.json": envelope });
    const expanded = result.validatedFiles["races.json"];

    const raceCol = expanded!.collections.find((c) => c.entityKind === "race");
    const expandedRecord = raceCol!.records[0]!;
    expect(expandedRecord.name).toBe("Human");
    expect(expandedRecord.source).toBe("PHB");
    expect(expandedRecord.remaining.speed).toBe(30);
    expect(expandedRecord.remaining.size).toBe("Medium");
  });

  it("input envelope and records remain unmodified after expansion", () => {
    const versionedRecord: RawRecord = {
      name: "Aasimar",
      source: "MPMM",
      remaining: {
        speed: 30,
        _versions: [{ name: "Necrotic Aasimar", source: "MPMM" }],
      },
    };

    const envelope: ValidatedFileEnvelope = {
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          records: [versionedRecord],
          recordCount: 1,
        },
      ],
      totalRecords: 1,
    };

    expandVersions({ "races.json": envelope });

    // Original record still has _versions
    expect(versionedRecord.remaining._versions).toBeDefined();
    expect(versionedRecord.remaining.speed).toBe(30);
    // Original envelope unchanged
    expect(envelope.totalRecords).toBe(1);
    expect(envelope.collections[0]!.recordCount).toBe(1);
    expect(envelope.collections[0]!.records.length).toBe(1);
  });

  it("recordCount and totalRecords are correct after expansion", () => {
    const envelope: ValidatedFileEnvelope = {
      filePath: "races.json",
      collections: [
        {
          entityKind: "race",
          records: [
            {
              name: "Human",
              source: "PHB",
              remaining: {
                _versions: [
                  { name: "Variant Human", source: "PHB" },
                  { name: "Custom Human", source: "UA" },
                ],
              },
            },
            { name: "Elf", source: "PHB", remaining: {} },
          ],
          recordCount: 2,
        },
        {
          entityKind: "subrace",
          records: [
            {
              name: "High Elf",
              source: "PHB",
              remaining: {
                _versions: [{ name: "Wood Elf", source: "PHB" }],
              },
            },
          ],
          recordCount: 1,
        },
      ],
      totalRecords: 3,
    };

    const result = expandVersions({ "races.json": envelope });
    const expanded = result.validatedFiles["races.json"];

    const raceCol = expanded!.collections.find((c) => c.entityKind === "race");
    expect(raceCol!.recordCount).toBe(4); // Human + 2 variants + Elf

    const subraceCol = expanded!.collections.find((c) => c.entityKind === "subrace");
    expect(subraceCol!.recordCount).toBe(2); // High Elf + Wood Elf

    expect(expanded!.totalRecords).toBe(6);
  });
});

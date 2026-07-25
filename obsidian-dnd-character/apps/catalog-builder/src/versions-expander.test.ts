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
});

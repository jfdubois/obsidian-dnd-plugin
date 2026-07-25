import { describe, expect, it } from "vitest";
import { createIngestionDiagnosticReport } from "./ingestion-diagnostic-report";
import { validateRawBoundary } from "./raw-boundary";
import type { RawLoadResult } from "./raw-loader";

function rawLoadWithParseFailure(): Pick<RawLoadResult, "diagnostics"> {
  return {
    diagnostics: [
      {
        code: "JSON_PARSE_ERROR",
        severity: "error",
        message: "Failed to parse JSON (line 2, column 8): bad token",
        path: "data/broken.json",
      },
      {
        code: "DISCOVERY_COMPLETE",
        severity: "info",
        message: "Discovered files",
        path: "data",
      },
    ],
  };
}

describe("createIngestionDiagnosticReport", () => {
  it("reports parse failures and excludes non-parse loader diagnostics", () => {
    const report = createIngestionDiagnosticReport({
      rawLoadResult: rawLoadWithParseFailure(),
      rawBoundaryResult: validateRawBoundary({}),
    });

    expect(report.parseFailures).toEqual([
      {
        code: "JSON_PARSE_ERROR",
        severity: "error",
        message: "Failed to parse JSON (line 2, column 8): bad token",
        path: "data/broken.json",
      },
    ]);
  });

  it("does not invent parse failures when the loader reports no JSON parse errors", () => {
    const report = createIngestionDiagnosticReport({
      rawLoadResult: {
        diagnostics: [
          {
            code: "DISCOVERY_COMPLETE",
            severity: "info",
            message: "Discovered files",
            path: "data",
          },
        ],
      },
      rawBoundaryResult: validateRawBoundary({}),
    });

    expect(report.parseFailures).toEqual([]);
  });

  it("reports copy resolution failures with source path, identity, and cycle details", () => {
    const boundary = validateRawBoundary({
      "class/classes-test.json": {
        class: [
          { name: "Adept", source: "TST", _copy: { name: "Mage", source: "TST" } },
          { name: "Mage", source: "TST", _copy: { name: "Adept", source: "TST" } },
        ],
      },
    });

    const report = createIngestionDiagnosticReport({ rawBoundaryResult: boundary });

    expect(report.resolutionFailures).toHaveLength(2);
    expect(report.resolutionFailures[0]).toMatchObject({
      code: "CIRCULAR_COPY_REFERENCE",
      sourcePath: "class/classes-test.json",
      entityType: "class",
      entityName: "Adept",
      entitySource: "TST",
    });
    expect(report.resolutionFailures[0]!.message).toContain(
      "Mage|TST -> Adept|TST -> Mage|TST",
    );
  });

  it("reports malformed and unknown _mod mechanics with actionable field and mode diagnostics", () => {
    const boundary = validateRawBoundary({
      "backgrounds.json": {
        background: [
          {
            name: "Base Scout",
            source: "TST",
            entries: [{ name: "Watch", entries: ["Stay alert."] }],
          },
          {
            name: "Bad Scout",
            source: "TST",
            _copy: {
              name: "Base Scout",
              source: "TST",
              _mod: {
                entries: [
                  { mode: "appendArr" },
                  { mode: "inventedMode", items: [] },
                ],
              },
            },
          },
        ],
      },
    });

    const report = createIngestionDiagnosticReport({ rawBoundaryResult: boundary });

    expect(report.resolutionFailures).toHaveLength(2);
    expect(report.resolutionFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_MOD_PAYLOAD",
          sourcePath: "backgrounds.json",
          entityType: "background",
          entityName: "Bad Scout",
          entitySource: "TST",
          fieldTarget: "entries",
          mode: "appendArr",
          rawParam: { mode: "appendArr" },
        }),
        expect.objectContaining({
          code: "UNKNOWN_MOD_MODE",
          sourcePath: "backgrounds.json",
          entityType: "background",
          entityName: "Bad Scout",
          entitySource: "TST",
          fieldTarget: "entries",
          mode: "inventedMode",
        }),
      ]),
    );
  });

  it("omits direct records and successful copy/mod records from resolution failures", () => {
    const boundary = validateRawBoundary({
      "races.json": {
        race: [
          { name: "Human", source: "PHB", entries: ["Adaptable"], speed: 30 },
          {
            name: "Swift Human",
            source: "TST",
            _copy: {
              name: "Human",
              source: "PHB",
              _mod: { speed: { mode: "setProp", prop: "*", value: 35 } },
            },
          },
        ],
      },
    });

    const report = createIngestionDiagnosticReport({ rawBoundaryResult: boundary });

    expect(report.resolutionFailures).toEqual([]);
  });

  it("inventories observed structured fields by entity type and marks future-importer claims", () => {
    const boundary = validateRawBoundary({
      "races.json": {
        race: [{ name: "Human", source: "PHB", entries: ["Adaptable"], ability: [{ any: 1 }] }],
      },
      "backgrounds.json": {
        background: [
          {
            name: "Acolyte",
            source: "PHB",
            entries: ["Shelter"],
            skillProficiencies: [{ insight: true }],
          },
        ],
      },
      "class/classes-test.json": {
        class: [
          {
            name: "Wizard",
            source: "PHB",
            entries: ["Magic"],
            classFeatures: ["Spellcasting|Wizard|PHB|1"],
          },
        ],
      },
    });

    const report = createIngestionDiagnosticReport({ rawBoundaryResult: boundary });

    expect(report.resolutionFailures).toEqual([]);
    expect(Object.keys(report.entityFieldInventory).sort()).toEqual([
      "background",
      "class",
      "race",
    ]);
    expect(report.entityFieldInventory.race?.observedFields).toEqual([
      "ability",
      "entries",
      "name",
      "source",
    ]);
    expect(report.entityFieldInventory.race?.claimedFields).toEqual(["ability"]);
    expect(report.entityFieldInventory.background?.claimedFields).toEqual([
      "skillProficiencies",
    ]);
    expect(report.entityFieldInventory.class?.claimedFields).toEqual(["classFeatures"]);
    expect(report.claimedFields).toEqual([
      "ability",
      "classFeatures",
      "skillProficiencies",
    ]);
    expect(report.entityFieldInventory.race?.narrativeFields).toEqual(["entries"]);
    expect(report.entityFieldInventory.race?.claimedFields).not.toContain("entries");
  });

  it("identifies unclaimed candidate mechanical fields without auto-classifying them as narrative", () => {
    const boundary = validateRawBoundary({
      "classes.json": {
        class: [
          {
            name: "Inventor",
            source: "TST",
            entries: ["Tools and experiments."],
            customMechanic: { recharge: 5 },
            customCounter: 3,
            designerNote: "Needs review",
          },
        ],
      },
    });

    const report = createIngestionDiagnosticReport({ rawBoundaryResult: boundary });

    expect(report.unclaimedFields.map((field) => field.field).sort()).toEqual([
      "customCounter",
      "customMechanic",
      "designerNote",
    ]);
    expect(report.unclaimedCandidateMechanicalFields).toEqual([
      expect.objectContaining({
        field: "customMechanic",
        entityType: "class",
        entityName: "Inventor",
        entitySource: "TST",
        sourcePath: "classes.json",
        valueKind: "object",
      }),
      expect.objectContaining({
        field: "customCounter",
        valueKind: "number",
      }),
    ]);
    expect(report.narrativeFields).toEqual(["entries"]);
    expect(report.entityFieldInventory.class?.narrativeFields).toEqual(["entries"]);
    expect(report.entityFieldInventory.class?.unclaimedFields).toEqual([
      "customCounter",
      "customMechanic",
      "designerNote",
    ]);
    expect(report.entityFieldInventory.class?.narrativeFields).not.toContain("customMechanic");
    expect(report.unclaimedCandidateMechanicalFields.map((field) => field.field)).not.toContain(
      "designerNote",
    );
  });
});

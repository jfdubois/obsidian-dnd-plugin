import { describe, it, expect, beforeAll } from "vitest";
import {
  validateRawBoundary,
  KNOWN_RAW_FIELDS,
  type RawBoundaryResult,
} from "./raw-boundary";
import { loadRawJsonFiles } from "./raw-loader";

const FIVEETOOLS_PATH =
  "/home/jdubois/Documents/Projects/obsidian-dnd-plugin/external/5etools-src";

/* ── KNOWN_RAW_FIELDS registry tests ───────────────────────────── */

describe("KNOWN_RAW_FIELDS registry", () => {
  it("is a ReadonlySet of strings", () => {
    expect(KNOWN_RAW_FIELDS).toBeInstanceOf(Set);
    for (const field of KNOWN_RAW_FIELDS) {
      expect(typeof field).toBe("string");
    }
  });

  it("contains envelope fields", () => {
    expect(KNOWN_RAW_FIELDS.has("name")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("source")).toBe(true);
  });

  it("contains common structural fields", () => {
    expect(KNOWN_RAW_FIELDS.has("id")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("page")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("category")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("edition")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("srd")).toBe(true);
  });

  it("contains combat and mechanical fields", () => {
    expect(KNOWN_RAW_FIELDS.has("cr")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("actions")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("immunities")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("resistances")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("vulnerabilities")).toBe(true);
  });

  it("contains spell-related fields", () => {
    expect(KNOWN_RAW_FIELDS.has("level")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("school")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("components")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("duration")).toBe(true);
  });

  it("contains proficiency fields", () => {
    expect(KNOWN_RAW_FIELDS.has("skillProficiencies")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("toolProficiencies")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("languageProficiencies")).toBe(true);
  });

  it("contains equipment fields", () => {
    expect(KNOWN_RAW_FIELDS.has("startingEquipment")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("rarity")).toBe(true);
    expect(KNOWN_RAW_FIELDS.has("attunement")).toBe(true);
  });

  it("rejects truly unknown fields", () => {
    expect(KNOWN_RAW_FIELDS.has("totallyMadeUpField")).toBe(false);
    expect(KNOWN_RAW_FIELDS.has("xyzUnknown")).toBe(false);
  });

  it("has a reasonable number of known fields", () => {
    expect(KNOWN_RAW_FIELDS.size).toBeGreaterThan(30);
  });
});

/* ── Real 5eTools data: file envelope validation ───────────────── */

describe("validateRawBoundary — real 5eTools data", () => {
  let result: RawBoundaryResult;

  beforeAll(() => {
    const loaded = loadRawJsonFiles(FIVEETOOLS_PATH);
    result = validateRawBoundary(loaded.files);
  });

  it("validates all loaded files", () => {
    expect(result.summary.totalFiles).toBeGreaterThan(0);
  });

  it("has valid files count matching validated files object", () => {
    expect(result.summary.validFiles).toBe(
      Object.keys(result.validatedFiles).length,
    );
  });

  it("total files equals valid + invalid", () => {
    expect(
      result.summary.validFiles + result.summary.invalidFiles,
    ).toBe(result.summary.totalFiles);
  });

  it("books.json is validated with entity kind 'book'", () => {
    const books = result.validatedFiles["books.json"];
    expect(books).toBeDefined();
    expect(books!.entityKind).toBe("book");
    expect(books!.recordCount).toBeGreaterThan(0);
  });

  it("feats.json is validated with entity kind 'feat'", () => {
    const feats = result.validatedFiles["feats.json"];
    expect(feats).toBeDefined();
    expect(feats!.entityKind).toBe("feat");
    expect(feats!.recordCount).toBeGreaterThan(0);
  });

  it("races.json is validated with entity kind 'race'", () => {
    const races = result.validatedFiles["races.json"];
    expect(races).toBeDefined();
    expect(races!.entityKind).toBe("race");
    expect(races!.recordCount).toBeGreaterThan(0);
  });

  it("backgrounds.json is validated with entity kind 'background'", () => {
    const backgrounds = result.validatedFiles["backgrounds.json"];
    expect(backgrounds).toBeDefined();
    expect(backgrounds!.entityKind).toBe("background");
    expect(backgrounds!.recordCount).toBeGreaterThan(0);
  });

  it("actions.json is validated with entity kind 'action'", () => {
    const actions = result.validatedFiles["actions.json"];
    expect(actions).toBeDefined();
    expect(actions!.entityKind).toBe("action");
    expect(actions!.recordCount).toBeGreaterThan(0);
  });

  it("deities.json is validated with entity kind 'deity'", () => {
    const deities = result.validatedFiles["deities.json"];
    expect(deities).toBeDefined();
    expect(deities!.entityKind).toBe("deity");
    expect(deities!.recordCount).toBeGreaterThan(0);
  });

  it("languages.json is validated with entity kind 'language'", () => {
    const languages = result.validatedFiles["languages.json"];
    expect(languages).toBeDefined();
    expect(languages!.entityKind).toBe("language");
    expect(languages!.recordCount).toBeGreaterThan(0);
  });

  it("skills.json is validated", () => {
    const skills = result.validatedFiles["skills.json"];
    expect(skills).toBeDefined();
    expect(skills!.entityKind).toBe("skill");
  });

  it("senses.json is validated", () => {
    const senses = result.validatedFiles["senses.json"];
    expect(senses).toBeDefined();
    expect(senses!.entityKind).toBe("sense");
  });

  it("spells in nested directory are validated", () => {
    const spellFiles = Object.keys(result.validatedFiles).filter((k) =>
      k.startsWith("spells/spells-"),
    );
    expect(spellFiles.length).toBeGreaterThan(0);
    for (const file of spellFiles) {
      expect(result.validatedFiles[file]!.entityKind).toBe("spell");
    }
  });

  it("class files in nested directory are validated", () => {
    const classFiles = Object.keys(result.validatedFiles).filter((k) =>
      k.startsWith("class/class-"),
    );
    expect(classFiles.length).toBeGreaterThan(0);
    for (const file of classFiles) {
      expect(result.validatedFiles[file]!.entityKind).toBe("class");
    }
  });

  it("each record has name and source", () => {
    for (const [, envelope] of Object.entries(result.validatedFiles)) {
      for (const record of envelope.records) {
        expect(record.name).toBeDefined();
        expect(typeof record.name).toBe("string");
        expect(record.name.length).toBeGreaterThan(0);
        expect(record.source).toBeDefined();
        expect(typeof record.source).toBe("string");
        expect(record.source.length).toBeGreaterThan(0);
      }
    }
  });

  it("field inventory has envelope fields", () => {
    expect(result.fieldInventory.envelope).toContain("name");
    expect(result.fieldInventory.envelope).toContain("source");
  });

  it("field inventory has narrative fields", () => {
    expect(result.fieldInventory.narrative).toContain("entries");
  });

  it("field inventory has known-raw fields", () => {
    expect(result.fieldInventory.knownRaw.length).toBeGreaterThan(0);
    expect(result.fieldInventory.knownRaw).toContain("page");
  });

  it("VALID_FILE diagnostics are info severity", () => {
    const validDiags = result.diagnostics.filter(
      (d) => d.code === "VALID_FILE",
    );
    for (const diag of validDiags) {
      expect(diag.severity).toBe("info");
    }
  });

  it("total records count matches sum of record counts", () => {
    let sum = 0;
    for (const envelope of Object.values(result.validatedFiles)) {
      sum += envelope.recordCount;
    }
    expect(result.summary.totalRecords).toBe(sum);
  });
});

/* ── Record envelope validation ────────────────────────────────── */

describe("validateRawBoundary — record envelope validation", () => {
  it("accepts record with name and source", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { name: "Tough", source: "PHB", page: 170 },
        ],
      },
    });

    expect(result.summary.validFiles).toBe(1);
    expect(result.summary.invalidFiles).toBe(0);
    expect(result.validatedFiles["test.json"]!.recordCount).toBe(1);
    expect(result.validatedFiles["test.json"]!.records[0]!.name).toBe("Tough");
    expect(result.validatedFiles["test.json"]!.records[0]!.source).toBe("PHB");
  });

  it("rejects record with missing name", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { source: "PHB", page: 170 },
        ],
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
    const errorDiag = result.diagnostics.find(
      (d) => d.code === "INVALID_RECORD_ENVELOPE",
    );
    expect(errorDiag).toBeDefined();
    expect(errorDiag!.message).toContain("name");
  });

  it("rejects record with empty name", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { name: "", source: "PHB" },
        ],
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
    const errorDiag = result.diagnostics.find(
      (d) => d.code === "INVALID_RECORD_ENVELOPE",
    );
    expect(errorDiag).toBeDefined();
    expect(errorDiag!.message).toContain("name");
  });

  it("rejects record with missing source", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { name: "Tough", page: 170 },
        ],
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
    const errorDiag = result.diagnostics.find(
      (d) => d.code === "INVALID_RECORD_ENVELOPE",
    );
    expect(errorDiag).toBeDefined();
    expect(errorDiag!.message).toContain("source");
  });

  it("rejects record with empty source", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { name: "Tough", source: "" },
        ],
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
    const errorDiag = result.diagnostics.find(
      (d) => d.code === "INVALID_RECORD_ENVELOPE",
    );
    expect(errorDiag).toBeDefined();
    expect(errorDiag!.message).toContain("source");
  });

  it("rejects record with non-string name", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { name: 123, source: "PHB" },
        ],
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
  });

  it("rejects record with non-string source", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { name: "Tough", source: null },
        ],
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
  });

  it("rejects non-object record in array", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          "just a string",
          42,
          null,
        ],
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
    const nonObjectDiags = result.diagnostics.filter(
      (d) => d.code === "NON_OBJECT_RECORD",
    );
    expect(nonObjectDiags.length).toBe(3);
  });

  it("partially valid: keeps valid records, reports invalid ones", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          { name: "Valid Feat", source: "PHB" },
          { name: "", source: "PHB" },
          { name: "Another Valid", source: "XGE" },
        ],
      },
    });

    expect(result.summary.validFiles).toBe(1);
    expect(result.validatedFiles["test.json"]!.recordCount).toBe(2);
    expect(result.validatedFiles["test.json"]!.records[0]!.name).toBe(
      "Valid Feat",
    );
    expect(result.validatedFiles["test.json"]!.records[1]!.name).toBe(
      "Another Valid",
    );

    const errorDiags = result.diagnostics.filter(
      (d) => d.code === "INVALID_RECORD_ENVELOPE",
    );
    expect(errorDiags.length).toBe(1);
  });
});

/* ── File envelope validation ──────────────────────────────────── */

describe("validateRawBoundary — file envelope validation", () => {
  it("accepts valid single-key array envelope", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB" }],
      },
    });

    expect(result.summary.invalidFiles).toBe(0);
    expect(result.validatedFiles["test.json"]!.entityKind).toBe("feat");
  });

  it("accepts envelope with _meta and entity key", () => {
    const result = validateRawBoundary({
      "test.json": {
        _meta: { internalCopies: ["feat"] },
        feat: [{ name: "Tough", source: "PHB" }],
      },
    });

    expect(result.summary.invalidFiles).toBe(0);
    expect(result.validatedFiles["test.json"]!.entityKind).toBe("feat");
  });

  it("rejects non-object top level", () => {
    const result = validateRawBoundary({
      "array.json": [{ name: "Tough", source: "PHB" }],
    });

    expect(result.summary.invalidFiles).toBe(1);
    const errorDiag = result.diagnostics.find(
      (d) => d.code === "INVALID_FILE_ENVELOPE",
    );
    expect(errorDiag).toBeDefined();
  });

  it("rejects null top level", () => {
    const result = validateRawBoundary({
      "null.json": null,
    });

    expect(result.summary.invalidFiles).toBe(1);
  });

  it("rejects empty object (no array key)", () => {
    const result = validateRawBoundary({
      "empty.json": {},
    });

    expect(result.summary.invalidFiles).toBe(1);
    const errorDiag = result.diagnostics.find(
      (d) => d.code === "INVALID_FILE_ENVELOPE",
    );
    expect(errorDiag).toBeDefined();
    expect(errorDiag!.message).toContain("No array-valued key");
  });

  it("rejects object with only non-array values", () => {
    const result = validateRawBoundary({
      "noarray.json": {
        name: "Tough",
        source: "PHB",
      },
    });

    expect(result.summary.invalidFiles).toBe(1);
  });

  it("accepts multiple array-valued keys, uses first as primary", () => {
    const result = validateRawBoundary({
      "multi.json": {
        feat: [{ name: "A", source: "PHB" }],
        race: [{ name: "Human", source: "PHB" }],
      },
    });

    expect(result.summary.validFiles).toBe(1);
    expect(result.summary.invalidFiles).toBe(0);
    // First array key becomes the primary entity kind
    expect(result.validatedFiles["multi.json"]!.entityKind).toBe("feat");
    expect(result.validatedFiles["multi.json"]!.recordCount).toBe(1);
  });

  it("uses _meta.internalCopies to determine primary entity kind", () => {
    const result = validateRawBoundary({
      "races.json": {
        _meta: { internalCopies: ["race", "subrace"] },
        race: [{ name: "Human", source: "PHB" }],
        subrace: [{ name: "Mountain Dwarf", source: "PHB" }],
      },
    });

    expect(result.summary.validFiles).toBe(1);
    expect(result.validatedFiles["races.json"]!.entityKind).toBe("race");
    expect(result.validatedFiles["races.json"]!.recordCount).toBe(1);
  });

  it("accepts empty records array with warning", () => {
    const result = validateRawBoundary({
      "empty-records.json": {
        feat: [],
      },
    });

    expect(result.summary.validFiles).toBe(1);
    expect(result.validatedFiles["empty-records.json"]!.recordCount).toBe(0);
    const warningDiag = result.diagnostics.find(
      (d) => d.code === "EMPTY_RECORDS_ARRAY",
    );
    expect(warningDiag).toBeDefined();
    expect(warningDiag!.severity).toBe("warning");
  });
});

/* ── Field classification tests ────────────────────────────────── */

describe("validateRawBoundary — field classification", () => {
  it("classifies name and source as envelope", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB" }],
      },
    });

    expect(result.fieldInventory.envelope).toContain("name");
    expect(result.fieldInventory.envelope).toContain("source");
  });

  it("classifies entries as narrative", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", entries: ["Some text"] }],
      },
    });

    expect(result.fieldInventory.narrative).toContain("entries");
  });

  it("classifies known raw fields as known-raw", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", page: 170, category: "G" }],
      },
    });

    expect(result.fieldInventory.knownRaw).toContain("page");
    expect(result.fieldInventory.knownRaw).toContain("category");
  });

  it("classifies unknown fields as unclaimed", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", unknownCustomField: true }],
      },
    });

    expect(result.fieldInventory.unclaimed).toContain("unknownCustomField");
  });

  it("emits UNCLAIMED_FIELD diagnostic for unknown fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", unknownCustomField: true }],
      },
    });

    const unclaimedDiag = result.unclaimedDiagnostics.find(
      (d) => d.field === "unknownCustomField",
    );
    expect(unclaimedDiag).toBeDefined();
    expect(unclaimedDiag!.code).toBe("UNCLAIMED_FIELD");
    expect(unclaimedDiag!.severity).toBe("warning");
    expect(unclaimedDiag!.entityKind).toBe("feat");
    expect(unclaimedDiag!.recordName).toBe("Tough");
    expect(unclaimedDiag!.recordIndex).toBe(0);
  });

  it("does not emit unclaimed diagnostic for known fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", page: 170, srd: true }],
      },
    });

    const pageUnclaimed = result.unclaimedDiagnostics.find(
      (d) => d.field === "page",
    );
    expect(pageUnclaimed).toBeUndefined();

    const srdUnclaimed = result.unclaimedDiagnostics.find(
      (d) => d.field === "srd",
    );
    expect(srdUnclaimed).toBeUndefined();
  });

  it("does not emit unclaimed diagnostic for envelope fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB" }],
      },
    });

    const nameUnclaimed = result.unclaimedDiagnostics.find(
      (d) => d.field === "name",
    );
    expect(nameUnclaimed).toBeUndefined();

    const sourceUnclaimed = result.unclaimedDiagnostics.find(
      (d) => d.field === "source",
    );
    expect(sourceUnclaimed).toBeUndefined();
  });

  it("does not emit unclaimed diagnostic for narrative fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", entries: ["text"] }],
      },
    });

    const entriesUnclaimed = result.unclaimedDiagnostics.find(
      (d) => d.field === "entries",
    );
    expect(entriesUnclaimed).toBeUndefined();
  });
});

/* ── Remaining raw data ────────────────────────────────────────── */

describe("validateRawBoundary — remaining raw data", () => {
  it("stores non-envelope fields in remaining", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", page: 170, category: "G" }],
      },
    });

    const record = result.validatedFiles["test.json"]!.records[0]!;
    expect(record.name).toBe("Tough");
    expect(record.source).toBe("PHB");
    expect(record.remaining.page).toBe(170);
    expect(record.remaining.category).toBe("G");
  });

  it("excludes name and source from remaining", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", page: 170 }],
      },
    });

    const record = result.validatedFiles["test.json"]!.records[0]!;
    expect(record.remaining.name).toBeUndefined();
    expect(record.remaining.source).toBeUndefined();
  });
});

/* ── Per-file error isolation ──────────────────────────────────── */

describe("validateRawBoundary — per-file error isolation", () => {
  it("one invalid file does not prevent validating others", () => {
    const result = validateRawBoundary({
      "valid.json": {
        feat: [{ name: "Tough", source: "PHB" }],
      },
      "invalid.json": {},
      "also-valid.json": {
        race: [{ name: "Elf", source: "PHB" }],
      },
    });

    expect(result.summary.validFiles).toBe(2);
    expect(result.summary.invalidFiles).toBe(1);
    expect(result.validatedFiles["valid.json"]).toBeDefined();
    expect(result.validatedFiles["also-valid.json"]).toBeDefined();
    expect(result.validatedFiles["invalid.json"]).toBeUndefined();
  });

  it("handles multiple file types simultaneously", () => {
    const result = validateRawBoundary({
      "feats.json": {
        feat: [{ name: "Tough", source: "PHB" }],
      },
      "races.json": {
        _meta: { internalCopies: ["race"] },
        race: [{ name: "Human", source: "PHB" }],
      },
      "spells.json": {
        spell: [{ name: "Firebolt", source: "PHB" }],
      },
    });

    expect(result.summary.validFiles).toBe(3);
    expect(result.validatedFiles["feats.json"]!.entityKind).toBe("feat");
    expect(result.validatedFiles["races.json"]!.entityKind).toBe("race");
    expect(result.validatedFiles["spells.json"]!.entityKind).toBe("spell");
  });
});

/* ── Edge cases ────────────────────────────────────────────────── */

describe("validateRawBoundary — edge cases", () => {
  it("handles empty files object", () => {
    const result = validateRawBoundary({});

    expect(result.summary.totalFiles).toBe(0);
    expect(result.summary.validFiles).toBe(0);
    expect(result.summary.invalidFiles).toBe(0);
    expect(result.summary.totalRecords).toBe(0);
    expect(Object.keys(result.validatedFiles).length).toBe(0);
  });

  it("handles deeply nested structures in remaining", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          {
            name: "Complex Feat",
            source: "PHB",
            entries: [
              "Some text",
              {
                type: "entries",
                name: "Feature",
                entries: ["Nested text"],
              },
            ],
            prerequisite: [{ campaign: ["Eberron"] }],
          },
        ],
      },
    });

    const record = result.validatedFiles["test.json"]!.records[0]!;
    expect(record.remaining.entries).toBeDefined();
    expect(Array.isArray(record.remaining.entries)).toBe(true);
    expect(record.remaining.prerequisite).toBeDefined();
  });

  it("handles record with only envelope fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Minimal", source: "PHB" }],
      },
    });

    const record = result.validatedFiles["test.json"]!.records[0]!;
    expect(Object.keys(record.remaining).length).toBe(0);
  });

  it("handles record with special characters in name", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Feat: Special Characters", source: "PHB" }],
      },
    });

    expect(result.summary.validFiles).toBe(1);
    const record = result.validatedFiles["test.json"]!.records[0]!;
    expect(record.name).toBe("Feat: Special Characters");
  });

  it("handles large number of records", () => {
    const records = Array.from({ length: 500 }, (_, i) => ({
      name: `Feat ${i}`,
      source: "PHB",
      page: i + 1,
    }));

    const result = validateRawBoundary({
      "large.json": { feat: records },
    });

    expect(result.summary.validFiles).toBe(1);
    expect(result.validatedFiles["large.json"]!.recordCount).toBe(500);
  });

  it("handles file with _meta and additional metadata keys", () => {
    const result = validateRawBoundary({
      "test.json": {
        _meta: { internalCopies: ["feat"] },
        _version: "1.0",
        feat: [{ name: "Tough", source: "PHB" }],
      },
    });

    expect(result.summary.validFiles).toBe(1);
    expect(result.validatedFiles["test.json"]!.entityKind).toBe("feat");
  });

  it("unclaimed diagnostics include correct path", () => {
    const result = validateRawBoundary({
      "nested/dir/file.json": {
        feat: [{ name: "Tough", source: "PHB", unknownField: true }],
      },
    });

    const unclaimedDiag = result.unclaimedDiagnostics[0];
    expect(unclaimedDiag).toBeDefined();
    expect(unclaimedDiag!.path).toBe("nested/dir/file.json");
  });
});

/* ── Result structure tests ────────────────────────────────────── */

describe("RawBoundaryResult structure", () => {
  it("result has all required top-level fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB" }],
      },
    });

    expect(result).toHaveProperty("validatedFiles");
    expect(result).toHaveProperty("diagnostics");
    expect(result).toHaveProperty("unclaimedDiagnostics");
    expect(result).toHaveProperty("fieldInventory");
    expect(result).toHaveProperty("summary");
  });

  it("summary has all required fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB" }],
      },
    });

    expect(result.summary).toHaveProperty("totalFiles");
    expect(result.summary).toHaveProperty("validFiles");
    expect(result.summary).toHaveProperty("invalidFiles");
    expect(result.summary).toHaveProperty("totalRecords");
    expect(result.summary).toHaveProperty("unclaimedFieldsCount");
  });

  it("fieldInventory has all classification categories", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [
          {
            name: "Tough",
            source: "PHB",
            page: 170,
            entries: ["text"],
            unknownX: 1,
          },
        ],
      },
    });

    expect(result.fieldInventory).toHaveProperty("envelope");
    expect(result.fieldInventory).toHaveProperty("knownRaw");
    expect(result.fieldInventory).toHaveProperty("unclaimed");
    expect(result.fieldInventory).toHaveProperty("narrative");

    expect(Array.isArray(result.fieldInventory.envelope)).toBe(true);
    expect(Array.isArray(result.fieldInventory.knownRaw)).toBe(true);
    expect(Array.isArray(result.fieldInventory.unclaimed)).toBe(true);
    expect(Array.isArray(result.fieldInventory.narrative)).toBe(true);
  });

  it("diagnostics have required fields", () => {
    const result = validateRawBoundary({
      "broken.json": {},
    });

    const errorDiag = result.diagnostics.find((d) => d.severity === "error");
    expect(errorDiag).toBeDefined();
    expect(errorDiag!.code).toBeDefined();
    expect(typeof errorDiag!.code).toBe("string");
    expect(errorDiag!.severity).toBe("error");
    expect(errorDiag!.message).toBeDefined();
    expect(typeof errorDiag!.message).toBe("string");
    expect(errorDiag!.path).toBeDefined();
    expect(typeof errorDiag!.path).toBe("string");
  });

  it("unclaimed diagnostics have extended fields", () => {
    const result = validateRawBoundary({
      "test.json": {
        feat: [{ name: "Tough", source: "PHB", unknownField: true }],
      },
    });

    const unclaimedDiag = result.unclaimedDiagnostics[0];
    expect(unclaimedDiag).toBeDefined();
    expect(unclaimedDiag!.code).toBe("UNCLAIMED_FIELD");
    expect(unclaimedDiag!.severity).toBe("warning");
    expect(unclaimedDiag!.field).toBe("unknownField");
    expect(unclaimedDiag!.entityKind).toBe("feat");
    expect(unclaimedDiag!.recordName).toBe("Tough");
    expect(unclaimedDiag!.recordIndex).toBe(0);
  });
});

/* ── Integration: end-to-end with real data ────────────────────── */

describe("validateRawBoundary — integration with real data", () => {
  it("full pipeline: load then validate", () => {
    const loaded = loadRawJsonFiles(FIVEETOOLS_PATH);
    expect(loaded.summary.successfullyParsed).toBeGreaterThan(0);

    const result = validateRawBoundary(loaded.files);
    expect(result.summary.totalFiles).toBe(loaded.summary.successfullyParsed);
    expect(result.summary.validFiles).toBeGreaterThan(0);
  });

  it("real data: core files have no envelope errors", () => {
    const loaded = loadRawJsonFiles(FIVEETOOLS_PATH);
    const result = validateRawBoundary(loaded.files);

    const envelopeErrors = result.diagnostics.filter(
      (d) => d.code === "INVALID_FILE_ENVELOPE",
    );

    const standardFiles = [
      "books.json",
      "feats.json",
      "races.json",
      "backgrounds.json",
      "actions.json",
      "deities.json",
      "languages.json",
      "skills.json",
    ];

    for (const file of standardFiles) {
      if (loaded.files[file] !== undefined) {
        const fileHasError = envelopeErrors.some((d) => d.path === file);
        expect(fileHasError).toBe(false);
      }
    }
  });

  it("real data: core files have no record envelope errors", () => {
    const loaded = loadRawJsonFiles(FIVEETOOLS_PATH);
    const result = validateRawBoundary(loaded.files);

    const recordErrors = result.diagnostics.filter(
      (d) => d.code === "INVALID_RECORD_ENVELOPE",
    );

    const coreFiles = [
      "books.json",
      "feats.json",
      "races.json",
      "backgrounds.json",
    ];

    for (const file of coreFiles) {
      if (loaded.files[file] !== undefined) {
        const fileHasError = recordErrors.some((d) => d.path === file);
        expect(fileHasError).toBe(false);
      }
    }
  });

  it("real feat records have expected fields in remaining", () => {
    const loaded = loadRawJsonFiles(FIVEETOOLS_PATH);
    const result = validateRawBoundary(loaded.files);

    const feats = result.validatedFiles["feats.json"];
    expect(feats).toBeDefined();
    expect(feats!.records.length).toBeGreaterThan(0);

    const firstFeat = feats!.records[0]!;
    expect(firstFeat.name).toBeDefined();
    expect(firstFeat.source).toBeDefined();
    expect(firstFeat.remaining.entries).toBeDefined();
  });
});


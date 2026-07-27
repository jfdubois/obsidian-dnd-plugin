import { describe, expect, it } from "vitest";
import type { RawRecord, ValidatedCollection, ValidatedFileEnvelope } from "./raw-boundary";
import { expandAbstractVersionEntry } from "./version-abstract-expander";
import { expandVersions, expandVersionsInFile } from "./versions-expander";

function collection(entityKind: string, records: readonly RawRecord[]): ValidatedCollection {
  return { entityKind, records: [...records], recordCount: records.length };
}

function envelope(filePath: string, collections: readonly ValidatedCollection[]): ValidatedFileEnvelope {
  return {
    filePath,
    collections: collections.map((item) => ({ ...item, records: [...item.records] })),
    totalRecords: collections.reduce((sum, item) => sum + item.recordCount, 0),
  };
}

function context() {
  return {
    sourcePath: "races.json",
    entityKind: "race",
    recordName: "Dragonborn",
    recordSource: "XPHB",
    versionIndex: 0,
  };
}

describe("expandAbstractVersionEntry", () => {
  it("returns a basic version unchanged as one concrete entry", () => {
    const version = { name: "Variant Human", source: "PHB", speed: 35 };

    const result = expandAbstractVersionEntry(version, context());

    expect(result.ok).toBe(true);
    expect(result.versions).toEqual([version]);
    expect(result.versions[0]).not.toBe(version);
  });

  it("expands one concrete entry per implementation and overlays implementation fields", () => {
    const bundle = {
      _abstract: {
        name: "Dragonborn ({{color}})",
        source: "XPHB",
        speed: 30,
        entries: ["Deal {{damageType}} damage."],
        nested: { text: "Nested {{color}}" },
        _mod: { entries: { mode: "appendArr", items: "Tail {{color}}" } },
        _preserve: { note: "{{color}}" },
        _templates: [{ name: "Template {{color}}" }],
      },
      _implementations: [
        { _variables: { color: "Black", damageType: "Acid" }, speed: 35 },
        { _variables: { color: "Blue", damageType: "Lightning" }, resist: ["lightning"] },
      ],
    };

    const result = expandAbstractVersionEntry(bundle, context());

    expect(result.ok).toBe(true);
    expect(result.versions).toEqual([
      {
        name: "Dragonborn (Black)",
        source: "XPHB",
        speed: 35,
        entries: ["Deal Acid damage."],
        nested: { text: "Nested Black" },
        _mod: { entries: { mode: "appendArr", items: "Tail Black" } },
        _preserve: { note: "Black" },
        _templates: [{ name: "Template Black" }],
      },
      {
        name: "Dragonborn (Blue)",
        source: "XPHB",
        speed: 30,
        entries: ["Deal Lightning damage."],
        nested: { text: "Nested Blue" },
        _mod: { entries: { mode: "appendArr", items: "Tail Blue" } },
        _preserve: { note: "Blue" },
        _templates: [{ name: "Template Blue" }],
        resist: ["lightning"],
      },
    ]);
    for (const version of result.versions) {
      expect(version).not.toHaveProperty("_abstract");
      expect(version).not.toHaveProperty("_implementations");
      expect(version).not.toHaveProperty("_variables");
      expect(version).toHaveProperty("name");
      expect(version).toHaveProperty("source");
    }
  });

  it("uses string-array variable values with upstream string coercion", () => {
    const result = expandAbstractVersionEntry({
      _abstract: { name: "Dragonborn ({{resist}})", source: "XPHB" },
      _implementations: [{ _variables: { resist: ["acid"] } }],
    }, context());

    expect(result.ok).toBe(true);
    expect(result.versions[0]).toMatchObject({ name: "Dragonborn (acid)" });
  });

  it("returns structured diagnostics for malformed bundles and implementations", () => {
    const malformedBundle = expandAbstractVersionEntry({
      _abstract: [],
      _implementations: [],
    }, context());
    const malformedImplementation = expandAbstractVersionEntry({
      _abstract: { name: "Variant", source: "TST" },
      _implementations: [new Date()],
    }, context());
    const malformedVariables = expandAbstractVersionEntry({
      _abstract: { name: "Variant", source: "TST" },
      _implementations: [{ _variables: { color: 1 } }],
    }, context());

    expect(malformedBundle.diagnostics[0]).toMatchObject({
      code: "INVALID_VERSION_ABSTRACT",
      sourcePath: "races.json",
      entityKind: "race",
      recordName: "Dragonborn",
      recordSource: "XPHB",
      versionIndex: 0,
      invalidField: "_abstract",
      validationReason: "NOT_PLAIN_OBJECT",
    });
    expect(malformedImplementation.diagnostics[0]).toMatchObject({
      code: "INVALID_VERSION_IMPLEMENTATION",
      implementationIndex: 0,
    });
    expect(malformedVariables.diagnostics[0]).toMatchObject({
      code: "INVALID_VERSION_VARIABLES",
      implementationIndex: 0,
      invalidField: "_variables.color",
    });
  });

  it("fails explicitly on unresolved variables", () => {
    const result = expandAbstractVersionEntry({
      _abstract: { name: "Dragonborn ({{color}})", source: "XPHB" },
      _implementations: [{ _variables: { damageType: "Acid" } }],
    }, context());

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNRESOLVED_VERSION_VARIABLE",
      implementationIndex: 0,
      invalidField: "name",
      validationReason: "UNRESOLVED_VARIABLE:color",
    });
  });

  it("does not mutate bundle inputs", () => {
    const bundle = {
      _abstract: { name: "Dragonborn ({{color}})", source: "XPHB", nested: { text: "{{color}}" } },
      _implementations: [{ _variables: { color: "Black" }, speed: 35 }],
    };
    const before = JSON.stringify(bundle);

    expandAbstractVersionEntry(bundle, context());

    expect(JSON.stringify(bundle)).toBe(before);
  });
});

describe("abstract version materialization", () => {
  it("materializes abstract implementations once in their source collection", () => {
    const base: RawRecord = {
      name: "Dragonborn",
      source: "XPHB",
      remaining: {
        entries: ["Base"],
        senses: ["darkvision"],
        _versions: [{
          _abstract: {
            name: "Dragonborn ({{color}})",
            source: "XPHB",
            senses: null,
            _mod: { entries: { mode: "appendArr", items: "Breath {{color}}" } },
          },
          _implementations: [
            { _variables: { color: "Black" }, resist: ["acid"] },
            { _variables: { color: "Blue" }, resist: ["lightning"] },
          ],
        }],
      },
    };
    const before = JSON.stringify(base);

    const result = expandVersionsInFile(envelope("races.json", [collection("race", [base])]), "races.json");

    expect(result.ok).toBe(true);
    expect(result.records).toHaveLength(3);
    expect(result.records[1]).toMatchObject({
      name: "Dragonborn (Black)",
      source: "XPHB",
      remaining: { entries: ["Base", "Breath Black"], resist: ["acid"] },
    });
    expect(result.records[2]?.remaining.entries).toEqual(["Base", "Breath Blue"]);
    expect(result.records[1]?.remaining).not.toHaveProperty("senses");
    expect(result.records[1]?.remaining).not.toHaveProperty("_abstract");
    expect(result.records[1]?.remaining).not.toHaveProperty("_implementations");
    expect(JSON.stringify(base)).toBe(before);
  });

  it("keeps multi-collection files separated and updates counts", () => {
    const result = expandVersions({
      "races.json": envelope("races.json", [
        collection("race", [{
          name: "Dragonborn",
          source: "XPHB",
          remaining: {
            _versions: [{
              _abstract: { name: "Dragonborn ({{color}})", source: "XPHB" },
              _implementations: [
                { _variables: { color: "Black" } },
                { _variables: { color: "Blue" } },
                { _variables: { color: "Red" } },
              ],
            }],
          },
        }]),
        collection("subrace", [{
          name: "Draconblood",
          source: "EGW",
          remaining: { _versions: [{ name: "Draconblood (Blue)", source: "EGW" }] },
        }]),
      ]),
    });

    const expanded = result.validatedFiles["races.json"];
    expect(result.ok).toBe(true);
    expect(expanded?.collections[0]?.recordCount).toBe(4);
    expect(expanded?.collections[1]?.recordCount).toBe(2);
    expect(expanded?.totalRecords).toBe(6);
    expect(expanded?.collections[0]?.records.map((record) => record.name)).toEqual([
      "Dragonborn",
      "Dragonborn (Black)",
      "Dragonborn (Blue)",
      "Dragonborn (Red)",
    ]);
    expect(expanded?.collections[1]?.records.map((record) => record.name)).toEqual([
      "Draconblood",
      "Draconblood (Blue)",
    ]);
  });
});

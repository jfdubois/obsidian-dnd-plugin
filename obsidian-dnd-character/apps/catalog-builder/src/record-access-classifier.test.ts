import { describe, expect, it } from "vitest";
import type { RawRecord } from "./raw-boundary";
import {
  classifyRecordAccess,
  classifyResolvedRecordAccess,
} from "./record-access-classifier";
import {
  classifyRecordRuleset,
  classifyResolvedRecordRulesets,
  type RulesetRecordClassification,
} from "./ruleset-classifier";

function makeRecord(source: string, remaining: Record<string, unknown> = {}): RawRecord {
  return { name: "Fixture Record", source, remaining };
}

function rulesetClassification(record: RawRecord): RulesetRecordClassification {
  const result = classifyRecordRuleset(record);
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result.classification;
}

describe("classifyRecordAccess", () => {
  it("classifies 2014 records with structured 2014 core markers as core", () => {
    const record = makeRecord("PHB", { basicRules: true });

    expect(classifyRecordAccess(rulesetClassification(record))).toEqual({
      record,
      source: "PHB",
      ruleset: "2014",
      access: "core",
      method: "structured-core-marker",
      coreMarker: { field: "basicRules", value: true },
      sourcePath: undefined,
      entityKind: undefined,
      recordIndex: undefined,
    });
  });

  it("classifies 2024 records with structured 2024 core markers as core", () => {
    const record = makeRecord("XPHB", { basicRules2024: true });

    expect(classifyRecordAccess(rulesetClassification(record))).toMatchObject({
      record,
      source: "XPHB",
      ruleset: "2024",
      access: "core",
      method: "structured-core-marker",
      coreMarker: { field: "basicRules2024", value: true },
    });
  });

  it("treats source-category records without explicit core markers as source access", () => {
    const record = makeRecord("PHB");

    expect(classifyRecordAccess(rulesetClassification(record))).toMatchObject({
      record,
      source: "PHB",
      ruleset: "2014",
      access: "source",
      method: "default-source-access",
      coreMarker: undefined,
    });
  });

  it("does not grant core access from markers belonging to the other ruleset", () => {
    const record = makeRecord("PHB", { basicRules2024: true, srd52: true });

    expect(classifyRecordAccess(rulesetClassification(record))).toMatchObject({
      record,
      source: "PHB",
      ruleset: "2014",
      access: "source",
      method: "default-source-access",
      coreMarker: undefined,
    });
  });

  it("ignores false and empty structured markers", () => {
    const record = makeRecord("XPHB", { basicRules2024: false, srd52: "" });

    expect(classifyRecordAccess(rulesetClassification(record))).toMatchObject({
      record,
      source: "XPHB",
      ruleset: "2024",
      access: "source",
      method: "default-source-access",
      coreMarker: undefined,
    });
  });
});

describe("classifyResolvedRecordAccess", () => {
  it("returns deterministic access classifications for both supported rulesets", () => {
    const phb = makeRecord("PHB", { srd: "Fixture Alias" });
    const xphb = makeRecord("XPHB", { srd52: true });
    const rulesetResult = classifyResolvedRecordRulesets([
      { record: phb, sourcePath: "backgrounds.json", entityKind: "background", recordIndex: 0 },
      { record: xphb, sourcePath: "backgrounds.json", entityKind: "background", recordIndex: 1 },
    ]);

    expect(rulesetResult.diagnostics).toEqual([]);
    expect(rulesetResult.representedRulesets).toEqual(["2014", "2024"]);
    expect(classifyResolvedRecordAccess(rulesetResult.classifications).classifications.map(
      (classification) => ({
        source: classification.source,
        ruleset: classification.ruleset,
        access: classification.access,
        coreMarker: classification.coreMarker,
        sourcePath: classification.sourcePath,
        entityKind: classification.entityKind,
        recordIndex: classification.recordIndex,
      }),
    )).toEqual([
      {
        source: "PHB",
        ruleset: "2014",
        access: "core",
        coreMarker: { field: "srd", value: "Fixture Alias" },
        sourcePath: "backgrounds.json",
        entityKind: "background",
        recordIndex: 0,
      },
      {
        source: "XPHB",
        ruleset: "2024",
        access: "core",
        coreMarker: { field: "srd52", value: true },
        sourcePath: "backgrounds.json",
        entityKind: "background",
        recordIndex: 1,
      },
    ]);
  });

  it("cannot classify records omitted by the ruleset classifier", () => {
    const rulesetResult = classifyResolvedRecordRulesets(
      [
        { record: makeRecord("PHB", { basicRules: true }) },
        { record: makeRecord("XPHB", { basicRules2024: true }) },
      ],
      { includedRulesets: ["2014"] },
    );

    expect(rulesetResult.diagnostics).toHaveLength(1);
    expect(classifyResolvedRecordAccess(rulesetResult.classifications).classifications.map(
      (classification) => classification.ruleset,
    )).toEqual(["2014"]);
  });
});

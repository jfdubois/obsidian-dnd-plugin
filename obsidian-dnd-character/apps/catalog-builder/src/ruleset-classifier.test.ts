import { describe, expect, it } from "vitest";
import type { RawRecord } from "./raw-boundary";
import {
  RULESET_SOURCE_CLASSIFICATIONS,
  classifyRecordRuleset,
  classifyResolvedRecordRulesets,
} from "./ruleset-classifier";

function makeRecord(source: string, remaining: Record<string, unknown> = {}): RawRecord {
  return { name: "Fixture Record", source, remaining };
}

describe("classifyRecordRuleset", () => {
  it("classifies 2014 and 2024 source-backed records", () => {
    const phb = makeRecord("PHB", { basicRules: true });
    const xphb = makeRecord("XPHB", { basicRules2024: true });

    expect(classifyRecordRuleset(phb)).toEqual({
      ok: true,
      classification: {
        record: phb,
        source: "PHB",
        ruleset: "2014",
        method: "reviewed-source-map",
        sourcePath: undefined,
        entityKind: undefined,
        recordIndex: undefined,
      },
    });
    expect(classifyRecordRuleset(xphb)).toEqual({
      ok: true,
      classification: {
        record: xphb,
        source: "XPHB",
        ruleset: "2024",
        method: "reviewed-source-map",
        sourcePath: undefined,
        entityKind: undefined,
        recordIndex: undefined,
      },
    });
  });

  it("uses source classification rather than source-access flags", () => {
    const result = classifyRecordRuleset(makeRecord("PHB", { basicRules2024: true }));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected PHB classification");
    expect(result.classification.ruleset).toBe("2014");
  });

  it("emits an explicit diagnostic for unknown source abbreviations", () => {
    const record = makeRecord("TST");
    const result = classifyRecordRuleset({
      record,
      sourcePath: "test.json",
      entityKind: "spell",
      recordIndex: 4,
    });

    expect(result).toEqual({
      ok: false,
      diagnostic: {
        code: "UNKNOWN_SOURCE",
        severity: "warning",
        message: 'No reviewed ruleset classification exists for source "TST".',
        source: "TST",
        sourcePath: "test.json",
        entityKind: "spell",
        recordName: "Fixture Record",
        recordIndex: 4,
      },
    });
  });

  it("emits an explicit diagnostic for empty source abbreviations", () => {
    const result = classifyRecordRuleset(makeRecord(""));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid source diagnostic");
    expect(result.diagnostic.code).toBe("INVALID_SOURCE");
  });
});

describe("classifyResolvedRecordRulesets", () => {
  it("returns deterministic classifications and represented rulesets", () => {
    const phb = makeRecord("PHB");
    const xphb = makeRecord("XPHB");

    const result = classifyResolvedRecordRulesets([
      { record: phb, sourcePath: "spells/spells-phb.json", entityKind: "spell", recordIndex: 0 },
      { record: xphb, sourcePath: "spells/spells-xphb.json", entityKind: "spell", recordIndex: 0 },
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.representedRulesets).toEqual(["2014", "2024"]);
    expect(result.classifications.map((classification) => ({
      source: classification.source,
      ruleset: classification.ruleset,
      record: classification.record,
    }))).toEqual([
      { source: "PHB", ruleset: "2014", record: phb },
      { source: "XPHB", ruleset: "2024", record: xphb },
    ]);
  });

  it("omits records from rulesets excluded by builder configuration", () => {
    const result = classifyResolvedRecordRulesets(
      [
        { record: makeRecord("PHB"), sourcePath: "spells/spells-phb.json" },
        { record: makeRecord("XPHB"), sourcePath: "spells/spells-xphb.json" },
      ],
      { includedRulesets: ["2014"] },
    );

    expect(result.classifications.map((classification) => classification.ruleset)).toEqual(["2014"]);
    expect(result.representedRulesets).toEqual(["2014"]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "EXCLUDED_RULESET",
      source: "XPHB",
      ruleset: "2024",
    });
  });
});

describe("RULESET_SOURCE_CLASSIFICATIONS", () => {
  it("contains reviewed mappings for both rulesets", () => {
    expect(RULESET_SOURCE_CLASSIFICATIONS.map((classification) => classification.ruleset)).toEqual(
      expect.arrayContaining(["2014", "2024"]),
    );
  });
});

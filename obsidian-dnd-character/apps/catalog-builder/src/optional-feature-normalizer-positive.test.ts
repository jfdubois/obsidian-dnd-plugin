import { describe, it, expect } from "vitest";
import { normalizeOptionalFeatures, type OptionalFeatureNormalizerInput } from "./optional-feature-normalizer";
import { makeCopyModRawRecord, ctx } from "./optional-feature-normalizer-test-helpers";

describe("normalizeOptionalFeatures — positive cases", () => {
  it("normalizes a basic optional feature from PHB", () => {
    const record = makeCopyModRawRecord({
      name: "Optional Rule",
      source: "PHB",
      entries: [
        { type: "paragraph", text: "This is an optional rule." },
      ],
    });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(1);
    const of = result.optionalFeatures[0]!;
    expect(of.kind).toBe("optional-feature");
    expect(of.name).toBe("Optional Rule");
    expect(of.ruleset).toBe("2014");
    expect(of.access).toBe("core");
    expect(of.legacy).toBe(false);
    expect(of.content.length).toBe(1);
    expect(of.content[0]).toEqual({ type: "paragraph", text: "This is an optional rule." });
    expect(of.prerequisites).toEqual([]);
    expect(of.effects).toEqual([]);
    expect(of.choices).toEqual([]);
    expect(of.dependencies).toEqual([]);
  });

  it("normalizes an optional feature from XPHB (2024 ruleset)", () => {
    const record = makeCopyModRawRecord({
      name: "New Optional Rule",
      source: "XPHB",
      entries: [
        { type: "paragraph", text: "This is a 2024 optional rule." },
      ],
    });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(1);
    const of = result.optionalFeatures[0]!;
    expect(of.kind).toBe("optional-feature");
    expect(of.name).toBe("New Optional Rule");
    expect(of.ruleset).toBe("2024");
    expect(of.access).toBe("core");
  });

  it("normalizes an optional feature with heading content", () => {
    const record = makeCopyModRawRecord({
      name: "Variant Rule",
      source: "PHB",
      entries: [
        { type: "heading", level: 2, text: "Variant Rule Title" },
        { type: "paragraph", text: "Details about the variant rule." },
      ],
    });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(1);
    const of = result.optionalFeatures[0]!;
    expect(of.content.length).toBe(2);
    expect(of.content[0]).toEqual({ type: "heading", level: 2, text: "Variant Rule Title" });
    expect(of.content[1]).toEqual({ type: "paragraph", text: "Details about the variant rule." });
  });

  it("normalizes an optional feature with page number", () => {
    const record = makeCopyModRawRecord({
      name: "Paginated Rule",
      source: "PHB",
      page: 285,
    });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(1);
    expect(result.optionalFeatures[0]!.page).toBe(285);
  });

  it("normalizes an optional feature with summary", () => {
    const record = makeCopyModRawRecord({
      name: "Summarized Rule",
      source: "PHB",
      summary: "A brief summary of this rule.",
    });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(1);
    expect(result.optionalFeatures[0]!.summary).toBe("A brief summary of this rule.");
  });

  it("normalizes an optional feature with description fallback", () => {
    const record = makeCopyModRawRecord({
      name: "Description Rule",
      source: "PHB",
      description: "This rule uses description field instead of entries.",
    });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(1);
    const of = result.optionalFeatures[0]!;
    expect(of.content.length).toBe(1);
    expect(of.content[0]).toEqual({ type: "paragraph", text: "This rule uses description field instead of entries." });
  });

  it("normalizes multiple optional features in a single batch", () => {
    const records = [
      makeCopyModRawRecord({ name: "Rule One", source: "PHB" }),
      makeCopyModRawRecord({ name: "Rule Two", source: "XPHB" }),
    ];
    const input: OptionalFeatureNormalizerInput = { records, context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(2);
    expect(result.optionalFeatures[0]!.name).toBe("Rule One");
    expect(result.optionalFeatures[0]!.ruleset).toBe("2014");
    expect(result.optionalFeatures[1]!.name).toBe("Rule Two");
    expect(result.optionalFeatures[1]!.ruleset).toBe("2024");
  });

  it("produces frozen results", () => {
    const record = makeCopyModRawRecord({ name: "Frozen Rule", source: "PHB" });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.optionalFeatures)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    expect(Object.isFrozen(result.optionalFeatures[0]!)).toBe(true);
  });

  it("generates canonical entity ID correctly", () => {
    const record = makeCopyModRawRecord({ name: "Speed Options", source: "PHB" });
    const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(1);
    const of = result.optionalFeatures[0]!;
    expect(of.id).toContain("optional-feature");
    expect(of.id).toContain("2014");
  });

  it("handles empty records array", () => {
    const input: OptionalFeatureNormalizerInput = { records: [], context: ctx };

    const result = normalizeOptionalFeatures(input);

    expect(result.optionalFeatures.length).toBe(0);
    expect(result.diagnostics.length).toBe(0);
  });
});

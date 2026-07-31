import { describe, it, expect } from "vitest";
import { normalizeOptionalFeatures, type OptionalFeatureNormalizerInput } from "./optional-feature-normalizer";
import { makeCopyModRawRecord, ctx } from "./optional-feature-normalizer-test-helpers";

describe("normalizeOptionalFeatures — negative cases", () => {
  describe("excluded source", () => {
    it("excludes optional features from unsupported known pinned sources", () => {
      const record = makeCopyModRawRecord({
        name: "Excluded Rule",
        source: "XGtE",
      });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });

    it("excludes optional features from DMG", () => {
      const record = makeCopyModRawRecord({
        name: "DMG Rule",
        source: "DMG",
      });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });
  });

  describe("unknown source", () => {
    it("rejects unknown source abbreviation", () => {
      const record = makeCopyModRawRecord({
        name: "Unknown Rule",
        source: "UNKNOWN",
      });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
    });

    it("rejects fabricated source abbreviation", () => {
      const record = makeCopyModRawRecord({
        name: "Fake Rule",
        source: "ZZZZZ",
      });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
    });
  });

  describe("invalid source", () => {
    it("rejects empty source", () => {
      const record = makeCopyModRawRecord({
        name: "Empty Source Rule",
        source: "",
      });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects whitespace-padded source", () => {
      const record = makeCopyModRawRecord({
        name: "Padded Source Rule",
        source: " PHB ",
      });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
    });
  });

  describe("page number edge cases", () => {
    it("ignores non-integer page number", () => {
      const record = makeCopyModRawRecord({ page: 169.5 });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(1);
      expect(result.optionalFeatures[0]!.page).toBeUndefined();
    });

    it("ignores zero page number", () => {
      const record = makeCopyModRawRecord({ page: 0 });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(1);
      expect(result.optionalFeatures[0]!.page).toBeUndefined();
    });

    it("ignores negative page number", () => {
      const record = makeCopyModRawRecord({ page: -1 });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(1);
      expect(result.optionalFeatures[0]!.page).toBeUndefined();
    });
  });

  describe("unsupported narrative mechanic (ENG-008)", () => {
    it("displays optional feature with narrative content but no invented effect", () => {
      const record = makeCopyModRawRecord({
        name: "Narrative Optional Rule",
        source: "PHB",
        entries: [
          { type: "paragraph", text: "This optional rule describes a narrative mechanic that cannot be fully automated." },
        ],
      });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(1);
      const of = result.optionalFeatures[0]!;
      expect(of.name).toBe("Narrative Optional Rule");
      expect(of.content.length).toBe(1);
      expect(of.content[0]).toEqual({
        type: "paragraph",
        text: "This optional rule describes a narrative mechanic that cannot be fully automated.",
      });
      // No invented effects from narrative text
      expect(of.effects).toEqual([]);
    });
  });

  describe("mixed batch handling", () => {
    it("processes valid records while excluding invalid ones in same batch", () => {
      const records = [
        makeCopyModRawRecord({ name: "Valid Rule", source: "PHB" }),
        makeCopyModRawRecord({ name: "Excluded Rule", source: "DMG" }),
        makeCopyModRawRecord({ name: "Another Valid Rule", source: "XPHB" }),
      ];
      const input: OptionalFeatureNormalizerInput = { records, context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.optionalFeatures.length).toBe(2);
      expect(result.optionalFeatures[0]!.name).toBe("Valid Rule");
      expect(result.optionalFeatures[1]!.name).toBe("Another Valid Rule");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Excluded Rule");
    });
  });

  describe("diagnostic metadata", () => {
    it("includes record index in diagnostic", () => {
      const records = [
        makeCopyModRawRecord({ name: "First", source: "PHB" }),
        makeCopyModRawRecord({ name: "Second", source: "DMG" }),
      ];
      const input: OptionalFeatureNormalizerInput = { records, context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.diagnostics[0]!.recordIndex).toBe(1);
    });

    it("includes entity kind in diagnostic", () => {
      const record = makeCopyModRawRecord({ name: "Bad Rule", source: "DMG" });
      const input: OptionalFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeOptionalFeatures(input);

      expect(result.diagnostics[0]!.entityKind).toBe("optional-feature");
    });
  });
});

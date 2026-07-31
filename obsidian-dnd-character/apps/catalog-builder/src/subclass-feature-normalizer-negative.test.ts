import { describe, it, expect } from "vitest";
import { normalizeSubclassFeatures, type SubclassFeatureNormalizerInput } from "./subclass-feature-normalizer";
import { makeCopyModRawRecord, ctx } from "./subclass-feature-normalizer-test-helpers";

describe("normalizeSubclassFeatures — negative cases", () => {
  describe("source scope exclusions", () => {
    it("excludes non-core sources with EXCLUDED_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Some Feature",
        source: "XGtE",
        className: "Fighter",
        subclassShortName: "Battle Master",
        level: 3,
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Some Feature");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("excludes unknown sources with UNKNOWN_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Unknown Feature",
        source: "FAKE",
        className: "Wizard",
        subclassShortName: "Evocation",
        level: 2,
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });
  });

  describe("missing or invalid className", () => {
    it("rejects records with empty className", () => {
      const record = makeCopyModRawRecord({ className: "" });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_CLASS_NAME");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects records with whitespace-only className", () => {
      const record = makeCopyModRawRecord({ className: "   " });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_CLASS_NAME");
    });

    it("rejects records with missing className field", () => {
      const record = makeCopyModRawRecord({ className: undefined });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_CLASS_NAME");
    });
  });

  describe("missing or invalid subclassShortName", () => {
    it("rejects records with empty subclassShortName", () => {
      const record = makeCopyModRawRecord({ subclassShortName: "" });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_SUBCLASS_NAME");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects records with whitespace-only subclassShortName", () => {
      const record = makeCopyModRawRecord({ subclassShortName: "   " });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_SUBCLASS_NAME");
    });

    it("rejects records with missing subclassShortName field", () => {
      const record = makeCopyModRawRecord({ subclassShortName: undefined });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_SUBCLASS_NAME");
    });
  });

  describe("missing or invalid level", () => {
    it("rejects records with missing level", () => {
      const record = makeCopyModRawRecord({ level: undefined });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_LEVEL");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects records with level zero", () => {
      const record = makeCopyModRawRecord({ level: 0 });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_LEVEL");
    });

    it("rejects records with level above 20", () => {
      const record = makeCopyModRawRecord({ level: 21 });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_LEVEL");
    });

    it("rejects records with non-integer level", () => {
      const record = makeCopyModRawRecord({ level: 2.5 });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_LEVEL");
    });
  });

  describe("mixed valid and invalid records", () => {
    it("normalizes valid records while reporting diagnostics for invalid ones", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Bad Feature",
        source: "XGtE",
        className: "Fighter",
        subclassShortName: "Battle Master",
        level: 3,
      });

      const input: SubclassFeatureNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(1);
      expect(result.features[0]!.name).toBe("Frenzy");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Bad Feature");
    });
  });

  describe("boundary levels", () => {
    it("accepts level 1", () => {
      const record = makeCopyModRawRecord({ level: 1 });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(1);
      expect(result.features[0]!.level).toBe(1);
    });

    it("accepts level 20", () => {
      const record = makeCopyModRawRecord({ level: 20 });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(1);
      expect(result.features[0]!.level).toBe(20);
    });
  });

  describe("content extraction edge cases", () => {
    it("handles non-paragraph entries gracefully", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "unknown", text: "some text" },
        ],
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(1);
      expect(result.features[0]!.content.length).toBe(1);
      expect(result.features[0]!.content[0]).toEqual({
        type: "note",
        text: "some text",
      });
    });

    it("skips non-object entries", () => {
      const record = makeCopyModRawRecord({
        entries: ["not an object", 42, null, undefined],
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(1);
      expect(result.features[0]!.content.length).toBe(0);
    });
  });

  describe("diagnostic structure", () => {
    it("includes recordIndex in diagnostics", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Bad Feature",
        source: "XGtE",
        className: "Fighter",
        subclassShortName: "Battle Master",
        level: 3,
      });

      const input: SubclassFeatureNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.diagnostics[0]!.recordIndex).toBe(1);
    });

    it("includes entityKind in diagnostics", () => {
      const record = makeCopyModRawRecord({
        name: "Bad Feature",
        source: "XGtE",
        className: "Fighter",
        subclassShortName: "Battle Master",
        level: 3,
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.diagnostics[0]!.entityKind).toBe("subclass-feature");
    });
  });
});

import { describe, it, expect } from "vitest";
import { normalizeFeats, type FeatNormalizerInput } from "./feat-normalizer";
import { makeCopyModRawRecord, ctx } from "./feat-normalizer-test-helpers";

describe("normalizeFeats — negative cases", () => {
  describe("source scope exclusions", () => {
    it("excludes non-core sources with EXCLUDED_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Some Feat",
        source: "XGtE",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Some Feat");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("excludes unknown sources with UNKNOWN_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Unknown Feat",
        source: "FAKE",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("excludes sources from other supplements with EXCLUDED_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Feather Fall",
        source: "ERLW",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });
  });

  describe("invalid source values", () => {
    it("rejects records with empty source", () => {
      const record = makeCopyModRawRecord({ source: "" });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects records with whitespace-padded source", () => {
      const record = makeCopyModRawRecord({ source: " PHB " });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
    });
  });

  describe("mixed valid and invalid records", () => {
    it("normalizes valid records while reporting diagnostics for invalid ones", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Excluded Feat",
        source: "XGtE",
      });

      const input: FeatNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.name).toBe("Tough");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Excluded Feat");
    });

    it("handles multiple invalid records with separate diagnostics", () => {
      const fake1 = makeCopyModRawRecord({ name: "Fake1", source: "FAKE1" });
      const fake2 = makeCopyModRawRecord({ name: "Fake2", source: "FAKE2" });

      const input: FeatNormalizerInput = { records: [fake1, fake2], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(0);
      expect(result.diagnostics.length).toBe(2);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
      expect(result.diagnostics[1]!.code).toBe("UNKNOWN_SOURCE");
    });
  });

  describe("content extraction edge cases", () => {
    it("handles non-paragraph entries gracefully", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "unknown", text: "some text" },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.content.length).toBe(1);
      expect(result.feats[0]!.content[0]).toEqual({
        type: "note",
        text: "some text",
      });
    });

    it("skips non-object entries", () => {
      const record = makeCopyModRawRecord({
        entries: ["not an object", 42, null, undefined],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.content.length).toBe(0);
    });

    it("handles empty entries array", () => {
      const record = makeCopyModRawRecord({
        entries: [],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.content).toEqual([]);
    });
  });

  describe("diagnostic structure", () => {
    it("includes recordIndex in diagnostics", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Excluded Feat",
        source: "XGtE",
      });

      const input: FeatNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeFeats(input);

      expect(result.diagnostics[0]!.recordIndex).toBe(1);
    });

    it("includes entityKind in diagnostics", () => {
      const record = makeCopyModRawRecord({
        name: "Excluded Feat",
        source: "XGtE",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.diagnostics[0]!.entityKind).toBe("feat");
    });

    it("includes source in diagnostics", () => {
      const record = makeCopyModRawRecord({
        name: "Excluded Feat",
        source: "XGtE",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.diagnostics[0]!.source).toBe("XGtE");
    });
  });
});

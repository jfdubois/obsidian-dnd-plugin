import { describe, it, expect } from "vitest";
import { normalizeLanguages, type LanguageNormalizerInput } from "./language-normalizer";
import { makeCopyModRawRecord, ctx } from "./language-normalizer-test-helpers";

describe("normalizeLanguages — negative cases", () => {
  describe("source scope exclusions", () => {
    it("excludes non-core sources with EXCLUDED_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Some Language",
        source: "XGtE",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Some Language");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("excludes unknown sources with UNKNOWN_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Unknown Language",
        source: "FAKE",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("excludes sources from other supplements with EXCLUDED_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Abyssal",
        source: "ERLW",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });
  });

  describe("invalid source values", () => {
    it("rejects records with empty source", () => {
      const record = makeCopyModRawRecord({ source: "" });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects records with whitespace-padded source", () => {
      const record = makeCopyModRawRecord({ source: " PHB " });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
    });
  });

  describe("missing language type", () => {
    it("rejects language without valid type", () => {
      const record = makeCopyModRawRecord({
        name: "No Type Language",
        type: undefined,
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_CANONICAL_ID");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects language with invalid type value", () => {
      const record = makeCopyModRawRecord({
        name: "Bad Type Language",
        type: "invalid_type",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_CANONICAL_ID");
    });
  });

  describe("mixed valid and invalid records", () => {
    it("normalizes valid records while reporting diagnostics for invalid ones", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Excluded Language",
        source: "XGtE",
      });

      const input: LanguageNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(1);
      expect(result.languages[0]!.name).toBe("Common");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Excluded Language");
    });

    it("handles multiple invalid records with separate diagnostics", () => {
      const fake1 = makeCopyModRawRecord({ name: "Fake1", source: "FAKE1" });
      const fake2 = makeCopyModRawRecord({ name: "Fake2", source: "FAKE2" });

      const input: LanguageNormalizerInput = { records: [fake1, fake2], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(0);
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
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(1);
      expect(result.languages[0]!.content.length).toBe(1);
      expect(result.languages[0]!.content[0]).toEqual({
        type: "note",
        text: "some text",
      });
    });

    it("skips non-object entries", () => {
      const record = makeCopyModRawRecord({
        entries: ["not an object", 42, null, undefined],
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(1);
      expect(result.languages[0]!.content.length).toBe(0);
    });

    it("handles empty entries array", () => {
      const record = makeCopyModRawRecord({
        entries: [],
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(1);
      expect(result.languages[0]!.content).toEqual([]);
    });
  });

  describe("diagnostic structure", () => {
    it("includes recordIndex in diagnostics", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Excluded Language",
        source: "XGtE",
      });

      const input: LanguageNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.diagnostics[0]!.recordIndex).toBe(1);
    });

    it("includes entityKind in diagnostics", () => {
      const record = makeCopyModRawRecord({
        name: "Excluded Language",
        source: "XGtE",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.diagnostics[0]!.entityKind).toBe("language");
    });

    it("includes source in diagnostics", () => {
      const record = makeCopyModRawRecord({
        name: "Excluded Language",
        source: "XGtE",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.diagnostics[0]!.source).toBe("XGtE");
    });
  });
});

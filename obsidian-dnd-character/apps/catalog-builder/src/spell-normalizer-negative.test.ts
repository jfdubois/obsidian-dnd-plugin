import { describe, it, expect } from "vitest";
import { normalizeSpells, type SpellNormalizerInput } from "./spell-normalizer";
import { makeCopyModRawRecord, ctx } from "./spell-normalizer-test-helpers";

describe("normalizeSpells — negative cases", () => {
  describe("source scope exclusions", () => {
    it("excludes non-core sources with EXCLUDED_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Some Spell",
        source: "XGtE",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Some Spell");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("excludes unknown sources with UNKNOWN_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Unknown Spell",
        source: "FAKE",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("excludes sources from other supplements with EXCLUDED_SOURCE diagnostic", () => {
      const record = makeCopyModRawRecord({
        name: "Feather Fall",
        source: "ERLW",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });
  });

  describe("invalid source values", () => {
    it("rejects records with empty source", () => {
      const record = makeCopyModRawRecord({ source: "" });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects records with whitespace-padded source", () => {
      const record = makeCopyModRawRecord({ source: " PHB " });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
    });
  });

  describe("missing required fields", () => {
    it("rejects spells with missing level", () => {
      const record = makeCopyModRawRecord({ level: undefined });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_SPELL_LEVEL");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects spells with missing casting time", () => {
      const record = makeCopyModRawRecord({ time: undefined });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_CASTING_TIME");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects spells with missing range", () => {
      const record = makeCopyModRawRecord({ range: undefined });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_RANGE");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects spells with missing duration", () => {
      const record = makeCopyModRawRecord({ duration: undefined });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_DURATION");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects spells with unknown school code", () => {
      const record = makeCopyModRawRecord({ school: "Z" });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SCHOOL_CODE");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("rejects spells with empty school code", () => {
      const record = makeCopyModRawRecord({ school: "" });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SCHOOL_CODE");
    });
  });

  describe("mixed valid and invalid records", () => {
    it("normalizes valid records while reporting diagnostics for invalid ones", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Excluded Spell",
        source: "XGtE",
      });

      const input: SpellNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(1);
      expect(result.spells[0]!.name).toBe("Fireball");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.recordName).toBe("Excluded Spell");
    });

    it("handles multiple invalid records with separate diagnostics", () => {
      const fake1 = makeCopyModRawRecord({ name: "Fake1", source: "FAKE1" });
      const fake2 = makeCopyModRawRecord({ name: "Fake2", source: "FAKE2" });

      const input: SpellNormalizerInput = { records: [fake1, fake2], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(0);
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
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(1);
      expect(result.spells[0]!.content.length).toBe(1);
      expect(result.spells[0]!.content[0]).toEqual({
        type: "note",
        text: "some text",
      });
    });

    it("skips non-string and non-object entries", () => {
      const record = makeCopyModRawRecord({
        entries: [42, null, undefined],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(1);
      expect(result.spells[0]!.content.length).toBe(0);
    });

    it("handles empty entries array", () => {
      const record = makeCopyModRawRecord({
        entries: [],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(1);
      expect(result.spells[0]!.content).toEqual([]);
    });
  });

  describe("diagnostic structure", () => {
    it("includes recordIndex in diagnostics", () => {
      const valid = makeCopyModRawRecord();
      const invalid = makeCopyModRawRecord({
        name: "Excluded Spell",
        source: "XGtE",
      });

      const input: SpellNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeSpells(input);

      expect(result.diagnostics[0]!.recordIndex).toBe(1);
    });

    it("includes entityKind in diagnostics", () => {
      const record = makeCopyModRawRecord({
        name: "Excluded Spell",
        source: "XGtE",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.diagnostics[0]!.entityKind).toBe("spell");
    });

    it("includes source in diagnostics", () => {
      const record = makeCopyModRawRecord({
        name: "Excluded Spell",
        source: "XGtE",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.diagnostics[0]!.source).toBe("XGtE");
    });
  });
});

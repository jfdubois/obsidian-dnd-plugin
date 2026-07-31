import { describe, it, expect } from "vitest";
import { normalizeSpells, type SpellNormalizerInput } from "./spell-normalizer";
import { makeCopyModRawRecord, ctx } from "./spell-normalizer-test-helpers";

describe("normalizeSpells - batch and edge cases", () => {
  describe("school code mapping", () => {
    it("maps all school codes correctly", () => {
      const schoolTests = [
        { code: "A", expected: "abjuration" },
        { code: "C", expected: "conjuration" },
        { code: "D", expected: "divination" },
        { code: "E", expected: "enchantment" },
        { code: "I", expected: "illusion" },
        { code: "N", expected: "necromancy" },
        { code: "T", expected: "transmutation" },
        { code: "V", expected: "evocation" },
      ];

      for (const { code, expected } of schoolTests) {
        const record = makeCopyModRawRecord({ school: code });
        const input: SpellNormalizerInput = { records: [record], context: ctx };
        const result = normalizeSpells(input);

        expect(result.spells[0]!.school).toBe(expected);
      }
    });
  });

  describe("duration variations", () => {
    it("extracts timed duration with pluralization", () => {
      const record = makeCopyModRawRecord({
        duration: [{ type: "timed", duration: { type: "hour", amount: 8 } }],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.duration).toBe("8 hours");
    });

    it("extracts timed duration with singular unit", () => {
      const record = makeCopyModRawRecord({
        duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.duration).toBe("1 minute");
    });

    it("extracts permanent duration", () => {
      const record = makeCopyModRawRecord({
        duration: [{ type: "permanent" }],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.duration).toBe("Until dispelled");
    });

    it("handles special duration text", () => {
      const record = makeCopyModRawRecord({
        duration: [{ type: "special", text: "Until the target falls unconscious" }],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.duration).toBe("Until the target falls unconscious");
    });
  });

  describe("range variations", () => {
    it("extracts self range", () => {
      const record = makeCopyModRawRecord({
        range: { type: "self" },
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.range).toBe("Self");
    });

    it("handles touch range", () => {
      const record = makeCopyModRawRecord({
        range: { type: "touch" },
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.range).toBe("Touch");
    });
  });

  describe("casting time variations", () => {
    it("handles special casting time", () => {
      const record = makeCopyModRawRecord({
        time: [{ type: "special", text: "Reaction" }],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.castingTime).toBe("Reaction");
    });
  });

  describe("higher-level effects", () => {
    it("extracts higher-level effects", () => {
      const record = makeCopyModRawRecord({
        entriesHigherLevel: [
          {
            type: "entries",
            name: "At Higher Levels",
            entries: ["When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd."],
          },
        ],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.higherLevelEffects).toBeDefined();
      expect(result.spells[0]!.higherLevelEffects!.length).toBe(2);
      expect(result.spells[0]!.higherLevelEffects![0]).toEqual({
        type: "heading",
        level: 3,
        text: "At Higher Levels",
      });
    });
  });
});

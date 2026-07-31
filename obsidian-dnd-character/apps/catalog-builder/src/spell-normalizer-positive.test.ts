import { describe, it, expect } from "vitest";
import { normalizeSpells, type SpellNormalizerInput } from "./spell-normalizer";
import { makeCopyModRawRecord, ctx } from "./spell-normalizer-test-helpers";

describe("normalizeSpells", () => {
  describe("empty input", () => {
    it("returns empty result for no records", () => {
      const input: SpellNormalizerInput = { records: [], context: ctx };
      const result = normalizeSpells(input);

      expect(result.spells).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const record = makeCopyModRawRecord();
      const input: SpellNormalizerInput = { records: [record], context: ctx };
      const result = normalizeSpells(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.spells)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("normalizes a valid PHB spell", () => {
      const record = makeCopyModRawRecord();
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(1);
      const spell = result.spells[0]!;
      expect(spell.kind).toBe("spell");
      expect(spell.name).toBe("Fireball");
      expect(spell.ruleset).toBe("2014");
      expect(spell.access).toBe("core");
      expect(spell.legacy).toBe(false);
      expect(spell.school).toBe("evocation");
      expect(spell.level).toBe(3);
      expect(spell.castingTime).toBe("1 action");
      expect(spell.range).toBe("150 feet");
      expect(spell.duration).toBe("Instantaneous");
      expect(spell.concentration).toBe(false);
      expect(spell.ritual).toBe(false);
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB spell", () => {
      const record = makeCopyModRawRecord({
        name: "Fireball",
        source: "XPHB",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(1);
      expect(result.spells[0]!.ruleset).toBe("2024");
      expect(result.spells[0]!.name).toBe("Fireball");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple spells in a single batch", () => {
      const fireball = makeCopyModRawRecord({ name: "Fireball" });
      const magicMissile = makeCopyModRawRecord({ name: "Magic Missile", level: 1 });

      const input: SpellNormalizerInput = { records: [fireball, magicMissile], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(2);
      expect(result.spells[0]!.name).toBe("Fireball");
      expect(result.spells[1]!.name).toBe("Magic Missile");
    });

    it("generates canonical ID with correct kind", () => {
      const record = makeCopyModRawRecord();
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.id).toContain("spell:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const record = makeCopyModRawRecord();
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      // PHB -> 2014 ruleset
      expect(result.spells[0]!.id).toContain(":2014:");
    });

    it("normalizes a cantrip (level 0)", () => {
      const record = makeCopyModRawRecord({
        name: "Firebolt",
        level: 0,
        school: "V",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells.length).toBe(1);
      expect(result.spells[0]!.level).toBe(0);
      expect(result.spells[0]!.school).toBe("evocation");
    });

    it("extracts narrative content from string entries", () => {
      const record = makeCopyModRawRecord({
        entries: [
          "You hurl a bubble of acid. Choose one creature you can see within range.",
          "This spell's damage increases by 1d6 when you reach 5th level.",
        ],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.content.length).toBe(2);
      expect(result.spells[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "You hurl a bubble of acid. Choose one creature you can see within range.",
      });
      expect(result.spells[0]!.content[1]).toEqual({
        type: "paragraph",
        text: "This spell's damage increases by 1d6 when you reach 5th level.",
      });
    });

    it("extracts content from nested entries objects", () => {
      const record = makeCopyModRawRecord({
        entries: [
          "You assume a different form.",
          {
            type: "entries",
            name: "Aquatic Adaptation",
            entries: ["You can breathe underwater and gain a swimming speed equal to your walking speed."],
          },
        ],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.content.length).toBe(3);
      expect(result.spells[0]!.content[1]).toEqual({
        type: "heading",
        level: 3,
        text: "Aquatic Adaptation",
      });
      expect(result.spells[0]!.content[2]).toEqual({
        type: "paragraph",
        text: "You can breathe underwater and gain a swimming speed equal to your walking speed.",
      });
    });

    it("extracts page number from record", () => {
      const record = makeCopyModRawRecord({ page: 211 });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.page).toBe(211);
    });

    it("extracts summary from record", () => {
      const record = makeCopyModRawRecord({ summary: "A bright streak flashes from your pointing finger." });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.summary).toBe("A bright streak flashes from your pointing finger.");
    });

    it("extracts description as paragraph content", () => {
      const record = makeCopyModRawRecord({
        description: "Your hit point maximum increases by 1 for every level you gain.",
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.content.length).toBe(1);
      expect(result.spells[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Your hit point maximum increases by 1 for every level you gain.",
      });
    });

    it("detects ritual from meta.ritual", () => {
      const record = makeCopyModRawRecord({
        meta: { ritual: true },
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.ritual).toBe(true);
    });

    it("detects concentration from duration", () => {
      const record = makeCopyModRawRecord({
        duration: [{ type: "timed", duration: { type: "hour", amount: 1 }, concentration: true }],
      });
      const input: SpellNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSpells(input);

      expect(result.spells[0]!.concentration).toBe(true);
      expect(result.spells[0]!.duration).toBe("1 hour");
    });
  });
});

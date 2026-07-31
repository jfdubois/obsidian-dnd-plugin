import { describe, it, expect } from "vitest";
import { normalizeFeats, type FeatNormalizerInput } from "./feat-normalizer";
import { makeCopyModRawRecord, ctx } from "./feat-normalizer-test-helpers";

describe("normalizeFeats", () => {
  describe("empty input", () => {
    it("returns empty result for no records", () => {
      const input: FeatNormalizerInput = { records: [], context: ctx };
      const result = normalizeFeats(input);

      expect(result.feats).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const record = makeCopyModRawRecord();
      const input: FeatNormalizerInput = { records: [record], context: ctx };
      const result = normalizeFeats(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.feats)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("normalizes a valid PHB feat", () => {
      const record = makeCopyModRawRecord();
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      const feat = result.feats[0]!;
      expect(feat.kind).toBe("feat");
      expect(feat.name).toBe("Tough");
      expect(feat.ruleset).toBe("2014");
      expect(feat.access).toBe("core");
      expect(feat.legacy).toBe(false);
      expect(feat.content).toEqual([]);
      expect(feat.prerequisites).toEqual([]);
      expect(feat.effects).toEqual([]);
      expect(feat.choices).toEqual([]);
      expect(feat.dependencies).toEqual([]);
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB feat", () => {
      const record = makeCopyModRawRecord({
        name: "Tough",
        source: "XPHB",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.ruleset).toBe("2024");
      expect(result.feats[0]!.name).toBe("Tough");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple feats in a single batch", () => {
      const tough = makeCopyModRawRecord({ name: "Tough" });
      const observant = makeCopyModRawRecord({ name: "Observant" });

      const input: FeatNormalizerInput = { records: [tough, observant], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(2);
      expect(result.feats[0]!.name).toBe("Tough");
      expect(result.feats[1]!.name).toBe("Observant");
    });

    it("extracts narrative content from entries", () => {
      const record = makeCopyModRawRecord({
        name: "Tough",
        entries: [
          { type: "paragraph", text: "Starting when you select this feat, your hit point maximum increases by 1, and it increases by 1 every time you gain a level." },
          { type: "heading", text: "Tough", level: 2 },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.content.length).toBe(2);
      expect(result.feats[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Starting when you select this feat, your hit point maximum increases by 1, and it increases by 1 every time you gain a level.",
      });
      expect(result.feats[0]!.content[1]).toEqual({
        type: "heading",
        level: 2,
        text: "Tough",
      });
    });

    it("extracts page number from record", () => {
      const record = makeCopyModRawRecord({ page: 169 });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.page).toBe(169);
    });

    it("extracts summary from record", () => {
      const record = makeCopyModRawRecord({ summary: "Increase hit point maximum by 1 per level." });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.summary).toBe("Increase hit point maximum by 1 per level.");
    });

    it("extracts description as paragraph content", () => {
      const record = makeCopyModRawRecord({
        description: "Your hit point maximum increases by 1 for every level you gain.",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.content.length).toBe(1);
      expect(result.feats[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Your hit point maximum increases by 1 for every level you gain.",
      });
    });

    it("generates canonical ID with correct kind", () => {
      const record = makeCopyModRawRecord();
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.id).toContain("feat:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const record = makeCopyModRawRecord();
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      // PHB -> 2014 ruleset
      expect(result.feats[0]!.id).toContain(":2014:");
    });

    it("extracts ability score prerequisite from structured prerequisites", () => {
      const record = makeCopyModRawRecord({
        name: "Great Weapon Master",
        prerequisites: [
          { ability: "STR", minScore: 20 },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.abilityScorePrerequisite).toBe("STR");
      expect(result.feats[0]!.abilityMinScore).toBe(20);
    });

    it("extracts ability score prerequisite with only ability (no minScore)", () => {
      const record = makeCopyModRawRecord({
        name: "Observant",
        prerequisites: [
          { ability: "INT" },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.abilityScorePrerequisite).toBe("INT");
      expect(result.feats[0]!.abilityMinScore).toBeUndefined();
    });

    it("extracts ability score prerequisite from direct fields", () => {
      const record = makeCopyModRawRecord({
        name: "Crusher",
        abilityScorePrerequisite: "STR",
        abilityMinScore: 13,
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.abilityScorePrerequisite).toBe("STR");
      expect(result.feats[0]!.abilityMinScore).toBe(13);
    });

    it("extracts single entry string as paragraph content", () => {
      const record = makeCopyModRawRecord({
        entry: "You gain the ability to make a special attack.",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.content.length).toBe(1);
      expect(result.feats[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "You gain the ability to make a special attack.",
      });
    });

    it("handles list entries in content", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "list", items: ["item1", "item2"] },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.content.length).toBe(1);
      expect(result.feats[0]!.content[0]).toEqual({
        type: "list",
        ordered: false,
        items: [],
      });
    });

    it("uses alternative abilityScore/abilityMin prerequisite shape", () => {
      const record = makeCopyModRawRecord({
        name: "Shield Master",
        prerequisites: [
          { abilityScore: "DEX", abilityMin: 13 },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.abilityScorePrerequisite).toBe("DEX");
      expect(result.feats[0]!.abilityMinScore).toBe(13);
    });

    it("normalizes feat without ability prerequisite", () => {
      const record = makeCopyModRawRecord({
        name: "Tough",
        prerequisites: [],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats[0]!.abilityScorePrerequisite).toBeUndefined();
      expect(result.feats[0]!.abilityMinScore).toBeUndefined();
    });
  });
});

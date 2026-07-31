import { describe, it, expect } from "vitest";
import { normalizeFeats, type FeatNormalizerInput } from "./feat-normalizer";
import { makeCopyModRawRecord, ctx } from "./feat-normalizer-test-helpers";

describe("normalizeFeats — negative cases (2)", () => {
  describe("ability prerequisite edge cases", () => {
    it("ignores invalid ability score in prerequisites", () => {
      const record = makeCopyModRawRecord({
        name: "Test Feat",
        prerequisites: [
          { ability: "INVALID", minScore: 15 },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.abilityScorePrerequisite).toBeUndefined();
    });

    it("ignores negative ability minScore", () => {
      const record = makeCopyModRawRecord({
        name: "Test Feat",
        prerequisites: [
          { ability: "STR", minScore: -5 },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.abilityScorePrerequisite).toBe("STR");
      expect(result.feats[0]!.abilityMinScore).toBeUndefined();
    });

    it("ignores non-integer ability minScore", () => {
      const record = makeCopyModRawRecord({
        name: "Test Feat",
        prerequisites: [
          { ability: "STR", minScore: 13.5 },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.abilityScorePrerequisite).toBe("STR");
      expect(result.feats[0]!.abilityMinScore).toBeUndefined();
    });

    it("ignores zero ability minScore", () => {
      const record = makeCopyModRawRecord({
        name: "Test Feat",
        prerequisites: [
          { ability: "STR", minScore: 0 },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.abilityScorePrerequisite).toBe("STR");
      expect(result.feats[0]!.abilityMinScore).toBeUndefined();
    });

    it("ignores non-object prerequisites", () => {
      const record = makeCopyModRawRecord({
        name: "Test Feat",
        prerequisites: ["not an object", 42, null],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.abilityScorePrerequisite).toBeUndefined();
    });

    it("ignores invalid direct abilityScorePrerequisite", () => {
      const record = makeCopyModRawRecord({
        name: "Test Feat",
        abilityScorePrerequisite: "INVALID",
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.abilityScorePrerequisite).toBeUndefined();
    });
  });

  describe("page number edge cases", () => {
    it("ignores non-integer page number", () => {
      const record = makeCopyModRawRecord({ page: 169.5 });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.page).toBeUndefined();
    });

    it("ignores zero page number", () => {
      const record = makeCopyModRawRecord({ page: 0 });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.page).toBeUndefined();
    });

    it("ignores negative page number", () => {
      const record = makeCopyModRawRecord({ page: -1 });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      expect(result.feats[0]!.page).toBeUndefined();
    });
  });

  describe("unsupported narrative mechanic (ENG-008)", () => {
    it("displays feat with narrative content but no invented effect", () => {
      const record = makeCopyModRawRecord({
        name: "Narrative Feat",
        entries: [
          { type: "paragraph", text: "You gain a special ability described in narrative text that cannot be fully automated." },
        ],
      });
      const input: FeatNormalizerInput = { records: [record], context: ctx };

      const result = normalizeFeats(input);

      expect(result.feats.length).toBe(1);
      const feat = result.feats[0]!;
      expect(feat.name).toBe("Narrative Feat");
      expect(feat.content.length).toBe(1);
      expect(feat.content[0]).toEqual({
        type: "paragraph",
        text: "You gain a special ability described in narrative text that cannot be fully automated.",
      });
      // No invented effects from narrative text
      expect(feat.effects).toEqual([]);
    });
  });
});

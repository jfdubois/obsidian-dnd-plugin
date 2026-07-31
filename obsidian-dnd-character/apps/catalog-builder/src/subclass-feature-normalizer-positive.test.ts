import { describe, it, expect } from "vitest";
import { normalizeSubclassFeatures, type SubclassFeatureNormalizerInput } from "./subclass-feature-normalizer";
import { makeCopyModRawRecord, ctx } from "./subclass-feature-normalizer-test-helpers";

describe("normalizeSubclassFeatures", () => {
  describe("empty input", () => {
    it("returns empty result for no records", () => {
      const input: SubclassFeatureNormalizerInput = { records: [], context: ctx };
      const result = normalizeSubclassFeatures(input);

      expect(result.features).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const record = makeCopyModRawRecord();
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };
      const result = normalizeSubclassFeatures(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.features)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("normalizes a valid PHB subclass feature", () => {
      const record = makeCopyModRawRecord();
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(1);
      const feature = result.features[0]!;
      expect(feature.kind).toBe("subclass-feature");
      expect(feature.name).toBe("Frenzy");
      expect(feature.ruleset).toBe("2014");
      expect(feature.access).toBe("core");
      expect(feature.legacy).toBe(false);
      expect(feature.level).toBe(1);
      expect(feature.className).toBe("Barbarian");
      expect(feature.content).toEqual([]);
      expect(feature.prerequisites).toEqual([]);
      expect(feature.effects).toEqual([]);
      expect(feature.choices).toEqual([]);
      expect(feature.dependencies.length).toBe(1);
      expect(feature.parentId).toContain("berserker");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB subclass feature", () => {
      const record = makeCopyModRawRecord({
        name: "Improved Critical",
        source: "XPHB",
        className: "Fighter",
        subclassShortName: "Champion",
        level: 3,
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(1);
      expect(result.features[0]!.ruleset).toBe("2024");
      expect(result.features[0]!.name).toBe("Improved Critical");
      expect(result.features[0]!.level).toBe(3);
      expect(result.features[0]!.className).toBe("Fighter");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple subclass features in a single batch", () => {
      const frenzy = makeCopyModRawRecord();
      const battle = makeCopyModRawRecord({
        name: "Battle Cry",
        level: 3,
      });

      const input: SubclassFeatureNormalizerInput = { records: [frenzy, battle], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features.length).toBe(2);
      expect(result.features[0]!.name).toBe("Frenzy");
      expect(result.features[1]!.name).toBe("Battle Cry");
    });

    it("resolves parentId to canonical subclass ID", () => {
      const record = makeCopyModRawRecord();
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      const feature = result.features[0]!;
      expect(feature.parentId).toBeDefined();
      expect(feature.parentId).toContain("subclass:");
      expect(feature.parentId).toContain("berserker");
      expect(feature.dependencies).toContain(feature.parentId);
    });

    it("extracts narrative content from entries", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "paragraph", text: "When you enter your rage, you can make an opportunity attack." },
          { type: "heading", text: "Rage", level: 2 },
        ],
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features[0]!.content.length).toBe(2);
      expect(result.features[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "When you enter your rage, you can make an opportunity attack.",
      });
      expect(result.features[0]!.content[1]).toEqual({
        type: "heading",
        level: 2,
        text: "Rage",
      });
    });

    it("extracts page number from record", () => {
      const record = makeCopyModRawRecord({ page: 48 });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features[0]!.page).toBe(48);
    });

    it("extracts summary from record", () => {
      const record = makeCopyModRawRecord({ summary: "Opportunity attack during rage" });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features[0]!.summary).toBe("Opportunity attack during rage");
    });

    it("extracts description as paragraph content", () => {
      const record = makeCopyModRawRecord({
        description: "Starting at 1st level in this subclass, you can make an opportunity attack.",
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features[0]!.content.length).toBe(1);
      expect(result.features[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Starting at 1st level in this subclass, you can make an opportunity attack.",
      });
    });

    it("generates canonical ID with correct kind", () => {
      const record = makeCopyModRawRecord();
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features[0]!.id).toContain("subclass-feature:");
    });

    it("generates canonical parent ID with subclass kind", () => {
      const record = makeCopyModRawRecord();
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features[0]!.parentId).toContain("subclass:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const record = makeCopyModRawRecord();
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      // PHB -> 2014 ruleset
      expect(result.features[0]!.id).toContain(":2014:");
      expect(result.features[0]!.parentId).toContain(":2014:");
    });

    it("stores className in the normalized feature", () => {
      const record = makeCopyModRawRecord({
        className: "Cleric",
        subclassShortName: "Life",
      });
      const input: SubclassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSubclassFeatures(input);

      expect(result.features[0]!.className).toBe("Cleric");
    });
  });
});

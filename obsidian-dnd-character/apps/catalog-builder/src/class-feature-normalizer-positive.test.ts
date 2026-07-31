import { describe, it, expect } from "vitest";
import { normalizeClassFeatures, type ClassFeatureNormalizerInput } from "./class-feature-normalizer";
import { makeCopyModRawRecord, ctx } from "./class-feature-normalizer-test-helpers";

describe("normalizeClassFeatures", () => {
  describe("empty input", () => {
    it("returns empty result for no records", () => {
      const input: ClassFeatureNormalizerInput = { records: [], context: ctx };
      const result = normalizeClassFeatures(input);

      expect(result.features).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const record = makeCopyModRawRecord();
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };
      const result = normalizeClassFeatures(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.features)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("normalizes a valid PHB class feature", () => {
      const record = makeCopyModRawRecord();
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features.length).toBe(1);
      const feature = result.features[0]!;
      expect(feature.kind).toBe("class-feature");
      expect(feature.name).toBe("Second Wind");
      expect(feature.ruleset).toBe("2014");
      expect(feature.access).toBe("core");
      expect(feature.legacy).toBe(false);
      expect(feature.level).toBe(2);
      expect(feature.content).toEqual([]);
      expect(feature.prerequisites).toEqual([]);
      expect(feature.effects).toEqual([]);
      expect(feature.choices).toEqual([]);
      expect(feature.dependencies.length).toBe(1);
      expect(feature.parentId).toContain("barbarian");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB class feature", () => {
      const record = makeCopyModRawRecord({
        name: "Extra Attack",
        source: "XPHB",
        className: "Fighter",
        level: 5,
      });
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features.length).toBe(1);
      expect(result.features[0]!.ruleset).toBe("2024");
      expect(result.features[0]!.name).toBe("Extra Attack");
      expect(result.features[0]!.level).toBe(5);
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple class features in a single batch", () => {
      const secondWind = makeCopyModRawRecord();
      const reckless = makeCopyModRawRecord({
        name: "Reckless Attack",
        level: 1,
      });

      const input: ClassFeatureNormalizerInput = { records: [secondWind, reckless], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features.length).toBe(2);
      expect(result.features[0]!.name).toBe("Second Wind");
      expect(result.features[1]!.name).toBe("Reckless Attack");
    });

    it("resolves parentId to canonical class ID", () => {
      const record = makeCopyModRawRecord();
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      const feature = result.features[0]!;
      expect(feature.parentId).toBeDefined();
      expect(feature.parentId).toContain("class:");
      expect(feature.parentId).toContain("barbarian");
      expect(feature.dependencies).toContain(feature.parentId);
    });

    it("extracts narrative content from entries", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "paragraph", text: "You can use a bonus action to regain hit points." },
          { type: "heading", text: "Rage", level: 2 },
        ],
      });
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features[0]!.content.length).toBe(2);
      expect(result.features[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "You can use a bonus action to regain hit points.",
      });
      expect(result.features[0]!.content[1]).toEqual({
        type: "heading",
        level: 2,
        text: "Rage",
      });
    });

    it("extracts page number from record", () => {
      const record = makeCopyModRawRecord({ page: 48 });
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features[0]!.page).toBe(48);
    });

    it("extracts summary from record", () => {
      const record = makeCopyModRawRecord({ summary: "Bonus action to heal" });
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features[0]!.summary).toBe("Bonus action to heal");
    });

    it("extracts description as paragraph content", () => {
      const record = makeCopyModRawRecord({
        description: "Starting at 2nd level, you can use a bonus action to regain hit points.",
      });
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features[0]!.content.length).toBe(1);
      expect(result.features[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Starting at 2nd level, you can use a bonus action to regain hit points.",
      });
    });

    it("generates canonical ID with correct kind", () => {
      const record = makeCopyModRawRecord();
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features[0]!.id).toContain("class-feature:");
    });

    it("generates canonical parent ID with class kind", () => {
      const record = makeCopyModRawRecord();
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      expect(result.features[0]!.parentId).toContain("class:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const record = makeCopyModRawRecord();
      const input: ClassFeatureNormalizerInput = { records: [record], context: ctx };

      const result = normalizeClassFeatures(input);

      // PHB -> 2014 ruleset
      expect(result.features[0]!.id).toContain(":2014:");
      expect(result.features[0]!.parentId).toContain(":2014:");
    });
  });
});

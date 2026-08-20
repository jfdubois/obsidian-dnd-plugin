import { describe, it, expect } from "vitest";
import { normalizeItems, type ItemNormalizerInput } from "./item-normalizer";
import { makeCopyModRawRecord, ctx } from "./item-normalizer-test-helpers";

describe("normalizeItems", () => {
  describe("empty input", () => {
    it("returns empty result for no records", () => {
      const input: ItemNormalizerInput = { records: [], context: ctx };
      const result = normalizeItems(input);

      expect(result.items).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const record = makeCopyModRawRecord();
      const input: ItemNormalizerInput = { records: [record], context: ctx };
      const result = normalizeItems(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.items)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("uses accepted 2014 record-level core markers", () => {
      const result = normalizeItems({ records: [makeCopyModRawRecord({ srd: true })], context: ctx });

      expect(result.items[0]!.access).toBe("core");
    });

    it("uses accepted 2024 record-level core markers", () => {
      const result = normalizeItems({ records: [makeCopyModRawRecord({ source: "XDMG", srd52: true })], context: ctx });

      expect(result.items[0]!.access).toBe("core");
    });

    it("keeps an unmarked 2024 item source-gated", () => {
      const result = normalizeItems({ records: [makeCopyModRawRecord({ source: "XDMG" })], context: ctx });

      expect(result.items[0]!.access).toBe("source");
    });

    it("normalizes a valid PHB item", () => {
      const record = makeCopyModRawRecord();
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);

      expect(result.items.length).toBe(1);
      const item = result.items[0]!;
      expect(item.kind).toBe("item");
      expect(item.name).toBe("Dagger");
      expect(item.ruleset).toBe("2014");
      expect(item.access).toBe("source");
      expect(item.legacy).toBe(false);
      expect(item.content).toEqual([]);
      expect(item.prerequisites).toEqual([]);
      expect(item.effects).toEqual([]);
      expect(item.choices).toEqual([]);
      expect(item.dependencies).toEqual([]);
      expect(item.category).toBe("other");
      expect(item.properties).toEqual([]);
      expect(item.requiresAttunement).toBe(false);
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB item", () => {
      const record = makeCopyModRawRecord({
        name: "Dagger",
        source: "XPHB",
      });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);

      expect(result.items.length).toBe(1);
      expect(result.items[0]!.ruleset).toBe("2024");
      expect(result.items[0]!.name).toBe("Dagger");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple items in a single batch", () => {
      const dagger = makeCopyModRawRecord({ name: "Dagger" });
      const sword = makeCopyModRawRecord({ name: "Longsword" });

      const input: ItemNormalizerInput = { records: [dagger, sword], context: ctx };

      const result = normalizeItems(input);

      expect(result.items.length).toBe(2);
      expect(result.items[0]!.name).toBe("Dagger");
      expect(result.items[1]!.name).toBe("Longsword");
    });

    it("extracts narrative content from entries", () => {
      const record = makeCopyModRawRecord({
        name: "Dagger",
        entries: [
          { type: "paragraph", text: "A dagger deals 1-4 piercing damage." },
          { type: "heading", text: "Dagger", level: 2 },
        ],
      });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);

      expect(result.items[0]!.content.length).toBe(2);
      expect(result.items[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "A dagger deals 1-4 piercing damage.",
      });
      expect(result.items[0]!.content[1]).toEqual({
        type: "heading",
        level: 2,
        text: "Dagger",
      });
    });

    it("generates canonical ID with correct kind", () => {
      const record = makeCopyModRawRecord();
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);

      expect(result.items[0]!.id).toContain("item:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const record = makeCopyModRawRecord();
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);

      expect(result.items[0]!.id).toContain(":2014:");
    });
  });
});

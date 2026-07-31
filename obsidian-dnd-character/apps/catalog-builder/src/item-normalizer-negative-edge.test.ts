import { describe, it, expect } from "vitest";
import { normalizeItems, type ItemNormalizerInput } from "./item-normalizer";
import { makeCopyModRawRecord, ctx } from "./item-normalizer-test-helpers";

describe("normalizeItems - edge cases", () => {
  describe("diagnostic structure", () => {
    it("includes record name in diagnostic", () => {
      const record = makeCopyModRawRecord({ name: "Exotic Blade", source: "DMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.diagnostics[0]!.recordName).toBe("Exotic Blade");
    });

    it("includes entity kind in diagnostic", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "DMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.diagnostics[0]!.entityKind).toBe("item");
    });

    it("includes record index in diagnostic", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "DMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.diagnostics[0]!.recordIndex).toBe(0);
    });

    it("diagnostics are frozen", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "DMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
      expect(Object.isFrozen(result.diagnostics[0])).toBe(true);
    });
  });

  describe("content extraction edge cases", () => {
    it("skips invalid entry types", () => {
      const record = makeCopyModRawRecord({
        entries: ["not-an-object", null, { type: "paragraph", text: "valid" }],
      });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.content.length).toBe(1);
    });

    it("skips empty entry string", () => {
      const record = makeCopyModRawRecord({ entry: "" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.content.length).toBe(0);
    });

    it("skips empty description", () => {
      const record = makeCopyModRawRecord({ description: "" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.content.length).toBe(0);
    });

    it("skips invalid page numbers", () => {
      const record = makeCopyModRawRecord({ page: -1 });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.page).toBeUndefined();
    });

    it("skips non-integer page numbers", () => {
      const record = makeCopyModRawRecord({ page: 1.5 });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.page).toBeUndefined();
    });

    it("skips zero page numbers", () => {
      const record = makeCopyModRawRecord({ page: 0 });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.page).toBeUndefined();
    });

    it("skips invalid cost strings", () => {
      const record = makeCopyModRawRecord({ cost: "not-a-number gp" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.cost).toBeUndefined();
    });

    it("skips negative weight", () => {
      const record = makeCopyModRawRecord({ weight: -1 });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.weight).toBeUndefined();
    });

    it("skips unknown body slot", () => {
      const record = makeCopyModRawRecord({ bodySlot: "feet" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.bodySlot).toBeUndefined();
    });

    it("skips unknown rarity", () => {
      const record = makeCopyModRawRecord({ rarity: "mythic" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.rarity).toBeUndefined();
    });

    it("skips empty properties array", () => {
      const record = makeCopyModRawRecord({ properties: [] });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.properties).toEqual([]);
    });

    it("filters empty strings from properties array", () => {
      const record = makeCopyModRawRecord({ properties: ["Finesse", "", "Light"] });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.properties).toEqual(["Finesse", "Light"]);
    });

    it("defaults requiresAttunement to false when missing", () => {
      const record = makeCopyModRawRecord({});
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.requiresAttunement).toBe(false);
    });

    it("defaults legacy to false", () => {
      const record = makeCopyModRawRecord({});
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.legacy).toBe(false);
    });
  });
});

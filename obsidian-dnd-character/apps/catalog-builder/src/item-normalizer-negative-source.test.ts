import { describe, it, expect } from "vitest";
import { normalizeItems, type ItemNormalizerInput } from "./item-normalizer";
import { makeCopyModRawRecord, ctx } from "./item-normalizer-test-helpers";

describe("normalizeItems - source failures", () => {
  describe("source classification failures", () => {
    it("rejects unsupported source XGtE with EXCLUDED_SOURCE", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "XGtE" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("rejects ERW source with EXCLUDED_SOURCE", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "ERLW" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });

    it("accepts DMG source as supported 2014 magic item source", () => {
      const record = makeCopyModRawRecord({ name: "Magic Sword", source: "DMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0]!.ruleset).toBe("2014");
      expect(result.diagnostics.length).toBe(0);
    });

    it("accepts XDMG source as supported 2024 magic item source", () => {
      const record = makeCopyModRawRecord({ name: "Wand of Magic", source: "XDMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0]!.ruleset).toBe("2024");
      expect(result.diagnostics.length).toBe(0);
    });

    it("rejects MM source with EXCLUDED_SOURCE", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "MM" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });

    it("rejects unknown source with UNKNOWN_SOURCE", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "GROB" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("warning");
    });

    it("rejects empty source with INVALID_SOURCE", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
      expect(result.diagnostics[0]!.severity).toBe("error");
    });

    it("rejects whitespace-only source with INVALID_SOURCE", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "   " });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
    });
  });

  describe("mixed batch handling", () => {
    it("accepts PHB and DMG items and rejects unsupported sources in same batch", () => {
      const validPhb = makeCopyModRawRecord({ name: "Dagger" });
      const validDmg = makeCopyModRawRecord({ name: "Magic Sword", source: "DMG" });
      const invalid = makeCopyModRawRecord({ name: "Exotic Item", source: "XGtE" });

      const input: ItemNormalizerInput = { records: [validPhb, validDmg, invalid], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(2);
      expect(result.items[0]!.name).toBe("Dagger");
      expect(result.items[1]!.name).toBe("Magic Sword");
      expect(result.items[1]!.ruleset).toBe("2014");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });

    it("accepts XPHB items and rejects unknown sources in same batch", () => {
      const valid = makeCopyModRawRecord({ name: "Dagger", source: "XPHB" });
      const invalid = makeCopyModRawRecord({ name: "Sword", source: "UNKNOWN" });

      const input: ItemNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0]!.name).toBe("Dagger");
      expect(result.items[0]!.ruleset).toBe("2024");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
    });

    it("rejects all items when none are from supported sources", () => {
      const records = [
        makeCopyModRawRecord({ name: "A", source: "MM" }),
        makeCopyModRawRecord({ name: "B", source: "XGtE" }),
        makeCopyModRawRecord({ name: "C", source: "ERLW" }),
      ];
      const input: ItemNormalizerInput = { records, context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics.length).toBe(3);
    });
  });
});

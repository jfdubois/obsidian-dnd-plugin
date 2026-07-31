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

    it("rejects DMG source with EXCLUDED_SOURCE", () => {
      const record = makeCopyModRawRecord({ name: "Dagger", source: "DMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
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
    it("accepts PHB items and rejects unsupported sources in same batch", () => {
      const valid = makeCopyModRawRecord({ name: "Dagger" });
      const invalid = makeCopyModRawRecord({ name: "Magic Sword", source: "DMG" });

      const input: ItemNormalizerInput = { records: [valid, invalid], context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0]!.name).toBe("Dagger");
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
        makeCopyModRawRecord({ name: "A", source: "DMG" }),
        makeCopyModRawRecord({ name: "B", source: "MM" }),
        makeCopyModRawRecord({ name: "C", source: "XGtE" }),
      ];
      const input: ItemNormalizerInput = { records, context: ctx };

      const result = normalizeItems(input);
      expect(result.items.length).toBe(0);
      expect(result.diagnostics.length).toBe(3);
    });
  });
});

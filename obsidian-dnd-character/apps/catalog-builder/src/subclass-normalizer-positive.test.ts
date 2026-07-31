import { describe, it, expect } from "vitest";
import { normalizeSubclasses, type SubclassNormalizerInput } from "./subclass-normalizer";
import { makeCopyModRawRecord, makeIndexedEntry, ctx } from "./subclass-normalizer-test-helpers";

describe("normalizeSubclasses", () => {
  describe("empty input", () => {
    it("returns empty result for no entries", () => {
      const input: SubclassNormalizerInput = { entries: [], context: ctx };
      const result = normalizeSubclasses(input);

      expect(result.subclasses).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const entry = makeIndexedEntry();
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };
      const result = normalizeSubclasses(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.subclasses)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("normalizes a valid PHB subclass entry", () => {
      const entry = makeIndexedEntry();
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(1);
      const sub = result.subclasses[0]!;
      expect(sub.kind).toBe("subclass");
      expect(sub.name).toBe("Champion");
      expect(sub.ruleset).toBe("2014");
      expect(sub.access).toBe("core");
      expect(sub.legacy).toBe(false);
      expect(sub.levelRequirement).toBe(3);
      expect(sub.content).toEqual([]);
      expect(sub.prerequisites).toEqual([]);
      expect(sub.effects).toEqual([]);
      expect(sub.choices).toEqual([]);
      expect(sub.featureIds).toEqual([]);
      expect(sub.dependencies.length).toBe(1);
      expect(sub.parentId).toContain("fighter");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB subclass entry", () => {
      const entry = makeIndexedEntry({
        id: "subclass:2024:core:fighter-champion",
        sourceId: "source:2024:core:xphb",
        name: "Warlord",
        source: "XPHB",
        ruleset: "2024",
        parentId: "Fighter",
        record: makeCopyModRawRecord({ parent: "Fighter" }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(1);
      expect(result.subclasses[0]!.ruleset).toBe("2024");
      expect(result.subclasses[0]!.name).toBe("Warlord");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple subclasses in a single batch", () => {
      const champion = makeIndexedEntry();
      const arcane = makeIndexedEntry({
        id: "subclass:2014:core:wizard-arcane-tradition",
        sourceId: "source:2014:core:phb",
        name: "School of Arcane Tradition",
        parentId: "Wizard",
        record: makeCopyModRawRecord({ parent: "Wizard" }),
      });

      const input: SubclassNormalizerInput = { entries: [champion, arcane], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(2);
      expect(result.subclasses[0]!.name).toBe("Champion");
      expect(result.subclasses[1]!.name).toBe("School of Arcane Tradition");
    });

    it("resolves parentId to canonical class ID", () => {
      const entry = makeIndexedEntry();
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      const sub = result.subclasses[0]!;
      expect(sub.parentId).toBeDefined();
      // The parent ID should contain "class" kind and "fighter" name
      expect(sub.parentId).toContain("class:");
      expect(sub.parentId).toContain("fighter");
      // The parent ID should also be listed in dependencies
      expect(sub.dependencies).toContain(sub.parentId);
    });

    it("extracts narrative content from entries", () => {
      const entry = makeIndexedEntry({
        record: makeCopyModRawRecord({
          parent: "Fighter",
          entries: [
            { type: "paragraph", text: "The Champion archetype represents" },
            { type: "heading", text: "Extra Ability", level: 2 },
          ],
        }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses[0]!.content.length).toBe(2);
      expect(result.subclasses[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "The Champion archetype represents",
      });
      expect(result.subclasses[0]!.content[1]).toEqual({
        type: "heading",
        level: 2,
        text: "Extra Ability",
      });
    });

    it("extracts page number from record", () => {
      const entry = makeIndexedEntry({
        record: makeCopyModRawRecord({ parent: "Fighter", page: 87 }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses[0]!.page).toBe(87);
    });

    it("extracts summary from record", () => {
      const entry = makeIndexedEntry({
        record: makeCopyModRawRecord({ parent: "Fighter", summary: "Improved attacks" }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses[0]!.summary).toBe("Improved attacks");
    });

    it("extracts description as paragraph content", () => {
      const entry = makeIndexedEntry({
        record: makeCopyModRawRecord({
          parent: "Fighter",
          description: "Champions are meticulous students of combat",
        }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses[0]!.content.length).toBe(1);
      expect(result.subclasses[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Champions are meticulous students of combat",
      });
    });
  });
});

import { describe, it, expect } from "vitest";
import { normalizeSubclasses, type SubclassNormalizerInput } from "./subclass-normalizer";
import { makeCopyModRawRecord, makeIndexedEntry, ctx } from "./subclass-normalizer-test-helpers";

describe("normalizeSubclasses", () => {
  describe("source exclusion", () => {
    it("excludes non-PHB/XPHB sources with EXCLUDED_SOURCE diagnostic", () => {
      const entry = makeIndexedEntry({
        name: "Battle Smith",
        source: "XGtE",
        parentId: "Artificer",
        record: makeCopyModRawRecord({ parent: "Artificer", source: "XGtE" }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });

    it("excludes unknown sources with UNKNOWN_SOURCE diagnostic", () => {
      const entry = makeIndexedEntry({
        name: "Fake Subclass",
        source: "FAKE",
        parentId: "FakeClass",
        record: makeCopyModRawRecord({ parent: "FakeClass", source: "FAKE" }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("UNKNOWN_SOURCE");
    });

    it("excludes ERLW source with EXCLUDED_SOURCE diagnostic", () => {
      const entry = makeIndexedEntry({
        name: "Fiend",
        source: "ERLW",
        parentId: "Warlock",
        record: makeCopyModRawRecord({ parent: "Warlock", source: "ERLW" }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });
  });

  describe("base class misdirection", () => {
    it("rejects base classes with BASE_CLASS_MISDIRECTED diagnostic", () => {
      const entry = makeIndexedEntry({
        isSubclass: false,
        parentId: undefined,
        record: makeCopyModRawRecord({
          hitdie: 10,
          primaryability: ["STR"],
          savingthrows: ["STR", "CON"],
        }),
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("BASE_CLASS_MISDIRECTED");
    });

    it("processes subclasses while rejecting base classes in mixed batch", () => {
      const champion = makeIndexedEntry();
      const fighter = makeIndexedEntry({
        id: "class:2014:core:fighter",
        name: "Fighter",
        isSubclass: false,
        parentId: undefined,
        record: makeCopyModRawRecord({
          hitdie: 10,
          primaryability: ["STR"],
          savingthrows: ["STR", "CON"],
        }),
      });

      const input: SubclassNormalizerInput = { entries: [champion, fighter], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(1);
      expect(result.subclasses[0]!.name).toBe("Champion");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("BASE_CLASS_MISDIRECTED");
    });
  });

  describe("parent ID validation", () => {
    it("rejects subclass with missing parentId", () => {
      const entry = makeIndexedEntry({
        parentId: undefined,
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_PARENT_ID");
    });

    it("rejects subclass with empty parentId", () => {
      const entry = makeIndexedEntry({
        parentId: "",
      });
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_PARENT_ID");
    });
  });

  describe("canonical ID generation", () => {
    it("generates canonical ID with correct kind", () => {
      const entry = makeIndexedEntry();
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses[0]!.id).toContain("subclass:");
    });

    it("generates canonical parent ID with class kind", () => {
      const entry = makeIndexedEntry();
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      expect(result.subclasses[0]!.parentId).toContain("class:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const entry = makeIndexedEntry();
      const input: SubclassNormalizerInput = { entries: [entry], context: ctx };

      const result = normalizeSubclasses(input);

      // PHB -> 2014 ruleset
      expect(result.subclasses[0]!.id).toContain(":2014:");
      expect(result.subclasses[0]!.parentId).toContain(":2014:");
    });
  });
});

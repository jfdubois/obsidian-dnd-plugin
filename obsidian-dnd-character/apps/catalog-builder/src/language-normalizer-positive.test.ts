import { describe, it, expect } from "vitest";
import { normalizeLanguages, type LanguageNormalizerInput } from "./language-normalizer";
import { makeCopyModRawRecord, ctx } from "./language-normalizer-test-helpers";

describe("normalizeLanguages", () => {
  describe("empty input", () => {
    it("returns empty result for no records", () => {
      const input: LanguageNormalizerInput = { records: [], context: ctx };
      const result = normalizeLanguages(input);

      expect(result.languages).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const record = makeCopyModRawRecord();
      const input: LanguageNormalizerInput = { records: [record], context: ctx };
      const result = normalizeLanguages(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.languages)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("normalizes a valid PHB language", () => {
      const record = makeCopyModRawRecord();
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(1);
      const language = result.languages[0]!;
      expect(language.kind).toBe("language");
      expect(language.name).toBe("Common");
      expect(language.ruleset).toBe("2014");
      expect(language.access).toBe("core");
      expect(language.type).toBe("language");
      expect(language.content).toEqual([]);
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB language", () => {
      const record = makeCopyModRawRecord({
        name: "Common",
        source: "XPHB",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(1);
      expect(result.languages[0]!.ruleset).toBe("2024");
      expect(result.languages[0]!.name).toBe("Common");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple languages in a single batch", () => {
      const common = makeCopyModRawRecord({ name: "Common", type: "language" });
      const drow = makeCopyModRawRecord({ name: "Drow", type: "language" });

      const input: LanguageNormalizerInput = { records: [common, drow], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(2);
      expect(result.languages[0]!.name).toBe("Common");
      expect(result.languages[0]!.type).toBe("language");
      expect(result.languages[1]!.name).toBe("Drow");
      expect(result.languages[1]!.type).toBe("language");
    });

    it("normalizes a script type language", () => {
      const record = makeCopyModRawRecord({
        name: "Draconic",
        type: "script",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages.length).toBe(1);
      expect(result.languages[0]!.type).toBe("script");
    });

    it("extracts narrative content from entries", () => {
      const record = makeCopyModRawRecord({
        name: "Common",
        entries: [
          { type: "paragraph", text: "Common is the tongue of commonality." },
          { type: "heading", text: "Common", level: 2 },
        ],
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages[0]!.content.length).toBe(2);
      expect(result.languages[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Common is the tongue of commonality.",
      });
      expect(result.languages[0]!.content[1]).toEqual({
        type: "heading",
        level: 2,
        text: "Common",
      });
    });

    it("extracts page number from record", () => {
      const record = makeCopyModRawRecord({ page: 123 });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages[0]!.page).toBe(123);
    });

    it("extracts summary from record", () => {
      const record = makeCopyModRawRecord({ summary: "The lingua franca of the realm." });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages[0]!.summary).toBe("The lingua franca of the realm.");
    });

    it("extracts description as paragraph content", () => {
      const record = makeCopyModRawRecord({
        description: "Common is the most widely spoken language.",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages[0]!.content.length).toBe(1);
      expect(result.languages[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Common is the most widely spoken language.",
      });
    });

    it("generates canonical ID with correct kind", () => {
      const record = makeCopyModRawRecord();
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages[0]!.id).toContain("language:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const record = makeCopyModRawRecord();
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      // PHB -> 2014 ruleset
      expect(result.languages[0]!.id).toContain(":2014:");
    });

    it("extracts speakerType from record", () => {
      const record = makeCopyModRawRecord({
        speakerType: "All races",
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages[0]!.speakerType).toBe("All races");
    });

    it("handles list entries in content", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "list", items: ["item1", "item2"] },
        ],
      });
      const input: LanguageNormalizerInput = { records: [record], context: ctx };

      const result = normalizeLanguages(input);

      expect(result.languages[0]!.content.length).toBe(1);
      expect(result.languages[0]!.content[0]).toEqual({
        type: "list",
        ordered: false,
        items: [],
      });
    });
  });
});

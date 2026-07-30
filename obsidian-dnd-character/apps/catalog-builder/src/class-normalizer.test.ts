import { describe, it, expect } from "vitest";
import { normalizeClasses, type ClassNormalizerInput } from "./class-normalizer";
import type { IndexedClassEntry } from "./class-index-types";
import type { CopyModRawRecord } from "./mod-types";

/* ── Helpers ───────────────────────────────────────────────────── */

function makeCopyModRawRecord(overrides: Record<string, unknown> = {}): CopyModRawRecord {
  return Object.freeze({
    name: "Fighter",
    source: "PHB",
    remaining: Object.freeze({
      hitdie: 10,
      primaryability: ["STR"],
      savingthrows: ["STR", "CON"],
      entries: [],
      ...overrides,
    }),
  });
}

function makeIndexedEntry(overrides: Partial<IndexedClassEntry> = {}): IndexedClassEntry {
  const record = makeCopyModRawRecord(overrides.record?.remaining);
  return Object.freeze({
    id: "class:2014:core:fighter",
    sourceId: "source:2014:core:phb",
    name: "Fighter",
    source: "PHB",
    ruleset: "2014",
    record: overrides.record ?? record,
    isSubclass: false,
    hitDie: 10,
    primaryAbilities: ["STR"],
    savingThrowProficiencies: ["STR", "CON"],
    diagnostics: [],
    ...overrides,
  });
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("normalizeClasses", () => {
  describe("positive normalization", () => {
    it("normalizes a valid PHB class entry", () => {
      const entry = makeIndexedEntry();
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(1);
      expect(result.classes[0]!.id).toBe("class:2014:core:fighter");
      expect(result.classes[0]!.kind).toBe("class");
      expect(result.classes[0]!.name).toBe("Fighter");
      expect(result.classes[0]!.ruleset).toBe("2014");
      expect(result.classes[0]!.access).toBe("core");
      expect(result.classes[0]!.hitDie).toBe(10);
      expect(result.classes[0]!.primaryAbilities).toEqual(["STR"]);
      expect(result.classes[0]!.savingThrowProficiencies).toEqual(["STR", "CON"]);
      expect(result.classes[0]!.legacy).toBe(false);
      expect(result.classes[0]!.content).toEqual([]);
      expect(result.classes[0]!.startingChoices).toEqual([]);
      expect(result.classes[0]!.levels).toEqual({});
      expect(result.classes[0]!.subclassIds).toEqual([]);
      expect(result.diagnostics.length).toBe(0);
    });

    it("creates saving throw proficiency effects", () => {
      const entry = makeIndexedEntry();
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.effects.length).toBe(2);
      expect(result.classes[0]!.effects[0]!.type).toBe("add-proficiency");
      expect(result.classes[0]!.effects[1]!.type).toBe("add-proficiency");
    });

    it("normalizes a valid XPHB class entry", () => {
      const entry = makeIndexedEntry({
        id: "class:2024:core:fighter",
        sourceId: "source:2024:core:xphb",
        name: "Fighter",
        source: "XPHB",
        ruleset: "2024",
        hitDie: 10,
        primaryAbilities: ["STR"],
        savingThrowProficiencies: ["STR", "CON"],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(1);
      expect(result.classes[0]!.ruleset).toBe("2024");
      expect(result.classes[0]!.name).toBe("Fighter");
    });

    it("normalizes multiple classes in a single batch", () => {
      const wizard = makeIndexedEntry({
        id: "class:2014:core:wizard",
        sourceId: "source:2014:core:phb",
        name: "Wizard",
        hitDie: 6,
        primaryAbilities: ["INT"],
        savingThrowProficiencies: ["INT", "WIS"],
      });
      const rogue = makeIndexedEntry({
        id: "class:2014:core:rogue",
        sourceId: "source:2014:core:phb",
        name: "Rogue",
        hitDie: 8,
        primaryAbilities: ["DEX"],
        savingThrowProficiencies: ["DEX", "INT"],
      });

      const input: ClassNormalizerInput = { entries: [wizard, rogue] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(2);
      expect(result.classes[0]!.name).toBe("Wizard");
      expect(result.classes[0]!.hitDie).toBe(6);
      expect(result.classes[1]!.name).toBe("Rogue");
      expect(result.classes[1]!.hitDie).toBe(8);
    });

    it("handles classes with multiple primary abilities", () => {
      const entry = makeIndexedEntry({
        id: "class:2014:core:paladin",
        sourceId: "source:2014:core:phb",
        name: "Paladin",
        hitDie: 10,
        primaryAbilities: ["STR", "CHA"],
        savingThrowProficiencies: ["WIS", "CHA"],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(1);
      expect(result.classes[0]!.primaryAbilities).toEqual(["STR", "CHA"]);
      expect(result.classes[0]!.savingThrowProficiencies).toEqual(["WIS", "CHA"]);
    });
  });

  describe("subclass exclusion", () => {
    it("excludes subclass entries", () => {
      const subclass = makeIndexedEntry({
        id: "class:2014:core:fighter-champion",
        sourceId: "source:2014:core:phb",
        name: "Champion",
        isSubclass: true,
        parentId: "class:2014:core:fighter",
      });
      const input: ClassNormalizerInput = { entries: [subclass] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("SUBCLASS_EXCLUDED");
    });

    it("processes base classes while excluding subclasses in mixed batch", () => {
      const fighter = makeIndexedEntry();
      const champion = makeIndexedEntry({
        id: "class:2014:core:fighter-champion",
        sourceId: "source:2014:core:phb",
        name: "Champion",
        isSubclass: true,
        parentId: "class:2014:core:fighter",
      });

      const input: ClassNormalizerInput = { entries: [fighter, champion] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(1);
      expect(result.classes[0]!.name).toBe("Fighter");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("SUBCLASS_EXCLUDED");
    });
  });

  describe("field extraction", () => {
    it("extracts hit die from entry", () => {
      const entry = makeIndexedEntry({ hitDie: 8 });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.hitDie).toBe(8);
    });

    it("extracts primary abilities as Ability[]", () => {
      const entry = makeIndexedEntry({
        primaryAbilities: ["DEX"],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.primaryAbilities).toEqual(["DEX"]);
    });

    it("extracts saving throw proficiencies as Ability[]", () => {
      const entry = makeIndexedEntry({
        savingThrowProficiencies: ["DEX", "INT"],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.savingThrowProficiencies).toEqual(["DEX", "INT"]);
    });

    it("converts lowercase ability strings to uppercase", () => {
      const entry = makeIndexedEntry({
        primaryAbilities: ["str"],
        savingThrowProficiencies: ["str", "con"],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.primaryAbilities).toEqual(["STR"]);
      expect(result.classes[0]!.savingThrowProficiencies).toEqual(["STR", "CON"]);
    });
  });

  describe("edge cases", () => {
    it("rejects entries with missing hit die", () => {
      const entry = makeIndexedEntry({ hitDie: undefined });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_HIT_DIE");
    });

    it("rejects entries with empty primary abilities", () => {
      const entry = makeIndexedEntry({ primaryAbilities: [] });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_PRIMARY_ABILITIES");
    });

    it("rejects entries with empty saving throw proficiencies", () => {
      const entry = makeIndexedEntry({ savingThrowProficiencies: [] });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("MISSING_SAVING_THROW_PROFICIENCIES");
    });

    it("warns on invalid primary ability strings", () => {
      const entry = makeIndexedEntry({
        primaryAbilities: ["STR", "LCK"],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(1);
      expect(result.classes[0]!.primaryAbilities).toEqual(["STR"]);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_PRIMARY_ABILITY");
    });

    it("warns on invalid saving throw ability strings", () => {
      const entry = makeIndexedEntry({
        savingThrowProficiencies: ["STR", "LCK"],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(1);
      expect(result.classes[0]!.savingThrowProficiencies).toEqual(["STR"]);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SAVING_THROW_ABILITY");
    });

    it("handles empty input", () => {
      const input: ClassNormalizerInput = { entries: [] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(0);
      expect(result.diagnostics.length).toBe(0);
    });
  });

  describe("excluded sources", () => {
    it("forwards EXCLUDED_SOURCE diagnostics from index loader", () => {
      const entry = makeIndexedEntry({
        diagnostics: [{
          code: "EXCLUDED_SOURCE",
          severity: "warning",
          message: "Source not supported",
          recordName: "Fighter",
          source: "XGtE",
        }],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    });

    it("forwards INVALID_SOURCE diagnostics from index loader", () => {
      const entry = makeIndexedEntry({
        diagnostics: [{
          code: "INVALID_SOURCE",
          severity: "error",
          message: "Invalid source",
          recordName: "Fighter",
        }],
      });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("INVALID_SOURCE");
    });
  });

  describe("content extraction", () => {
    it("extracts paragraph content from entries", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "paragraph", text: "Fighters are expert martial combatants." },
        ],
      });
      const entry = makeIndexedEntry({ record });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.content.length).toBe(1);
      expect(result.classes[0]!.content[0]!).toEqual({
        type: "paragraph",
        text: "Fighters are expert martial combatants.",
      });
    });

    it("extracts heading content", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "heading", level: 2, text: "Hit Points" },
        ],
      });
      const entry = makeIndexedEntry({ record });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.content.length).toBe(1);
      expect(result.classes[0]!.content[0]!).toEqual({
        type: "heading",
        level: 2,
        text: "Hit Points",
      });
    });

    it("extracts description field as paragraph", () => {
      const record = makeCopyModRawRecord({
        description: "A master of martial combat.",
      });
      const entry = makeIndexedEntry({ record });
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(result.classes[0]!.content.length).toBe(1);
      expect(result.classes[0]!.content[0]!).toEqual({
        type: "paragraph",
        text: "A master of martial combat.",
      });
    });
  });

  describe("frozen results", () => {
    it("returns a frozen result object", () => {
      const entry = makeIndexedEntry();
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.classes)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });

    it("returns frozen class rules", () => {
      const entry = makeIndexedEntry();
      const input: ClassNormalizerInput = { entries: [entry] };

      const result = normalizeClasses(input);

      expect(Object.isFrozen(result.classes[0]!)).toBe(true);
    });

    it("returns frozen diagnostics", () => {
      const subclass = makeIndexedEntry({
        isSubclass: true,
      });
      const input: ClassNormalizerInput = { entries: [subclass] };

      const result = normalizeClasses(input);

      expect(Object.isFrozen(result.diagnostics[0]!)).toBe(true);
    });
  });

  describe("mixed batches", () => {
    it("processes valid classes and excludes subclasses", () => {
      const fighter = makeIndexedEntry();
      const champion = makeIndexedEntry({
        id: "class:2014:core:fighter-champion",
        name: "Champion",
        isSubclass: true,
        parentId: "class:2014:core:fighter",
      });
      const wizard = makeIndexedEntry({
        id: "class:2014:core:wizard",
        name: "Wizard",
        hitDie: 6,
        primaryAbilities: ["INT"],
        savingThrowProficiencies: ["INT", "WIS"],
      });

      const input: ClassNormalizerInput = { entries: [fighter, champion, wizard] };

      const result = normalizeClasses(input);

      expect(result.classes.length).toBe(2);
      expect(result.classes[0]!.name).toBe("Fighter");
      expect(result.classes[1]!.name).toBe("Wizard");
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("SUBCLASS_EXCLUDED");
    });
  });
});

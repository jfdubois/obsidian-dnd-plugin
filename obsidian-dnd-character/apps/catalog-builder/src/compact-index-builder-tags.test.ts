import { describe, it, expect } from "vitest";
import {
  entityToSummary,
  type CompactIndexDiagnostic,
} from "./compact-index-builder";
import {
  makeSpecies,
  makeBackground,
  makeClass,
  makeSubclass,
  makeFeat,
  makeSpell,
  makeItem,
  makeOptionalFeature,
  makeSkill,
  makeLanguage,
} from "./compact-index-builder-test-helpers";

describe("compact-index-builder tags", () => {
  describe("species tags", () => {
    it("generates species tags from traitDefs and darkvision", () => {
      const entity = makeSpecies("elf", "Elf", ["Fey Ancestry", "Dark-Elven Magic"], true);
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary).toBeDefined();
      expect(summary!.tags).toContain("fey ancestry");
      expect(summary!.tags).toContain("dark-elven magic");
      expect(summary!.tags).toContain("darkvision");
    });

    it("generates empty tags for species with no traits", () => {
      const entity = makeSpecies("human", "Human", [], false);
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toEqual([]);
    });
  });

  describe("class tags", () => {
    it("generates class tags from primaryAbilities and savingThrowProficiencies", () => {
      const entity = makeClass("fighter", "Fighter", ["STR", "CON"], ["STR", "CON"]);
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("str");
      expect(summary!.tags).toContain("con");
      expect(summary!.tags).toContain("str-save");
      expect(summary!.tags).toContain("con-save");
    });
  });

  describe("spell tags", () => {
    it("generates spell tags from school and level", () => {
      const entity = makeSpell("shield", "Shield", "Abjuration", 1, false, false);
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("abjuration");
      expect(summary!.tags).toContain("1st-level");
    });

    it("generates cantrip tag for level 0 spells", () => {
      const entity = makeSpell("firebolt", "Firebolt", "Evocation", 0);
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("cantrip");
    });

    it("generates ritual and concentration tags", () => {
      const entity = makeSpell("calm-emotions", "Calm Emotions", "Enchantment", 1, true, true);
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("ritual");
      expect(summary!.tags).toContain("concentration");
    });
  });

  describe("item tags", () => {
    it("generates item tags from rarity, category, bodySlot", () => {
      const entity = makeItem("amulet", "Amulet of Health", "other", "rare", "amulet");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("other");
      expect(summary!.tags).toContain("rare");
      expect(summary!.tags).toContain("amulet");
    });

    it("generates tags without optional fields", () => {
      const entity = makeItem("dagger", "Dagger", "weapon");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("weapon");
      expect(summary!.tags).not.toContain("undefined");
    });
  });

  describe("skill tags", () => {
    it("generates skill tags from abilityScore", () => {
      const entity = makeSkill("acrobatics", "Acrobatics", "DEX");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("dex");
    });
  });

  describe("language tags", () => {
    it("generates language tags from type", () => {
      const entity = makeLanguage("common", "Common", "language");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("language");
    });
  });

  describe("background tags", () => {
    it("generates background tags from featureId", () => {
      const entity = makeBackground("soldier", "Soldier", "military-rank");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("military-rank");
    });

    it("generates empty tags for background with no featureId", () => {
      const entity = makeBackground("criminal", "Criminal");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toEqual([]);
    });
  });

  describe("subclass tags", () => {
    it("generates subclass tags from parentId", () => {
      const entity = makeSubclass("champion", "Champion", "fighter");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("fighter");
    });
  });

  describe("feat tags", () => {
    it("generates feat tags from abilityScorePrerequisite", () => {
      const entity = makeFeat("great-weapon-fighter", "Great Weapon Fighter", "STR");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toContain("str");
    });

    it("generates empty tags for feat with no prerequisite", () => {
      const entity = makeFeat("tough", "Tough");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toEqual([]);
    });
  });

  describe("optional-feature tags", () => {
    it("generates empty tags for optional-feature", () => {
      const entity = makeOptionalFeature("heroic-soviet", "Heroic Rest");
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary!.tags).toEqual([]);
    });
  });
});

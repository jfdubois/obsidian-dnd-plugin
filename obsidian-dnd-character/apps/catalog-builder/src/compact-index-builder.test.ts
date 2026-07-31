import { describe, it, expect } from "vitest";
import {
  buildCompactIndex,
  entityToSummary,
  buildDetailPath,
  type CatalogableEntity,
  type CompactIndexDiagnostic,
} from "./compact-index-builder";
import { createEntityId } from "@obsidian-dnd/domain";
import {
  makeSpecies,
  makeFeat,
  makeBackground,
  makeClass,
  makeSpell,
  makeSkill,
  makeLanguage,
} from "./compact-index-builder-test-helpers";

describe("compact-index-builder", () => {
  describe("buildDetailPath", () => {
    it("builds correct detail path", () => {
      const path = buildDetailPath("species", createEntityId("human"));
      expect(path).toBe("entities/species/human.json");
    });
  });

  describe("buildCompactIndex", () => {
    it("returns empty result for empty input", () => {
      const result = buildCompactIndex([]);
      expect(result.index).toHaveLength(0);
      expect(result.totalEntities).toBe(0);
      expect(result.totalKinds).toBe(0);
      expect(result.diagnostics).toHaveLength(0);
    });

    it("groups entities by kind", () => {
      const species = makeSpecies("human", "Human", []);
      const feat = makeFeat("tough", "Tough");
      const result = buildCompactIndex([species, feat]);

      expect(result.index).toHaveLength(2);
      expect(result.totalEntities).toBe(2);
      expect(result.totalKinds).toBe(2);

      const featGroup = result.index.find((g) => g.kind === "feat");
      expect(featGroup).toBeDefined();
      expect(featGroup!.count).toBe(1);

      const speciesGroup = result.index.find((g) => g.kind === "species");
      expect(speciesGroup).toBeDefined();
      expect(speciesGroup!.count).toBe(1);
    });

    it("sorts summaries by name case-insensitive", () => {
      const entities: CatalogableEntity[] = [
        makeFeat("zealous", "Zealous"),
        makeFeat("alpha", "Alpha"),
        makeFeat("bravo", "Bravo"),
      ];
      const result = buildCompactIndex(entities);
      const featGroup = result.index.find((g) => g.kind === "feat")!;

      expect(featGroup.summaries[0]!.name).toBe("Alpha");
      expect(featGroup.summaries[1]!.name).toBe("Bravo");
      expect(featGroup.summaries[2]!.name).toBe("Zealous");
    });

    it("sorts kind groups alphabetically", () => {
      const entities: CatalogableEntity[] = [
        makeSpecies("human", "Human", []),
        makeFeat("tough", "Tough"),
        makeBackground("soldier", "Soldier"),
      ];
      const result = buildCompactIndex(entities);

      expect(result.index[0]!.kind).toBe("background");
      expect(result.index[1]!.kind).toBe("feat");
      expect(result.index[2]!.kind).toBe("species");
    });

    it("freezes output", () => {
      const species = makeSpecies("human", "Human", []);
      const result = buildCompactIndex([species]);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.index)).toBe(true);
      expect(Object.isFrozen(result.index[0]!.summaries)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });

    it("emits diagnostic for missing name", () => {
      const entity = makeSpecies("human", "", []);
      const diagnostics: CompactIndexDiagnostic[] = [];
      const summary = entityToSummary(entity, diagnostics);

      expect(summary).toBeUndefined();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]!.code).toBe("MISSING_ENTITY_NAME");
    });

    it("handles mixed entity kinds", () => {
      const entities: CatalogableEntity[] = [
        makeSpecies("elf", "Elf", ["Fey Ancestry"]),
        makeClass("fighter", "Fighter", ["STR", "CON"], ["STR", "CON"]),
        makeSpell("fireball", "Fireball", "Evocation", 3, false, false),
        makeSkill("acrobatics", "Acrobatics", "DEX"),
        makeLanguage("common", "Common", "language"),
      ];
      const result = buildCompactIndex(entities);

      expect(result.totalEntities).toBe(5);
      expect(result.totalKinds).toBe(5);
    });

    it("produces deterministic output", () => {
      const entities: CatalogableEntity[] = [
        makeFeat("tough", "Tough"),
        makeSpecies("human", "Human", []),
        makeFeat("observant", "Observant"),
      ];

      const result1 = buildCompactIndex(entities);
      const result2 = buildCompactIndex(entities);

      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });
  });
});

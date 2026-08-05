import { describe, it, expect } from "vitest";
import type { EntityId } from "@obsidian-dnd/domain";
import type { CatalogLookup } from "./effect-provenance";
import { EFFECT_SOURCE_KINDS } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import {
  eid,
  makeEffect,
  makeSpecies,
  makeBackground,
  makeClass,
  makeCharacter,
  makeEmptyCatalog,
  cid,
} from "./effect-collection-helpers";

/* ── Core collection tests ──────────────────────────────────────── */

describe("collectEffects", () => {
  it("returns empty array for character with no catalog matches", () => {
    const character = makeCharacter({});
    const catalog = makeEmptyCatalog();

    const result = collectEffects(character, catalog);

    expect(result).toEqual([]);
  });

  it("collects species effects with correct provenance", () => {
    const speciesEffect = makeEffect("add-ability", { ability: "STR", value: 2 });
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: (id: EntityId) =>
        id === eid("species-elf")
          ? makeSpecies(eid("species-elf"), [speciesEffect])
          : undefined,
    };

    const character = makeCharacter({});
    const result = collectEffects(character, catalog);

    expect(result).toHaveLength(1);
    expect(result[0]!.effect).toBe(speciesEffect);
    expect(result[0]!.provenance.sourceKind).toBe("species");
    expect(result[0]!.provenance.entityId).toBe(eid("species-elf"));
  });

  it("collects background effects with correct provenance", () => {
    const bgEffect = makeEffect("add-language", { languageId: eid("lang-common") });
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getBackground: (id: EntityId) =>
        id === eid("bg-sage")
          ? makeBackground(eid("bg-sage"), [bgEffect])
          : undefined,
    };

    const character = makeCharacter({});
    const result = collectEffects(character, catalog);

    expect(result).toHaveLength(1);
    expect(result[0]!.provenance.sourceKind).toBe("background");
  });

  it("collects effects in deterministic order: species -> background -> class", () => {
    const speciesEffect = makeEffect("add-ability", { ability: "DEX", value: 2 });
    const bgEffect = makeEffect("add-language", { languageId: eid("lang-common") });
    const classEffect = makeEffect("add-proficiency", { proficiency: { type: "armor", armorId: eid("armor-light") } });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [speciesEffect]),
      getBackground: () => makeBackground(eid("bg-sage"), [bgEffect]),
      getClass: () => makeClass(eid("class-rogue"), [classEffect]),
    };

    const character = makeCharacter({
      progression: {
        classes: [
          { instanceId: cid("rogue-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] },
        ],
      },
    });

    const result = collectEffects(character, catalog);

    expect(result).toHaveLength(3);
    expect(result[0]!.provenance.sourceKind).toBe("species");
    expect(result[1]!.provenance.sourceKind).toBe("background");
    expect(result[2]!.provenance.sourceKind).toBe("class");
  });

  it("prioritizes starting classes over multiclass", () => {
    const rogueEffect = makeEffect("add-proficiency", { proficiency: { type: "armor", armorId: eid("armor-light") } });
    const wizardEffect = makeEffect("add-proficiency", { proficiency: { type: "armor", armorId: eid("armor-none") } });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getClass: (id: EntityId) => {
        if (id === eid("class-rogue")) {
          return makeClass(eid("class-rogue"), [rogueEffect]);
        }
        if (id === eid("class-wizard")) {
          return makeClass(eid("class-wizard"), [wizardEffect], { hitDie: 6, primaryAbilities: ["INT"], savingThrowProficiencies: ["INT", "WIS"] });
        }
        return undefined;
      },
    };

    const character = makeCharacter({
      progression: {
        classes: [
          { instanceId: cid("wizard-1"), classId: eid("class-wizard"), level: 5, isStartingClass: false, hitPointIncreases: [] },
          { instanceId: cid("rogue-1"), classId: eid("class-rogue"), level: 3, isStartingClass: true, hitPointIncreases: [] },
        ],
      },
    });

    const result = collectEffects(character, catalog);
    const classEffects = result.filter((e) => e.provenance.sourceKind === "class");

    expect(classEffects).toHaveLength(2);
    expect(classEffects[0]!.provenance.entityId).toBe(eid("class-rogue"));
    expect(classEffects[1]!.provenance.entityId).toBe(eid("class-wizard"));
  });

  it("returns frozen results that cannot be mutated", () => {
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [makeEffect("add-ability", { ability: "STR", value: 2 })]),
    };

    const character = makeCharacter({});
    const result = collectEffects(character, catalog);

    expect(Object.isFrozen(result)).toBe(true);
    if (result.length > 0) {
      expect(Object.isFrozen(result[0]!.provenance)).toBe(true);
    }
  });

  it("produces identical ordering for identical inputs", () => {
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf"), [makeEffect("add-ability", { ability: "DEX", value: 2 })]),
      getBackground: () => makeBackground(eid("bg-sage"), [makeEffect("add-language", { languageId: eid("lang-common") })]),
    };

    const character = makeCharacter({});

    const result1 = collectEffects(character, catalog);
    const result2 = collectEffects(character, catalog);

    expect(result1.length).toBe(result2.length);
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i]!.provenance.sourceKind).toBe(result2[i]!.provenance.sourceKind);
      expect(result1[i]!.provenance.entityId).toBe(result2[i]!.provenance.entityId);
    }
  });

  it("skips missing entities without throwing", () => {
    const catalog = makeEmptyCatalog();
    const character = makeCharacter({
      progression: {
        classes: [
          { instanceId: cid("rogue-1"), classId: eid("class-missing"), level: 1, isStartingClass: true, hitPointIncreases: [] },
        ],
      },
      origins: { speciesId: eid("species-missing"), backgroundId: eid("bg-missing") },
    });

    expect(() => collectEffects(character, catalog)).not.toThrow();
    expect(collectEffects(character, catalog)).toEqual([]);
  });
});

describe("EFFECT_SOURCE_KINDS", () => {
  it("contains all 12 source kinds in deterministic order", () => {
    expect(EFFECT_SOURCE_KINDS).toHaveLength(12);
    expect(EFFECT_SOURCE_KINDS[0]).toBe("species");
    expect(EFFECT_SOURCE_KINDS[1]).toBe("background");
    expect(EFFECT_SOURCE_KINDS[11]).toBe("override");
  });
});

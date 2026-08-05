import { describe, it, expect } from "vitest";
import type { EntityId } from "@obsidian-dnd/domain";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import {
  eid,
  cid,
  makeEffect,
  makeSpecies,
  makeBackground,
  makeClass,
  makeClassFeature,
  makeSubclass,
  makeSubclassFeature,
  makeCharacter,
  makeEmptyCatalog,
} from "./effect-collection-helpers";

/* ── Class feature, subclass, and subclass feature tests ────────── */

describe("collectEffects - class features", () => {
  it("collects class feature effects by level order", () => {
    const feature1 = makeClassFeature(eid("feat-sneak-attack"), eid("class-rogue"), 1, [makeEffect("add-ability", { ability: "DEX", value: 0 })]);
    const feature3 = makeClassFeature(eid("feat-uncanny-dodge"), eid("class-rogue"), 5, [makeEffect("add-capability", { capability: { type: "no-sleep-required" } })]);

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getClass: () => makeClass(eid("class-rogue"), [], {
        levels: {
          1: { level: 1, grants: [{ type: "feature", featureId: eid("feat-sneak-attack") }] },
          5: { level: 5, grants: [{ type: "feature", featureId: eid("feat-uncanny-dodge") }] },
        },
      }),
      getClassFeature: (id: EntityId) => {
        if (id === eid("feat-sneak-attack")) return feature1;
        if (id === eid("feat-uncanny-dodge")) return feature3;
        return undefined;
      },
    };

    const character = makeCharacter({
      progression: {
        classes: [
          { instanceId: cid("rogue-1"), classId: eid("class-rogue"), level: 5, isStartingClass: true, hitPointIncreases: [] },
        ],
      },
    });

    const result = collectEffects(character, catalog);
    const featureEffects = result.filter((e) => e.provenance.sourceKind === "class-feature");

    expect(featureEffects).toHaveLength(2);
    expect(featureEffects[0]!.provenance.entityId).toBe(eid("feat-sneak-attack"));
    expect(featureEffects[0]!.provenance.level).toBe(1);
    expect(featureEffects[1]!.provenance.entityId).toBe(eid("feat-uncanny-dodge"));
    expect(featureEffects[1]!.provenance.level).toBe(5);
  });
});

describe("collectEffects - subclass", () => {
  it("collects subclass effects when subclass is chosen", () => {
    const subclassEffect = makeEffect("add-language", { languageId: eid("lang-celestial") });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getClass: () => makeClass(eid("class-paladin"), [], { hitDie: 10, primaryAbilities: ["STR", "CHA"], savingThrowProficiencies: ["WIS", "CHA"], subclassIds: [eid("subclass-oath-vengeance")] }),
      getSubclass: () => makeSubclass(eid("subclass-oath-vengeance"), eid("class-paladin"), [subclassEffect]),
    };

    const character = makeCharacter({
      progression: {
        classes: [
          { instanceId: cid("paladin-1"), classId: eid("class-paladin"), level: 5, isStartingClass: true, subclassId: eid("subclass-oath-vengeance"), hitPointIncreases: [] },
        ],
      },
    });

    const result = collectEffects(character, catalog);
    const subclassEffects = result.filter((e) => e.provenance.sourceKind === "subclass");

    expect(subclassEffects).toHaveLength(1);
    expect(subclassEffects[0]!.effect).toBe(subclassEffect);
    expect(subclassEffects[0]!.provenance.classInstanceId).toBe(cid("paladin-1"));
  });
});

describe("collectEffects - subclass features", () => {
  it("collects subclass feature effects in featureIds order", () => {
    const sf1 = makeSubclassFeature(eid("sf-vow"), eid("subclass-abj"), "Wizard", 2, [makeEffect("add-proficiency", { proficiency: { type: "saving-throw", ability: "WIS" } })]);
    const sf2 = makeSubclassFeature(eid("sf-project"), eid("subclass-abj"), "Wizard", 14, [makeEffect("grant-resource", { resource: { id: eid("res-ward"), name: "Projected Ward", max: { type: "fixed", value: 1 }, recovery: { type: "long-rest" } } })]);

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getClass: () => makeClass(eid("class-wizard"), [], { hitDie: 6, primaryAbilities: ["INT"], savingThrowProficiencies: ["INT", "WIS"], subclassIds: [eid("subclass-abj")] }),
      getSubclass: () => makeSubclass(eid("subclass-abj"), eid("class-wizard"), [], [eid("sf-vow"), eid("sf-project")]),
      getSubclassFeature: (id: EntityId) => {
        if (id === eid("sf-vow")) return sf1;
        if (id === eid("sf-project")) return sf2;
        return undefined;
      },
    };

    const character = makeCharacter({
      progression: {
        classes: [
          { instanceId: cid("wizard-1"), classId: eid("class-wizard"), level: 14, isStartingClass: true, subclassId: eid("subclass-abj"), hitPointIncreases: [] },
        ],
      },
    });

    const result = collectEffects(character, catalog);
    const sfEffects = result.filter((e) => e.provenance.sourceKind === "subclass-feature");

    expect(sfEffects).toHaveLength(2);
    expect(sfEffects[0]!.provenance.entityId).toBe(eid("sf-vow"));
    expect(sfEffects[1]!.provenance.entityId).toBe(eid("sf-project"));
  });
});

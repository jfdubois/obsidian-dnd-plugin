import { describe, it, expect } from "vitest";
import fixture from "../fixtures/normalized-catalog.json";
import { isCatalogManifest } from "./catalog-manifest";
import { isCatalogSource } from "./source-metadata";
import { isSpeciesRule, isTraitDefinition } from "./entity-species";
import { isBackgroundRule } from "./entity-background";
import { isFeatRule } from "./entity-feat";
import { isSpellRule } from "./entity-spell";
import { isItemRule, isItemCost } from "./entity-item";
import { isClassRule, isLevelDefinition, isLevelGrant } from "./class-progression";
import { isRuleEffect } from "./effect";
import { isRulePrerequisite } from "./prerequisite";
import { isChoiceDefinition } from "./choice-definition";
import { isRenderNode } from "./render-node";

const catalog = fixture as Record<string, unknown>;

describe("Normalized catalog fixture - manifest", () => {
  it("manifest validates as CatalogManifest", () => {
    const manifest = (catalog as Record<string, unknown>).manifest;
    expect(isCatalogManifest(manifest)).toBe(true);
  });

  it("manifest has correct apiVersion", () => {
    const m = (catalog as Record<string, unknown>).manifest as Record<string, unknown>;
    expect(m.apiVersion).toBe(1);
  });

  it("manifest has correct schemaVersion", () => {
    const m = (catalog as Record<string, unknown>).manifest as Record<string, unknown>;
    expect(m.schemaVersion).toBe(1);
  });

  it("manifest has correct revision", () => {
    const m = (catalog as Record<string, unknown>).manifest as Record<string, unknown>;
    expect(m.catalogRevision).toBe("test-001");
  });

  it("manifest has correct rulesets", () => {
    const m = (catalog as Record<string, unknown>).manifest as Record<string, unknown>;
    expect(m.rulesets).toEqual(["2024"]);
  });

  it("manifest has all expected entityKinds", () => {
    const m = (catalog as Record<string, unknown>).manifest as Record<string, unknown>;
    expect(m.entityKinds).toEqual(["species", "background", "feat", "spell", "item", "class"]);
  });

  it("manifest checksums are non-empty strings", () => {
    const m = (catalog as Record<string, unknown>).manifest as Record<string, unknown>;
    const checksums = m.checksums as Record<string, string>;
    for (const [key, value] of Object.entries(checksums)) {
      expect(key.length).toBeGreaterThan(0);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe("Normalized catalog fixture - sources", () => {
  it("has exactly 2 sources", () => {
    const sources = (catalog as Record<string, unknown>).sources as unknown[];
    expect(sources).toHaveLength(2);
  });

  it("all sources validate as CatalogSource", () => {
    const sources = (catalog as Record<string, unknown>).sources as unknown[];
    for (const source of sources) {
      expect(isCatalogSource(source)).toBe(true);
    }
  });

  it("first source is a published core source", () => {
    const sources = (catalog as Record<string, unknown>).sources as Record<string, unknown>[];
    expect(sources[0]?.category).toBe("core");
    expect(sources[0]?.published).toBe("2024-11-19");
  });

  it("second source is a core-free source without published date", () => {
    const sources = (catalog as Record<string, unknown>).sources as Record<string, unknown>[];
    expect(sources[1]?.category).toBe("other");
    expect(sources[1]?.published).toBeUndefined();
  });
});

describe("Normalized catalog fixture - species", () => {
  it("has exactly 1 species", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect((entities.species as unknown[]).length).toBe(1);
  });

  it("species validates as SpeciesRule", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(isSpeciesRule((entities.species as unknown[])[0])).toBe(true);
  });

  it("species has correct kind", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(((entities.species as Record<string, unknown>[]) [0] as Record<string, unknown>).kind).toBe("species");
  });

  it("species has darkvision enabled with range", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const s = (entities.species as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(s.darkvision).toBe(true);
    expect(s.darkvisionRange).toBe(60);
  });

  it("species has multiple effect types", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const effects = ((entities.species as Record<string, unknown>)[0] as Record<string, unknown>).effects as Record<string, unknown>[];
    const types = effects.map((e) => e.type);
    expect(types).toContain("add-ability");
    expect(types).toContain("add-sense");
    expect(types).toContain("add-language");
    expect(types).toContain("add-proficiency");
    expect(types).toContain("add-immunity");
  });

  it("all species effects validate", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const effects = ((entities.species as Record<string, unknown>)[0] as Record<string, unknown>).effects as unknown[];
    for (const effect of effects) {
      expect(isRuleEffect(effect)).toBe(true);
    }
  });

  it("species has trait definitions with nested render nodes", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const traitDefs = ((entities.species as Record<string, unknown>)[0] as Record<string, unknown>).traitDefs as Record<string, unknown>[];
    expect(traitDefs).toHaveLength(2);
    for (const trait of traitDefs) {
      expect(isTraitDefinition(trait)).toBe(true);
      for (const node of (trait.content as unknown[])) {
        expect(isRenderNode(node)).toBe(true);
      }
    }
  });

  it("species has a choice definition for subrace selection", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const choices = ((entities.species as Record<string, unknown>)[0] as Record<string, unknown>).choices as unknown[];
    expect(choices).toHaveLength(1);
    expect(isChoiceDefinition(choices[0])).toBe(true);
  });

  it("species content includes paragraph, heading, list render nodes", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const content = ((entities.species as Record<string, unknown>)[0] as Record<string, unknown>).content as Record<string, unknown>[];
    const types = content.map((n) => n.type);
    expect(types).toContain("paragraph");
    expect(types).toContain("heading");
    expect(types).toContain("list");
  });
});

describe("Normalized catalog fixture - backgrounds", () => {
  it("has exactly 1 background", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect((entities.backgrounds as unknown[]).length).toBe(1);
  });

  it("background validates as BackgroundRule", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(isBackgroundRule((entities.backgrounds as unknown[])[0])).toBe(true);
  });

  it("background has correct kind", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(((entities.backgrounds as Record<string, unknown>)[0] as Record<string, unknown>).kind).toBe("background");
  });

  it("background has skill proficiencies", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const b = (entities.backgrounds as Record<string, unknown>)[0] as Record<string, unknown>;
    const skillProfs = b.skillProficiencies as string[];
    expect(skillProfs).toContain("skill:2024:core:athletics");
    expect(skillProfs).toContain("skill:2024:core:intimidation");
  });

  it("background has a featureId reference", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const b = (entities.backgrounds as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(b.featureId).toBe("class-feature:2024:core:soldier:military-rank");
  });

  it("background effects include tool and armor proficiencies", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const effects = ((entities.backgrounds as Record<string, unknown>)[0] as Record<string, unknown>).effects as Record<string, unknown>[];
    const profs = effects.filter((e) => e.type === "add-proficiency");
    expect(profs).toHaveLength(2);
    expect((profs[0] as Record<string, unknown>).proficiency).toHaveProperty("kind", "tool");
    expect((profs[1] as Record<string, unknown>).proficiency).toHaveProperty("kind", "armor");
  });

  it("background has a skill-proficiency choice definition", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const choices = ((entities.backgrounds as Record<string, unknown>)[0] as Record<string, unknown>).choices as Record<string, unknown>[];
    expect(choices[0]?.type).toBe("skill-proficiency");
    expect(isChoiceDefinition(choices[0])).toBe(true);
  });

  it("background content includes a table render node", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const content = ((entities.backgrounds as Record<string, unknown>)[0] as Record<string, unknown>).content as Record<string, unknown>[];
    const types = content.map((n) => n.type);
    expect(types).toContain("table");
  });
});

describe("Normalized catalog fixture - feats", () => {
  it("has exactly 1 feat", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect((entities.feats as unknown[]).length).toBe(1);
  });

  it("feat validates as FeatRule", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(isFeatRule((entities.feats as unknown[])[0])).toBe(true);
  });

  it("feat has correct kind", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(((entities.feats as Record<string, unknown>)[0] as Record<string, unknown>).kind).toBe("feat");
  });

  it("feat has ability-score prerequisite", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const prereqs = ((entities.feats as Record<string, unknown>)[0] as Record<string, unknown>).prerequisites as unknown[];
    const abilityPrereqs = prereqs.filter((p) => (p as Record<string, unknown>).type === "ability-score");
    expect(abilityPrereqs).toHaveLength(1);
    expect(isRulePrerequisite(abilityPrereqs[0])).toBe(true);
  });

  it("all feat effects validate", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const effects = ((entities.feats as Record<string, unknown>)[0] as Record<string, unknown>).effects as unknown[];
    for (const effect of effects) {
      expect(isRuleEffect(effect)).toBe(true);
    }
  });

  it("feat has grant-feature effect", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const effects = ((entities.feats as Record<string, unknown>)[0] as Record<string, unknown>).effects as Record<string, unknown>[];
    const types = effects.map((e) => e.type);
    expect(types).toContain("grant-feature");
  });

  it("feat has abilityScorePrerequisite field", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const f = (entities.feats as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(f.abilityScorePrerequisite).toBe("CON");
    expect(f.abilityMinScore).toBe(13);
  });
});

describe("Normalized catalog fixture - spells", () => {
  it("has exactly 2 spells", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect((entities.spells as unknown[]).length).toBe(2);
  });

  it("all spells validate as SpellRule", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    for (const spell of (entities.spells as unknown[])) {
      expect(isSpellRule(spell)).toBe(true);
    }
  });

  it("first spell is cantrip (level 0)", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const s = (entities.spells as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(s.level).toBe(0);
  });

  it("second spell is 3rd level", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const s = (entities.spells as Record<string, unknown>)[1] as Record<string, unknown>;
    expect(s.level).toBe(3);
  });

  it("spells have correct kind", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    for (const spell of (entities.spells as Record<string, unknown>[])) {
      expect(spell.kind).toBe("spell");
    }
  });

  it("first spell has Evocation school", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const s = (entities.spells as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(s.school).toBe("Evocation");
  });

  it("spell content includes paragraph and dice render nodes", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const s = (entities.spells as Record<string, unknown>)[0] as Record<string, unknown>;
    const content = s.content as Record<string, unknown>[];
    const types = content.map((n) => n.type);
    expect(types).toContain("paragraph");
    expect(types).toContain("dice");
  });

  it("second spell has higherLevelEffects", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const s = (entities.spells as Record<string, unknown>)[1] as Record<string, unknown>;
    const hle = s.higherLevelEffects as Record<string, unknown>[];
    expect(hle).toHaveLength(1);
    expect(isRenderNode(hle[0])).toBe(true);
  });
});

describe("Normalized catalog fixture - items", () => {
  it("has exactly 1 item", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect((entities.items as unknown[]).length).toBe(1);
  });

  it("item validates as ItemRule", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(isItemRule((entities.items as unknown[])[0])).toBe(true);
  });

  it("item has correct kind", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(((entities.items as Record<string, unknown>)[0] as Record<string, unknown>).kind).toBe("item");
  });

  it("item has rarity and weight", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const i = (entities.items as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(i.rarity).toBe("common");
    expect(i.weight).toBe(3);
  });

  it("item has a cost with gp", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const i = (entities.items as Record<string, unknown>)[0] as Record<string, unknown>;
    const cost = i.cost as Record<string, unknown>;
    expect(isItemCost(cost)).toBe(true);
    expect(cost.unit).toBe("gp");
    expect(cost.amount).toBe(15);
  });

  it("item does not require attunement", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const i = (entities.items as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(i.requiresAttunement).toBe(false);
  });

  it("item has grant-attack effect", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const effects = ((entities.items as Record<string, unknown>)[0] as Record<string, unknown>).effects as Record<string, unknown>[];
    const types = effects.map((e) => e.type);
    expect(types).toContain("grant-attack");
  });

  it("item has weapon category", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const i = (entities.items as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(i.category).toBe("weapon");
  });
});

describe("Normalized catalog fixture - classes", () => {
  it("has exactly 1 class", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect((entities.classes as unknown[]).length).toBe(1);
  });

  it("class validates as ClassRule", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(isClassRule((entities.classes as unknown[])[0])).toBe(true);
  });

  it("class has correct kind", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    expect(((entities.classes as Record<string, unknown>)[0] as Record<string, unknown>).kind).toBe("class");
  });

  it("class has 2 level definitions", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const classDef = (entities.classes as Record<string, unknown>)[0] as Record<string, unknown>;
    const levels = classDef.levels as Record<string, Record<string, unknown>>;
    expect(Object.keys(levels)).toHaveLength(2);
    for (const level of Object.values(levels)) {
      expect(isLevelDefinition(level)).toBe(true);
    }
  });

  it("level definitions have correct level numbers", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const classDef = (entities.classes as Record<string, unknown>)[0] as Record<string, unknown>;
    const levels = classDef.levels as Record<string, Record<string, unknown>>;
    expect(levels["1"]?.level).toBe(1);
    expect(levels["2"]?.level).toBe(2);
  });

  it("level grants validate", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const classDef = (entities.classes as Record<string, unknown>)[0] as Record<string, unknown>;
    const levels = classDef.levels as Record<string, Record<string, unknown>>;
    for (const level of Object.values(levels)) {
      const grants = level.grants as unknown[];
      for (const grant of grants) {
        expect(isLevelGrant(grant)).toBe(true);
      }
    }
  });

  it("level 1 has feature and choice grants", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const classDef = (entities.classes as Record<string, unknown>)[0] as Record<string, unknown>;
    const levels = classDef.levels as Record<string, Record<string, unknown>>;
    const level1 = levels["1"]!;
    const grantTypes = (level1.grants as Record<string, unknown>[]).map((g) => g.type);
    expect(grantTypes).toContain("feature");
    expect(grantTypes).toContain("choice");
  });

  it("level 2 has feature and resource-progression grants", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const classDef = (entities.classes as Record<string, unknown>)[0] as Record<string, unknown>;
    const levels = classDef.levels as Record<string, Record<string, unknown>>;
    const level2 = levels["2"]!;
    const grantTypes = (level2.grants as Record<string, unknown>[]).map((g) => g.type);
    expect(grantTypes).toContain("feature");
    expect(grantTypes).toContain("resource-progression");
  });

  it("class has correct hitDie", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const classDef = (entities.classes as Record<string, unknown>)[0] as Record<string, unknown>;
    expect(classDef.hitDie).toBe(10);
  });

  it("class has proficiency effects for armor", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const effects = ((entities.classes as Record<string, unknown>)[0] as Record<string, unknown>).effects as Record<string, unknown>[];
    const profEffects = effects.filter((e) => e.type === "add-proficiency");
    expect(profEffects.length).toBeGreaterThan(0);
    const kinds = profEffects.map((e) => (e.proficiency as Record<string, unknown>).kind);
    expect(kinds).toContain("armor");
  });
});

describe("Normalized catalog fixture - negative tests", () => {
  it("rejects manifest with wrong apiVersion", () => {
    const manifest = (catalog as Record<string, unknown>).manifest as Record<string, unknown>;
    const badManifest = { ...(manifest as object), apiVersion: 99 };
    expect(isCatalogManifest(badManifest)).toBe(false);
  });

  it("rejects species with missing required fields", () => {
    const entities = (catalog as Record<string, unknown>).entities as Record<string, unknown>;
    const species = (entities.species as Record<string, unknown>)[0] as Record<string, unknown>;
    const badSpecies = { ...(species as Record<string, unknown>) };
    delete badSpecies.name;
    expect(isSpeciesRule(badSpecies)).toBe(false);
  });

  it("rejects effect with unknown type", () => {
    const badEffect = { type: "nonexistent-type", value: 1 };
    expect(isRuleEffect(badEffect)).toBe(false);
  });

  it("rejects prerequisite with unknown type", () => {
    const badPrereq = { type: "magic" };
    expect(isRulePrerequisite(badPrereq)).toBe(false);
  });

  it("rejects render node with unknown type", () => {
    const badNode = { type: "video", text: "test" };
    expect(isRenderNode(badNode)).toBe(false);
  });
});

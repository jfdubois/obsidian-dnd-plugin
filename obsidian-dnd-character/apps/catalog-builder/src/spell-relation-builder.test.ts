import { describe, it, expect } from "vitest";
import type { EntityId } from "@obsidian-dnd/domain";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import {
  createSpellRule,
  createRenderParagraph,
  createEntitySelectionPrerequisite,
} from "@obsidian-dnd/catalog-contract";
import {
  buildSpellRelations,
  type SpellRelationBuilderInput,
  type SpellPrerequisiteRelation,
  type SpellLevelChainRelation,
  type SpellSchoolGroupRelation,
} from "./spell-relation-builder";

function makeSpell(
  name: string,
  school: string,
  level: number,
  source: string = "PHB",
  ruleset: "2014" | "2024" = "2014",
  deps: EntityId[] = [],
  prereqs: ReturnType<typeof createEntitySelectionPrerequisite>[] = [],
): ReturnType<typeof createSpellRule> {
  const id = createEntityId(`spell::${ruleset}::${source}::${name}`);
  return createSpellRule(
    id, name, createSourceId(source), ruleset, "core", school, level,
    "1 action", "Self", "Instantaneous", false, false,
    [createRenderParagraph("test")], prereqs, [], [], deps, false,
  );
}

function input(spells: ReturnType<typeof makeSpell>[]): SpellRelationBuilderInput {
  return { spells };
}

describe("buildSpellRelations", () => {
  describe("empty input", () => {
    it("returns empty relations and diagnostics", () => {
      const result = buildSpellRelations(input([]));
      expect(result.relations).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const result = buildSpellRelations(input([]));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.relations)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("prerequisite relations", () => {
    it("links dependency to dependent spell", () => {
      const mm = makeSpell("Magic Missile", "evocation", 1);
      const sr = makeSpell("Scorching Ray", "evocation", 2, "PHB", "2014", [mm.id]);
      const result = buildSpellRelations(input([mm, sr]));
      const prereqs = result.relations.filter((r) => r.type === "prerequisite") as SpellPrerequisiteRelation[];
      expect(prereqs.length).toBe(1);
      expect(prereqs[0]!.sourceId).toBe(mm.id);
      expect(prereqs[0]!.targetId).toBe(sr.id);
      expect(prereqs[0]!.sourceName).toBe("Magic Missile");
      expect(prereqs[0]!.targetName).toBe("Scorching Ray");
    });

    it("links entity-selection prerequisite to dependent spell", () => {
      const shield = makeSpell("Shield", "abjuration", 1);
      const improved = makeSpell("Improved Shield", "abjuration", 2, "PHB", "2014", [], [createEntitySelectionPrerequisite(shield.id)]);
      const result = buildSpellRelations(input([shield, improved]));
      const prereqs = result.relations.filter((r) => r.type === "prerequisite") as SpellPrerequisiteRelation[];
      expect(prereqs.length).toBe(1);
      expect(prereqs[0]!.sourceId).toBe(shield.id);
      expect(prereqs[0]!.targetId).toBe(improved.id);
    });

    it("emits diagnostic for broken dependency reference", () => {
      const missingId = createEntityId("spell::2014::PHB::Ghost Spell");
      const spell = makeSpell("Dependent Spell", "evocation", 3, "PHB", "2014", [missingId]);
      const result = buildSpellRelations(input([spell]));
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("BROKEN_DEPENDENCY_REF");
      expect(result.diagnostics[0]!.spellId).toBe(spell.id);
      expect(result.diagnostics[0]!.missingId).toBe(missingId);
      const prereqs = result.relations.filter((r) => r.type === "prerequisite");
      expect(prereqs.length).toBe(0);
    });

    it("emits diagnostic for broken entity-selection prerequisite", () => {
      const missingId = createEntityId("spell::2014::PHB::Ghost Spell");
      const spell = makeSpell("Dep Spell", "evocation", 3, "PHB", "2014", [], [createEntitySelectionPrerequisite(missingId)]);
      const result = buildSpellRelations(input([spell]));
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("BROKEN_PREREQUISITE_REF");
    });

    it("deduplicates when dependency and prerequisite reference same spell", () => {
      const base = makeSpell("Base Spell", "evocation", 1);
      const dep = makeSpell("Dep Spell", "evocation", 2, "PHB", "2014", [base.id], [createEntitySelectionPrerequisite(base.id)]);
      const result = buildSpellRelations(input([base, dep]));
      const prereqs = result.relations.filter((r) => r.type === "prerequisite") as SpellPrerequisiteRelation[];
      expect(prereqs.length).toBe(1);
    });
  });

  describe("level chain relations", () => {
    it("chains cantrip to 1st level version", () => {
      const cantrip = makeSpell("Ray", "evocation", 0);
      const first = makeSpell("Ray", "evocation", 1);
      const result = buildSpellRelations(input([cantrip, first]));
      const chains = result.relations.filter((r) => r.type === "level-chain") as SpellLevelChainRelation[];
      expect(chains.length).toBe(1);
      expect(chains[0]!.lowerId).toBe(cantrip.id);
      expect(chains[0]!.higherId).toBe(first.id);
      expect(chains[0]!.lowerLevel).toBe(0);
      expect(chains[0]!.higherLevel).toBe(1);
    });

    it("chains multiple consecutive levels", () => {
      const l0 = makeSpell("Beam", "evocation", 0);
      const l1 = makeSpell("Beam", "evocation", 1);
      const l2 = makeSpell("Beam", "evocation", 2);
      const result = buildSpellRelations(input([l0, l1, l2]));
      const chains = result.relations.filter((r) => r.type === "level-chain") as SpellLevelChainRelation[];
      expect(chains.length).toBe(2);
      expect(chains[0]!.lowerLevel).toBe(0);
      expect(chains[0]!.higherLevel).toBe(1);
      expect(chains[1]!.lowerLevel).toBe(1);
      expect(chains[1]!.higherLevel).toBe(2);
    });

    it("skips non-adjacent levels", () => {
      const l0 = makeSpell("Gap", "evocation", 0);
      const l3 = makeSpell("Gap", "evocation", 3);
      const result = buildSpellRelations(input([l0, l3]));
      const chains = result.relations.filter((r) => r.type === "level-chain") as SpellLevelChainRelation[];
      expect(chains.length).toBe(0);
    });

    it("does not chain across rulesets", () => {
      const s2014 = makeSpell("Fireball", "evocation", 3, "PHB", "2014");
      const s2024 = makeSpell("Fireball", "evocation", 3, "XPHB", "2024");
      const result = buildSpellRelations(input([s2014, s2024]));
      const chains = result.relations.filter((r) => r.type === "level-chain") as SpellLevelChainRelation[];
      expect(chains.length).toBe(0);
    });

    it("does not chain different spell names", () => {
      const fb = makeSpell("Fireball", "evocation", 3);
      const mm = makeSpell("Magic Missile", "evocation", 1);
      const result = buildSpellRelations(input([fb, mm]));
      const chains = result.relations.filter((r) => r.type === "level-chain") as SpellLevelChainRelation[];
      expect(chains.length).toBe(0);
    });
  });

  describe("school group relations", () => {
    it("groups spells by school", () => {
      const evoc1 = makeSpell("Fireball", "evocation", 3);
      const evoc2 = makeSpell("Magic Missile", "evocation", 1);
      const abj = makeSpell("Shield", "abjuration", 1);
      const result = buildSpellRelations(input([evoc1, evoc2, abj]));
      const groups = result.relations.filter((r) => r.type === "school-group") as SpellSchoolGroupRelation[];
      expect(groups.length).toBe(2);
      const abjGroup = groups.find((g) => g.school === "abjuration")!;
      const evocGroup = groups.find((g) => g.school === "evocation")!;
      expect(abjGroup.spellIds).toEqual([abj.id]);
      expect(evocGroup.spellIds.length).toBe(2);
      expect(evocGroup.spellIds).toContain(evoc1.id);
      expect(evocGroup.spellIds).toContain(evoc2.id);
    });

    it("sorts school groups alphabetically", () => {
      const necro = makeSpell("Inflict Wounds", "necromancy", 1);
      const abj = makeSpell("Shield", "abjuration", 1);
      const evoc = makeSpell("Fireball", "evocation", 3);
      const result = buildSpellRelations(input([necro, abj, evoc]));
      const groups = result.relations.filter((r) => r.type === "school-group") as SpellSchoolGroupRelation[];
      expect(groups[0]!.school).toBe("abjuration");
      expect(groups[1]!.school).toBe("evocation");
      expect(groups[2]!.school).toBe("necromancy");
    });

    it("sorts spell IDs within school groups", () => {
      const sa = makeSpell("Alpha", "evocation", 1);
      const sb = makeSpell("Beta", "evocation", 1);
      const result = buildSpellRelations(input([sb, sa]));
      const groups = result.relations.filter((r) => r.type === "school-group") as SpellSchoolGroupRelation[];
      const evocGroup = groups.find((g) => g.school === "evocation")!;
      expect(evocGroup.spellIds[0]).toBe(sa.id);
      expect(evocGroup.spellIds[1]).toBe(sb.id);
    });

    it("freezes spell IDs array", () => {
      const spell = makeSpell("Fireball", "evocation", 3);
      const result = buildSpellRelations(input([spell]));
      const groups = result.relations.filter((r) => r.type === "school-group") as SpellSchoolGroupRelation[];
      expect(Object.isFrozen(groups[0]!.spellIds)).toBe(true);
    });
  });

  describe("determinism and sorting", () => {
    it("returns relations in deterministic order", () => {
      const spells = [
        makeSpell("Zeta", "necromancy", 3),
        makeSpell("Alpha", "evocation", 1),
        makeSpell("Beta", "evocation", 2),
        makeSpell("Gamma", "abjuration", 1),
      ];
      const r1 = buildSpellRelations(input(spells));
      const r2 = buildSpellRelations(input(spells));
      expect(r1.relations).toEqual(r2.relations);
    });

    it("relations are sorted: prerequisite, level-chain, school-group", () => {
      const base = makeSpell("Base", "evocation", 1);
      const dep = makeSpell("Dep", "evocation", 2, "PHB", "2014", [base.id]);
      const a = makeSpell("Beam", "abjuration", 0);
      const b = makeSpell("Beam", "abjuration", 1);
      const result = buildSpellRelations(input([base, dep, a, b]));
      const types = result.relations.map((r) => r.type);
      expect(types[0]).toBe("prerequisite");
      expect(types[1]).toBe("level-chain");
      expect(types[2]).toBe("school-group");
      expect(types[3]).toBe("school-group");
    });
  });

  describe("single spell", () => {
    it("produces only school group for isolated spell", () => {
      const spell = makeSpell("Fireball", "evocation", 3);
      const result = buildSpellRelations(input([spell]));
      const prereqs = result.relations.filter((r) => r.type === "prerequisite");
      const chains = result.relations.filter((r) => r.type === "level-chain");
      const groups = result.relations.filter((r) => r.type === "school-group");
      expect(prereqs.length).toBe(0);
      expect(chains.length).toBe(0);
      expect(groups.length).toBe(1);
      expect(result.diagnostics.length).toBe(0);
    });
  });
});

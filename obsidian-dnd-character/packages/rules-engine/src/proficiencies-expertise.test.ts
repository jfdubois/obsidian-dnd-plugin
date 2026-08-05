import { describe, it, expect } from "vitest";
import { calculateProficiencies } from "./proficiencies";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeClass,
  makeSubclass,
  makeSubclassFeature,
  makeFeat,
  makeEffect,
  eid,
  cid,
  cii,
  cdi,
} from "./effect-collection-helpers";
import type { CatalogLookup } from "./effect-provenance";

function buildCatalog(overrides: Partial<CatalogLookup>): CatalogLookup {
  return { ...makeEmptyCatalog(), ...overrides };
}

/* ── Expertise from subclass feature ─────────────────────────────── */

describe("calculateProficiencies - expertise from subclass", () => {
  it("applies expertise from subclass feature", () => {
    const skillEffect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
    });
    const expertiseEffect = makeEffect("add-expertise", {
      skillId: eid("skill:2024:core:stealth"),
    });

    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [skillEffect]),
      getSubclass: () => makeSubclass(
        eid("subclass-thief"),
        eid("class-rogue"),
        [],
        [eid("feat-rogue-expertise")],
      ),
      getSubclassFeature: () => makeSubclassFeature(
        eid("feat-rogue-expertise"),
        eid("subclass-thief"),
        "Rogue",
        1,
        [expertiseEffect],
      ),
    });

    const character = makeCharacter({
      progression: {
        classes: [{
          instanceId: cid("rog-1"),
          classId: eid("class-rogue"),
          level: 3,
          isStartingClass: true,
          hitPointIncreases: [],
          subclassId: eid("subclass-thief"),
        }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.skills).toHaveLength(1);
    const [first] = result.skills;
    expect(first!.hasExpertise).toBe(true);
    expect(first!.effectiveBonus).toBe(4);
  });
});

/* ── Expertise from feat ─────────────────────────────────────────── */

describe("calculateProficiencies - expertise from feat", () => {
  it("applies expertise from feat", () => {
    const skillEffect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:athletics") },
    });
    const expertiseEffect = makeEffect("add-expertise", {
      skillId: eid("skill:2024:core:athletics"),
    });

    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-skilled"), [skillEffect, expertiseEffect]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{ instanceId: cid("rog-1"), classId: eid("class-rogue"), level: 1, isStartingClass: true, hitPointIncreases: [] }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedOptionIds: [eid("feat-skilled")],
        },
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.skills).toHaveLength(1);
    const [first] = result.skills;
    expect(first!.hasExpertise).toBe(true);
    expect(first!.effectiveBonus).toBe(4);
  });
});

/* ── Expertise bonus scaling ─────────────────────────────────────── */

describe("calculateProficiencies - expertise bonus scaling", () => {
  it("doubles proficiency bonus at higher levels", () => {
    const skillEffect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
    });
    const expertiseEffect = makeEffect("add-expertise", {
      skillId: eid("skill:2024:core:stealth"),
    });

    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [skillEffect]),
      getSubclass: () => makeSubclass(
        eid("subclass-thief"),
        eid("class-rogue"),
        [],
        [eid("feat-rogue-expertise")],
      ),
      getSubclassFeature: () => makeSubclassFeature(
        eid("feat-rogue-expertise"),
        eid("subclass-thief"),
        "Rogue",
        1,
        [expertiseEffect],
      ),
    });

    const character = makeCharacter({
      progression: {
        classes: [{
          instanceId: cid("rog-1"),
          classId: eid("class-rogue"),
          level: 10,
          isStartingClass: true,
          hitPointIncreases: [],
          subclassId: eid("subclass-thief"),
        }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.proficiencyBonus).toBe(4);
    const [first] = result.skills;
    expect(first!.effectiveBonus).toBe(8);
  });
});

/* ── Expertise without proficiency ───────────────────────────────── */

describe("calculateProficiencies - expertise without proficiency", () => {
  it("expertise alone does not create a skill entry", () => {
    const expertiseEffect = makeEffect("add-expertise", {
      skillId: eid("skill:2024:core:stealth"),
    });

    const catalog = buildCatalog({
      getFeat: () => makeFeat(eid("feat-skilled"), [expertiseEffect]),
    });

    const character = makeCharacter({
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedOptionIds: [eid("feat-skilled")],
        },
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.skills).toHaveLength(0);
  });
});

/* ── Multiple expertise sources ──────────────────────────────────── */

describe("calculateProficiencies - multiple expertise sources", () => {
  it("tracks expertise from multiple sources on same skill", () => {
    const skillEffect = makeEffect("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
    });
    const expertiseEffect1 = makeEffect("add-expertise", {
      skillId: eid("skill:2024:core:stealth"),
    });
    const expertiseEffect2 = makeEffect("add-expertise", {
      skillId: eid("skill:2024:core:stealth"),
    });

    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), [skillEffect, expertiseEffect1]),
      getFeat: () => makeFeat(eid("feat-skilled"), [expertiseEffect2]),
    });

    const character = makeCharacter({
      progression: {
        classes: [{
          instanceId: cid("rog-1"),
          classId: eid("class-rogue"),
          level: 3,
          isStartingClass: true,
          hitPointIncreases: [],
        }],
      },
      selections: {
        [cii("choice-feat-1")]: {
          instanceId: cii("choice-feat-1"),
          definitionId: cdi("def-feat-1"),
          originGrantId: eid("grant-feat-1"),
          selectedOptionIds: [eid("feat-skilled")],
        },
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.skills).toHaveLength(1);
    const [first] = result.skills;
    expect(first!.hasExpertise).toBe(true);
    expect(first!.effectiveBonus).toBe(4);
  });
});

/* ── Mixed proficiency and expertise ─────────────────────────────── */

describe("calculateProficiencies - mixed proficiency and expertise", () => {
  it("handles mix of proficient and expert skills", () => {
    const effects = [
      makeEffect("add-proficiency", {
        proficiency: { kind: "skill", entityId: eid("skill:2024:core:stealth") },
      }),
      makeEffect("add-proficiency", {
        proficiency: { kind: "skill", entityId: eid("skill:2024:core:perception") },
      }),
      makeEffect("add-expertise", {
        skillId: eid("skill:2024:core:stealth"),
      }),
    ];

    const catalog = buildCatalog({
      getClass: () => makeClass(eid("class-rogue"), effects),
    });

    const character = makeCharacter({
      progression: {
        classes: [{
          instanceId: cid("rog-1"),
          classId: eid("class-rogue"),
          level: 3,
          isStartingClass: true,
          hitPointIncreases: [],
        }],
      },
    });

    const result = calculateProficiencies(character, catalog);

    expect(result.skills).toHaveLength(2);
    const stealth = result.skills.find((s) => s.skillId === eid("skill:2024:core:stealth"));
    const perception = result.skills.find((s) => s.skillId === eid("skill:2024:core:perception"));

    expect(stealth).toBeDefined();
    expect(stealth!.hasExpertise).toBe(true);
    expect(stealth!.effectiveBonus).toBe(4);

    expect(perception).toBeDefined();
    expect(perception!.hasExpertise).toBe(false);
    expect(perception!.effectiveBonus).toBe(2);
  });
});

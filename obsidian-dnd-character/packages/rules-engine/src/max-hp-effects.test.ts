import { describe, it, expect } from "vitest";
import type { Character } from "@obsidian-dnd/character-contract";
import type { CatalogLookup } from "./effect-provenance";
import { calculateMaxHp } from "./max-hp";
import {
  eid,
  cid,
  cii,
  cdi,
  makeEffect,
  makeCharacter,
  makeClass,
  makeFeat,
  makeEmptyCatalog,
} from "./effect-collection-helpers";

/* ── Character factory ───────────────────────────────────────────── */

function makeCharacterWithClass(
  classId: ReturnType<typeof eid>,
  level: number,
  conScore: number,
  overrides: Partial<Character> = {},
): Character {
  return makeCharacter({
    progression: {
      classes: [
        {
          instanceId: cid("rogue-1"),
          classId,
          level,
          isStartingClass: true,
          hitPointIncreases: [],
        },
      ],
    },
    abilities: {
      scores: { STR: 10, DEX: 10, CON: conScore, INT: 10, WIS: 10, CHA: 10 },
    },
    ...overrides,
  });
}

/* ── HP increase effect tests ─────────────────────────────────────── */

describe("calculateMaxHp - effects", () => {
  it("applies add-hit-point-increase effects from feats", () => {
    const classId = eid("rogue");
    const cls = makeClass(classId, [], { hitDie: 8 });
    const featId = eid("tough");
    const hpEffect = makeEffect("add-hit-point-increase", { value: 2 });
    const feat = makeFeat(featId, [hpEffect]);
    const character = makeCharacterWithClass(classId, 1, 10, {
      selections: {
        [cii("choice-1")]: {
          instanceId: cii("choice-1"),
          definitionId: cdi("def-1"),
          originGrantId: eid("grant-1"),
          selectedValue: { type: "entity-ids", entityIds: [featId] },
        },
      },
    });
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
      getFeat: (id) => (id === featId ? feat : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(10); // d8 + 0 CON + 2 Tough
    expect(result.hitPointIncreases).toEqual([2]);
  });

  it("applies multiple add-hit-point-increase effects", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    const feat1Id = eid("tough");
    const feat2Id = eid("tough-2");
    const feat1 = makeFeat(feat1Id, [makeEffect("add-hit-point-increase", { value: 2 })]);
    const feat2 = makeFeat(feat2Id, [makeEffect("add-hit-point-increase", { value: 5 })]);
    const character = makeCharacterWithClass(classId, 1, 10, {
      selections: {
        [cii("choice-1")]: {
          instanceId: cii("choice-1"),
          definitionId: cdi("def-1"),
          originGrantId: eid("grant-1"),
          selectedValue: { type: "entity-ids", entityIds: [feat1Id] },
        },
        [cii("choice-2")]: {
          instanceId: cii("choice-2"),
          definitionId: cdi("def-2"),
          originGrantId: eid("grant-2"),
          selectedValue: { type: "entity-ids", entityIds: [feat2Id] },
        },
      },
    });
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
      getFeat: (id) => {
        if (id === feat1Id) return feat1;
        if (id === feat2Id) return feat2;
        return undefined;
      },
    };

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(17); // d10 + 0 CON + 2 + 5
    expect(result.hitPointIncreases).toEqual([2, 5]);
  });

  it("applies CON modifier from ability-increasing effects", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    const featId = eid("athlete");
    const conEffect = makeEffect("add-ability", { ability: "CON", value: 2 });
    const feat = makeFeat(featId, [conEffect]);
    const character = makeCharacterWithClass(classId, 1, 10, {
      selections: {
        [cii("choice-1")]: {
          instanceId: cii("choice-1"),
          definitionId: cdi("def-1"),
          originGrantId: eid("grant-1"),
          selectedValue: { type: "entity-ids", entityIds: [featId] },
        },
      },
    });
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
      getFeat: (id) => (id === featId ? feat : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // CON 10 + 2 = 12 -> +1 modifier
    expect(result.conModifier).toBe(1);
    expect(result.totalHp).toBe(11); // d10 + 1 CON
  });

  it("handles combined CON effects and HP increase effects", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    const conFeatId = eid("athlete");
    const hpFeatId = eid("tough");
    const conFeat = makeFeat(conFeatId, [makeEffect("add-ability", { ability: "CON", value: 4 })]);
    const hpFeat = makeFeat(hpFeatId, [makeEffect("add-hit-point-increase", { value: 3 })]);
    const character = makeCharacterWithClass(classId, 3, 10, {
      selections: {
        [cii("choice-1")]: {
          instanceId: cii("choice-1"),
          definitionId: cdi("def-1"),
          originGrantId: eid("grant-1"),
          selectedValue: { type: "entity-ids", entityIds: [conFeatId] },
        },
        [cii("choice-2")]: {
          instanceId: cii("choice-2"),
          definitionId: cdi("def-2"),
          originGrantId: eid("grant-2"),
          selectedValue: { type: "entity-ids", entityIds: [hpFeatId] },
        },
      },
    });
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
      getFeat: (id) => {
        if (id === conFeatId) return conFeat;
        if (id === hpFeatId) return hpFeat;
        return undefined;
      },
    };

    const result = calculateMaxHp(character, catalog);

    // CON 10 + 4 = 14 -> +2 modifier
    // 10*3 + 2*3 + 3 = 30 + 6 + 3 = 39
    expect(result.conModifier).toBe(2);
    expect(result.totalHp).toBe(39);
    expect(result.hitPointIncreases).toEqual([3]);
  });

  it("returns frozen inner arrays", () => {
    const classId = eid("rogue");
    const cls = makeClass(classId, [], { hitDie: 8 });
    const character = makeCharacterWithClass(classId, 1, 10);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    expect(Object.isFrozen(result.perClassBreakdown)).toBe(true);
    expect(Object.isFrozen(result.hitPointIncreases)).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import type { Character } from "@obsidian-dnd/character-contract";
import type { CatalogLookup } from "./effect-provenance";
import { calculateMaxHp } from "./max-hp";
import {
  eid,
  cid,
  makeCharacter,
  makeClass,
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

/* ── Tests ───────────────────────────────────────────────────────── */

describe("calculateMaxHp", () => {
  it("calculates max HP for a single-class character with CON 10", () => {
    const classId = eid("rogue");
    const cls = makeClass(classId, [], { hitDie: 8 });
    const character = makeCharacterWithClass(classId, 1, 10);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(8); // d8 + 0 CON
    expect(result.conModifier).toBe(0);
    expect(result.perClassBreakdown).toHaveLength(1);
    expect(result.perClassBreakdown[0]).toEqual({
      classId,
      instanceId: cid("rogue-1"),
      level: 1,
      hitDie: 8,
      maxHp: 8,
    });
    expect(result.hitPointIncreases).toEqual([]);
  });

  it("calculates max HP with positive CON modifier", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    const character = makeCharacterWithClass(classId, 1, 16); // +3 CON
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(13); // d10 + 3 CON
    expect(result.conModifier).toBe(3);
  });

  it("calculates max HP with negative CON modifier", () => {
    const classId = eid("rogue");
    const cls = makeClass(classId, [], { hitDie: 8 });
    const character = makeCharacterWithClass(classId, 1, 8); // -1 CON
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(7); // d8 - 1 CON
    expect(result.conModifier).toBe(-1);
  });

  it("calculates max HP for multi-level single class", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    const character = makeCharacterWithClass(classId, 5, 14); // +2 CON
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(60); // 10*5 + 2*5
    expect(result.perClassBreakdown[0]).toMatchObject({ maxHp: 60 });
  });

  it("calculates max HP for multiclass character", () => {
    const fighterId = eid("fighter");
    const rogueId = eid("rogue");
    const fighter = makeClass(fighterId, [], { hitDie: 10 });
    const rogue = makeClass(rogueId, [], { hitDie: 8 });
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("fighter-1"),
            classId: fighterId,
            level: 3,
            isStartingClass: true,
            hitPointIncreases: [],
          },
          {
            instanceId: cid("rogue-1"),
            classId: rogueId,
            level: 2,
            isStartingClass: false,
            hitPointIncreases: [],
          },
        ],
      },
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 12, INT: 10, WIS: 10, CHA: 10 },
      },
    });
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => {
        if (id === fighterId) return fighter;
        if (id === rogueId) return rogue;
        return undefined;
      },
    };

    const result = calculateMaxHp(character, catalog);

    // Fighter: 10*3 + 1*3 = 33, Rogue: 8*2 + 1*2 = 18
    expect(result.totalHp).toBe(51);
    expect(result.perClassBreakdown).toHaveLength(2);
    expect(result.perClassBreakdown[0]).toMatchObject({ maxHp: 33 });
    expect(result.perClassBreakdown[1]).toMatchObject({ maxHp: 18 });
  });

  it("returns zero HP for a character with no classes", () => {
    const character = makeCharacter({
      progression: { classes: [] },
    });
    const catalog = makeEmptyCatalog();

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(0);
    expect(result.perClassBreakdown).toEqual([]);
    expect(result.hitPointIncreases).toEqual([]);
  });

  it("uses default hitDie of 8 when class is not found in catalog", () => {
    const classId = eid("unknown-class");
    const character = makeCharacterWithClass(classId, 1, 10);
    const catalog = makeEmptyCatalog();

    const result = calculateMaxHp(character, catalog);

    expect(result.totalHp).toBe(8); // default d8 + 0 CON
    expect(result.perClassBreakdown[0]).toMatchObject({ hitDie: 8 });
  });
});

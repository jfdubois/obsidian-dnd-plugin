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
  hitPointIncreases: Character["progression"]["classes"][number]["hitPointIncreases"] = [],
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
          hitPointIncreases,
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
  it("calculates max HP for a level-one character with no hitPointIncreases", () => {
    const classId = eid("rogue");
    const cls = makeClass(classId, [], { hitDie: 8 });
    // Level 1, CON 10 (+0), no hitPointIncreases
    const character = makeCharacterWithClass(classId, 1, 10, []);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: d8 + 0 CON = 8
    expect(result.totalHp).toBe(8);
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

  it("calculates max HP with positive CON modifier at level 1", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 1, CON 16 (+3)
    const character = makeCharacterWithClass(classId, 1, 16, []);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // d10 + 3 CON = 13
    expect(result.totalHp).toBe(13);
    expect(result.conModifier).toBe(3);
  });

  it("calculates max HP with negative CON modifier at level 1", () => {
    const classId = eid("rogue");
    const cls = makeClass(classId, [], { hitDie: 8 });
    // Level 1, CON 8 (-1)
    const character = makeCharacterWithClass(classId, 1, 8, []);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // d8 - 1 CON = 7
    expect(result.totalHp).toBe(7);
    expect(result.conModifier).toBe(-1);
  });

  it("uses hitPointIncreases for levels 2+ in a multi-level single-class character", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 5, CON 14 (+2), with 4 hitPointIncreases (levels 2-5, all maximized)
    const increases = [
      { level: 2, rollOrMax: 10, isMaximized: true },
      { level: 3, rollOrMax: 10, isMaximized: true },
      { level: 4, rollOrMax: 10, isMaximized: true },
      { level: 5, rollOrMax: 10, isMaximized: true },
    ];
    const character = makeCharacterWithClass(classId, 5, 14, increases);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: 10 + 2 = 12
    // Level 2: 10 + 2 = 12
    // Level 3: 10 + 2 = 12
    // Level 4: 10 + 2 = 12
    // Level 5: 10 + 2 = 12
    // Total: 60
    expect(result.totalHp).toBe(60);
    expect(result.perClassBreakdown[0]).toMatchObject({ maxHp: 60 });
  });

  it("produces different max HP for different per-level stored increases", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 5, CON 14 (+2), with mixed roll/max increases
    const increases = [
      { level: 2, rollOrMax: 6, isMaximized: false },  // rolled 6
      { level: 3, rollOrMax: 10, isMaximized: true },   // maximized
      { level: 4, rollOrMax: 3, isMaximized: false },   // rolled 3
      { level: 5, rollOrMax: 8, isMaximized: false },   // rolled 8
    ];
    const character = makeCharacterWithClass(classId, 5, 14, increases);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: 10 + 2 = 12
    // Level 2: 6 + 2 = 8
    // Level 3: 10 + 2 = 12
    // Level 4: 3 + 2 = 5
    // Level 5: 8 + 2 = 10
    // Total: 47
    expect(result.totalHp).toBe(47);
    expect(result.perClassBreakdown[0]).toMatchObject({ maxHp: 47 });
  });

  it("applies CON modifier contribution across character levels", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 3, CON 18 (+4)
    const increases = [
      { level: 2, rollOrMax: 10, isMaximized: true },
      { level: 3, rollOrMax: 10, isMaximized: true },
    ];
    const character = makeCharacterWithClass(classId, 3, 18, increases);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: 10 + 4 = 14
    // Level 2: 10 + 4 = 14
    // Level 3: 10 + 4 = 14
    // Total: 42
    expect(result.totalHp).toBe(42);
    expect(result.conModifier).toBe(4);
  });

  it("respects minimum-1 HP rule with severely negative CON modifier", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 3, CON 4 (-3)
    const increases = [
      { level: 2, rollOrMax: 3, isMaximized: false },  // 3 + (-3) = 0 -> clamped to 1
      { level: 3, rollOrMax: 10, isMaximized: true },  // 10 + (-3) = 7
    ];
    const character = makeCharacterWithClass(classId, 3, 4, increases);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: max(1, 10 + (-3)) = 7
    // Level 2: max(1, 3 + (-3)) = 1 (minimum rule)
    // Level 3: max(1, 10 + (-3)) = 7
    // Total: 15
    expect(result.totalHp).toBe(15);
    expect(result.conModifier).toBe(-3);
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
    const character = makeCharacterWithClass(classId, 1, 10, []);
    const catalog = makeEmptyCatalog();

    const result = calculateMaxHp(character, catalog);

    // default d8 + 0 CON = 8
    expect(result.totalHp).toBe(8);
    expect(result.perClassBreakdown[0]).toMatchObject({ hitDie: 8 });
  });

  it("calculates max HP for multiclass character with hitPointIncreases", () => {
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
            hitPointIncreases: [
              { level: 2, rollOrMax: 10, isMaximized: true },
              { level: 3, rollOrMax: 10, isMaximized: true },
            ],
          },
          {
            instanceId: cid("rogue-1"),
            classId: rogueId,
            level: 2,
            isStartingClass: false,
            hitPointIncreases: [
              { level: 2, rollOrMax: 8, isMaximized: true },
            ],
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

    // Fighter: (10+1) + (10+1) + (10+1) = 33
    // Rogue: (8+1) + (8+1) = 18
    // Total: 51
    expect(result.totalHp).toBe(51);
    expect(result.perClassBreakdown).toHaveLength(2);
    expect(result.perClassBreakdown[0]).toMatchObject({ maxHp: 33 });
    expect(result.perClassBreakdown[1]).toMatchObject({ maxHp: 18 });
  });

  it("ignores hitPointIncreases entries outside the class level range", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 3, CON 14 (+2), with an extra entry for level 5 (beyond current level)
    const increases = [
      { level: 2, rollOrMax: 10, isMaximized: true },
      { level: 3, rollOrMax: 10, isMaximized: true },
      { level: 5, rollOrMax: 10, isMaximized: true }, // beyond level 3, ignored
    ];
    const character = makeCharacterWithClass(classId, 3, 14, increases);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: 10 + 2 = 12
    // Level 2: 10 + 2 = 12
    // Level 3: 10 + 2 = 12
    // Level 5 entry is ignored (beyond class level 3)
    // Total: 36
    expect(result.totalHp).toBe(36);
  });

  it("ignores level-1 entries in hitPointIncreases (level 1 always uses full hitDie)", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 2, CON 14 (+2), with a level-1 entry (should be ignored)
    const increases = [
      { level: 1, rollOrMax: 5, isMaximized: false }, // ignored, level 1 uses hitDie
      { level: 2, rollOrMax: 10, isMaximized: true },
    ];
    const character = makeCharacterWithClass(classId, 2, 14, increases);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: 10 + 2 = 12 (full hitDie, ignoring level-1 entry)
    // Level 2: 10 + 2 = 12
    // Total: 24
    expect(result.totalHp).toBe(24);
  });

  it("returns frozen inner arrays", () => {
    const classId = eid("rogue");
    const cls = makeClass(classId, [], { hitDie: 8 });
    const character = makeCharacterWithClass(classId, 1, 10, []);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    expect(Object.isFrozen(result.perClassBreakdown)).toBe(true);
    expect(Object.isFrozen(result.hitPointIncreases)).toBe(true);
  });

  // ── Regression tests ────────────────────────────────────────────

  it("REGRESSION: level-five character is NOT automatically awarded five maximum hit dice", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 5, CON 14 (+2), with NO hitPointIncreases
    // Old formula would give: 10*5 + 2*5 = 60
    // Corrected formula: only level 1 = 10 + 2 = 12
    const character = makeCharacterWithClass(classId, 5, 14, []);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // With no hitPointIncreases, only level 1 contributes
    expect(result.totalHp).toBe(12);
    expect(result.perClassBreakdown[0]).toMatchObject({ maxHp: 12 });
    // Explicitly NOT 60 (the old hitDie * level behavior)
    expect(result.totalHp).not.toBe(60);
  });

  it("REGRESSION: level-five character with partial hitPointIncreases does not backfill missing levels", () => {
    const classId = eid("fighter");
    const cls = makeClass(classId, [], { hitDie: 10 });
    // Level 5, CON 14 (+2), only 2 hitPointIncreases (levels 2-3)
    // Levels 4-5 are missing, NOT backfilled with hitDie
    const increases = [
      { level: 2, rollOrMax: 10, isMaximized: true },
      { level: 3, rollOrMax: 10, isMaximized: true },
    ];
    const character = makeCharacterWithClass(classId, 5, 14, increases);
    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getClass: (id) => (id === classId ? cls : undefined),
    };

    const result = calculateMaxHp(character, catalog);

    // Level 1: 10 + 2 = 12
    // Level 2: 10 + 2 = 12
    // Level 3: 10 + 2 = 12
    // Levels 4-5: no entries, 0 additional HP
    // Total: 36
    expect(result.totalHp).toBe(36);
    // Explicitly NOT 60 (old behavior would backfill with hitDie * 5)
    expect(result.totalHp).not.toBe(60);
  });
});

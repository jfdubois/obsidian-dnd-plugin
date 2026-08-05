import { describe, it, expect } from "vitest";
import { calculateSpellcasting } from "./spellcasting";
import { makeEffect, eid } from "./effect-collection-helpers";
import {
  makeKnownSpell,
  makePreparedSpell,
  makeAlwaysPreparedSpell,
  makeCantrip,
} from "./spellcasting-helpers";

/* ── Empty baseline ─────────────────────────────────────────────── */

describe("calculateSpellcasting - baseline", () => {
  it("returns empty result for no effects", () => {
    const result = calculateSpellcasting([]);
    expect(result.slots).toEqual({});
    expect(result.knownSpells).toEqual({});
    expect(result.preparedSpells).toEqual({});
    expect(result.alwaysPreparedSpells).toEqual([]);
    expect(result.cantrips).toEqual([]);
    expect(result.explanations).toEqual([]);
  });

  it("ignores non grant-spell effects", () => {
    const effects = [
      makeEffect("add-ability", { ability: "STR", value: 2 }),
      makeEffect("add-resistance", { damageType: "fire" }),
    ];
    const result = calculateSpellcasting(effects);
    expect(result.knownSpells).toEqual({});
    expect(result.cantrips).toEqual([]);
    expect(result.explanations).toEqual([]);
  });
});

/* ── Known spells ────────────────────────────────────────────────── */

describe("calculateSpellcasting - known spells", () => {
  it("tracks single known spell at level 1", () => {
    const result = calculateSpellcasting([makeKnownSpell("spell-burning-hands", 1)]);
    expect(result.knownSpells[1]).toEqual([eid("spell-burning-hands")]);
    expect(result.explanations).toContain("Spell known: spell-burning-hands (level 1)");
  });

  it("tracks known spell at level 3", () => {
    const result = calculateSpellcasting([makeKnownSpell("spell-fireball", 3)]);
    expect(result.knownSpells[3]).toEqual([eid("spell-fireball")]);
    expect(result.knownSpells[1]).toBeUndefined();
  });

  it("deduplicates identical known spells by spell ID", () => {
    const result = calculateSpellcasting([
      makeKnownSpell("spell-firebolt", 0),
      makeKnownSpell("spell-firebolt", 0),
      makeKnownSpell("spell-firebolt", 0),
    ]);
    expect(result.knownSpells[0]).toEqual([eid("spell-firebolt")]);
    expect(result.knownSpells[0]).toHaveLength(1);
  });

  it("groups multiple known spells at same level, sorted", () => {
    const result = calculateSpellcasting([
      makeKnownSpell("spell-chill-touch", 1),
      makeKnownSpell("spell-burning-hands", 1),
      makeKnownSpell("spell-farewell", 1),
    ]);
    expect(result.knownSpells[1]).toHaveLength(3);
    expect(result.knownSpells[1]).toEqual([
      eid("spell-burning-hands"),
      eid("spell-chill-touch"),
      eid("spell-farewell"),
    ]);
  });

  it("separates known spells at different levels", () => {
    const result = calculateSpellcasting([
      makeKnownSpell("spell-firebolt", 0),
      makeKnownSpell("spell-burning-hands", 1),
      makeKnownSpell("spell-mirror-image", 2),
    ]);
    expect(result.knownSpells[0]).toEqual([eid("spell-firebolt")]);
    expect(result.knownSpells[1]).toEqual([eid("spell-burning-hands")]);
    expect(result.knownSpells[2]).toEqual([eid("spell-mirror-image")]);
  });
});

/* ── Prepared spells ─────────────────────────────────────────────── */

describe("calculateSpellcasting - prepared spells", () => {
  it("tracks single prepared spell", () => {
    const result = calculateSpellcasting([makePreparedSpell("spell-cure-wounds", 1)]);
    expect(result.preparedSpells[1]).toEqual([eid("spell-cure-wounds")]);
    expect(result.knownSpells[1]).toBeUndefined();
  });

  it("deduplicates prepared spells by spell ID", () => {
    const result = calculateSpellcasting([
      makePreparedSpell("spell-cure-wounds", 1),
      makePreparedSpell("spell-cure-wounds", 1),
    ]);
    expect(result.preparedSpells[1]).toHaveLength(1);
  });
});

/* ── Always-prepared spells ──────────────────────────────────────── */

describe("calculateSpellcasting - always-prepared spells", () => {
  it("tracks always-prepared spell", () => {
    const result = calculateSpellcasting([makeAlwaysPreparedSpell("spell-levitate", 2)]);
    expect(result.alwaysPreparedSpells).toEqual([eid("spell-levitate")]);
    expect(result.knownSpells).toEqual({});
    expect(result.preparedSpells).toEqual({});
  });

  it("deduplicates always-prepared spells", () => {
    const result = calculateSpellcasting([
      makeAlwaysPreparedSpell("spell-levitate", 2),
      makeAlwaysPreparedSpell("spell-levitate", 2),
    ]);
    expect(result.alwaysPreparedSpells).toHaveLength(1);
  });
});

/* ── Cantrips ────────────────────────────────────────────────────── */

describe("calculateSpellcasting - cantrips", () => {
  it("tracks single cantrip", () => {
    const result = calculateSpellcasting([makeCantrip("spell-firebolt")]);
    expect(result.cantrips).toEqual([eid("spell-firebolt")]);
  });

  it("deduplicates cantrips by spell ID", () => {
    const result = calculateSpellcasting([
      makeCantrip("spell-firebolt"),
      makeCantrip("spell-firebolt"),
    ]);
    expect(result.cantrips).toHaveLength(1);
  });

  it("tracks multiple cantrips sorted", () => {
    const result = calculateSpellcasting([
      makeCantrip("spell-shocking-grasp"),
      makeCantrip("spell-firebolt"),
      makeCantrip("spell-true-strike"),
    ]);
    expect(result.cantrips).toEqual([
      eid("spell-firebolt"),
      eid("spell-shocking-grasp"),
      eid("spell-true-strike"),
    ]);
  });
});

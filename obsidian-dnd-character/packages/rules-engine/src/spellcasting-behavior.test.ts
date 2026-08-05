import { describe, it, expect } from "vitest";
import { calculateSpellcasting } from "./spellcasting";
import { eid } from "./effect-collection-helpers";
import {
  makeKnownSpell,
  makePreparedSpell,
  makeAlwaysPreparedSpell,
  makeCantrip,
} from "./spellcasting-helpers";

/* ── Mixed grant types ───────────────────────────────────────────── */

describe("calculateSpellcasting - mixed grant types", () => {
  it("handles all grant types in single call", () => {
    const result = calculateSpellcasting([
      makeKnownSpell("spell-firebolt", 0),
      makePreparedSpell("spell-cure-wounds", 1),
      makeAlwaysPreparedSpell("spell-levitate", 2),
      makeCantrip("spell-guidance"),
    ]);
    expect(result.knownSpells[0]).toEqual([eid("spell-firebolt")]);
    expect(result.preparedSpells[1]).toEqual([eid("spell-cure-wounds")]);
    expect(result.alwaysPreparedSpells).toEqual([eid("spell-levitate")]);
    expect(result.cantrips).toEqual([eid("spell-guidance")]);
  });

  it("same spell in different grant categories appears in both", () => {
    const result = calculateSpellcasting([
      makeKnownSpell("spell-cure-wounds", 1),
      makePreparedSpell("spell-cure-wounds", 1),
    ]);
    expect(result.knownSpells[1]).toEqual([eid("spell-cure-wounds")]);
    expect(result.preparedSpells[1]).toEqual([eid("spell-cure-wounds")]);
  });
});

/* ── Determinism ─────────────────────────────────────────────────── */

describe("calculateSpellcasting - determinism", () => {
  it("same input produces identical output", () => {
    const effects = [
      makeKnownSpell("spell-fireball", 3),
      makeCantrip("spell-firebolt"),
      makePreparedSpell("spell-cure-wounds", 1),
      makeKnownSpell("spell-mage-armor", 1),
    ];
    const result1 = calculateSpellcasting(effects);
    const result2 = calculateSpellcasting(effects);
    expect(result1.knownSpells).toEqual(result2.knownSpells);
    expect(result1.preparedSpells).toEqual(result2.preparedSpells);
    expect(result1.alwaysPreparedSpells).toEqual(result2.alwaysPreparedSpells);
    expect(result1.cantrips).toEqual(result2.cantrips);
    expect(result1.explanations).toEqual(result2.explanations);
  });

  it("input order does not affect output order", () => {
    const resultA = calculateSpellcasting([
      makeCantrip("spell-true-strike"),
      makeCantrip("spell-firebolt"),
      makeKnownSpell("spell-mage-armor", 1),
      makeKnownSpell("spell-burning-hands", 1),
    ]);
    const resultB = calculateSpellcasting([
      makeKnownSpell("spell-burning-hands", 1),
      makeCantrip("spell-firebolt"),
      makeKnownSpell("spell-mage-armor", 1),
      makeCantrip("spell-true-strike"),
    ]);
    expect(resultA.cantrips).toEqual(resultB.cantrips);
    expect(resultA.knownSpells[1]).toEqual(resultB.knownSpells[1]);
  });
});

/* ── Edge cases ──────────────────────────────────────────────────── */

describe("calculateSpellcasting - edge cases", () => {
  it("handles level 9 spells gracefully", () => {
    const result = calculateSpellcasting([makeKnownSpell("spell-wish", 9)]);
    expect(result.knownSpells[9]).toEqual([eid("spell-wish")]);
    expect(Object.keys(result.knownSpells)).toEqual(["9"]);
  });

  it("slots are empty when no slot effects exist", () => {
    const result = calculateSpellcasting([makeKnownSpell("spell-firebolt", 0)]);
    expect(result.slots).toEqual({});
  });

  it("returns frozen arrays and records", () => {
    const result = calculateSpellcasting([makeCantrip("spell-firebolt")]);
    expect(Object.isFrozen(result.cantrips)).toBe(true);
    expect(Object.isFrozen(result.alwaysPreparedSpells)).toBe(true);
    expect(Object.isFrozen(result.explanations)).toBe(true);
    expect(Object.isFrozen(result.slots)).toBe(true);
  });
});

/* ── Explanations ────────────────────────────────────────────────── */

describe("calculateSpellcasting - explanations", () => {
  it("generates explanation for each grant", () => {
    const result = calculateSpellcasting([
      makeKnownSpell("spell-firebolt", 0),
      makeCantrip("spell-guidance"),
    ]);
    expect(result.explanations).toHaveLength(2);
    expect(result.explanations[0]).toContain("spell-firebolt");
    expect(result.explanations[1]).toContain("spell-guidance");
  });

  it("explanations reflect grant type labels", () => {
    const result = calculateSpellcasting([
      makeKnownSpell("spell-firebolt", 0),
      makePreparedSpell("spell-cure-wounds", 1),
      makeAlwaysPreparedSpell("spell-levitate", 2),
      makeCantrip("spell-guidance"),
    ]);
    expect(result.explanations).toContain("Spell known: spell-firebolt (level 0)");
    expect(result.explanations).toContain("Spell prepared: spell-cure-wounds (level 1)");
    expect(result.explanations).toContain("Spell always prepared: spell-levitate (level 2)");
    expect(result.explanations).toContain("Cantrip: spell-guidance");
  });
});

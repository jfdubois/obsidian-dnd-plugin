import { describe, it, expect } from "vitest";
import { proficiencyBonusForLevel, PROFICIENCY_BONUS_TABLE } from "./proficiency-bonus";

describe("PROFICIENCY_BONUS_TABLE", () => {
  it("contains exactly 7 entries", () => {
    expect(PROFICIENCY_BONUS_TABLE).toHaveLength(7);
  });

  it("covers levels 1 through 30 without gaps", () => {
    expect(PROFICIENCY_BONUS_TABLE[0]!.minLevel).toBe(1);
    expect(PROFICIENCY_BONUS_TABLE[6]!.maxLevel).toBe(30);

    for (let i = 0; i < PROFICIENCY_BONUS_TABLE.length - 1; i++) {
      const current = PROFICIENCY_BONUS_TABLE[i]!;
      const next = PROFICIENCY_BONUS_TABLE[i + 1]!;
      expect(next.minLevel).toBe(current.maxLevel + 1);
    }
  });

  it("is frozen and immutable", () => {
    expect(Object.isFrozen(PROFICIENCY_BONUS_TABLE)).toBe(true);
    for (const entry of PROFICIENCY_BONUS_TABLE) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });
});

describe("proficiencyBonusForLevel", () => {
  it("returns +2 for levels 1-4", () => {
    expect(proficiencyBonusForLevel(1)).toBe(2);
    expect(proficiencyBonusForLevel(2)).toBe(2);
    expect(proficiencyBonusForLevel(3)).toBe(2);
    expect(proficiencyBonusForLevel(4)).toBe(2);
  });

  it("returns +3 for levels 5-8", () => {
    expect(proficiencyBonusForLevel(5)).toBe(3);
    expect(proficiencyBonusForLevel(6)).toBe(3);
    expect(proficiencyBonusForLevel(7)).toBe(3);
    expect(proficiencyBonusForLevel(8)).toBe(3);
  });

  it("returns +4 for levels 9-12", () => {
    expect(proficiencyBonusForLevel(9)).toBe(4);
    expect(proficiencyBonusForLevel(10)).toBe(4);
    expect(proficiencyBonusForLevel(11)).toBe(4);
    expect(proficiencyBonusForLevel(12)).toBe(4);
  });

  it("returns +5 for levels 13-16", () => {
    expect(proficiencyBonusForLevel(13)).toBe(5);
    expect(proficiencyBonusForLevel(14)).toBe(5);
    expect(proficiencyBonusForLevel(15)).toBe(5);
    expect(proficiencyBonusForLevel(16)).toBe(5);
  });

  it("returns +6 for levels 17-20", () => {
    expect(proficiencyBonusForLevel(17)).toBe(6);
    expect(proficiencyBonusForLevel(18)).toBe(6);
    expect(proficiencyBonusForLevel(19)).toBe(6);
    expect(proficiencyBonusForLevel(20)).toBe(6);
  });

  it("returns +7 for levels 21-24", () => {
    expect(proficiencyBonusForLevel(21)).toBe(7);
    expect(proficiencyBonusForLevel(22)).toBe(7);
    expect(proficiencyBonusForLevel(23)).toBe(7);
    expect(proficiencyBonusForLevel(24)).toBe(7);
  });

  it("returns +8 for levels 25-30", () => {
    expect(proficiencyBonusForLevel(25)).toBe(8);
    expect(proficiencyBonusForLevel(26)).toBe(8);
    expect(proficiencyBonusForLevel(27)).toBe(8);
    expect(proficiencyBonusForLevel(28)).toBe(8);
    expect(proficiencyBonusForLevel(29)).toBe(8);
    expect(proficiencyBonusForLevel(30)).toBe(8);
  });

  it("returns 0 for level 0", () => {
    expect(proficiencyBonusForLevel(0)).toBe(0);
  });

  it("returns 0 for negative levels", () => {
    expect(proficiencyBonusForLevel(-1)).toBe(0);
    expect(proficiencyBonusForLevel(-100)).toBe(0);
  });

  it("returns maximum bonus for levels above 30", () => {
    expect(proficiencyBonusForLevel(31)).toBe(8);
    expect(proficiencyBonusForLevel(50)).toBe(8);
    expect(proficiencyBonusForLevel(100)).toBe(8);
  });

  it("produces deterministic results across calls", () => {
    const result1 = proficiencyBonusForLevel(15);
    const result2 = proficiencyBonusForLevel(15);

    expect(result1).toBe(result2);
    expect(result1).toBe(5);
  });
});

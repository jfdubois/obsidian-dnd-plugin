import { describe, it, expect } from "vitest";
import { abilityModifier } from "./ability-scores";

describe("abilityModifier", () => {
  it("returns -5 for score 1", () => {
    expect(abilityModifier(1)).toBe(-5);
  });

  it("returns -4 for score 3", () => {
    expect(abilityModifier(3)).toBe(-4);
  });

  it("returns -2 for score 6", () => {
    expect(abilityModifier(6)).toBe(-2);
  });

  it("returns -1 for score 8", () => {
    expect(abilityModifier(8)).toBe(-1);
  });

  it("returns 0 for score 10", () => {
    expect(abilityModifier(10)).toBe(0);
  });

  it("returns 0 for score 11", () => {
    expect(abilityModifier(11)).toBe(0);
  });

  it("returns 1 for score 12", () => {
    expect(abilityModifier(12)).toBe(1);
  });

  it("returns 2 for score 14", () => {
    expect(abilityModifier(14)).toBe(2);
  });

  it("returns 3 for score 16", () => {
    expect(abilityModifier(16)).toBe(3);
  });

  it("returns 4 for score 18", () => {
    expect(abilityModifier(18)).toBe(4);
  });

  it("returns 5 for score 20", () => {
    expect(abilityModifier(20)).toBe(5);
  });

  it("returns 10 for score 30", () => {
    expect(abilityModifier(30)).toBe(10);
  });

  it("handles odd scores correctly (floor division)", () => {
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(13)).toBe(1);
    expect(abilityModifier(17)).toBe(3);
    expect(abilityModifier(21)).toBe(5);
    expect(abilityModifier(29)).toBe(9);
  });

  it("handles boundary at score 2 (modifier -4)", () => {
    expect(abilityModifier(2)).toBe(-4);
  });

  it("handles boundary at score 4 (modifier -3)", () => {
    expect(abilityModifier(4)).toBe(-3);
  });

  it("handles boundary at score 5 (modifier -3)", () => {
    expect(abilityModifier(5)).toBe(-3);
  });

  it("handles boundary at score 7 (modifier -2)", () => {
    expect(abilityModifier(7)).toBe(-2);
  });

  it("handles boundary at score 15 (modifier 2)", () => {
    expect(abilityModifier(15)).toBe(2);
  });

  it("handles boundary at score 19 (modifier 4)", () => {
    expect(abilityModifier(19)).toBe(4);
  });

  it("handles boundary at score 22 (modifier 6)", () => {
    expect(abilityModifier(22)).toBe(6);
  });

  it("produces deterministic results across calls", () => {
    const result1 = abilityModifier(15);
    const result2 = abilityModifier(15);
    expect(result1).toBe(result2);
    expect(result1).toBe(2);
  });
});

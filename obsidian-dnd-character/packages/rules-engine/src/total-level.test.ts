import { describe, it, expect } from "vitest";
import { calculateTotalLevel } from "./total-level";
import { makeCharacter, cid, eid } from "./effect-collection-helpers";

describe("calculateTotalLevel", () => {
  it("returns 0 for a character with no classes", () => {
    const character = makeCharacter({
      progression: { classes: [] },
    });

    expect(calculateTotalLevel(character)).toBe(0);
  });

  it("returns the level for a single-class character", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: eid("class-rogue"),
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
    });

    expect(calculateTotalLevel(character)).toBe(5);
  });

  it("sums levels for a multiclass character", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: eid("class-rogue"),
            level: 3,
            isStartingClass: true,
            hitPointIncreases: [],
          },
          {
            instanceId: cid("wizard-1"),
            classId: eid("class-wizard"),
            level: 5,
            isStartingClass: false,
            hitPointIncreases: [],
          },
        ],
      },
    });

    expect(calculateTotalLevel(character)).toBe(8);
  });

  it("sums levels for three-class progression", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("fighter-1"),
            classId: eid("class-fighter"),
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [],
          },
          {
            instanceId: cid("rogue-1"),
            classId: eid("class-rogue"),
            level: 3,
            isStartingClass: false,
            hitPointIncreases: [],
          },
          {
            instanceId: cid("cleric-1"),
            classId: eid("class-cleric"),
            level: 2,
            isStartingClass: false,
            hitPointIncreases: [],
          },
        ],
      },
    });

    expect(calculateTotalLevel(character)).toBe(10);
  });

  it("handles level 20 single-class maximum", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("paladin-1"),
            classId: eid("class-paladin"),
            level: 20,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
    });

    expect(calculateTotalLevel(character)).toBe(20);
  });

  it("handles level 30 epic progression", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("wizard-1"),
            classId: eid("class-wizard"),
            level: 20,
            isStartingClass: true,
            hitPointIncreases: [],
          },
          {
            instanceId: cid("sorcerer-1"),
            classId: eid("class-sorcerer"),
            level: 10,
            isStartingClass: false,
            hitPointIncreases: [],
          },
        ],
      },
    });

    expect(calculateTotalLevel(character)).toBe(30);
  });

  it("produces deterministic results across calls", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          { instanceId: cid("barbarian-1"), classId: eid("class-barbarian"), level: 7, isStartingClass: true, hitPointIncreases: [] },
          { instanceId: cid("druid-1"), classId: eid("class-druid"), level: 4, isStartingClass: false, hitPointIncreases: [] },
        ],
      },
    });

    const result1 = calculateTotalLevel(character);
    const result2 = calculateTotalLevel(character);

    expect(result1).toBe(result2);
    expect(result1).toBe(11);
  });
});

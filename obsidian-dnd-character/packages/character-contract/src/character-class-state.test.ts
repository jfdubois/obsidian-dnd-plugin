import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createClassInstanceId,
} from "@obsidian-dnd/domain";
import {
  type HitPointIncrease,
  isCharacterClassState,
  createCharacterClassState,
} from "./character-class-state";

function makeHitPointIncrease(level = 1, rollOrMax = 10, isMaximized = false): HitPointIncrease {
  return { level, rollOrMax, isMaximized };
}

describe("HitPointIncrease", () => {
  it("accepts valid hit point increase", () => {
    expect(isCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 1,
      isStartingClass: true,
      hitPointIncreases: [makeHitPointIncrease()],
    })).toBe(true);
  });

  it("rejects hit point increase with level 0", () => {
    expect(isCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 1,
      isStartingClass: true,
      hitPointIncreases: [{ level: 0, rollOrMax: 10, isMaximized: false }],
    })).toBe(false);
  });

  it("rejects hit point increase with negative rollOrMax", () => {
    expect(isCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 1,
      isStartingClass: true,
      hitPointIncreases: [{ level: 1, rollOrMax: -1, isMaximized: false }],
    })).toBe(false);
  });
});

describe("CharacterClassState", () => {
  it("accepts valid class state", () => {
    const state = createCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 5,
      isStartingClass: true,
      hitPointIncreases: [makeHitPointIncrease(1, 10), makeHitPointIncrease(2, 8)],
    });
    expect(isCharacterClassState(state)).toBe(true);
    expect(state.level).toBe(5);
    expect(state.isStartingClass).toBe(true);
    expect(state.hitPointIncreases.length).toBe(2);
  });

  it("accepts class state with subclass", () => {
    const state = createCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 3,
      isStartingClass: true,
      subclassId: createEntityId("subclass:2024:xphb:champion"),
      hitPointIncreases: [makeHitPointIncrease()],
    });
    expect(isCharacterClassState(state)).toBe(true);
  });

  it("rejects class state with level 0", () => {
    expect(isCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 0,
      isStartingClass: true,
      hitPointIncreases: [],
    })).toBe(false);
  });

  it("rejects class state with missing instanceId", () => {
    expect(isCharacterClassState({
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 1,
      isStartingClass: true,
      hitPointIncreases: [],
    })).toBe(false);
  });

  it("rejects class state with invalid subclassId", () => {
    expect(isCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 3,
      isStartingClass: true,
      subclassId: 123,
      hitPointIncreases: [],
    })).toBe(false);
  });

  it("factory produces deep copies of hitPointIncreases", () => {
    const increases = [makeHitPointIncrease()];
    const state = createCharacterClassState({
      instanceId: createClassInstanceId("cls-1"),
      classId: createEntityId("class:2024:xphb:fighter"),
      level: 1,
      isStartingClass: true,
      hitPointIncreases: increases,
    });
    expect(state.hitPointIncreases).not.toBe(increases);
  });
});

import { describe, it, expect } from "vitest";
import { createChoiceDefinitionId, createChoiceInstanceId, createChoiceOptionId, createEntityId } from "@obsidian-dnd/domain";
import { createCharacterChoice, isCharacterChoice, isCharacterChoiceSelectedValue } from "./character-choice";

const identity = { instanceId: createChoiceInstanceId("choice-1"), definitionId: createChoiceDefinitionId("choice-def-1"), originGrantId: createEntityId("class:2024:xphb:fighter") };

describe("CharacterChoice", () => {
  it("accepts entity selections including an empty legacy-permitted selection", () => {
    const choice = createCharacterChoice({ ...identity, selectedValue: { type: "entity-ids", entityIds: [] } });
    expect(isCharacterChoice(choice)).toBe(true);
  });
  it("accepts entity, ability-allocation, and closed-option selected values", () => {
    expect(isCharacterChoiceSelectedValue({ type: "entity-ids", entityIds: [createEntityId("feat:x")] })).toBe(true);
    expect(isCharacterChoiceSelectedValue({ type: "ability-allocation", allocations: [{ ability: "STR", bonus: 2 }] })).toBe(true);
    expect(isCharacterChoiceSelectedValue({ type: "option-ids", optionIds: [createChoiceOptionId("option:x")] })).toBe(true);
  });
  it("rejects malformed selected values", () => {
    expect(isCharacterChoiceSelectedValue({ type: "ability-allocation", allocations: [{ ability: "STR", bonus: 1 }, { ability: "STR", bonus: 1 }] })).toBe(false);
    expect(isCharacterChoiceSelectedValue({ type: "option-ids", optionIds: [""] })).toBe(false);
    expect(isCharacterChoice({ ...identity, selectedOptionIds: [] })).toBe(false);
  });
  it("copies nested selected values", () => {
    const ids = [createEntityId("feat:x")];
    const choice = createCharacterChoice({ ...identity, selectedValue: { type: "entity-ids", entityIds: ids } });
    expect(choice.selectedValue.type).toBe("entity-ids");
    if (choice.selectedValue.type === "entity-ids") expect(choice.selectedValue.entityIds).not.toBe(ids);
  });
});

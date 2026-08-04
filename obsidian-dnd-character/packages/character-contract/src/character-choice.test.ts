import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
} from "@obsidian-dnd/domain";
import {
  isCharacterChoice,
  createCharacterChoice,
} from "./character-choice";

describe("CharacterChoice", () => {
  it("accepts valid choice", () => {
    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("choice-1"),
      definitionId: createChoiceDefinitionId("choice-def-1"),
      originGrantId: createEntityId("class:2024:xphb:fighter"),
      selectedOptionIds: [createEntityId("feat:2024:xphb:tough")],
    });
    expect(isCharacterChoice(choice)).toBe(true);
    expect(choice.selectedOptionIds.length).toBe(1);
  });

  it("accepts choice with multiple selected options", () => {
    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("choice-1"),
      definitionId: createChoiceDefinitionId("choice-def-1"),
      originGrantId: createEntityId("background:2024:xphb:soldier"),
      selectedOptionIds: [
        createEntityId("skill:2024:xphb:athletics"),
        createEntityId("skill:2024:xphb:intimidation"),
      ],
    });
    expect(isCharacterChoice(choice)).toBe(true);
  });

  it("rejects choice with invalid instanceId", () => {
    expect(isCharacterChoice({
      instanceId: null,
      definitionId: createChoiceDefinitionId("choice-def-1"),
      originGrantId: createEntityId("class:2024:xphb:fighter"),
      selectedOptionIds: [],
    })).toBe(false);
  });

  it("rejects choice with non-entity selectedOptionIds", () => {
    expect(isCharacterChoice({
      instanceId: createChoiceInstanceId("choice-1"),
      definitionId: createChoiceDefinitionId("choice-def-1"),
      originGrantId: createEntityId("class:2024:xphb:fighter"),
      selectedOptionIds: [123],
    })).toBe(false);
  });

  it("factory produces deep copy of selectedOptionIds", () => {
    const options = [createEntityId("feat:2024:xphb:tough")];
    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("choice-1"),
      definitionId: createChoiceDefinitionId("choice-def-1"),
      originGrantId: createEntityId("class:2024:xphb:fighter"),
      selectedOptionIds: options,
    });
    expect(choice.selectedOptionIds).not.toBe(options);
  });
});

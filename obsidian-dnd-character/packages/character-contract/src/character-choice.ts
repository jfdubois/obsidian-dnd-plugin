import type {
  EntityId,
  ChoiceInstanceId,
  ChoiceDefinitionId,
} from "@obsidian-dnd/domain";
import {
  isEntityId,
  isChoiceInstanceId,
  isChoiceDefinitionId,
} from "@obsidian-dnd/domain";

/* ── Character choice ──────────────────────────────────────────── */

export interface CharacterChoice {
  instanceId: ChoiceInstanceId;
  definitionId: ChoiceDefinitionId;
  originGrantId: EntityId;
  selectedOptionIds: EntityId[];
}

export function isCharacterChoice(value: unknown): value is CharacterChoice {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isChoiceInstanceId(obj.instanceId)) return false;
  if (!isChoiceDefinitionId(obj.definitionId)) return false;
  if (!isEntityId(obj.originGrantId)) return false;
  if (!Array.isArray(obj.selectedOptionIds)) return false;
  if (!obj.selectedOptionIds.every((id: unknown) => isEntityId(id))) return false;

  return true;
}

export function createCharacterChoice(
  props: {
    instanceId: ChoiceInstanceId;
    definitionId: ChoiceDefinitionId;
    originGrantId: EntityId;
    selectedOptionIds: EntityId[];
  },
): CharacterChoice {
  return {
    instanceId: props.instanceId,
    definitionId: props.definitionId,
    originGrantId: props.originGrantId,
    selectedOptionIds: [...props.selectedOptionIds],
  };
}

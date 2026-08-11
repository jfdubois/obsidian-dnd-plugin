import type { Ability, ChoiceDefinitionId, ChoiceInstanceId, ChoiceOptionId, EntityId } from "@obsidian-dnd/domain";
import { isAbility, isChoiceDefinitionId, isChoiceInstanceId, isChoiceOptionId, isEntityId } from "@obsidian-dnd/domain";

export interface AbilityAllocationSelection {
  ability: Ability;
  bonus: number;
}

export type CharacterChoiceSelectedValue =
  | { type: "entity-ids"; entityIds: EntityId[] }
  | { type: "ability-allocation"; allocations: AbilityAllocationSelection[] }
  | { type: "option-ids"; optionIds: ChoiceOptionId[] };

export interface CharacterChoice {
  instanceId: ChoiceInstanceId;
  definitionId: ChoiceDefinitionId;
  originGrantId: EntityId;
  selectedValue: CharacterChoiceSelectedValue;
}

export function isCharacterChoiceSelectedValue(value: unknown): value is CharacterChoiceSelectedValue {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.type === "entity-ids") return Array.isArray(obj.entityIds) && obj.entityIds.every(isEntityId);
  if (obj.type === "option-ids") return Array.isArray(obj.optionIds) && obj.optionIds.every(isChoiceOptionId);
  if (obj.type === "ability-allocation") {
    if (!Array.isArray(obj.allocations) || obj.allocations.length === 0) return false;
    const abilities = new Set<Ability>();
    return obj.allocations.every((allocation) => {
      if (typeof allocation !== "object" || allocation === null) return false;
      const item = allocation as Record<string, unknown>;
      if (!isAbility(item.ability) || abilities.has(item.ability) || typeof item.bonus !== "number" || !Number.isInteger(item.bonus) || item.bonus <= 0) return false;
      abilities.add(item.ability);
      return true;
    });
  }
  return false;
}

export function isCharacterChoice(value: unknown): value is CharacterChoice {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return isChoiceInstanceId(obj.instanceId) && isChoiceDefinitionId(obj.definitionId)
    && isEntityId(obj.originGrantId) && isCharacterChoiceSelectedValue(obj.selectedValue);
}

export function createCharacterChoice(props: CharacterChoice): CharacterChoice {
  const selectedValue = props.selectedValue.type === "entity-ids"
    ? { type: "entity-ids" as const, entityIds: [...props.selectedValue.entityIds] }
    : props.selectedValue.type === "option-ids"
      ? { type: "option-ids" as const, optionIds: [...props.selectedValue.optionIds] }
      : { type: "ability-allocation" as const, allocations: props.selectedValue.allocations.map((allocation) => ({ ...allocation })) };
  return { ...props, selectedValue };
}

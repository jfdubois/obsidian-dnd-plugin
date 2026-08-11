import { Setting } from "obsidian";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { Ability, EntityId } from "@obsidian-dnd/domain";
import type { ChoiceConsequence } from "./creator-consequence-service";

export type SubmitCreatorChoice = (instanceId: ChoiceConsequence["instanceId"], value: CharacterChoice["selectedValue"]) => void;
export type ClearCreatorChoice = (instanceId: ChoiceConsequence["instanceId"]) => void;

interface ChoiceState { choice: ChoiceConsequence; selectedIds: Set<string>; allocations: Map<string, number>; }

/** Presentation-only renderer for already-derived active creator choices. */
export function renderActiveCreatorChoices(container: HTMLElement, heading: string, choices: readonly ChoiceConsequence[], submit: SubmitCreatorChoice, clear?: ClearCreatorChoice): void {
  const section = container.createDiv({ cls: "dnd-internal-choices" });
  section.createEl("h4", { text: heading });
  const states = choices.map((choice) => renderChoice(section, choice));
  new Setting(section.createDiv({ cls: "dnd-choice-actions" })).addButton((button) => button
    .setButtonText("Confirm choices").setCta().onClick(() => {
      for (const state of states) {
        const value = selectedValue(state);
        if (value === undefined) return;
        submit(state.choice.instanceId, value);
      }
    }));
  if (clear !== undefined && choices.some((choice) => choice.selectedValue !== undefined)) {
    new Setting(section.createDiv({ cls: "dnd-choice-actions" })).addButton((button) => button
      .setButtonText("Clear choices").onClick(() => {
        for (const choice of choices) if (choice.selectedValue !== undefined) clear(choice.instanceId);
      }));
  }
}

function renderChoice(container: HTMLElement, choice: ChoiceConsequence): ChoiceState {
  const state: ChoiceState = {
    choice,
    selectedIds: new Set<string>(choice.selectedValue?.type === "entity-ids" ? choice.selectedValue.entityIds : choice.selectedValue?.type === "option-ids" ? choice.selectedValue.optionIds : []),
    allocations: new Map(choice.selectedValue?.type === "ability-allocation" ? choice.selectedValue.allocations.map((entry) => [entry.ability, entry.bonus]) : []),
  };
  const wrapper = container.createDiv({ cls: `dnd-choice-wrapper dnd-choice-${choice.definition.id}` });
  const bounds = choice.definition.type === "ability-allocation" ? "allocation" : `${choice.definition.minimum}${choice.definition.maximum > 1 ? `-${choice.definition.maximum}` : ""} required`;
  wrapper.createEl("label", { text: `${choice.definition.label} (${bounds})`, cls: "dnd-choice-label" });
  if (choice.status === "invalid") wrapper.createEl("p", { text: "Current selection is no longer eligible. Choose a valid replacement.", cls: "dnd-creator-error" });
  if (choice.definition.type === "ability-allocation") renderAbilityAllocation(wrapper, state);
  else renderIds(wrapper, state);
  return state;
}

function renderIds(container: HTMLElement, state: ChoiceState): void {
  const { choice, selectedIds } = state;
  const definition = choice.definition;
  if (definition.type === "ability-allocation") return;
  const values = definition.type === "closed-option"
    ? definition.options.map((option) => ({ id: String(option.id), name: option.label }))
    : choice.candidates.map((candidate) => ({ id: String(candidate.id), name: candidate.name }));
  if (values.length === 0) {
    container.createEl("p", { text: `No candidates available for "${choice.definition.label}".`, cls: "dnd-creator-error" });
    return;
  }
  if (definition.maximum > 1) for (const value of [...values].sort((a, b) => a.name.localeCompare(b.name))) {
    const setting = new Setting(container);
    setting.setName(value.name).addToggle((toggle) => toggle.setValue(selectedIds.has(value.id)).onChange((checked) => {
      if (checked && (definition.repeatable || selectedIds.size < definition.maximum)) selectedIds.add(value.id);
      if (!checked) selectedIds.delete(value.id);
    }));
  } else new Setting(container).addDropdown((dropdown) => {
    const options: Record<string, string> = { "": "— Select —" };
    for (const value of [...values].sort((a, b) => a.name.localeCompare(b.name))) options[value.id] = value.name;
    dropdown.addOptions(options).setValue([...selectedIds][0] ?? "").onChange((value) => { selectedIds.clear(); if (value !== "") selectedIds.add(value); });
  });
}

function renderAbilityAllocation(container: HTMLElement, state: ChoiceState): void {
  const definition = state.choice.definition;
  if (definition.type !== "ability-allocation") return;
  container.createEl("p", { text: `Allowed bonuses: ${definition.distributions.map((entry) => entry.bonuses.join(" / ")).join(" or ")}`, cls: "dnd-creator-info" });
  for (const ability of definition.eligibleAbilities) new Setting(container).setName(ability).addDropdown((dropdown) => {
    const options: Record<string, string> = { "": "No bonus" };
    for (const bonus of [...new Set(definition.distributions.flatMap((entry) => entry.bonuses))].sort((a, b) => b - a)) options[String(bonus)] = `+${bonus}`;
    dropdown.addOptions(options).setValue(state.allocations.get(ability) === undefined ? "" : String(state.allocations.get(ability))).onChange((value) => {
      if (value === "") state.allocations.delete(ability); else state.allocations.set(ability, Number(value));
    });
  });
}

function selectedValue(state: ChoiceState): CharacterChoice["selectedValue"] | undefined {
  const definition = state.choice.definition;
  if (definition.type === "ability-allocation") {
    const allocations = [...state.allocations].map(([ability, bonus]) => ({ ability: ability as Ability, bonus }));
    const bonuses = allocations.map((entry) => entry.bonus).sort((a, b) => b - a).join(",");
    if (!definition.distributions.some((entry) => entry.bonuses.slice().sort((a, b) => b - a).join(",") === bonuses)) return undefined;
    return { type: "ability-allocation", allocations };
  }
  if (state.selectedIds.size < definition.minimum || state.selectedIds.size > definition.maximum) return undefined;
  return definition.type === "closed-option"
    ? { type: "option-ids", optionIds: [...state.selectedIds] as never }
    : { type: "entity-ids", entityIds: [...state.selectedIds] as EntityId[] };
}

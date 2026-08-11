import { Setting, type DropdownComponent } from "obsidian";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { ChoiceDefinition } from "@obsidian-dnd/catalog-contract";
import type { Ability, EntityId } from "@obsidian-dnd/domain";
import type { ChoiceConsequence } from "./creator-consequence-service";

export interface CreatorChoiceSubmission { instanceId: ChoiceConsequence["instanceId"]; value: CharacterChoice["selectedValue"]; }
export type SubmitCreatorChoices = (submissions: readonly CreatorChoiceSubmission[]) => void;
export type ClearCreatorChoice = (instanceId: ChoiceConsequence["instanceId"]) => void;

interface ChoiceState { choice: ChoiceConsequence; slots: Array<string | undefined>; allocations: Map<string, number>; }
type IdChoiceDefinition = Exclude<ChoiceDefinition, { type: "ability-allocation" }>;

/** Presentation-only renderer for already-derived active creator choices. */
export function renderActiveCreatorChoices(container: HTMLElement, heading: string, choices: readonly ChoiceConsequence[], submit: SubmitCreatorChoices, clear?: ClearCreatorChoice): void {
  const section = container.createDiv({ cls: "dnd-internal-choices" });
  section.createEl("h4", { text: heading });
  const states = choices.map((choice) => renderChoice(section, choice));
  new Setting(section.createDiv({ cls: "dnd-choice-actions" })).addButton((button) => button
    .setButtonText("Confirm choices").setCta().onClick(() => {
      const submissions: CreatorChoiceSubmission[] = [];
      for (const state of states) {
        const value = selectedValue(state);
        if (value === undefined) return;
        submissions.push({ instanceId: state.choice.instanceId, value });
      }
      submit(submissions);
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
    slots: choice.definition.type === "ability-allocation" ? [] : Array.from({ length: choice.definition.maximum }, (_, index) => {
      const values = choice.selectedValue?.type === "entity-ids" ? choice.selectedValue.entityIds : choice.selectedValue?.type === "option-ids" ? choice.selectedValue.optionIds : [];
      return values[index] === undefined ? undefined : String(values[index]);
    }),
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
  const { choice } = state;
  const definition = choice.definition;
  if (definition.type === "ability-allocation") return;
  const values = definition.type === "closed-option"
    ? definition.options.map((option) => ({ id: String(option.id), name: option.label }))
    : choice.candidates.map((candidate) => ({ id: String(candidate.id), name: candidate.name }));
  if (values.length === 0) {
    container.createEl("p", { text: `No candidates available for "${choice.definition.label}".`, cls: "dnd-creator-error" });
    return;
  }
  renderSelectionSlots(container, state, definition, values);
}

function renderSelectionSlots(container: HTMLElement, state: ChoiceState, definition: IdChoiceDefinition, values: readonly { id: string; name: string }[]): void {
  const dropdowns: DropdownComponent[] = [];
  const sortedValues = [...values].sort((a, b) => a.name.localeCompare(b.name));
  const singular = definition.maximum === 1;
  const placeholder = `— Select ${choiceSlotLabel(definition).toLowerCase()} —`;
  for (let index = 0; index < state.slots.length; index += 1) {
    const required = index < definition.minimum;
    new Setting(container).setName(singular ? definition.label : `${choiceSlotLabel(definition)} ${index + 1}${required ? "" : " (optional)"}`).addDropdown((dropdown) => {
      dropdowns.push(dropdown);
      dropdown.onChange((value) => {
        state.slots[index] = value === "" ? undefined : value;
        refreshSlotOptions(dropdowns, state, sortedValues, placeholder);
      });
    });
  }
  refreshSlotOptions(dropdowns, state, sortedValues, placeholder);
}

function refreshSlotOptions(dropdowns: readonly DropdownComponent[], state: ChoiceState, values: readonly { id: string; name: string }[], placeholder: string): void {
  for (const [index, dropdown] of dropdowns.entries()) {
    const siblingIds = new Set(state.slots.filter((value, siblingIndex) => siblingIndex !== index && value !== undefined));
    const options: Record<string, string> = { "": placeholder };
    for (const value of values) if (state.choice.definition.type === "ability-allocation" || state.choice.definition.repeatable || !siblingIds.has(value.id)) options[value.id] = value.name;
    dropdown.selectEl.replaceChildren();
    dropdown.addOptions(options).setValue(state.slots[index] ?? "");
  }
}

function choiceSlotLabel(definition: IdChoiceDefinition): string {
  if (definition.type === "closed-option") return definition.label;
  if (definition.optionQuery.type === "entity") return titleCase(definition.optionQuery.kind);
  if (definition.optionQuery.type === "proficiency") return titleCase(definition.optionQuery.kind);
  return titleCase(definition.type.replace(/-proficiency$/, ""));
}

function titleCase(value: string): string { return value.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "); }

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
  const ids = state.slots.filter((value): value is string => value !== undefined);
  if (ids.length < definition.minimum || ids.length > definition.maximum) return undefined;
  return definition.type === "closed-option"
    ? { type: "option-ids", optionIds: ids as never }
    : { type: "entity-ids", entityIds: ids as EntityId[] };
}

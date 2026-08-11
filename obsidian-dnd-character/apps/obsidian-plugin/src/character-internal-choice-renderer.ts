import { Setting } from "obsidian";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import type { CatalogRevision, EntityId } from "@obsidian-dnd/domain";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import { renderChoiceDefinition, type ChoiceDropdownState } from "./character-species-choice-renderers";
import type { ChoiceConsequence } from "./creator-consequence-service";

/** @deprecated Compatibility renderer; the modal uses creator-active-choice-renderer. */

export async function renderInternalChoices(
  container: HTMLElement,
  heading: string,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  choices: readonly ChoiceConsequence[],
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): Promise<void> {
  const section = container.createDiv({ cls: "dnd-internal-choices" });
  section.createEl("h4", { text: heading });
  const states: ChoiceDropdownState[] = [];

  for (const choice of choices) {
    const state = await renderChoiceDefinition(
      section, draft, catalog, revision, choice.definition, isEntityEligible,
    );
    if (state !== null) {
      state.instanceId = choice.instanceId;
      state.originId = choice.originId;
      state.selectedIds = selectedIds(choice);
      states.push(state);
    }
  }

  if (states.length === 0) return;
  const setting = new Setting(section.createDiv({ cls: "dnd-choice-actions" }));
  setting.addButton((button) => {
    button.setButtonText("Confirm choices").setCta().onClick(() => {
      const choices = buildInternalChoices(states);
      if (choices !== null) onChoicesResolved(choices);
    });
  });
}

export function buildInternalChoices(
  states: ChoiceDropdownState[],
): Record<string, CharacterChoice> | null {
  const choices: Record<string, CharacterChoice> = {};
  for (const state of states) {
    if (state.definition.type === "ability-allocation") return null;
    if (state.selectedIds.size < state.definition.minimum
      || state.selectedIds.size > state.definition.maximum) return null;
    if (state.instanceId === undefined || state.originId === undefined) return null;
    const instanceId = state.instanceId;
    choices[instanceId] = createCharacterChoice({
      instanceId,
      definitionId: state.definition.id,
      originGrantId: state.originId,
      selectedValue: { type: "entity-ids", entityIds: [...state.selectedIds] as EntityId[] },
    });
  }
  return choices;
}

function selectedIds(choice: ChoiceConsequence): Set<string> {
  const selected = choice.selectedValue;
  if (selected?.type === "entity-ids") return new Set(selected.entityIds);
  if (selected?.type === "option-ids") return new Set(selected.optionIds);
  return new Set();
}

import { Setting } from "obsidian";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import { createChoiceInstanceId, type CatalogRevision, type EntityId } from "@obsidian-dnd/domain";
import type { ChoiceDefinition } from "@obsidian-dnd/catalog-contract";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import { renderChoiceDefinition, type ChoiceDropdownState } from "./character-species-choice-renderers";

export async function renderInternalChoices(
  container: HTMLElement,
  heading: string,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  originGrantId: EntityId,
  definitions: ChoiceDefinition[],
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): Promise<void> {
  const section = container.createDiv({ cls: "dnd-internal-choices" });
  section.createEl("h4", { text: heading });
  const states: ChoiceDropdownState[] = [];

  for (const definition of definitions) {
    const state = await renderChoiceDefinition(
      section, draft, catalog, revision, definition, isEntityEligible,
    );
    if (state !== null) states.push(state);
  }

  if (states.length === 0) return;
  const setting = new Setting(section.createDiv({ cls: "dnd-choice-actions" }));
  setting.addButton((button) => {
    button.setButtonText("Confirm choices").setCta().onClick(() => {
      const choices = buildInternalChoices(states, originGrantId);
      if (choices !== null) onChoicesResolved(choices);
    });
  });
}

export function buildInternalChoices(
  states: ChoiceDropdownState[],
  originGrantId: EntityId,
): Record<string, CharacterChoice> | null {
  const choices: Record<string, CharacterChoice> = {};
  for (const state of states) {
    if (state.selectedIds.size < state.definition.minimum
      || state.selectedIds.size > state.definition.maximum) return null;
    const instanceId = createChoiceInstanceId(
      `${state.definition.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    choices[instanceId] = createCharacterChoice({
      instanceId,
      definitionId: state.definition.id,
      originGrantId,
      selectedOptionIds: [...state.selectedIds] as EntityId[],
    });
  }
  return choices;
}

/* ── Species choices renderer: Obsidian UI for species choices ───
   Renders species choice controls after species selection.
   Handles zero-choice auto-resolve and dispatches to type-specific
   renderers. Uses only approved Obsidian APIs.                     */

import { Setting } from "obsidian";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import type { EntityId, CatalogRevision } from "@obsidian-dnd/domain";
import { createChoiceInstanceId } from "@obsidian-dnd/domain";
import type { ChoiceDefinition } from "@obsidian-dnd/catalog-contract";
import { renderChoiceDefinition, type ChoiceDropdownState } from "./character-species-choice-renderers";

/* ── Public API ────────────────────────────────────────────────── */

export async function renderSpeciesChoices(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): Promise<void> {
  const speciesId = draft.species.speciesId;
  if (!speciesId) return;

  const status = catalog.getRuntimeStatus();
  const revision = status.activeRevision;
  if (revision === undefined) {
    container.createEl("p", { text: "Catalog is not active." });
    return;
  }

  const loadingEl = container.createDiv({ cls: "dnd-creator-loading" });
  loadingEl.createEl("p", { text: "Loading species choices..." });

  try {
    const speciesResult = await catalog.fetchEntity(
      revision, speciesId, getSpeciesDetailPath(speciesId),
    );
    loadingEl.remove();

    const speciesData = speciesResult.data;
    if (speciesData.kind !== "species") {
      container.createEl("p", { text: "Invalid species data." });
      return;
    }

    const choices = speciesData.choices;
    if (!choices || choices.length === 0) {
      container.createEl("p", {
        text: "No additional choices for this species.",
        cls: "dnd-creator-info",
      });
      onChoicesResolved({});
      return;
    }

    await renderChoicesSection(
      container, draft, catalog, revision, speciesId,
      choices, isEntityEligible, onChoicesResolved,
    );
  } catch {
    loadingEl.remove();
    container.createEl("p", {
      text: "Failed to load species choices.",
      cls: "dnd-creator-error",
    });
  }
}

/* ── Choices section rendering ─────────────────────────────────── */

async function renderChoicesSection(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  speciesId: string,
  choices: ChoiceDefinition[],
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): Promise<void> {
  const section = container.createDiv({ cls: "dnd-species-choices" });
  section.createEl("h4", { text: "Species Choices" });

  const dropdownStates: ChoiceDropdownState[] = [];

  for (const def of choices) {
    const state = await renderChoiceDefinition(
      section, draft, catalog, revision, def, isEntityEligible,
    );
    if (state) dropdownStates.push(state);
  }

  if (dropdownStates.length > 0) {
    renderConfirmButton(section, dropdownStates, speciesId, onChoicesResolved);
  }
}

/* ── Confirm button ────────────────────────────────────────────── */

function renderConfirmButton(
  container: HTMLElement,
  states: ChoiceDropdownState[],
  speciesId: string,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): void {
  const btnContainer = container.createDiv({ cls: "dnd-choice-actions" });
  const setting = new Setting(btnContainer);
  setting.addButton((btn) => {
    btn.setButtonText("Confirm choices")
      .setCta()
      .onClick(() => {
        const choices = buildChoices(states, speciesId);
        if (choices !== null) onChoicesResolved(choices);
      });
  });
}

/* ── Choice building ───────────────────────────────────────────── */

export function buildChoices(
  states: ChoiceDropdownState[],
  originGrantId: string,
): Record<string, CharacterChoice> | null {
  const choices: Record<string, CharacterChoice> = {};

  for (const state of states) {
    const { definition, selectedIds } = state;
    if (selectedIds.size < definition.minimum || selectedIds.size > definition.maximum) {
      return null;
    }

    const instanceId = createChoiceInstanceId(
      `${definition.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );

    const choice = createCharacterChoice({
      instanceId,
      definitionId: definition.id,
      originGrantId: originGrantId as EntityId,
      selectedOptionIds: [...selectedIds] as EntityId[],
    });
    choices[instanceId] = choice;
  }

  return choices;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function getSpeciesDetailPath(speciesId: string): string {
  const parts = speciesId.split(":");
  if (parts.length >= 4) {
    const ruleset = parts[1];
    const source = parts[2];
    const name = parts.slice(3).join("-");
    return `entities/species/${source}/${ruleset}/${name}.json`;
  }
  return `entities/species/${speciesId}.json`;
}

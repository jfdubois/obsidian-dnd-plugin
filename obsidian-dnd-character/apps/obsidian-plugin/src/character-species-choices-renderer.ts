/* ── Species choices renderer: Obsidian UI for species choices ───
   Renders species choice controls after species selection.
   Handles zero-choice auto-resolve and dispatches to type-specific
   renderers. Uses only approved Obsidian APIs.                     */

import { Setting } from "obsidian";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import type { EntityId, CatalogRevision, RuleGrantId } from "@obsidian-dnd/domain";
import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import { renderChoiceDefinition, type ChoiceDropdownState } from "./character-species-choice-renderers";
import { deriveDraftConsequences } from "./creator-draft-commands";
import type { ChoiceConsequence } from "./creator-consequence-service";
import { loadCreatorConsequenceReadModel } from "./creator-consequence-read-model";
import { renderActiveCreatorChoices } from "./creator-active-choice-renderer";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import { renderOriginConsequences } from "./creator-origin-consequence-renderer";

/* ── Public API ────────────────────────────────────────────────── */

export async function renderSpeciesChoices(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  selectedSpecies: Pick<CatalogEntitySummary, "id" | "detailPath">,
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
  onChoicesPresented?: () => void,
  onEntityLoadError?: (message: string) => void,
  onChoiceSubmitted?: (instanceId: ChoiceConsequence["instanceId"], value: CharacterChoice["selectedValue"], entities: readonly EntityDetailResponse[]) => void,
  onChoiceCleared?: (instanceId: ChoiceConsequence["instanceId"]) => void,
  onRandomGrantResolution?: (grantId: RuleGrantId, entities: readonly EntityDetailResponse[]) => void,
): Promise<void> {
  const speciesId = draft.species.speciesId;
  if (!speciesId || speciesId !== selectedSpecies.id) return;

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
      revision, selectedSpecies.id, selectedSpecies.detailPath,
    );
    loadingEl.remove();

    const speciesData = speciesResult.data;
    if (speciesData.kind !== "species") {
      const message = `Selected catalog entity at ${selectedSpecies.detailPath} is not species data. Refresh the catalog and try again.`;
      container.createEl("p", { text: message, cls: "dnd-creator-error" });
      onEntityLoadError?.(message);
      return;
    }

    const legacyModel = onChoiceSubmitted === undefined ? deriveDraftConsequences(draft, [speciesData]) : undefined;
    const readModel = onChoiceSubmitted === undefined ? undefined : await loadCreatorConsequenceReadModel(draft, catalog, revision, [speciesData]);
    const model = readModel?.model ?? legacyModel!;
    const origin = model.origins.find((entry) => entry.origin.id === speciesId);
    const choices = origin?.choices ?? [];
    renderOriginConsequences(container, origin, model.diagnostics, onRandomGrantResolution === undefined ? undefined : (grantId) => onRandomGrantResolution(grantId, readModel?.entities ?? [speciesData]));
    if (choices.length === 0) {
      container.createEl("p", {
        text: "No additional choices for this species.",
        cls: "dnd-creator-info",
      });
      onChoicesResolved({});
      return;
    }

    if (onChoiceSubmitted !== undefined) renderActiveCreatorChoices(container, "Species Choices", choices, (instanceId, value) => onChoiceSubmitted(instanceId, value, readModel!.entities), onChoiceCleared);
    else await renderChoicesSection(container, draft, catalog, revision, choices, isEntityEligible, onChoicesResolved);
    onChoicesPresented?.();
  } catch {
    loadingEl.remove();
    const message = `Could not load the selected species entity at ${selectedSpecies.detailPath}. Refresh the catalog and try again.`;
    container.createEl("p", {
      text: message,
      cls: "dnd-creator-error",
    });
    onEntityLoadError?.(message);
  }
}

/* ── Choices section rendering ─────────────────────────────────── */

async function renderChoicesSection(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  choices: readonly ChoiceConsequence[],
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): Promise<void> {
  const section = container.createDiv({ cls: "dnd-species-choices" });
  section.createEl("h4", { text: "Species Choices" });

  const dropdownStates: ChoiceDropdownState[] = [];

  for (const choice of choices) {
    const state = await renderChoiceDefinition(
      section, draft, catalog, revision, choice.definition, isEntityEligible,
    );
    if (state) {
      state.instanceId = choice.instanceId;
      state.originId = choice.originId;
      state.selectedIds = selectedIds(choice);
      dropdownStates.push(state);
    }
  }

  if (dropdownStates.length > 0) {
    renderConfirmButton(section, dropdownStates, onChoicesResolved);
  }
}

/* ── Confirm button ────────────────────────────────────────────── */

function renderConfirmButton(
  container: HTMLElement,
  states: ChoiceDropdownState[],
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): void {
  const btnContainer = container.createDiv({ cls: "dnd-choice-actions" });
  const setting = new Setting(btnContainer);
  setting.addButton((btn) => {
    btn.setButtonText("Confirm choices")
      .setCta()
      .onClick(() => {
        const choices = buildChoices(states);
        if (choices !== null) onChoicesResolved(choices);
      });
  });
}

/* ── Choice building ───────────────────────────────────────────── */

export function buildChoices(
  states: ChoiceDropdownState[],
  _legacyOriginGrantId?: string,
): Record<string, CharacterChoice> | null {
  const choices: Record<string, CharacterChoice> = {};

  for (const state of states) {
    const { definition, selectedIds } = state;
    if (definition.type === "ability-allocation") return null;
    if (selectedIds.size < definition.minimum || selectedIds.size > definition.maximum) {
      return null;
    }

    if (state.instanceId === undefined || state.originId === undefined) return null;
    const instanceId = state.instanceId;

    const choice = createCharacterChoice({
      instanceId,
      definitionId: definition.id,
      originGrantId: state.originId,
      selectedValue: { type: "entity-ids", entityIds: [...selectedIds] as EntityId[] },
    });
    choices[instanceId] = choice;
  }

  return choices;
}

function selectedIds(choice: ChoiceConsequence): Set<string> {
  const selected = choice.selectedValue;
  if (selected?.type === "entity-ids") return new Set(selected.entityIds);
  if (selected?.type === "option-ids") return new Set(selected.optionIds);
  return new Set();
}

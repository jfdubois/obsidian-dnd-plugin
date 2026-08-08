/* ── Species choices renderer: Obsidian UI for species choices ───
   Renders species choice controls after species selection.
   Handles zero-choice auto-resolve, entity-type dropdowns,
   and placeholder messages for unimplemented choice types.
   Uses only approved Obsidian APIs.                          */

import { Setting } from "obsidian";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import type { EntityId, CatalogRevision } from "@obsidian-dnd/domain";
import { createChoiceInstanceId } from "@obsidian-dnd/domain";
import type { ChoiceDefinition, EntityQuery } from "@obsidian-dnd/catalog-contract";
import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";

interface ChoiceDropdownState {
  definition: ChoiceDefinition;
  selectedIds: Set<string>;
  candidates: CatalogEntitySummary[];
}

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
  let _placeholderCount = 0;

  for (const def of choices) {
    if (def.type === "entity") {
      const entityQuery = def.optionQuery as EntityQuery;
      const state = await fetchAndRenderEntityChoice(
        section, draft, catalog, revision, def,
        entityQuery.kind, isEntityEligible,
      );
      if (state) dropdownStates.push(state);
    } else {
      _placeholderCount += 1;
      renderNonEntityPlaceholder(section, def);
    }
  }

  if (dropdownStates.length > 0) {
    renderConfirmButton(section, dropdownStates, speciesId, onChoicesResolved);
  }
}

/* ── Entity choice dropdown ────────────────────────────────────── */

async function fetchAndRenderEntityChoice(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  definition: ChoiceDefinition,
  kind: string,
  isEntityEligible: (sourceId: string, access: string) => boolean,
): Promise<ChoiceDropdownState | null> {
  const ruleset = draft.ruleset.ruleset;
  if (!ruleset) return null;

  try {
    const index = await catalog.fetchIndex(revision, kind as never);
    const candidates = index.filter(
      (s) => s.ruleset === ruleset && isEntityEligible(s.sourceId, s.access),
    );

    const state: ChoiceDropdownState = {
      definition,
      selectedIds: new Set(),
      candidates,
    };

    if (candidates.length === 0) {
      container.createEl("p", {
        text: `No candidates available for "${definition.label}".`,
        cls: "dnd-creator-info",
      });
      return state;
    }

    renderEntityDropdown(container, state, kind);
    return state;
  } catch {
    container.createEl("p", {
      text: `Failed to load candidates for "${definition.label}".`,
      cls: "dnd-creator-error",
    });
    return null;
  }
}

function renderEntityDropdown(
  container: HTMLElement,
  state: ChoiceDropdownState,
  kind: string,
): void {
  const { definition, candidates } = state;
  const isMulti = definition.maximum > 1;

  const wrapper = container.createDiv({
    cls: `dnd-choice-wrapper dnd-choice-${definition.id}`,
  });

  wrapper.createEl("label", {
    text: `${definition.label} (${definition.minimum}${isMulti ? `-${definition.maximum}` : ""} required)`,
    cls: "dnd-choice-label",
  });

  if (isMulti) {
    const checkboxGroup = wrapper.createDiv({ cls: "dnd-choice-checkboxes" });
    const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name));
    for (const candidate of sorted) {
      const setting = new Setting(checkboxGroup);
      setting.addToggle((toggle) => {
        toggle.setValue(false)
          .setTooltip(candidate.name)
          .onChange((checked) => {
            if (checked && state.selectedIds.size < definition.maximum) {
              state.selectedIds.add(candidate.id);
            } else if (!checked) {
              state.selectedIds.delete(candidate.id);
            }
          });
      });
      setting.nameEl.setText(candidate.name);
    }
  } else {
    const setting = new Setting(wrapper);
    setting.addDropdown((dropdown) => {
      const options: Record<string, string> = {};
      options[""] = `— Select ${kind} —`;
      const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of sorted) options[entry.id] = entry.name;
      dropdown.addOptions(options).setValue("").onChange((value) => {
        state.selectedIds.clear();
        if (value !== "") state.selectedIds.add(value);
      });
    });
  }
}

/* ── Non-entity placeholder ────────────────────────────────────── */

function renderNonEntityPlaceholder(
  container: HTMLElement,
  definition: ChoiceDefinition,
): void {
  container.createEl("p", {
    text: `Species choice '${definition.label}' requires ${definition.type} selection (not yet implemented).`,
    cls: "dnd-creator-info dnd-choice-placeholder",
  });
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

function buildChoices(
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

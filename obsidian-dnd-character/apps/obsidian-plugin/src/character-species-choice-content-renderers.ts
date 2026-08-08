/* ── Species choice content renderers ────────────────────────────
   Renders UI for language, equipment, spell, and feature choices.
   Uses only approved Obsidian APIs.                               */

import { Setting } from "obsidian";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import type { CatalogRevision } from "@obsidian-dnd/domain";
import type {
  ChoiceDefinition,
  CatalogEntitySummary,
  EntityQuery,
  EquipmentQuery,
  SpellQuery,
} from "@obsidian-dnd/catalog-contract";
import { evaluateEntityQuery } from "./character-species-choice-filter";

/* ── Shared types ──────────────────────────────────────────────── */

export interface ChoiceDropdownState {
  definition: ChoiceDefinition;
  selectedIds: Set<string>;
  candidates: CatalogEntitySummary[];
}

/* ── Language choice ───────────────────────────────────────────── */

export async function renderLanguageChoice(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  definition: ChoiceDefinition,
  query: EntityQuery,
  isEntityEligible: (sourceId: string, access: string) => boolean,
): Promise<ChoiceDropdownState> {
  const ruleset = draft.ruleset.ruleset;
  if (!ruleset) {
    container.createEl("p", { text: "Ruleset not selected.", cls: "dnd-creator-error" });
    return { definition, selectedIds: new Set(), candidates: [] };
  }

  try {
    const candidates = await evaluateEntityQuery(catalog, revision, query, ruleset, isEntityEligible);
    const state: ChoiceDropdownState = { definition, selectedIds: new Set(), candidates };

    if (candidates.length === 0) {
      container.createEl("p", {
        text: `No languages available for "${definition.label}".`,
        cls: "dnd-creator-info",
      });
      return state;
    }

    renderDropdown(container, state, "language");
    return state;
  } catch {
    container.createEl("p", {
      text: `Failed to load languages for "${definition.label}".`,
      cls: "dnd-creator-error",
    });
    return { definition, selectedIds: new Set(), candidates: [] };
  }
}

/* ── Equipment choice ──────────────────────────────────────────── */

export async function renderEquipmentChoice(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  definition: ChoiceDefinition,
  query: EquipmentQuery,
  isEntityEligible: (sourceId: string, access: string) => boolean,
): Promise<ChoiceDropdownState> {
  const ruleset = draft.ruleset.ruleset;
  if (!ruleset) {
    container.createEl("p", { text: "Ruleset not selected.", cls: "dnd-creator-error" });
    return { definition, selectedIds: new Set(), candidates: [] };
  }

  try {
    const index = await catalog.fetchIndex(revision, "item" as never);
    const candidates = index.filter((summary) => {
      if (summary.ruleset !== ruleset) return false;
      if (query.sourceId !== undefined && summary.sourceId !== query.sourceId) return false;
      if (query.access !== undefined && summary.access !== query.access) return false;
      if (!isEntityEligible(summary.sourceId, summary.access)) return false;
      return true;
    });

    const state: ChoiceDropdownState = { definition, selectedIds: new Set(), candidates };

    if (candidates.length === 0) {
      container.createEl("p", {
        text: `No equipment available for "${definition.label}".`,
        cls: "dnd-creator-info",
      });
      return state;
    }

    renderDropdown(container, state, "equipment");
    return state;
  } catch {
    container.createEl("p", {
      text: `Failed to load equipment for "${definition.label}".`,
      cls: "dnd-creator-error",
    });
    return { definition, selectedIds: new Set(), candidates: [] };
  }
}

/* ── Spell choice ──────────────────────────────────────────────── */

export async function renderSpellChoice(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  definition: ChoiceDefinition,
  query: SpellQuery,
  isEntityEligible: (sourceId: string, access: string) => boolean,
): Promise<ChoiceDropdownState> {
  const ruleset = draft.ruleset.ruleset;
  if (!ruleset) {
    container.createEl("p", { text: "Ruleset not selected.", cls: "dnd-creator-error" });
    return { definition, selectedIds: new Set(), candidates: [] };
  }

  try {
    const index = await catalog.fetchIndex(revision, "spell" as never);
    const candidates = index.filter((summary) => {
      if (summary.ruleset !== ruleset) return false;
      if (!isEntityEligible(summary.sourceId, summary.access)) return false;
      if (query.excludeKnown !== undefined) {
        if (query.excludeKnown.includes(summary.id as never)) return false;
      }
      return true;
    });

    const state: ChoiceDropdownState = { definition, selectedIds: new Set(), candidates };

    if (candidates.length === 0) {
      container.createEl("p", {
        text: `No spells available for "${definition.label}".`,
        cls: "dnd-creator-info",
      });
      return state;
    }

    renderDropdown(container, state, "spell");
    return state;
  } catch {
    container.createEl("p", {
      text: `Failed to load spells for "${definition.label}".`,
      cls: "dnd-creator-error",
    });
    return { definition, selectedIds: new Set(), candidates: [] };
  }
}

/* ── Feature choice ────────────────────────────────────────────── */

export async function renderFeatureChoice(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  definition: ChoiceDefinition,
  query: EntityQuery,
  isEntityEligible: (sourceId: string, access: string) => boolean,
): Promise<ChoiceDropdownState> {
  const ruleset = draft.ruleset.ruleset;
  if (!ruleset) {
    container.createEl("p", { text: "Ruleset not selected.", cls: "dnd-creator-error" });
    return { definition, selectedIds: new Set(), candidates: [] };
  }

  try {
    const candidates = await evaluateEntityQuery(catalog, revision, query, ruleset, isEntityEligible);
    const state: ChoiceDropdownState = { definition, selectedIds: new Set(), candidates };

    if (candidates.length === 0) {
      container.createEl("p", {
        text: `No features available for "${definition.label}".`,
        cls: "dnd-creator-info",
      });
      return state;
    }

    renderDropdown(container, state, "feature");
    return state;
  } catch {
    container.createEl("p", {
      text: `Failed to load features for "${definition.label}".`,
      cls: "dnd-creator-error",
    });
    return { definition, selectedIds: new Set(), candidates: [] };
  }
}

/* ── Shared dropdown rendering ─────────────────────────────────── */

function renderDropdown(
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

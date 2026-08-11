/* ── Legacy compatibility choice renderers ───────────────────────
   Renders UI for each ChoiceDefinitionType.
   Uses only approved Obsidian APIs.                               */

/**
 * @deprecated The active creator modal renders `ChoiceConsequence` through
 * creator-active-choice-renderer. Retained only for bounded legacy callers
 * and tests while their public callback contract is retired.
 */

import { Setting } from "obsidian";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import type { CatalogRevision, ChoiceInstanceId, EntityId, SourceId } from "@obsidian-dnd/domain";
import type {
  ChoiceDefinition,
  CatalogEntitySummary,
  EntityQuery,
  ProficiencyQuery,
  EquipmentQuery,
  SpellQuery,
} from "@obsidian-dnd/catalog-contract";
import { evaluateEntityQuery, proficiencyKindToEntityKind } from "./character-species-choice-filter";
import { evaluatePrerequisites } from "./character-species-choice-prerequisite";
import {
  renderLanguageChoice,
  renderEquipmentChoice,
  renderSpellChoice,
  renderFeatureChoice,
} from "./character-species-choice-content-renderers";

/* ── Shared types ──────────────────────────────────────────────── */

export interface ChoiceDropdownState {
  definition: ChoiceDefinition;
  instanceId?: ChoiceInstanceId;
  originId?: EntityId;
  selectedIds: Set<string>;
  candidates: CatalogEntitySummary[];
}

/* ── Ability enum display names ────────────────────────────────── */

const ABILITY_DISPLAY: Record<string, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

const ABILITIES = Object.keys(ABILITY_DISPLAY) as string[];

/* ── Public dispatch ───────────────────────────────────────────── */

export async function renderChoiceDefinition(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  definition: ChoiceDefinition,
  isEntityEligible: (sourceId: string, access: string) => boolean,
): Promise<ChoiceDropdownState | null> {
  // Evaluate prerequisites first
  if (!evaluatePrerequisites(draft, definition.prerequisites)) {
    container.createEl("p", {
      text: `"${definition.label}" — prerequisites not met.`,
      cls: "dnd-creator-info dnd-choice-prereq",
    });
    return null;
  }

  if (definition.type === "ability-allocation" || definition.type === "closed-option") {
    container.createEl("p", { text: `Choice type '${definition.type}' is not available in this legacy selector.`, cls: "dnd-creator-info dnd-choice-placeholder" });
    return null;
  }
  const query = definition.optionQuery;

  switch (definition.type) {
    case "entity":
      return renderEntityChoice(container, draft, catalog, revision, definition, query as EntityQuery, isEntityEligible);
    case "skill-proficiency":
      return renderProficiencyChoice(container, draft, catalog, revision, definition, query as ProficiencyQuery, isEntityEligible, "skill");
    case "tool-proficiency":
      return renderProficiencyChoice(container, draft, catalog, revision, definition, query as ProficiencyQuery, isEntityEligible, "tool");
    case "language":
      return renderLanguageChoice(container, draft, catalog, revision, definition, query as EntityQuery, isEntityEligible);
    case "equipment":
      return renderEquipmentChoice(container, draft, catalog, revision, definition, query as EquipmentQuery, isEntityEligible);
    case "spell":
      return renderSpellChoice(container, draft, catalog, revision, definition, query as SpellQuery, isEntityEligible);
    case "feature":
      return renderFeatureChoice(container, draft, catalog, revision, definition, query as EntityQuery, isEntityEligible);
    default:
      container.createEl("p", {
        text: "Choice type is not implemented.",
        cls: "dnd-creator-info dnd-choice-placeholder",
      });
      return null;
  }
}

/* ── Entity choice (feat, optional-feature, etc.) ──────────────── */

export async function renderEntityChoice(
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
        text: `No candidates available for "${definition.label}".`,
        cls: "dnd-creator-info",
      });
      return state;
    }

    renderDropdown(container, state, query.kind);
    return state;
  } catch {
    container.createEl("p", {
      text: `Failed to load candidates for "${definition.label}".`,
      cls: "dnd-creator-error",
    });
    return { definition, selectedIds: new Set(), candidates: [] };
  }
}

/* ── Ability choice ────────────────────────────────────────────── */

export function renderAbilityChoice(
  container: HTMLElement,
  _draft: CharacterDraft,
  definition: ChoiceDefinition,
): ChoiceDropdownState {
  const abilities: CatalogEntitySummary[] = ABILITIES.map((ability) => ({
    id: ability as unknown as EntityId,
    kind: "skill" as const,
    name: ABILITY_DISPLAY[ability] ?? ability,
    sourceId: "core" as unknown as SourceId,
    ruleset: "2024" as const,
    access: "core" as const,
    legacy: false,
    tags: [],
    detailPath: "",
  }));

  const state: ChoiceDropdownState = {
    definition,
    selectedIds: new Set(),
    candidates: abilities,
  };

  renderDropdown(container, state, "ability");
  return state;
}

/* ── Proficiency choice (skill, tool) ──────────────────────────── */

export async function renderProficiencyChoice(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  definition: ChoiceDefinition,
  query: ProficiencyQuery,
  isEntityEligible: (sourceId: string, access: string) => boolean,
  kind: string,
): Promise<ChoiceDropdownState> {
  const ruleset = draft.ruleset.ruleset;
  if (!ruleset) {
    container.createEl("p", { text: "Ruleset not selected.", cls: "dnd-creator-error" });
    return { definition, selectedIds: new Set(), candidates: [] };
  }

  try {
    const entityKind = proficiencyKindToEntityKind(query.kind);
    const index = await catalog.fetchIndex(revision, entityKind as never);

    const candidates = index.filter((summary) => {
      if (summary.ruleset !== ruleset) return false;
      if (!isEntityEligible(summary.sourceId, summary.access)) return false;
      return true;
    });

    const state: ChoiceDropdownState = { definition, selectedIds: new Set(), candidates };

    if (candidates.length === 0) {
      container.createEl("p", {
        text: `No ${kind} proficiencies available for "${definition.label}".`,
        cls: "dnd-creator-info",
      });
      return state;
    }

    renderDropdown(container, state, kind);
    return state;
  } catch {
    container.createEl("p", {
      text: `Failed to load ${kind} proficiencies for "${definition.label}".`,
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
  if (definition.type === "ability-allocation") return;
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

import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { CharacterDraft } from "./character-draft";
import { getStepState, invalidateDependentSteps, markStepResolved } from "./character-draft";

export function selectBackgroundChoices(
  draft: CharacterDraft,
  choices: Record<string, CharacterChoice>,
): boolean {
  if (getStepState(draft, "background") !== "resolved") return false;
  if (getStepState(draft, "background-choices") === "resolved"
    && Object.keys(choices).length === 0) return false;
  // Legacy bulk adapter; catalog-owned resolutions live only in selections.
  Object.assign(draft.selections, choices);
  markStepResolved(draft, "background-choices");
  invalidateDependentSteps(draft, "background-choices");
  return true;
}

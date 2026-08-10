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
  draft.backgroundChoices.choices = { ...choices };
  markStepResolved(draft, "background-choices");
  invalidateDependentSteps(draft, "background-choices");
  return true;
}

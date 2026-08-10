import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { CharacterDraft } from "./character-draft";
import { getStepState, invalidateDependentSteps, markStepResolved } from "./character-draft";

export function selectClassStartingGrants(
  draft: CharacterDraft,
  choices: Record<string, CharacterChoice>,
): boolean {
  if (getStepState(draft, "class") !== "resolved") return false;
  if (getStepState(draft, "class-starting-grants") === "resolved"
    && Object.keys(choices).length === 0) return false;
  draft.classGrants.choices = { ...choices };
  markStepResolved(draft, "class-starting-grants");
  invalidateDependentSteps(draft, "class-starting-grants");
  return true;
}

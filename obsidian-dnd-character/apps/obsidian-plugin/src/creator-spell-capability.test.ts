import { describe, expect, it } from "vitest";
import type { SelectionConsequenceModel } from "./creator-consequence-service";
import { deriveSpellSelectionCapability } from "./creator-spell-capability";
import { createEmptyCharacterDraft, isDraftCompleteWithoutCatalogOriginChoices, markStepResolved } from "./character-draft";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

function modelForSpellChoice(minimum: number, status: "resolved" | "unresolved" = "unresolved"): SelectionConsequenceModel {
  return {
    origins: [{
      origin: { kind: "class" },
      choices: [{ definition: { type: "spell", minimum }, status }],
    }],
    diagnostics: [], activeChoiceIds: new Set(), activeGrantIds: new Set(),
  } as unknown as SelectionConsequenceModel;
}

describe("creator spell-selection capability", () => {
  it("is absent when the normalized class has no required spell choice", () => {
    expect(deriveSpellSelectionCapability(modelForSpellChoice(0))).toEqual({ required: false, complete: true });
  });

  it("is required only by an active normalized class spell choice with a positive minimum", () => {
    expect(deriveSpellSelectionCapability(modelForSpellChoice(1))).toEqual({ required: true, complete: false });
  });

  it("reports a required spell capability complete only after its normalized choice resolves", () => {
    expect(deriveSpellSelectionCapability(modelForSpellChoice(1, "resolved"))).toEqual({ required: true, complete: true });
  });

  it("does not require fabricated Spells DraftStep state when the capability is absent", () => {
    const draft = createEmptyCharacterDraft();
    for (const step of ALL_DRAFT_STEPS) {
      if (step !== "spell-eligibility" && step !== "spells") markStepResolved(draft, step);
    }
    expect(draft.spells.selections).toEqual([]);
    expect(isDraftCompleteWithoutCatalogOriginChoices(draft)).toBe(true);
  });

  it("keeps spell steps blocking while the projected capability is required", () => {
    const draft = createEmptyCharacterDraft();
    draft.spellEligibility.isSpellcaster = true;
    for (const step of ALL_DRAFT_STEPS) {
      if (step !== "spell-eligibility" && step !== "spells") markStepResolved(draft, step);
    }
    expect(isDraftCompleteWithoutCatalogOriginChoices(draft)).toBe(false);
    markStepResolved(draft, "spell-eligibility");
    markStepResolved(draft, "spells");
    expect(isDraftCompleteWithoutCatalogOriginChoices(draft)).toBe(true);
  });
});

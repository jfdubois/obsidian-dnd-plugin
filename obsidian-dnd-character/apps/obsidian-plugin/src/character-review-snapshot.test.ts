import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createSourceId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
  createItemInstanceId,
} from "@obsidian-dnd/domain";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import {
  createEmptyCharacterDraft,
  markStepResolved,
} from "./character-draft";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import { buildReviewSnapshot } from "./character-review-snapshot";

/* ── Helpers ───────────────────────────────────────────────────── */

function resolveAllDataSteps(draft: ReturnType<typeof createEmptyCharacterDraft>): void {
  for (const step of ALL_DRAFT_STEPS) {
    if (step !== "review") {
      markStepResolved(draft, step);
    }
  }
}

/* ── Positive: snapshot reflects all resolved selections ───────── */

describe("buildReviewSnapshot — positive", () => {
  it("returns snapshot matching all resolved draft selections", () => {
    const draft = createEmptyCharacterDraft();

    // Populate every data section with representative selections
    draft.ruleset.ruleset = "2024";
    draft.sources.enabledSourceIds = [createSourceId("phb")];
    draft.identity.name = "Gandalf";
    draft.identity.playerName = "Alice";
    draft.species.speciesId = createEntityId("wizard");
    draft.speciesChoices.choices = {
      [createChoiceInstanceId("species-trait-1")]: createCharacterChoice({
        instanceId: createChoiceInstanceId("species-trait-1"),
        definitionId: createChoiceDefinitionId("ability-increase"),
        originGrantId: createEntityId("wizard"),
        selectedOptionIds: [createEntityId("int-increase")],
      }),
    };
    draft.background.backgroundId = createEntityId("sage");
    draft.backgroundChoices.choices = {
      [createChoiceInstanceId("bg-skill-1")]: createCharacterChoice({
        instanceId: createChoiceInstanceId("bg-skill-1"),
        definitionId: createChoiceDefinitionId("skill-choices"),
        originGrantId: createEntityId("sage"),
        selectedOptionIds: [createEntityId("arcana"), createEntityId("history")],
      }),
    };
    draft.class.classId = createEntityId("wizard");
    draft.class.subclassId = createEntityId("evoker");
    draft.classGrants.choices = {
      [createChoiceInstanceId("class-starting-equip")]: createCharacterChoice({
        instanceId: createChoiceInstanceId("class-starting-equip"),
        definitionId: createChoiceDefinitionId("starting-equipment"),
        originGrantId: createEntityId("wizard"),
        selectedOptionIds: [createEntityId("quarterstaff")],
      }),
    };
    draft.abilities.method = "standard-array";
    draft.abilities.scores = {
      STR: 8,
      DEX: 14,
      CON: 12,
      INT: 18,
      WIS: 16,
      CHA: 12,
    };
    draft.proficiencyChoices.choices = {};
    draft.proficiencies.skillProficiencies = [
      createEntityId("arcana"),
      createEntityId("history"),
    ];
    draft.proficiencies.toolProficiencies = [];
    draft.languageChoices.choices = {};
    draft.languages.languageIds = [
      createEntityId("common"),
      createEntityId("elvish"),
    ];
    draft.equipmentChoices.choices = {};
    draft.equipment.items = [
      {
        instanceId: createItemInstanceId("weapon-1"),
        itemId: createEntityId("quarterstaff"),
        quantity: 1,
        equipped: true,
        attuned: false,
      },
    ];
    draft.spellEligibility.isSpellcaster = true;
    draft.spellEligibility.spellcastingAbility = "INT";
    draft.spells.selections = [
      {
        spellId: createEntityId("firebolt"),
        acquisition: "known",
      },
    ];

    // Resolve all data steps
    resolveAllDataSteps(draft);

    const snapshot = buildReviewSnapshot(draft);

    expect(snapshot).not.toBeNull();

    // Verify all 18 data sections are present and match draft selections
    expect(snapshot!.ruleset.ruleset).toBe("2024");
    expect(snapshot!.sources.enabledSourceIds).toEqual([createSourceId("phb")]);
    expect(snapshot!.identity.name).toBe("Gandalf");
    expect(snapshot!.identity.playerName).toBe("Alice");
    expect(snapshot!.species.speciesId).toBe(createEntityId("wizard"));
    expect(Object.keys(snapshot!.speciesChoices.choices)).toHaveLength(1);
    expect(snapshot!.background.backgroundId).toBe(createEntityId("sage"));
    expect(Object.keys(snapshot!.backgroundChoices.choices)).toHaveLength(1);
    expect(snapshot!.class.classId).toBe(createEntityId("wizard"));
    expect(snapshot!.class.subclassId).toBe(createEntityId("evoker"));
    expect(Object.keys(snapshot!.classGrants.choices)).toHaveLength(1);
    expect(snapshot!.abilities.method).toBe("standard-array");
    expect(snapshot!.abilities.scores?.INT).toBe(18);
    expect(Object.keys(snapshot!.proficiencyChoices.choices)).toHaveLength(0);
    expect(snapshot!.proficiencies.skillProficiencies).toContain(
      createEntityId("arcana"),
    );
    expect(snapshot!.proficiencies.toolProficiencies).toEqual([]);
    expect(Object.keys(snapshot!.languageChoices.choices)).toHaveLength(0);
    expect(snapshot!.languages.languageIds).toContain(createEntityId("common"));
    expect(Object.keys(snapshot!.equipmentChoices.choices)).toHaveLength(0);
    expect(snapshot!.equipment.items).toHaveLength(1);
    expect(snapshot!.spellEligibility.isSpellcaster).toBe(true);
    expect(snapshot!.spellEligibility.spellcastingAbility).toBe("INT");
    expect(snapshot!.spells.selections).toHaveLength(1);
  });

  it("snapshot references the same draft data objects", () => {
    const draft = createEmptyCharacterDraft();
    draft.ruleset.ruleset = "2024";
    resolveAllDataSteps(draft);

    const snapshot = buildReviewSnapshot(draft);
    expect(snapshot).not.toBeNull();

    // Snapshot fields reference the same objects as the draft
    expect(snapshot!.ruleset).toBe(draft.ruleset);
    expect(snapshot!.sources).toBe(draft.sources);
    expect(snapshot!.identity).toBe(draft.identity);
    expect(snapshot!.species).toBe(draft.species);
    expect(snapshot!.speciesChoices).toBe(draft.speciesChoices);
    expect(snapshot!.background).toBe(draft.background);
    expect(snapshot!.backgroundChoices).toBe(draft.backgroundChoices);
    expect(snapshot!.class).toBe(draft.class);
    expect(snapshot!.classGrants).toBe(draft.classGrants);
    expect(snapshot!.abilities).toBe(draft.abilities);
    expect(snapshot!.proficiencyChoices).toBe(draft.proficiencyChoices);
    expect(snapshot!.proficiencies).toBe(draft.proficiencies);
    expect(snapshot!.languageChoices).toBe(draft.languageChoices);
    expect(snapshot!.languages).toBe(draft.languages);
    expect(snapshot!.equipmentChoices).toBe(draft.equipmentChoices);
    expect(snapshot!.equipment).toBe(draft.equipment);
    expect(snapshot!.spellEligibility).toBe(draft.spellEligibility);
    expect(snapshot!.spells).toBe(draft.spells);
  });
});

/* ── Negative: incomplete draft returns null ───────────────────── */

describe("buildReviewSnapshot — negative", () => {
  it("returns null when no steps are resolved", () => {
    const draft = createEmptyCharacterDraft();
    const snapshot = buildReviewSnapshot(draft);
    expect(snapshot).toBeNull();
  });

  it("returns null when only one step is resolved", () => {
    const draft = createEmptyCharacterDraft();
    draft.ruleset.ruleset = "2024";
    markStepResolved(draft, "ruleset");

    const snapshot = buildReviewSnapshot(draft);
    expect(snapshot).toBeNull();
  });

  it("returns null when one data step is unresolved", () => {
    const draft = createEmptyCharacterDraft();

    // Resolve all data steps except "spells"
    for (const step of ALL_DRAFT_STEPS) {
      if (step !== "review" && step !== "spells") {
        markStepResolved(draft, step);
      }
    }

    const snapshot = buildReviewSnapshot(draft);
    expect(snapshot).toBeNull();
  });

  it("returns null even when review step is resolved but data steps are not", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "review");

    const snapshot = buildReviewSnapshot(draft);
    expect(snapshot).toBeNull();
  });
});

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
    draft.selections = {
      [createChoiceInstanceId("species-trait-1")]: createCharacterChoice({
        instanceId: createChoiceInstanceId("species-trait-1"),
        definitionId: createChoiceDefinitionId("ability-increase"),
        originGrantId: createEntityId("wizard"),
        selectedValue: { type: "entity-ids", entityIds: [createEntityId("int-increase")] },
      }),
    };
    draft.background.backgroundId = createEntityId("sage");
    Object.assign(draft.selections, {
      [createChoiceInstanceId("bg-skill-1")]: createCharacterChoice({
        instanceId: createChoiceInstanceId("bg-skill-1"),
        definitionId: createChoiceDefinitionId("skill-choices"),
        originGrantId: createEntityId("sage"),
        selectedValue: { type: "entity-ids", entityIds: [createEntityId("arcana"), createEntityId("history")] },
      }),
    });
    draft.class.classId = createEntityId("wizard");
    draft.class.subclassId = createEntityId("evoker");
    Object.assign(draft.selections, {
      [createChoiceInstanceId("class-starting-equip")]: createCharacterChoice({
        instanceId: createChoiceInstanceId("class-starting-equip"),
        definitionId: createChoiceDefinitionId("starting-equipment"),
        originGrantId: createEntityId("wizard"),
        selectedValue: { type: "entity-ids", entityIds: [createEntityId("quarterstaff")] },
      }),
    });
    draft.abilities.method = "standard-array";
    draft.abilities.scores = {
      STR: 8,
      DEX: 14,
      CON: 12,
      INT: 18,
      WIS: 16,
      CHA: 12,
    };
    draft.proficiencies.skillProficiencies = [
      createEntityId("arcana"),
      createEntityId("history"),
    ];
    draft.proficiencies.toolProficiencies = [];
    draft.languages.languageIds = [
      createEntityId("common"),
      createEntityId("elvish"),
    ];
    draft.equipment.items = [
      {
        instanceId: createItemInstanceId("weapon-1"),
        type: "catalog-item",
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

    // Catalog-owned choices are exposed once through canonical selections.
    expect(snapshot!.ruleset.ruleset).toBe("2024");
    expect(snapshot!.sources.enabledSourceIds).toEqual([createSourceId("phb")]);
    expect(snapshot!.identity.name).toBe("Gandalf");
    expect(snapshot!.identity.playerName).toBe("Alice");
    expect(snapshot!.species.speciesId).toBe(createEntityId("wizard"));
    expect(snapshot!.background.backgroundId).toBe(createEntityId("sage"));
    expect(snapshot!.class.classId).toBe(createEntityId("wizard"));
    expect(snapshot!.class.subclassId).toBe(createEntityId("evoker"));
    expect(snapshot!.abilities.method).toBe("standard-array");
    expect(snapshot!.abilities.scores?.INT).toBe(18);
    expect(snapshot!.proficiencies.skillProficiencies).toContain(
      createEntityId("arcana"),
    );
    expect(snapshot!.proficiencies.toolProficiencies).toEqual([]);
    expect(snapshot!.languages.languageIds).toContain(createEntityId("common"));
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
    expect(snapshot!.background).toBe(draft.background);
    expect(snapshot!.class).toBe(draft.class);
    expect(snapshot!.abilities).toBe(draft.abilities);
    expect(snapshot!.proficiencies).toBe(draft.proficiencies);
    expect(snapshot!.languages).toBe(draft.languages);
    expect(snapshot!.equipment).toBe(draft.equipment);
    expect(snapshot!.spellEligibility).toBe(draft.spellEligibility);
    expect(snapshot!.spells).toBe(draft.spells);
    expect(snapshot!.selections).toBe(draft.selections);
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
    draft.spellEligibility.isSpellcaster = true;

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

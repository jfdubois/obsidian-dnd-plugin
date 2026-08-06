import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createSourceId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
  createItemInstanceId,
} from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { isCharacter } from "@obsidian-dnd/character-contract";

import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import { finalizeCharacter } from "./character-finalize";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

/* ── Helpers ───────────────────────────────────────────────────── */

function makeCompleteDraft(): ReturnType<typeof createEmptyCharacterDraft> {
  const draft = createEmptyCharacterDraft();

  /* Ruleset */
  draft.ruleset.ruleset = "2024";

  /* Sources */
  draft.sources.enabledSourceIds = [createSourceId("xphb")];

  /* Identity */
  draft.identity.name = "Aragorn";
  draft.identity.playerName = "Alice";

  /* Species */
  draft.species.speciesId = createEntityId("species:2024:xphb:human");

  /* Background */
  draft.background.backgroundId = createEntityId("background:2024:xphb:soldier");

  /* Class */
  draft.class.classId = createEntityId("class:2024:xphb:fighter");

  /* Abilities */
  draft.abilities.method = "standard-array";
  draft.abilities.scores = {
    STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 16,
  };

  /* Species choices */
  draft.speciesChoices.choices = {
    [createChoiceInstanceId("feat-1")]: {
      instanceId: createChoiceInstanceId("feat-1"),
      definitionId: createChoiceDefinitionId("feat-choice-1"),
      originGrantId: createEntityId("species:2024:xphb:human"),
      selectedOptionIds: [createEntityId("feat:2024:xphb:tough")],
    } as CharacterChoice,
  };

  /* Equipment */
  draft.equipment.items = [
    {
      instanceId: createItemInstanceId("item-1"),
      itemId: createEntityId("item:2024:xphb:longsword"),
      quantity: 1,
      equipped: false,
      attuned: false,
    },
  ];

  /* Mark every step resolved */
  for (const step of ALL_DRAFT_STEPS) {
    markStepResolved(draft, step);
  }

  return draft;
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("finalizeCharacter", () => {
  it("returns a valid Character from a complete draft", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(isCharacter(result!)).toBe(true);
  });

  it("maps content policy from draft sources", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.contentPolicy.ruleset).toBe("2024");
    expect(result!.contentPolicy.enabledSourceIds).toEqual([createSourceId("xphb")]);
    expect(result!.contentPolicy.mode).toBe("snapshot");
  });

  it("maps identity from draft identity data", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.identity.name).toBe("Aragorn");
    expect(result!.identity.playerName).toBe("Alice");
  });

  it("maps origins from species and background selections", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.origins.speciesId).toBe(createEntityId("species:2024:xphb:human"));
    expect(result!.origins.backgroundId).toBe(createEntityId("background:2024:xphb:soldier"));
  });

  it("maps class to progression.classes", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.progression.classes).toHaveLength(1);
    expect(result!.progression.classes[0]!.classId).toBe(createEntityId("class:2024:xphb:fighter"));
    expect(result!.progression.classes[0]!.level).toBe(1);
    expect(result!.progression.classes[0]!.isStartingClass).toBe(true);
  });

  it("merges selections from all choice sections", () => {
    const draft = createEmptyCharacterDraft();

    /* Ruleset */
    draft.ruleset.ruleset = "2024";
    /* Sources */
    draft.sources.enabledSourceIds = [createSourceId("xphb")];
    /* Identity */
    draft.identity.name = "Aragorn";
    /* Species */
    draft.species.speciesId = createEntityId("species:2024:xphb:human");
    /* Background */
    draft.background.backgroundId = createEntityId("background:2024:xphb:soldier");
    /* Class */
    draft.class.classId = createEntityId("class:2024:xphb:fighter");
    /* Abilities */
    draft.abilities.method = "standard-array";
    draft.abilities.scores = {
      STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 16,
    };

    /* Species choices */
    draft.speciesChoices.choices = {
      [createChoiceInstanceId("feat-1")]: {
        instanceId: createChoiceInstanceId("feat-1"),
        definitionId: createChoiceDefinitionId("feat-choice-1"),
        originGrantId: createEntityId("species:2024:xphb:human"),
        selectedOptionIds: [createEntityId("feat:2024:xphb:tough")],
      } as CharacterChoice,
    };

    /* Background choices */
    draft.backgroundChoices.choices = {
      [createChoiceInstanceId("bg-feat")]: {
        instanceId: createChoiceInstanceId("bg-feat"),
        definitionId: createChoiceDefinitionId("bg-feat-def"),
        originGrantId: createEntityId("background:2024:xphb:soldier"),
        selectedOptionIds: [createEntityId("feat:2024:xphb:observant")],
      } as CharacterChoice,
    };

    /* Mark every step resolved */
    for (const step of ALL_DRAFT_STEPS) {
      markStepResolved(draft, step);
    }

    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    const speciesChoiceId = createChoiceInstanceId("feat-1");
    const bgChoiceId = createChoiceInstanceId("bg-feat");
    expect(result!.selections[speciesChoiceId]).toBeDefined();
    expect(result!.selections[bgChoiceId]).toBeDefined();
    expect(Object.keys(result!.selections)).toHaveLength(2);
  });

  it("maps ability scores to character abilities", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.abilities.scores.STR).toBe(15);
    expect(result!.abilities.scores.DEX).toBe(14);
  });

  it("maps equipment items to inventory", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.inventory).toHaveLength(1);
    expect(result!.inventory[0]!.itemId).toBe(createEntityId("item:2024:xphb:longsword"));
  });

  it("does not persist candidate lists or catalog copies", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    // Character has no field for candidate lists
    expect(result!.catalog).toBeDefined();
    expect(result!.catalog.createdWithRevision).toBeDefined();
    // catalog is a reference, not a copy
    expect(typeof result!.catalog.createdWithRevision).toBe("string");
  });

  it("returns null for incomplete draft", () => {
    const draft = createEmptyCharacterDraft();
    // No steps resolved
    const result = finalizeCharacter(draft);
    expect(result).toBeNull();
  });

  it("returns null when species is not selected", () => {
    const draft = makeCompleteDraft();
    draft.species.speciesId = null;
    const result = finalizeCharacter(draft);
    expect(result).toBeNull();
  });

  it("returns null when background is not selected", () => {
    const draft = makeCompleteDraft();
    draft.background.backgroundId = null;
    const result = finalizeCharacter(draft);
    expect(result).toBeNull();
  });

  it("returns null when class is not selected", () => {
    const draft = makeCompleteDraft();
    draft.class.classId = null;
    const result = finalizeCharacter(draft);
    expect(result).toBeNull();
  });

  it("returns null when identity name is empty", () => {
    const draft = makeCompleteDraft();
    draft.identity.name = "";
    const result = finalizeCharacter(draft);
    expect(result).toBeNull();
  });

  it("returns null when ability scores are missing", () => {
    const draft = makeCompleteDraft();
    draft.abilities.scores = undefined;
    const result = finalizeCharacter(draft);
    expect(result).toBeNull();
  });

  it("returns null when ruleset is not selected", () => {
    const draft = makeCompleteDraft();
    draft.ruleset.ruleset = null;
    const result = finalizeCharacter(draft);
    expect(result).toBeNull();
  });

  it("sets metadata timestamps", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.metadata.createdAt).toBeDefined();
    expect(result!.metadata.updatedAt).toBeDefined();
    expect(result!.metadata.createdAt).toBe(result!.metadata.updatedAt);
  });

  it("initializes resources with default starting values", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.resources.currentHp).toBe(0);
    expect(result!.resources.temporaryHp).toBe(0);
    expect(result!.resources.deathSaves.successes).toBe(0);
    expect(result!.resources.deathSaves.failures).toBe(0);
    expect(result!.resources.conditions).toEqual([]);
  });

  it("initializes empty overrides", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.overrides).toEqual({});
  });

  it("sets schema version on result", () => {
    const draft = makeCompleteDraft();
    const result = finalizeCharacter(draft);

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(1);
  });
});

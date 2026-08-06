/* ── Character finalize: draft → atomic Character ────────────────
   Maps a complete CharacterDraft into a persisted Character
   contract object. Returns null if the draft is incomplete or
   missing required fields. Persists only selections and origin
   grants — never candidate lists or catalog copies.              */

import type { CharacterDraft } from "./character-draft";
import { isDraftComplete } from "./character-draft";

import type {
  Character,
  CharacterChoice,
} from "@obsidian-dnd/character-contract";
import {
  createCharacter,
  createCharacterIdentity,
  createCharacterCatalogReference,
  createCharacterClassState,
  createCharacterSpellState,
  createCharacterResourceState,
} from "@obsidian-dnd/character-contract";

import type {
  CharacterContentPolicy,
  Ruleset,
  Ability,
  ChoiceInstanceId,
  EntityId,
} from "@obsidian-dnd/domain";
import {
  createCharacterId,
  createCatalogRevision,
  createClassInstanceId,
} from "@obsidian-dnd/domain";

/* ── Public API ────────────────────────────────────────────────── */

export function finalizeCharacter(draft: CharacterDraft): Character | null {
  /* Gate: draft must be fully resolved */
  if (!isDraftComplete(draft)) {
    return null;
  }

  /* Gate: required entity selections must be populated */
  if (draft.ruleset.ruleset === null) return null;
  if (draft.species.speciesId === null) return null;
  if (draft.background.backgroundId === null) return null;
  if (draft.class.classId === null) return null;
  if (draft.identity.name === "") return null;
  if (draft.abilities.scores === undefined) return null;

  const now = new Date().toISOString();

  return createCharacter({
    id: createCharacterId(now),
    catalog: buildCatalogReference(),
    contentPolicy: buildContentPolicy(draft),
    identity: buildIdentity(draft),
    progression: buildProgression(draft),
    origins: buildOrigins(draft),
    selections: mergeSelections(draft),
    abilities: buildAbilities(draft),
    spells: buildSpells(draft),
    inventory: buildInventory(draft),
    resources: defaultResources(),
    overrides: {},
    metadata: { createdAt: now, updatedAt: now },
  });
}

/* ── Field builders ────────────────────────────────────────────── */

function buildCatalogReference() {
  const revision = createCatalogRevision("default");
  return createCharacterCatalogReference({
    catalogSchemaVersion: 1,
    createdWithRevision: revision,
    lastValidatedRevision: revision,
  });
}

function buildContentPolicy(draft: CharacterDraft): CharacterContentPolicy {
  const ruleset = draft.ruleset.ruleset;
  /* Narrowed: ruleset is never null here (gated above) */
  return {
    ruleset: ruleset as Ruleset,
    enabledSourceIds: [...draft.sources.enabledSourceIds],
    mode: "snapshot" as const,
    sourceProfileOrigin: draft.sources.sourceProfileOrigin,
  };
}

function buildIdentity(draft: CharacterDraft) {
  return createCharacterIdentity(draft.identity.name, {
    playerName: draft.identity.playerName,
    pronouns: draft.identity.pronouns,
    alignment: draft.identity.alignment,
  });
}

function buildProgression(draft: CharacterDraft) {
  const classState = createCharacterClassState({
    instanceId: createClassInstanceId("starting"),
    classId: draft.class.classId as EntityId,
    level: 1,
    isStartingClass: true,
    subclassId: draft.class.subclassId ?? undefined,
    hitPointIncreases: [],
  });

  return { classes: [classState] };
}

function buildOrigins(draft: CharacterDraft) {
  return {
    speciesId: draft.species.speciesId as EntityId,
    backgroundId: draft.background.backgroundId as EntityId,
  };
}

function mergeSelections(
  draft: CharacterDraft,
): Record<ChoiceInstanceId, CharacterChoice> {
  return {
    ...draft.speciesChoices.choices,
    ...draft.backgroundChoices.choices,
    ...draft.classGrants.choices,
    ...draft.proficiencyChoices.choices,
    ...draft.languageChoices.choices,
    ...draft.equipmentChoices.choices,
  };
}

function buildAbilities(draft: CharacterDraft) {
  const scores = draft.abilities.scores;
  /* Narrowed: scores is defined (gated above) */
  return { scores: { ...scores } as Record<Ability, number> };
}

function buildSpells(draft: CharacterDraft) {
  return createCharacterSpellState({
    selections: [...draft.spells.selections],
    spellSlotsUsed: {},
  });
}

function buildInventory(draft: CharacterDraft) {
  return [...draft.equipment.items];
}

function defaultResources() {
  return createCharacterResourceState({
    currentHp: 0,
    temporaryHp: 0,
    deathSaves: { successes: 0, failures: 0 },
    hitDiceUsed: {},
    featureUses: {},
    conditions: [],
  });
}

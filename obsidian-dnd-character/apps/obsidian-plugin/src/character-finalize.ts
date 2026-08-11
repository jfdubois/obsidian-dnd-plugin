/* ── Character finalize: draft → atomic Character ────────────────
   Maps a complete CharacterDraft into a persisted Character
   contract object. Returns null if the draft is incomplete or
   missing required fields. Persists only selections and origin
   grants — never candidate lists or catalog copies.              */

import type { CharacterDraft } from "./character-draft";
import { isDraftComplete, isDraftCompleteWithoutCatalogOriginChoices } from "./character-draft";

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
  isCharacter,
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
  createItemInstanceId,
} from "@obsidian-dnd/domain";
import type { EntityDetailResponse, RuleGrant } from "@obsidian-dnd/catalog-contract";
import { deriveDraftConsequences } from "./creator-draft-commands";

/* ── Public API ────────────────────────────────────────────────── */

export function finalizeCharacter(draft: CharacterDraft): Character | null {
  /* Gate: draft must be fully resolved */
  if (!isDraftComplete(draft)) {
    return null;
  }

  return finalizeResolvedDraft(draft);
}

function finalizeResolvedDraft(draft: CharacterDraft): Character | null {

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

/**
 * The creator's materialization boundary.  It deliberately derives from the
 * current draft and normalized catalog itself: presentation models are
 * disposable and must never become persistence authority.
 */
export function finalizeCharacterWithCatalog(draft: CharacterDraft, entities: readonly EntityDetailResponse[]): Character | null {
  const model = deriveDraftConsequences(draft, entities);
  // Stale draft history is intentionally retained, but is not final state.
  if (model.diagnostics.some((diagnostic) => diagnostic.code !== "stale-choice")) return null;
  if (!isDraftCompleteWithoutCatalogOriginChoices(draft)) return null;
  const grants = model.origins.flatMap((origin) => origin.grants);
  const grantIds = new Set<string>();
  for (const consequence of grants) {
    if (grantIds.has(String(consequence.grant.id)) || !isMaterializableGrant(consequence.grant, entities, consequence.resolvedAmount)) return null;
    grantIds.add(String(consequence.grant.id));
  }

  const base = finalizeResolvedDraft(draft);
  if (base === null) return null;
  const inventory = [...base.inventory];
  const currency = { ...base.currency };
  for (const consequence of grants) {
    const grant = consequence.grant;
    if (grant.type === "item") {
      inventory.push({ instanceId: createItemInstanceId(`grant:${grant.id}`), type: "catalog-item", itemId: grant.itemId, quantity: grant.quantity, equipped: false, attuned: false });
    } else if (grant.type === "named-item") {
      inventory.push({ instanceId: createItemInstanceId(`grant:${grant.id}`), type: "named-item", name: grant.name.trim(), quantity: grant.quantity, equipped: false });
    } else if (grant.type === "currency") {
      const amount = grant.amount.type === "fixed" ? grant.amount.value : consequence.resolvedAmount;
      if (amount === undefined || !Number.isSafeInteger(currency[grant.denomination] + amount)) return null;
      currency[grant.denomination] += amount;
    }
  }
  const activeSelections = Object.fromEntries(Object.entries(draft.selections)
    .filter(([instanceId]) => model.activeChoiceIds.has(instanceId as ChoiceInstanceId))) as Record<ChoiceInstanceId, CharacterChoice>;
  const character = { ...base, selections: activeSelections, inventory, currency };
  return isCharacter(character) ? character : null;
}

function isMaterializableGrant(grant: RuleGrant, entities: readonly EntityDetailResponse[], resolvedAmount: number | undefined): boolean {
  if (grant.type === "item") return Number.isInteger(grant.quantity) && grant.quantity > 0
    && entities.some((entity) => entity.id === grant.itemId && entity.kind === "item");
  if (grant.type === "named-item") return Number.isInteger(grant.quantity) && grant.quantity > 0 && grant.name.trim().length > 0;
  if (grant.type !== "currency") return true;
  const amount = grant.amount.type === "fixed" ? grant.amount.value : resolvedAmount;
  return amount !== undefined && Number.isSafeInteger(amount) && amount >= 0;
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
  return { ...draft.selections };
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

import type { ChoiceInstanceId, EntityId, RuleGrantId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { CharacterDraft } from "./character-draft";
import { deriveSelectionConsequences, validateCreatorChoiceValue, type CreatorConsequenceInput, type SelectionConsequenceModel } from "./creator-consequence-service";
import { clearDraftRandomCurrencyGrant, resolveDraftRandomCurrencyGrant, type RandomSource } from "./creator-random-grant-resolution";

export function draftConsequenceInput(draft: CharacterDraft, entities: readonly EntityDetailResponse[]): CreatorConsequenceInput {
  return { speciesId: draft.species.speciesId, backgroundId: draft.background.backgroundId,
    classId: draft.class.classId, selections: draft.selections,
    randomGrantResolutions: draft.randomGrantResolutions, entities,
    ruleset: draft.ruleset.ruleset, enabledSourceIds: draft.sources.enabledSourceIds };
}

export function deriveDraftConsequences(draft: CharacterDraft, entities: readonly EntityDetailResponse[]): SelectionConsequenceModel {
  return deriveSelectionConsequences(draftConsequenceInput(draft, entities));
}

/** Generic validated mutation for every catalog-owned creator choice. */
export function setCreatorChoice(draft: CharacterDraft, entities: readonly EntityDetailResponse[], instanceId: ChoiceInstanceId, selectedValue: CharacterChoice["selectedValue"]): void {
  const active = deriveDraftConsequences(draft, entities).origins.flatMap((origin) => origin.choices).find((choice) => choice.instanceId === instanceId);
  if (active === undefined) throw new Error("Choice instance is not active");
  const validation = validateCreatorChoiceValue(active.definition, selectedValue, active.candidates);
  if (validation.status !== "resolved") throw new Error(validation.message);
  draft.selections[instanceId] = { instanceId, definitionId: active.definition.id, originGrantId: active.originId, selectedValue };
}

/** Validates and stages all visible choice commands before committing their selections together. */
export function setCreatorChoices(draft: CharacterDraft, entities: readonly EntityDetailResponse[], choices: readonly { instanceId: ChoiceInstanceId; value: CharacterChoice["selectedValue"] }[]): void {
  const activeChoices = new Map(deriveDraftConsequences(draft, entities).origins.flatMap((origin) => origin.choices).map((choice) => [choice.instanceId, choice]));
  if (new Set(choices.map((choice) => choice.instanceId)).size !== choices.length) throw new Error("Choice batch contains duplicate instances");
  for (const choice of choices) {
    const active = activeChoices.get(choice.instanceId);
    if (active === undefined) throw new Error("Choice instance is not active");
    const validation = validateCreatorChoiceValue(active.definition, choice.value, active.candidates);
    if (validation.status !== "resolved") throw new Error(validation.message);
  }
  const staged = structuredClone(draft) as CharacterDraft;
  for (const choice of choices) setCreatorChoice(staged, entities, choice.instanceId, choice.value);
  draft.selections = staged.selections;
}

export function clearCreatorChoice(draft: CharacterDraft, instanceId: ChoiceInstanceId): void { delete draft.selections[instanceId]; }

/** Origin changes retain inactive historical choices; derivation controls reachability. */
export function setCreatorOrigin(draft: CharacterDraft, kind: "species" | "background" | "class", id: EntityId | null): void {
  if (kind === "species") draft.species.speciesId = id;
  else if (kind === "background") draft.background.backgroundId = id;
  else draft.class.classId = id;
}

export function resolveCreatorRandomGrant(draft: CharacterDraft, entities: readonly EntityDetailResponse[], grantId: RuleGrantId, random: RandomSource): number {
  return resolveDraftRandomCurrencyGrant(draft, deriveDraftConsequences(draft, entities), grantId, random);
}

export function clearCreatorRandomGrant(draft: CharacterDraft, entities: readonly EntityDetailResponse[], grantId: RuleGrantId): void {
  clearDraftRandomCurrencyGrant(draft, deriveDraftConsequences(draft, entities), grantId);
}

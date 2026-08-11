import type { ChoiceDefinitionId, ChoiceOptionId, EntityId, RuleGrantId } from "@obsidian-dnd/domain";
import type { ChoiceDefinition, ItemRule, RuleGrant } from "@obsidian-dnd/catalog-contract";
import type { CatalogableEntity } from "./compact-index-tag-generator.js";

export type DeferredEquipmentDestination =
  | { readonly scope: "entity-grants" | "class-starting-grants"; readonly ownerId: EntityId }
  | { readonly scope: "choice-option-grants"; readonly ownerId: EntityId; readonly choiceId: ChoiceDefinitionId; readonly optionId: ChoiceOptionId };

export type DeferredEquipmentIntent =
  | { readonly mode: "canonical-reference-required"; readonly id: RuleGrantId; readonly quantity: number; readonly itemId: EntityId; readonly destination: DeferredEquipmentDestination; readonly sourcePath: string }
  | { readonly mode: "physical-name-with-fallback"; readonly id: RuleGrantId; readonly quantity: number; readonly name: string; readonly candidateItemId?: EntityId; readonly destination: DeferredEquipmentDestination; readonly sourcePath: string };

export type DeferredEquipmentResolution =
  | { readonly ok: true; readonly grant: RuleGrant }
  | { readonly ok: false; readonly message: string; readonly sourcePath: string };

/** Resolves builder-only intents after normalized ItemRules are available. */
export function resolveDeferredEquipmentIntent(intent: DeferredEquipmentIntent, items: readonly ItemRule[]): DeferredEquipmentResolution {
  const resolved = intent.mode === "canonical-reference-required"
    ? items.find((item) => item.id === intent.itemId)
    : intent.candidateItemId === undefined ? undefined : items.find((item) => item.id === intent.candidateItemId);
  if (resolved !== undefined) return { ok: true, grant: { id: intent.id, type: "item", itemId: resolved.id, quantity: intent.quantity } };
  if (intent.mode === "canonical-reference-required") {
    return { ok: false, sourcePath: intent.sourcePath, message: `Authoritative item reference ${intent.itemId} did not resolve to an ItemRule.` };
  }
  return { ok: true, grant: { id: intent.id, type: "named-item", name: intent.name, quantity: intent.quantity } };
}

export type DeferredEquipmentApplicationResult =
  | { readonly ok: true; readonly entities: readonly CatalogableEntity[] }
  | { readonly ok: false; readonly messages: readonly string[] };

/** Resolves every builder-only intent and inserts its final grant by stable owner IDs. */
export function applyDeferredEquipmentIntents(
  entities: readonly CatalogableEntity[],
  intents: readonly DeferredEquipmentIntent[],
): DeferredEquipmentApplicationResult {
  const items = entities.filter((entity): entity is ItemRule => entity.kind === "item");
  const grantsByDestination = new Map<string, RuleGrant[]>();
  const messages: string[] = [];
  for (const intent of intents) {
    const resolution = resolveDeferredEquipmentIntent(intent, items);
    if (!resolution.ok) {
      messages.push(`${resolution.sourcePath}: ${resolution.message}`);
      continue;
    }
    const key = destinationKey(intent.destination);
    const grants = grantsByDestination.get(key) ?? [];
    grants.push(resolution.grant);
    grantsByDestination.set(key, grants);
  }
  if (messages.length > 0) return { ok: false, messages: Object.freeze(messages) };

  const resolved = entities.map((entity) => applyEntityGrants(entity, grantsByDestination));
  return { ok: true, entities: Object.freeze(resolved) };
}

function destinationKey(destination: DeferredEquipmentDestination): string {
  return destination.scope === "choice-option-grants"
    ? `${destination.scope}:${destination.ownerId}:${destination.choiceId}:${destination.optionId}`
    : `${destination.scope}:${destination.ownerId}`;
}

function applyEntityGrants(entity: CatalogableEntity, grantsByDestination: ReadonlyMap<string, readonly RuleGrant[]>): CatalogableEntity {
  const entityGrants = grantsByDestination.get(`entity-grants:${entity.id}`);
  const classStartingGrants = grantsByDestination.get(`class-starting-grants:${entity.id}`);
  if (entity.kind === "background") {
    const choices = appendChoiceOptionGrants(entity.choices, entity.id, grantsByDestination);
    return { ...entity, grants: entityGrants === undefined ? entity.grants : [...entity.grants, ...entityGrants], choices };
  }
  if (entity.kind === "class") {
    const choices = appendChoiceOptionGrants(entity.choices, entity.id, grantsByDestination);
    const startingChoices = appendChoiceOptionGrants(entity.startingChoices, entity.id, grantsByDestination);
    return {
      ...entity,
      grants: entityGrants === undefined ? entity.grants : [...entity.grants, ...entityGrants],
      choices,
      startingGrants: classStartingGrants === undefined ? entity.startingGrants : [...entity.startingGrants, ...classStartingGrants],
      startingChoices,
    };
  }
  return entity;
}

function appendChoiceOptionGrants(
  choices: readonly ChoiceDefinition[],
  ownerId: EntityId,
  grantsByDestination: ReadonlyMap<string, readonly RuleGrant[]>,
): ChoiceDefinition[] {
  return choices.map((choice) => {
    if (choice.type !== "closed-option") return choice;
    return {
      ...choice,
      options: choice.options.map((option) => {
        const grants = grantsByDestination.get(`choice-option-grants:${ownerId}:${choice.id}:${option.id}`);
        return grants === undefined ? option : { ...option, grants: [...option.grants, ...grants] };
      }),
    };
  });
}

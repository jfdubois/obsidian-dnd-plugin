import type { RuleGrantId } from "@obsidian-dnd/domain";
import type { RuleGrant } from "@obsidian-dnd/catalog-contract";
import type { CharacterDraft } from "./character-draft";
import { isValidDiceCurrencyAmount, type SelectionConsequenceModel } from "./creator-consequence-service";

export interface RandomSource { next(): number; }

/** Resolves only a currently active dice grant; callers own draft mutation. */
export function resolveRandomCurrencyGrant(grantId: RuleGrantId, activeGrants: readonly RuleGrant[], random: RandomSource): number {
  const grant = activeGrants.find((candidate) => candidate.id === grantId);
  if (grant?.type !== "currency" || grant.amount.type !== "dice") throw new Error("Active dice currency grant not found");
  if (!isValidDiceCurrencyAmount(grant.amount)) throw new Error("Active dice currency grant has an invalid catalog definition");
  let sum = 0;
  for (let roll = 0; roll < grant.amount.count; roll += 1) {
    const value = random.next();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Random source must return a value in [0, 1)");
    sum += Math.floor(value * grant.amount.dieSides) + 1;
  }
  return sum * grant.amount.multiplier;
}

/** Explicit command: the only path that writes a dice result into creator state. */
export function resolveDraftRandomCurrencyGrant(draft: CharacterDraft, model: SelectionConsequenceModel, grantId: RuleGrantId, random: RandomSource): number {
  if (Object.prototype.hasOwnProperty.call(draft.randomGrantResolutions, grantId)) throw new Error("Active dice currency grant is already resolved; clear it before resolving again");
  const result = resolveRandomCurrencyGrant(grantId, model.origins.flatMap((origin) => origin.grants.map((consequence) => consequence.grant)), random);
  draft.randomGrantResolutions[grantId] = result;
  return result;
}

/** Explicit correction command. Historical inactive values are intentionally retained. */
export function clearDraftRandomCurrencyGrant(draft: CharacterDraft, model: SelectionConsequenceModel, grantId: RuleGrantId): void {
  if (!model.activeGrantIds.has(grantId)) throw new Error("Random currency grant is not active");
  delete draft.randomGrantResolutions[grantId];
}

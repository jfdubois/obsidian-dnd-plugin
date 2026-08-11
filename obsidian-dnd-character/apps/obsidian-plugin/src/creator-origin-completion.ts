import type { EntityId } from "@obsidian-dnd/domain";
import type { SelectionConsequenceModel } from "./creator-consequence-service";

/**
 * Completion for a selected catalog origin is derived from the active
 * consequence model. Draft *-choices steps are compatibility projections,
 * not an independent source of catalog-choice truth.
 */
export function isOriginConsequenceComplete(
  model: SelectionConsequenceModel,
  originId: EntityId,
): boolean {
  const origin = model.origins.find((entry) => entry.origin.id === originId);
  if (origin === undefined) return false;
  if (origin.choices.some((choice) => choice.status !== "resolved")) return false;
  if (origin.grants.some((grant) => grant.randomResolution?.status !== "resolved")) return false;
  return !model.diagnostics.some((diagnostic) =>
    diagnostic.originId === originId && diagnostic.code !== "stale-choice",
  );
}

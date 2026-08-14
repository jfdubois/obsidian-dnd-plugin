import type { Character } from "@obsidian-dnd/character-contract";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { CharacterSheetProjection } from "@obsidian-dnd/rules-engine";
import type { CharacterDraft } from "./character-draft";
import { finalizeCharacterWithCatalogResult } from "./character-finalize";
import { deriveCreatorCharacterState } from "./creator-derived-state";

/** Disposable creator review state. It contains no persisted catalog copies. */
export interface CreatorPreview {
  character: Character;
  projection: CharacterSheetProjection;
}

export function buildCreatorPreview(
  draft: CharacterDraft,
  entities: readonly EntityDetailResponse[],
): CreatorPreview | null {
  const finalization = finalizeCharacterWithCatalogResult(draft, entities);
  if (finalization.status === "failure") return null;
  return {
    character: finalization.character,
    projection: deriveCreatorCharacterState(finalization.character, entities),
  };
}

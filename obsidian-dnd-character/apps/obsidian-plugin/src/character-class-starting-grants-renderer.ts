import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import { renderInternalChoices } from "./character-internal-choice-renderer";
import { deriveDraftConsequences } from "./creator-draft-commands";
import { loadCreatorConsequenceReadModel } from "./creator-consequence-read-model";
import { renderActiveCreatorChoices } from "./creator-active-choice-renderer";
import type { ChoiceConsequence } from "./creator-consequence-service";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";

export async function renderClassStartingGrants(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  selected: Pick<CatalogEntitySummary, "id" | "detailPath">,
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onResolved: (choices: Record<string, CharacterChoice>) => void,
  onChoicesPresented: () => void,
  onLoadError: (message: string) => void,
  onChoiceSubmitted?: (instanceId: ChoiceConsequence["instanceId"], value: CharacterChoice["selectedValue"], entities: readonly EntityDetailResponse[]) => void,
  onChoiceCleared?: (instanceId: ChoiceConsequence["instanceId"]) => void,
): Promise<void> {
  if (draft.class.classId !== selected.id) return;
  const revision = catalog.getRuntimeStatus().activeRevision;
  if (revision === undefined) return;
  const loading = container.createDiv({ cls: "dnd-creator-loading" });
  loading.createEl("p", { text: "Loading class starting grants..." });
  try {
    const result = await catalog.fetchEntity(revision, selected.id, selected.detailPath);
    loading.remove();
    if (result.data.kind !== "class") {
      onLoadError(`Selected catalog entity at ${selected.detailPath} is not class data. Refresh the catalog and try again.`);
      return;
    }
    const legacyModel = onChoiceSubmitted === undefined ? deriveDraftConsequences(draft, [result.data]) : undefined;
    const readModel = onChoiceSubmitted === undefined ? undefined : await loadCreatorConsequenceReadModel(draft, catalog, revision, [result.data]);
    const origin = (readModel?.model ?? legacyModel!).origins
      .find((entry) => entry.origin.id === selected.id);
    const choices = origin?.choices ?? [];
    if (choices.length === 0 && (origin?.levelOneGrants.length ?? 0) === 0) {
      container.createEl("p", { text: "No additional starting grants for this class.", cls: "dnd-creator-info" });
      onResolved({});
      return;
    }
    if (choices.length === 0) {
      container.createEl("p", {
        text: "This class has catalog-defined starting grants that require review before continuing.",
        cls: "dnd-creator-info",
      });
      onChoicesPresented();
      return;
    }
    if (onChoiceSubmitted !== undefined) renderActiveCreatorChoices(container, "Class Starting Choices", choices, (instanceId, value) => onChoiceSubmitted(instanceId, value, readModel!.entities), onChoiceCleared);
    else await renderInternalChoices(container, "Class Starting Choices", draft, catalog, revision, choices, isEntityEligible, onResolved);
    onChoicesPresented();
  } catch {
    loading.remove();
    onLoadError(`Could not load the selected class entity at ${selected.detailPath}. Refresh the catalog and try again.`);
  }
}

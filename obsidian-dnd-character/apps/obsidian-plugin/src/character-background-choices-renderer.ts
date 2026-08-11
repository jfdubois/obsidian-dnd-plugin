import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import { renderInternalChoices } from "./character-internal-choice-renderer";
import { deriveDraftConsequences } from "./creator-draft-commands";
import { loadCreatorConsequenceReadModel } from "./creator-consequence-read-model";
import { renderActiveCreatorChoices, type CreatorChoiceSubmission } from "./creator-active-choice-renderer";
import type { ChoiceConsequence } from "./creator-consequence-service";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { RuleGrantId } from "@obsidian-dnd/domain";
import { renderOriginConsequences } from "./creator-origin-consequence-renderer";
import { isOriginConsequenceComplete } from "./creator-origin-completion";
import { originConsequenceLoadDiagnostic, originEntityLoadDiagnostic } from "./creator-consequence-load-diagnostic";

export async function renderBackgroundChoices(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  selected: Pick<CatalogEntitySummary, "id" | "detailPath">,
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onResolved: (choices: Record<string, CharacterChoice>) => void,
  onChoicesPresented: () => void,
  onLoadError: (message: string) => void,
  onChoicesSubmitted?: (choices: readonly CreatorChoiceSubmission[], entities: readonly EntityDetailResponse[]) => void,
  onChoiceCleared?: (instanceId: ChoiceConsequence["instanceId"]) => void,
  onRandomGrantResolution?: (grantId: RuleGrantId, entities: readonly EntityDetailResponse[]) => void,
  onConsequenceCompletion?: (complete: boolean) => void,
): Promise<void> {
  if (draft.background.backgroundId !== selected.id) return;
  const revision = catalog.getRuntimeStatus().activeRevision;
  if (revision === undefined) return;
  const loading = container.createDiv({ cls: "dnd-creator-loading" });
  loading.createEl("p", { text: "Loading background choices..." });
  let data: EntityDetailResponse;
  try {
    data = (await catalog.fetchEntity(revision, selected.id, selected.detailPath)).data;
  } catch (error) {
    loading.remove();
    onLoadError(originEntityLoadDiagnostic("background", selected.detailPath, error));
    return;
  }
  loading.remove();
  try {
    if (data.kind !== "background") {
      onLoadError(`Selected catalog entity at ${selected.detailPath} is not background data. Refresh the catalog and try again.`);
      return;
    }
    const legacyModel = onChoicesSubmitted === undefined ? deriveDraftConsequences(draft, [data]) : undefined;
    const readModel = onChoicesSubmitted === undefined ? undefined : await loadCreatorConsequenceReadModel(draft, catalog, revision, [data]);
    const model = readModel?.model ?? legacyModel!;
    const origin = model.origins.find((entry) => entry.origin.id === selected.id);
    const choices = origin?.choices ?? [];
    onConsequenceCompletion?.(isOriginConsequenceComplete(model, selected.id));
    renderOriginConsequences(container, origin, model.diagnostics, onRandomGrantResolution === undefined ? undefined : (grantId) => onRandomGrantResolution(grantId, readModel?.entities ?? [data]));
    if (choices.length === 0) {
      container.createEl("p", { text: "No additional choices for this background.", cls: "dnd-creator-info" });
      if (onChoicesSubmitted === undefined) onResolved({});
      return;
    }
    if (onChoicesSubmitted !== undefined) renderActiveCreatorChoices(container, "Background Choices", choices, (submissions) => onChoicesSubmitted(submissions, readModel!.entities), onChoiceCleared);
    else await renderInternalChoices(container, "Background Choices", draft, catalog, revision, choices, isEntityEligible, onResolved);
    onChoicesPresented();
  } catch (error) {
    onLoadError(originConsequenceLoadDiagnostic("background", error));
  }
}

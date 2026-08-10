import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import { renderInternalChoices } from "./character-internal-choice-renderer";

export async function renderBackgroundChoices(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  selected: Pick<CatalogEntitySummary, "id" | "detailPath">,
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onResolved: (choices: Record<string, CharacterChoice>) => void,
  onChoicesPresented: () => void,
  onLoadError: (message: string) => void,
): Promise<void> {
  if (draft.background.backgroundId !== selected.id) return;
  const revision = catalog.getRuntimeStatus().activeRevision;
  if (revision === undefined) return;
  const loading = container.createDiv({ cls: "dnd-creator-loading" });
  loading.createEl("p", { text: "Loading background choices..." });
  try {
    const result = await catalog.fetchEntity(revision, selected.id, selected.detailPath);
    loading.remove();
    if (result.data.kind !== "background") {
      onLoadError(`Selected catalog entity at ${selected.detailPath} is not background data. Refresh the catalog and try again.`);
      return;
    }
    if (result.data.choices.length === 0) {
      container.createEl("p", { text: "No additional choices for this background.", cls: "dnd-creator-info" });
      onResolved({});
      return;
    }
    await renderInternalChoices(
      container, "Background Choices", draft, catalog, revision, selected.id,
      result.data.choices, isEntityEligible, onResolved,
    );
    onChoicesPresented();
  } catch {
    loading.remove();
    onLoadError(`Could not load the selected background entity at ${selected.detailPath}. Refresh the catalog and try again.`);
  }
}

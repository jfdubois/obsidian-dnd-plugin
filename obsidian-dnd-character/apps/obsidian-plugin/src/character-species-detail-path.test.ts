import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogService } from "./catalog/catalog-service";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { selectSpeciesChoices } from "./character-species-choices-step";
import { renderSpeciesChoices } from "./character-species-choices-renderer";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createSpeciesRule, createCatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import { createCatalogRevision, createEntityId, createSourceId } from "@obsidian-dnd/domain";

const revision = createCatalogRevision("5etools-3c5d9d3-b1");
const elfId = createEntityId("species:2014:phb:elf");
const sourceId = createSourceId("phb");
const detailPath = "entities/species/species:2014:phb:elf.json";

function createContainer(): HTMLElement {
  const element = {
    textContent: "",
    innerHTML: "",
    createEl: vi.fn((_tag: string, attrs?: { text?: string; cls?: string }) => {
      const child = createContainer();
      child.textContent = attrs?.text ?? "";
      return child;
    }),
    createDiv: vi.fn(function (attrs?: { text?: string; cls?: string }) {
      return element.createEl("div", attrs);
    }),
    remove: vi.fn(),
  };
  return element as unknown as HTMLElement;
}

function createElf() {
  return createSpeciesRule(
    elfId, "Elf", sourceId, "2014", "core", "Medium", 30, true,
    [], [], [], [], [], [], [], false,
  );
}

function createSummary() {
  return createCatalogEntitySummary({
    id: elfId, kind: "species", name: "Elf", sourceId, ruleset: "2014",
    access: "core", legacy: false, tags: [], detailPath,
  });
}

function createCatalog(data: ReturnType<typeof createElf> | null): CatalogService {
  return {
    getRuntimeStatus: vi.fn(() => ({ activationState: "active", activeRevision: revision })),
    fetchEntity: vi.fn(async () => ({ catalogRevision: revision, data })),
    fetchIndex: vi.fn(async () => []),
  } as unknown as CatalogService;
}

describe("species detailPath contract", () => {
  let draft: ReturnType<typeof createEmptyCharacterDraft>;

  beforeEach(() => {
    draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);
    selectSpecies(draft, elfId);
  });

  it("passes the summary's exact published detailPath to fetchEntity", async () => {
    const catalog = createCatalog(createElf());
    await renderSpeciesChoices(
      createContainer(), draft, catalog, createSummary(), () => true, vi.fn(),
    );

    expect(catalog.fetchEntity).toHaveBeenCalledWith(revision, elfId, detailPath);
    expect(catalog.fetchEntity).not.toHaveBeenCalledWith(
      revision, elfId, "entities/species/phb/2014/elf.json",
    );
  });

  it("auto-resolves a zero-choice production species exactly once", async () => {
    const catalog = createCatalog(createElf());
    const results: boolean[] = [];
    const resolve = (choices: Record<string, CharacterChoice>) => {
      results.push(selectSpeciesChoices(draft, choices));
    };

    await renderSpeciesChoices(createContainer(), draft, catalog, createSummary(), () => true, resolve);
    await renderSpeciesChoices(createContainer(), draft, catalog, createSummary(), () => true, resolve);

    expect(results).toEqual([true, false]);
    expect(getStepState(draft, "species")).toBe("resolved");
    expect(getStepState(draft, "species-choices")).toBe("resolved");
    expect(draft.diagnostics).not.toContainEqual(expect.objectContaining({
      message: "Species choices not yet resolved",
    }));
  });

  it("reports an actionable entity-load diagnostic for a wrong detailPath", async () => {
    const catalog = createCatalog(null);
    vi.mocked(catalog.fetchEntity).mockRejectedValueOnce(new Error("not found"));
    const onEntityLoadError = vi.fn();

    await renderSpeciesChoices(
      createContainer(), draft, catalog,
      { ...createSummary(), detailPath: "entities/species/wrong.json" },
      () => true, vi.fn(), undefined, onEntityLoadError,
    );

    expect(onEntityLoadError).toHaveBeenCalledWith(expect.stringContaining(
      "entities/species/wrong.json",
    ));
  });
});

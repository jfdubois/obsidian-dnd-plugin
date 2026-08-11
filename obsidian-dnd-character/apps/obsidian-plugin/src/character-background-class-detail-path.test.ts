import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogService } from "./catalog/catalog-service";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectBackground } from "./character-background-step";
import { selectClass } from "./character-class-step";
import { selectBackgroundChoices } from "./character-background-choices-step";
import { selectClassStartingGrants } from "./character-class-starting-grants-step";
import { renderBackgroundChoices } from "./character-background-choices-renderer";
import { renderClassStartingGrants } from "./character-class-starting-grants-renderer";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import {
  createBackgroundRule, createCatalogEntitySummary, createChoiceDefinition,
  createClassRule, createEntityQuery,
} from "@obsidian-dnd/catalog-contract";
import {
  createCatalogRevision, createChoiceDefinitionId, createEntityId, createSourceId,
} from "@obsidian-dnd/domain";

const revision = createCatalogRevision("5etools-3c5d9d3-b1");
const sourceId = createSourceId("phb");
const backgroundId = createEntityId("background:2014:phb:acolyte");
const classId = createEntityId("class:2014:phb:fighter");

function container(): HTMLElement {
  const element = {
    createEl: vi.fn((_tag: string, attrs?: { text?: string }) => {
      const child = container();
      child.textContent = attrs?.text ?? "";
      return child;
    }),
    createDiv: vi.fn(function (attrs?: { text?: string }) { return element.createEl("div", attrs); }),
    remove: vi.fn(), textContent: "", innerHTML: "", children_arr: [],
  };
  return element as unknown as HTMLElement;
}

function summary(id: typeof backgroundId | typeof classId, kind: "background" | "class") {
  return createCatalogEntitySummary({
    id, kind, name: kind, sourceId, ruleset: "2014", access: "core", legacy: false,
    tags: [], detailPath: `entities/${kind}s/${id}.json`,
  });
}

function background(choices: Parameters<typeof createBackgroundRule>[9] = []) {
  return createBackgroundRule(backgroundId, "Acolyte", sourceId, "2014", "core", [], [], [], [], choices, [], false);
}

function classRule(
  startingChoices: Parameters<typeof createClassRule>[8] = [],
  levels: Parameters<typeof createClassRule>[9] = {},
) {
  return createClassRule(
    classId, "Fighter", sourceId, "2014", "core", 10, ["STR"], ["STR", "CON"],
    startingChoices, levels, [], [], [], [], [], [], false,
  );
}

function catalog(data: ReturnType<typeof background> | ReturnType<typeof classRule>): CatalogService {
  return {
    getRuntimeStatus: vi.fn(() => ({ activationState: "active", activeRevision: revision })),
    fetchEntity: vi.fn(async () => ({ catalogRevision: revision, data })),
    fetchIndex: vi.fn(async () => []),
  } as unknown as CatalogService;
}

describe("background and class authoritative detail loading", () => {
  let draft: ReturnType<typeof createEmptyCharacterDraft>;
  beforeEach(() => {
    draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);
  });

  it("uses the background summary path and resolves zero choices exactly once", async () => {
    selectBackground(draft, backgroundId);
    const service = catalog(background());
    const results: boolean[] = [];
    const resolve = (choices: Record<string, CharacterChoice>) => results.push(selectBackgroundChoices(draft, choices));
    const selected = summary(backgroundId, "background");
    await renderBackgroundChoices(container(), draft, service, selected, () => true, resolve, vi.fn(), vi.fn());
    await renderBackgroundChoices(container(), draft, service, selected, () => true, resolve, vi.fn(), vi.fn());
    expect(service.fetchEntity).toHaveBeenCalledWith(revision, backgroundId, selected.detailPath);
    expect(results).toEqual([true, false]);
    expect(getStepState(draft, "background-choices")).toBe("resolved");
  });

  it("uses the class summary path and resolves an empty production class once", async () => {
    selectClass(draft, classId);
    const service = catalog(classRule());
    const results: boolean[] = [];
    const resolve = (choices: Record<string, CharacterChoice>) => results.push(selectClassStartingGrants(draft, choices));
    const selected = summary(classId, "class");
    await renderClassStartingGrants(container(), draft, service, selected, () => true, resolve, vi.fn(), vi.fn());
    await renderClassStartingGrants(container(), draft, service, selected, () => true, resolve, vi.fn(), vi.fn());
    expect(service.fetchEntity).toHaveBeenCalledWith(revision, classId, selected.detailPath);
    expect(results).toEqual([true, false]);
    expect(getStepState(draft, "class-starting-grants")).toBe("resolved");
  });

  it("does not auto-resolve a class with a real starting choice", async () => {
    selectClass(draft, classId);
    const choice = createChoiceDefinition(
      createChoiceDefinitionId("class-starting-choice"), "Starting Choice", "entity", 1, 1,
      false, createEntityQuery("feat"), [],
    );
    const resolve = vi.fn();
    const presented = vi.fn();
    await renderClassStartingGrants(
      container(), draft, catalog(classRule([choice])), summary(classId, "class"),
      () => true, resolve, presented, vi.fn(),
    );
    expect(resolve).not.toHaveBeenCalled();
    expect(presented).toHaveBeenCalledOnce();
    expect(getStepState(draft, "class-starting-grants")).not.toBe("resolved");
  });

  it("renders non-empty normalized background choices without auto-resolving", async () => {
    selectBackground(draft, backgroundId);
    const choice = createChoiceDefinition(
      createChoiceDefinitionId("background-choice"), "Background Choice", "entity", 1, 1,
      false, createEntityQuery("feat"), [],
    );
    const resolve = vi.fn();
    const presented = vi.fn();
    await renderBackgroundChoices(
      container(), draft, catalog(background([choice])), summary(backgroundId, "background"),
      () => true, resolve, presented, vi.fn(),
    );
    expect(resolve).not.toHaveBeenCalled();
    expect(presented).toHaveBeenCalledOnce();
    expect(getStepState(draft, "background-choices")).not.toBe("resolved");
  });

  it("surfaces authoritative-path load errors", async () => {
    selectBackground(draft, backgroundId);
    const service = catalog(background());
    vi.mocked(service.fetchEntity).mockRejectedValueOnce(new Error("missing"));
    const error = vi.fn();
    const selected = summary(backgroundId, "background");
    await renderBackgroundChoices(container(), draft, service, selected, () => true, vi.fn(), vi.fn(), error);
    expect(error).toHaveBeenCalledWith(expect.stringContaining(selected.detailPath));
  });

  it("reports a consequence-data failure without blaming an already loaded background", async () => {
    selectBackground(draft, backgroundId);
    const service = catalog(background([createChoiceDefinition(
      createChoiceDefinitionId("background-language"), "Choose languages", "language", 2, 2,
      false, createEntityQuery("language"), [],
    )]));
    vi.mocked(service.fetchIndex).mockRejectedValueOnce(new Error("languages index unavailable"));
    const error = vi.fn();
    await renderBackgroundChoices(
      container(), draft, service, summary(backgroundId, "background"), () => true,
      vi.fn(), vi.fn(), error, vi.fn(),
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining("catalog consequence data"));
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining("selected background entity"));
  });

  it("surfaces class authoritative-path load errors", async () => {
    selectClass(draft, classId);
    const service = catalog(classRule());
    vi.mocked(service.fetchEntity).mockRejectedValueOnce(new Error("missing"));
    const error = vi.fn();
    const selected = summary(classId, "class");
    await renderClassStartingGrants(container(), draft, service, selected, () => true, vi.fn(), vi.fn(), error);
    expect(error).toHaveBeenCalledWith(expect.stringContaining(selected.detailPath));
  });
});

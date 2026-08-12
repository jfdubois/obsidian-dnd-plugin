import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { createChoiceDefinitionId, createChoiceOptionId, createEntityId, createSourceId } from "@obsidian-dnd/domain";
import type { ChoiceInstanceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createLanguageRule, type BackgroundRule, type ChoiceDefinition, type EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import { CharacterCreatorModal } from "./character-creator-modal";
import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import type { StepController } from "./character-step-controller";

type Origin = "species" | "background" | "class";

interface ModalAccess {
  controller: StepController;
  renderGeneration: number;
  progressBarEl: HTMLElement | null;
  renderProgressBar(): void;
  updateOriginConsequenceCompletion(origin: Origin, complete: boolean, generation: number): void;
  submitCatalogChoiceBatch(step: "species-choices" | "background-choices" | "class-starting-grants", entities: readonly EntityDetailResponse[], choices: readonly { instanceId: ChoiceInstanceId; value: CharacterChoice["selectedValue"] }[]): void;
  clearCatalogChoice(step: "species-choices" | "background-choices" | "class-starting-grants", entities: readonly EntityDetailResponse[], instanceId: ChoiceInstanceId): void;
}

interface ProgressElement {
  empty(): void;
  setText(text: string): void;
  createDiv(): ProgressElement;
  createSpan(): { setText(text: string): void; addClass(cls: string): void; onClickEvent(): void };
}

function app(): App { return { workspace: {}, vault: {}, scope: {} } as App; }

function modalFor(origin: Origin): { modal: CharacterCreatorModal; access: ModalAccess } {
  const draft = createEmptyCharacterDraft();
  if (origin === "species") draft.species.speciesId = createEntityId("species:2014:phb:elf");
  else if (origin === "background") draft.background.backgroundId = createEntityId("background:2014:phb:acolyte");
  else draft.class.classId = createEntityId("class:2014:phb:cleric");
  markStepResolved(draft, origin);
  const modal = new CharacterCreatorModal(app(), draft);
  const access = modal as unknown as ModalAccess;
  access.renderGeneration = 4;
  return { modal, access };
}

function progressBar(): { element: HTMLElement; dots: Array<{ text: string; classes: string[] }> } {
  const dots: Array<{ text: string; classes: string[] }> = [];
  const element = (): ProgressElement => ({
    empty: () => undefined, setText: () => undefined, createDiv: element,
    createSpan: () => {
      const dot = { text: "", classes: [] as string[] }; dots.push(dot);
      return { setText: (text) => { dot.text = text; }, addClass: (cls) => { dot.classes.push(cls); }, onClickEvent: () => undefined };
    },
  });
  return { element: element() as unknown as HTMLElement, dots };
}

function acolyteFixture(): { draft: ReturnType<typeof createEmptyCharacterDraft>; entities: EntityDetailResponse[]; submissions: Array<{ instanceId: ChoiceInstanceId; value: CharacterChoice["selectedValue"] }> } {
  const backgroundId = createEntityId("background:2014:test:acolyte");
  const commonId = createEntityId("language:2014:test:common");
  const elvishId = createEntityId("language:2014:test:elvish");
  const language: ChoiceDefinition = { id: createChoiceDefinitionId("choice:test:acolyte:language"), label: "Choose languages", type: "language", minimum: 2, maximum: 2, repeatable: false, optionQuery: { type: "entity", kind: "language" }, prerequisites: [] };
  const packageId = createChoiceOptionId("option:test:acolyte:package");
  const equipment: ChoiceDefinition = { id: createChoiceDefinitionId("choice:test:acolyte:equipment"), label: "Starting equipment", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: packageId, label: "Package", grants: [], choices: [] }] };
  const background: BackgroundRule = { id: backgroundId, kind: "background", name: "Acolyte", sourceId: createSourceId("test"), ruleset: "2014", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [language, equipment], dependencies: [], skillProficiencies: [] };
  const draft = createEmptyCharacterDraft();
  draft.ruleset.ruleset = "2014"; draft.background.backgroundId = backgroundId; markStepResolved(draft, "background");
  const languageInstance = `${backgroundId}:choice:${language.id}` as ChoiceInstanceId;
  const equipmentInstance = `${backgroundId}:choice:${equipment.id}` as ChoiceInstanceId;
  return { draft, entities: [background, createLanguageRule(commonId, "Common", createSourceId("test"), "2014", "core", [], "language"), createLanguageRule(elvishId, "Elvish", createSourceId("test"), "2014", "core", [], "language")], submissions: [{ instanceId: languageInstance, value: { type: "entity-ids", entityIds: [commonId, elvishId] } }, { instanceId: equipmentInstance, value: { type: "option-ids", optionIds: [packageId] } }] };
}

describe("creator origin completion projection", () => {
  it.each<Origin>(["species", "background", "class"])("refreshes the progress projection when %s becomes complete", (origin) => {
    const { access } = modalFor(origin); const refresh = vi.spyOn(access, "renderProgressBar");
    access.updateOriginConsequenceCompletion(origin, true, 4);
    expect(access.controller.isStepResolved(origin)).toBe(true);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("removes the Background resolved projection immediately when completion becomes false", () => {
    const { access } = modalFor("background"); const refresh = vi.spyOn(access, "renderProgressBar");
    access.updateOriginConsequenceCompletion("background", true, 4);
    access.updateOriginConsequenceCompletion("background", false, 4);
    expect(access.controller.isStepResolved("background")).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("renders Background's resolved visual indicator from the refreshed completion projection", () => {
    const { access } = modalFor("background"); const progress = progressBar(); access.progressBarEl = progress.element;
    access.updateOriginConsequenceCompletion("background", true, 4);
    expect(progress.dots.find((dot) => dot.text === "Background")?.classes).toContain("dnd-creator-step-dot-resolved");
  });

  it("does not let an obsolete asynchronous render overwrite a newer completion projection", () => {
    const { access } = modalFor("background");
    access.updateOriginConsequenceCompletion("background", false, 4);
    access.renderGeneration = 5;
    access.updateOriginConsequenceCompletion("background", true, 4);
    expect(access.controller.isStepResolved("background")).toBe(false);
  });

  it("projects a completed Acolyte batch before navigation makes its asynchronous Background callback stale", () => {
    const { draft, entities, submissions } = acolyteFixture();
    const modal = new CharacterCreatorModal(app(), draft);
    const access = modal as unknown as ModalAccess;
    const progress = progressBar(); access.progressBarEl = progress.element; access.renderGeneration = 4;

    access.submitCatalogChoiceBatch("background-choices", entities, submissions);
    access.renderGeneration = 5;

    expect(access.controller.isStepResolved("background")).toBe(true);
    expect(progress.dots.find((dot) => dot.text === "Background")?.classes).toContain("dnd-creator-step-dot-resolved");
    access.updateOriginConsequenceCompletion("background", false, 4);
    expect(access.controller.isStepResolved("background")).toBe(true);
  });

  it("projects Background incomplete synchronously when an active required choice is cleared", () => {
    const { draft, entities, submissions } = acolyteFixture();
    const modal = new CharacterCreatorModal(app(), draft);
    const access = modal as unknown as ModalAccess;
    access.renderGeneration = 4;

    access.submitCatalogChoiceBatch("background-choices", entities, submissions);
    expect(access.controller.isStepResolved("background")).toBe(true);
    access.clearCatalogChoice("background-choices", entities, submissions[0]!.instanceId);
    expect(access.controller.isStepResolved("background")).toBe(false);
  });
});

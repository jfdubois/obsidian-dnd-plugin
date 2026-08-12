import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { createChoiceDefinitionId, createChoiceOptionId, createEntityId, createSourceId } from "@obsidian-dnd/domain";
import type { ChoiceInstanceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createLanguageRule, type BackgroundRule, type ChoiceDefinition, type EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import { CharacterCreatorModal } from "./character-creator-modal";
import { createEmptyCharacterDraft, getStepState, markStepResolved } from "./character-draft";
import { isOriginConsequenceComplete } from "./creator-origin-completion";
import { deriveDraftConsequences, setCreatorChoices } from "./creator-draft-commands";
import type { StepController } from "./character-step-controller";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { selectBackground } from "./character-background-step";

type Origin = "species" | "background" | "class";

interface ModalAccess {
  controller: StepController;
  renderGeneration: number;
  progressBarEl: HTMLElement | null;
  renderProgressBar(): void;
  updateOriginConsequenceCompletion(origin: Origin, complete: boolean, generation: number): void;
  submitCatalogChoiceBatch(step: "species-choices" | "background-choices" | "class-starting-grants", entities: readonly EntityDetailResponse[], choices: readonly { instanceId: ChoiceInstanceId; value: CharacterChoice["selectedValue"] }[]): void;
  clearCatalogChoice(step: "species-choices" | "background-choices" | "class-starting-grants", entities: readonly EntityDetailResponse[], instanceId: ChoiceInstanceId): void;
  navigateNext(): void;
  renderProgressBar(): void;
  renderCurrentStep(): void;
  projectCatalogCommandCompletion(step: "species-choices" | "background-choices" | "class-starting-grants", entities: readonly EntityDetailResponse[], activeIds: readonly string[]): void;
  resolveCatalogChoiceSubstep(step: "species-choices" | "background-choices" | "class-starting-grants", entities: readonly EntityDetailResponse[]): void;
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

  it("keeps the completed Background projection through the exact local refresh, Next, and Class progress path", () => {
    const { draft, entities, submissions } = acolyteFixture();
    const modal = new CharacterCreatorModal(app(), draft);
    const access = modal as unknown as ModalAccess;
    const progress = progressBar();
    access.progressBarEl = progress.element;
    access.renderGeneration = 4;
    (access.controller as unknown as { _currentIndex: number })._currentIndex = 4;

    const completion = () => (access.controller as unknown as { originConsequenceCompletion: Map<Origin, boolean> }).originConsequenceCompletion.get("background");

    // T0: the selected origin is unresolved before the governed batch.
    expect(completion()).toBeUndefined();
    expect(access.controller.isStepResolved("background")).toBe(false);
    setCreatorChoices(draft, entities, submissions);

    // T1: selection persistence changes the consequence model, not the disposable projection.
    const model = deriveDraftConsequences(draft, entities);
    expect(isOriginConsequenceComplete(model, draft.background.backgroundId!)).toBe(true);
    expect(completion()).toBeUndefined();
    expect(access.controller.isStepResolved("background")).toBe(false);
    expect(getStepState(draft, "background")).toBe("resolved");
    expect(Object.keys(draft.selections)).toHaveLength(2);
    expect(model.diagnostics.filter((diagnostic) => diagnostic.originId === draft.background.backgroundId)).toEqual([]);

    // T2/T3/T4: command projection and the targeted region refresh preserve completion.
    access.projectCatalogCommandCompletion("background-choices", entities, submissions.map((submission) => submission.instanceId));
    expect(completion()).toBe(true);
    expect(access.controller.isStepResolved("background")).toBe(true);
    access.resolveCatalogChoiceSubstep("background-choices", entities);
    expect(completion()).toBe(true);
    expect(access.controller.isStepResolved("background")).toBe(true);

    // T5/T6: use the modal navigation and progress methods, not a helper-only path.
    access.navigateNext();
    expect(access.controller.currentStep).toBe("class");
    expect(completion()).toBe(true);
    access.renderProgressBar();
    expect(completion()).toBe(true);
    expect(access.controller.isStepResolved("background")).toBe(true);
    const backgroundDots = progress.dots.filter((dot) => dot.text === "Background");
    expect(backgroundDots[backgroundDots.length - 1]?.classes).toContain("dnd-creator-step-dot-resolved");
  });

  it("resolves Background in the real empty-draft lifecycle despite its unvisited legacy choices step", () => {
    const { entities, submissions } = acolyteFixture();
    const draft = createEmptyCharacterDraft();
    const elfId = createEntityId("species:2014:test:elf");
    selectRuleset(draft, "2014");
    selectSources(draft, []);
    expect(selectSpecies(draft, elfId)).toBe(true);

    const modal = new CharacterCreatorModal(app(), draft);
    const access = modal as unknown as ModalAccess;
    access.controller.setOriginConsequenceCompletion("species", true);
    expect(selectBackground(draft, entities[0]!.id)).toBe(true);

    const progress = progressBar();
    access.progressBarEl = progress.element;
    access.renderGeneration = 4;
    (access.controller as unknown as { _currentIndex: number })._currentIndex = 4;
    access.submitCatalogChoiceBatch("background-choices", entities, submissions);
    access.navigateNext();
    expect(access.controller.currentStep).toBe("class");
    access.renderProgressBar();

    expect(getStepState(draft, "background")).toBe("resolved");
    expect(getStepState(draft, "background-choices")).toBe("unvisited");
    expect((access.controller as unknown as { originConsequenceCompletion: Map<Origin, boolean> }).originConsequenceCompletion.get("background")).toBe(true);
    expect(access.controller.isStepResolved("background")).toBe(true);
    const backgroundDots = progress.dots.filter((dot) => dot.text === "Background");
    expect(backgroundDots[backgroundDots.length - 1]?.classes).toContain("dnd-creator-step-dot-resolved");
  });

  it.each<Origin>(["species", "background", "class"])("does not let non-resolved legacy %s steps veto authoritative completion", (origin) => {
    const { access } = modalFor(origin);
    const legacySteps = origin === "species" ? ["species", "species-choices"]
      : origin === "background" ? ["background", "background-choices"]
        : ["class", "class-starting-grants"];
    for (const step of legacySteps) access.controller.draft.stepStatuses.set(step as never, "invalidated");
    const progress = progressBar();
    access.progressBarEl = progress.element;
    access.updateOriginConsequenceCompletion(origin, true, 4);

    const oldLegacyVetoResult = getStepState(access.controller.draft, origin) === "resolved"
      && (access.controller as unknown as { originConsequenceCompletion: Map<Origin, boolean> }).originConsequenceCompletion.get(origin) === true;
    expect(oldLegacyVetoResult).toBe(false);
    expect(access.controller.isStepResolved(origin)).toBe(true);
    expect(progress.dots.find((dot) => dot.text === (origin === "class" ? "Class" : origin[0]!.toUpperCase() + origin.slice(1)))?.classes).toContain("dnd-creator-step-dot-resolved");
  });

  it.each<"false" | "absent">(["false", "absent"])("keeps selected Background unresolved when its projection is %s", (projection) => {
    const { access } = modalFor("background");
    if (projection === "false") access.updateOriginConsequenceCompletion("background", false, 4);
    expect(access.controller.isStepResolved("background")).toBe(false);
  });

  it("keeps Background unresolved with no selected origin even if compatibility state is resolved", () => {
    const modal = new CharacterCreatorModal(app(), createEmptyCharacterDraft());
    const access = modal as unknown as ModalAccess;
    access.controller.markStepResolved("background");
    access.updateOriginConsequenceCompletion("background", true, 4);
    expect(access.controller.isStepResolved("background")).toBe(false);
  });

  it("does not full-rerender the creator step for confirmed or cleared local choices", () => {
    const { draft, entities, submissions } = acolyteFixture();
    const modal = new CharacterCreatorModal(app(), draft);
    const access = modal as unknown as ModalAccess;
    const render = vi.spyOn(access, "renderCurrentStep");

    access.submitCatalogChoiceBatch("background-choices", entities, submissions);
    access.clearCatalogChoice("background-choices", entities, submissions[0]!.instanceId);

    expect(render).not.toHaveBeenCalled();
  });

  it("preserves the modal content scroll root through a local choice confirmation", () => {
    const { draft, entities, submissions } = acolyteFixture();
    const modal = new CharacterCreatorModal(app(), draft);
    const access = modal as unknown as ModalAccess;
    const scrollRoot = {
      scrollTop: 284,
      scrollHeight: 800,
      clientHeight: 400,
      querySelector: () => null,
    };
    (access as unknown as { contentEl: HTMLElement }).contentEl = scrollRoot as unknown as HTMLElement;

    access.submitCatalogChoiceBatch("background-choices", entities, submissions);
    expect(scrollRoot.scrollTop).toBe(284);
  });
});

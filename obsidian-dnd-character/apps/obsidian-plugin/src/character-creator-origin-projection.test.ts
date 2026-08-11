import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { createEntityId } from "@obsidian-dnd/domain";
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
});

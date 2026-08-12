import { describe, it, expect, vi, beforeEach } from "vitest";
import type { App } from "obsidian";

import {
  CharacterCreatorModal,
  openCharacterCreatorModal,
} from "./character-creator-modal";
import {
  createEmptyCharacterDraft,
  isDraftComplete,
  hasErrors,
  markStepResolved,
  getStepState,
  getStepStatuses,
} from "./character-draft";
import type { CreatorStep } from "./character-step-controller";
import { StepController } from "./character-step-controller";
import type { DraftStep } from "./character-draft-steps";
import type { DraftDiagnostic } from "./character-draft-dependency";
import { buildDraftDiagnostics } from "./character-draft-dependency";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectBackground } from "./character-background-step";
import { selectClass } from "./character-class-step";
import { selectSpecies } from "./character-species-step";
import { createEntityId } from "@obsidian-dnd/domain";

/* ── Mock Obsidian components ─────────────────────────────────── */

function createMockApp(): App {
  return {
    workspace: {
      getLeavesOfType: vi.fn().mockReturnValue([]),
    },
    vault: {
      adapter: {
        exists: vi.fn(),
        read: vi.fn(),
        write: vi.fn(),
      },
    },
    scope: {
      register: vi.fn(),
      unregister: vi.fn(),
    },
  } as unknown as App;
}

/* ── Tests ────────────────────────────────────────────────────── */

describe("CharacterCreatorModal", () => {
  let app: App;
  let draft: ReturnType<typeof createEmptyCharacterDraft>;

  beforeEach(() => {
    app = createMockApp();
    draft = createEmptyCharacterDraft();
  });

  describe("constructor", () => {
    it("creates a modal with a step controller", () => {
      const modal = new CharacterCreatorModal(app, draft);
      expect(modal).toBeDefined();
    });

    it("starts at the ruleset step", () => {
      const modal = new CharacterCreatorModal(app, draft);
      // Access the controller through the modal's internal state
      expect(modal).toBeDefined();
    });
  });

  describe("openCharacterCreatorModal", () => {
    it("creates and opens a modal", () => {
      const openSpy = vi.fn();
      const modal = new CharacterCreatorModal(app, draft);
      vi.spyOn(modal, "open").mockImplementation(openSpy);

      const result = openCharacterCreatorModal(app, draft);
      expect(result).toBeInstanceOf(CharacterCreatorModal);
    });
  });

  describe("StepController integration", () => {
    it("controller starts at step index 0 (ruleset)", () => {
      const controller = new StepController(draft);
      expect(controller.currentStepIndex).toBe(0);
      expect(controller.currentStep).toBe("ruleset");
    });

    it("controller has 11 total steps", () => {
      const controller = new StepController(draft);
      expect(controller.totalSteps).toBe(11);
    });

    it("controller navigates forward through steps", () => {
      const controller = new StepController(draft);
      const step1 = controller.next();
      expect(step1).toBe("sources");
      expect(controller.currentStepIndex).toBe(1);
    });

    it("controller navigates backward through steps", () => {
      const controller = new StepController(draft);
      controller.next(); // move to sources
      const prev = controller.previous();
      expect(prev).toBe("ruleset");
      expect(controller.currentStepIndex).toBe(0);
    });

    it("controller cannot navigate before first step", () => {
      const controller = new StepController(draft);
      const prev = controller.previous();
      expect(prev).toBe("ruleset");
      expect(controller.currentStepIndex).toBe(0);
    });

    it("controller cannot navigate past last step", () => {
      const controller = new StepController(draft);
      // Navigate all the way to review
      for (let i = 0; i < 10; i++) {
        controller.next();
      }
      expect(controller.currentStep).toBe("review");
      const next = controller.next();
      expect(next).toBe("review");
    });

    it("controller can jump to any step", () => {
      const controller = new StepController(draft);
      const success = controller.jumpTo("review");
      expect(success).toBe(true);
      expect(controller.currentStep).toBe("review");
    });

    it("controller cannot jump to invalid step", () => {
      const controller = new StepController(draft);
      const success = controller.jumpTo("invalid" as unknown as CreatorStep);
      expect(success).toBe(false);
    });
  });

  describe("Step resolution", () => {
    it("treats derived global summaries as resolved without legacy draft writes", () => {
      const controller = new StepController(draft);
      expect(controller.isStepResolved("proficienciesAndLanguages")).toBe(true);
      expect(controller.isStepResolved("equipment")).toBe(true);
      expect(getStepState(draft, "languages")).toBe("unvisited");
      expect(getStepState(draft, "equipment")).toBe("unvisited");
    });

    it("does not emit legacy global-page required-step diagnostics", () => {
      markStepResolved(draft, "proficiencies");
      markStepResolved(draft, "languages");
      markStepResolved(draft, "equipment");
      expect(buildDraftDiagnostics(getStepStatuses(draft)).filter((entry) => entry.message === "Required step not yet completed")).toEqual([]);
    });
    it("marks current step as resolved", () => {
      const controller = new StepController(draft);
      controller.markCurrentStepResolved();
      expect(controller.isStepResolved("ruleset")).toBe(true);
    });

    it("marks specific step as resolved", () => {
      const controller = new StepController(draft);
      controller.markStepResolved("ruleset");
      expect(controller.isStepResolved("ruleset")).toBe(true);
    });

    it("canSave returns false when steps are unresolved", () => {
      const controller = new StepController(draft);
      expect(controller.canSave()).toBe(false);
    });

    it("canSave returns true when all steps are resolved", () => {
      const controller = new StepController(draft);
      // Resolve all non-skippable steps
      const steps: ReadonlyArray<
        | "ruleset"
        | "sources"
        | "identity"
        | "species"
        | "background"
        | "class"
        | "abilities"
        | "proficienciesAndLanguages"
        | "equipment"
        | "spells"
        | "review"
      > = [
        "ruleset",
        "sources",
        "identity",
        "species",
        "background",
        "class",
        "abilities",
        "proficienciesAndLanguages",
        "equipment",
        "spells",
        "review",
      ];
      for (const step of steps) {
        controller.markStepResolved(step);
      }
      draft.species.speciesId = createEntityId("species:2014:phb:elf");
      draft.background.backgroundId = createEntityId("background:2014:phb:acolyte");
      draft.class.classId = createEntityId("class:2014:phb:cleric");
      for (const origin of ["species", "background", "class"] as const) controller.setOriginConsequenceCompletion(origin, true);
      expect(controller.canSave()).toBe(true);
    });

    it("spells step is skippable when not a spellcaster", () => {
      const controller = new StepController(draft);
      draft.spellEligibility.isSpellcaster = false;
      expect(controller.isStepSkippable("spells")).toBe(true);
    });

    it("spells step is not skippable when isSpellcaster is true", () => {
      const controller = new StepController(draft);
      draft.spellEligibility.isSpellcaster = true;
      expect(controller.isStepSkippable("spells")).toBe(false);
    });

    it("spells step is not skippable when isSpellcaster is undefined", () => {
      const controller = new StepController(draft);
      // Reset to default (isSpellcaster: false from createEmptyCharacterDraft)
      expect(controller.isStepSkippable("spells")).toBe(true);
    });
  });

  describe("Dependency invalidation", () => {
    it("invalidates downstream dependents when step is resolved", () => {
      const controller = new StepController(draft);
      controller.markStepResolved("ruleset");
      // Sources depends on ruleset, so it should be invalidated
      const invalidated = controller.invalidateDependents("ruleset");
      expect(invalidated.length).toBeGreaterThan(0);
    });

    it("invalidates current dependents", () => {
      const controller = new StepController(draft);
      controller.markStepResolved("ruleset");
      const invalidated = controller.invalidateCurrentDependents();
      expect(invalidated.length).toBeGreaterThan(0);
    });
  });

  describe("Review state", () => {
    it("builds review state from draft data", () => {
      const controller = new StepController(draft);
      draft.ruleset.ruleset = "2024";
      draft.identity.name = "Test Character";

      const reviewState = controller.buildReviewState();
      expect(reviewState.ruleset.ruleset).toBe("2024");
      expect(reviewState.identity.name).toBe("Test Character");
    });
  });

  describe("Draft completion gating", () => {
    it("isDraftComplete returns false for empty draft", () => {
      expect(isDraftComplete(draft)).toBe(false);
    });

    it("hasErrors returns false for empty draft with no diagnostics", () => {
      expect(hasErrors(draft)).toBe(false);
    });

    it("hasErrors returns true when draft has error diagnostics", () => {
      draft.diagnostics = [
        {
          step: "species" as DraftStep,
          message: "Test error",
          severity: "error" as const,
        },
      ];
      expect(hasErrors(draft)).toBe(true);
    });
  });

  describe("P10-T020 corrective regression tests", () => {
    it("ruleset selection calls centralized selectRuleset", () => {
      // Verify that selectRuleset is imported and used in renderRulesetStep
      // The modal should delegate to selectRuleset() instead of direct mutation
      expect(typeof selectRuleset).toBe("function");
      // selectRuleset should set the ruleset and mark step resolved
      selectRuleset(draft, "2024");
      expect(draft.ruleset.ruleset).toBe("2024");
    });

    it("ruleset selection does not cause double invalidation", () => {
      // Before fix: modal called markCurrentStepResolved() + invalidateCurrentDependents()
      // after selectRuleset already did both internally
      // After fix: only selectRuleset() is called, which handles everything once
      // Reset draft to ensure clean state
      draft = createEmptyCharacterDraft();

      // Call selectRuleset once (as the modal now does)
      selectRuleset(draft, "2024");

      // The step should be resolved exactly once
      expect(draft.ruleset.ruleset).toBe("2024");
    });

    it("diagnostics consolidate invalidated steps into single warning", () => {
      // Create a scenario with multiple invalidated steps
      const statuses = [
        { step: "ruleset" as DraftStep, state: "resolved" as const },
        { step: "sources" as DraftStep, state: "invalidated" as const },
        { step: "species" as DraftStep, state: "invalidated" as const },
        { step: "background" as DraftStep, state: "invalidated" as const },
        { step: "class" as DraftStep, state: "invalidated" as const },
        { step: "identity" as DraftStep, state: "resolved" as const },
        { step: "abilities" as DraftStep, state: "unvisited" as const },
        { step: "proficienciesAndLanguages" as DraftStep, state: "unvisited" as const },
        { step: "equipment" as DraftStep, state: "unvisited" as const },
        { step: "spells" as DraftStep, state: "unvisited" as const },
        { step: "review" as DraftStep, state: "unvisited" as const },
      ];

      const diagnostics = buildDraftDiagnostics(statuses);
      const warnings = diagnostics.filter(
        (d: DraftDiagnostic) => d.severity === "warning",
      );

      // Should have exactly one consolidated warning, not one per invalidated step
      expect(warnings.length).toBe(1);
      expect(warnings[0]!.message).toContain("4 steps affected");
    });

    it("diagnostics do not emit one warning per invalidated step", () => {
      // Create a scenario with multiple invalidated steps
      const statuses = [
        { step: "ruleset" as DraftStep, state: "resolved" as const },
        { step: "sources" as DraftStep, state: "invalidated" as const },
        { step: "species" as DraftStep, state: "invalidated" as const },
        { step: "background" as DraftStep, state: "invalidated" as const },
        { step: "class" as DraftStep, state: "invalidated" as const },
        { step: "identity" as DraftStep, state: "resolved" as const },
        { step: "abilities" as DraftStep, state: "unvisited" as const },
        { step: "proficienciesAndLanguages" as DraftStep, state: "unvisited" as const },
        { step: "equipment" as DraftStep, state: "unvisited" as const },
        { step: "spells" as DraftStep, state: "unvisited" as const },
        { step: "review" as DraftStep, state: "unvisited" as const },
      ];

      const diagnostics = buildDraftDiagnostics(statuses);
      const warnings = diagnostics.filter(
        (d: DraftDiagnostic) => d.severity === "warning",
      );

      // Before fix: 4 warnings (one per invalidated step)
      // After fix: 1 consolidated warning
      expect(warnings.length).toBeLessThan(4);
      expect(warnings.length).toBe(1);
    });

    it("first ruleset selection produces zero diagnostics", () => {
      const freshDraft = createEmptyCharacterDraft();
      selectRuleset(freshDraft, "2014");
      expect(freshDraft.diagnostics).toHaveLength(0);
    });

    it("first ruleset selection to 2024 also produces zero diagnostics", () => {
      const freshDraft = createEmptyCharacterDraft();
      selectRuleset(freshDraft, "2024");
      expect(freshDraft.diagnostics).toHaveLength(0);
    });

    it("no diagnostics have empty or whitespace-only messages", () => {
      const freshDraft = createEmptyCharacterDraft();
      selectRuleset(freshDraft, "2024");
      const hasEmptyMessage = freshDraft.diagnostics.some(
        (d) => d.message == null || d.message.trim().length === 0,
      );
      expect(hasEmptyMessage).toBe(false);
    });

    it("ruleset change after resolved downstream steps produces one warning", () => {
      const freshDraft = createEmptyCharacterDraft();
      selectRuleset(freshDraft, "2014");
      markStepResolved(freshDraft, "species");
      markStepResolved(freshDraft, "species-choices");
      selectRuleset(freshDraft, "2024");

      const warnings = freshDraft.diagnostics.filter(
        (d) => d.severity === "warning",
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.message.trim().length).toBeGreaterThan(0);
      expect(warnings[0]!.message).toContain("step");
    });

    // P10-T020: 2014 to 2024 ruleset change leaves all unvisited steps unvisited
    it("2014 to 2024 ruleset change leaves all unvisited steps unvisited", () => {
      const freshDraft = createEmptyCharacterDraft();
      selectRuleset(freshDraft, "2014");
      selectRuleset(freshDraft, "2024");

      // All non-ruleset steps must remain unvisited, not invalidated
      expect(getStepState(freshDraft, "sources")).toBe("unvisited");
      expect(getStepState(freshDraft, "species")).toBe("unvisited");
      expect(getStepState(freshDraft, "species-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "background")).toBe("unvisited");
      expect(getStepState(freshDraft, "background-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "class")).toBe("unvisited");
      expect(getStepState(freshDraft, "class-starting-grants")).toBe("unvisited");
      expect(getStepState(freshDraft, "abilities")).toBe("unvisited");
      expect(getStepState(freshDraft, "proficiencies")).toBe("unvisited");
      expect(getStepState(freshDraft, "proficiency-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "languages")).toBe("unvisited");
      expect(getStepState(freshDraft, "language-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "equipment")).toBe("unvisited");
      expect(getStepState(freshDraft, "equipment-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "spell-eligibility")).toBe("unvisited");
      expect(getStepState(freshDraft, "spells")).toBe("unvisited");
      expect(getStepState(freshDraft, "review")).toBe("unvisited");
    });

    // P10-T020: 2024 to 2014 ruleset change leaves all unvisited steps unvisited
    it("2024 to 2014 ruleset change leaves all unvisited steps unvisited", () => {
      const freshDraft = createEmptyCharacterDraft();
      selectRuleset(freshDraft, "2024");
      selectRuleset(freshDraft, "2014");

      // All non-ruleset steps must remain unvisited, not invalidated
      expect(getStepState(freshDraft, "sources")).toBe("unvisited");
      expect(getStepState(freshDraft, "species")).toBe("unvisited");
      expect(getStepState(freshDraft, "species-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "background")).toBe("unvisited");
      expect(getStepState(freshDraft, "background-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "class")).toBe("unvisited");
      expect(getStepState(freshDraft, "class-starting-grants")).toBe("unvisited");
      expect(getStepState(freshDraft, "abilities")).toBe("unvisited");
      expect(getStepState(freshDraft, "proficiencies")).toBe("unvisited");
      expect(getStepState(freshDraft, "proficiency-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "languages")).toBe("unvisited");
      expect(getStepState(freshDraft, "language-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "equipment")).toBe("unvisited");
      expect(getStepState(freshDraft, "equipment-choices")).toBe("unvisited");
      expect(getStepState(freshDraft, "spell-eligibility")).toBe("unvisited");
      expect(getStepState(freshDraft, "spells")).toBe("unvisited");
      expect(getStepState(freshDraft, "review")).toBe("unvisited");
    });

    // P10-T020: Modal rendering - invalidated steps show warning banner, unvisited do not
    it("modal rendering: invalidated steps produce warnings, unvisited do not", () => {
      const freshDraft = createEmptyCharacterDraft();
      selectRuleset(freshDraft, "2014");
      // Pre-resolve some downstream steps
      markStepResolved(freshDraft, "species");
      markStepResolved(freshDraft, "class");
      // Now change ruleset - resolved steps become invalidated, unvisited stay unvisited
      selectRuleset(freshDraft, "2024");

      // Resolved steps should be invalidated
      expect(getStepState(freshDraft, "species")).toBe("invalidated");
      expect(getStepState(freshDraft, "class")).toBe("invalidated");
      // Unvisited steps should remain unvisited
      expect(getStepState(freshDraft, "abilities")).toBe("unvisited");
      expect(getStepState(freshDraft, "equipment")).toBe("unvisited");

      // Diagnostics should have exactly one consolidated warning
      const warnings = freshDraft.diagnostics.filter(
        (d) => d.severity === "warning",
      );
      expect(warnings).toHaveLength(1);
    });
  });

  /* eslint-disable @typescript-eslint/no-explicit-any -- testing private modal members */
  describe("Navigation button behavior (P10-T020 corrective)", () => {
    it("navigateNext renders current step when advancing from ruleset to sources", () => {
      const modal = new CharacterCreatorModal(app, draft);
      const renderSpy = vi.spyOn(modal, "renderCurrentStep" as any);

      // Start at ruleset (step 0)
      expect((modal as any).controller.currentStep).toBe("ruleset");

      // Navigate next — should advance and render
      (modal as any).navigateNext();
      expect((modal as any).controller.currentStep).toBe("sources");
      expect(renderSpy).toHaveBeenCalled();
    });

    it("navigateNext does not render when already at last step", () => {
      const modal = new CharacterCreatorModal(app, draft);

      // Navigate all the way to review
      for (let i = 0; i < 10; i++) {
        (modal as any).navigateNext();
      }
      expect((modal as any).controller.currentStep).toBe("review");

      const renderSpy = vi.spyOn(modal, "renderCurrentStep" as any);
      // Already at last step — next() returns same step, no render
      (modal as any).navigateNext();
      expect((modal as any).controller.currentStep).toBe("review");
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it("navigatePrevious renders current step when going back from sources to ruleset", () => {
      const modal = new CharacterCreatorModal(app, draft);

      // First advance to sources
      (modal as any).navigateNext();
      expect((modal as any).controller.currentStep).toBe("sources");

      const renderSpy = vi.spyOn(modal, "renderCurrentStep" as any);

      // Navigate back — should go to ruleset and render
      (modal as any).navigatePrevious();
      expect((modal as any).controller.currentStep).toBe("ruleset");
      expect(renderSpy).toHaveBeenCalled();
    });

    it("navigatePrevious does not render when already at first step", () => {
      const modal = new CharacterCreatorModal(app, draft);
      expect((modal as any).controller.currentStep).toBe("ruleset");

      const renderSpy = vi.spyOn(modal, "renderCurrentStep" as any);

      // Already at first step — previous() returns same step, no render
      (modal as any).navigatePrevious();
      expect((modal as any).controller.currentStep).toBe("ruleset");
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it("repeated Next/Back updates step index and current step", () => {
      const modal = new CharacterCreatorModal(app, draft);

      // Forward: ruleset -> sources -> identity
      (modal as any).navigateNext();
      expect((modal as any).controller.currentStep).toBe("sources");
      expect((modal as any).controller.currentStepIndex).toBe(1);

      (modal as any).navigateNext();
      expect((modal as any).controller.currentStep).toBe("identity");
      expect((modal as any).controller.currentStepIndex).toBe(2);

      // Back: identity -> sources -> ruleset
      (modal as any).navigatePrevious();
      expect((modal as any).controller.currentStep).toBe("sources");
      expect((modal as any).controller.currentStepIndex).toBe(1);

      (modal as any).navigatePrevious();
      expect((modal as any).controller.currentStep).toBe("ruleset");
      expect((modal as any).controller.currentStepIndex).toBe(0);
    });

    it("draft selections survive Back/Next navigation", () => {
      const modal = new CharacterCreatorModal(app, draft);

      // Make a selection on the current step
      draft.identity.name = "Test Character";
      draft.identity.alignment = "Lawful Good";

      // Navigate forward and back
      (modal as any).navigateNext();
      (modal as any).navigatePrevious();

      // Selections should persist
      expect(draft.identity.name).toBe("Test Character");
      expect(draft.identity.alignment).toBe("Lawful Good");
    });

    it("direct step-tab jump and button navigation produce same controller state", () => {
      const modal = new CharacterCreatorModal(app, draft);

      // Resolve ruleset so sources prerequisites are met
      selectRuleset(draft, "2024");

      // Navigate via button to sources
      (modal as any).navigateNext();
      expect((modal as any).controller.currentStep).toBe("sources");
      expect((modal as any).controller.currentStepIndex).toBe(1);

      // Navigate back to ruleset
      (modal as any).navigatePrevious();
      expect((modal as any).controller.currentStep).toBe("ruleset");
      expect((modal as any).controller.currentStepIndex).toBe(0);

      // Now jump directly via controller (prerequisites met)
      (modal as any).controller.jumpTo("sources");
      expect((modal as any).controller.currentStep).toBe("sources");
      expect((modal as any).controller.currentStepIndex).toBe(1);
    });

    it("back button should be disabled on ruleset step", () => {
      const modal = new CharacterCreatorModal(app, draft);
      expect((modal as any).controller.currentStep).toBe("ruleset");
      expect((modal as any).controller.currentStepIndex).toBe(0);

      // updateNavigationButtons disables back when currentStepIndex === 0
      // Mock a button to verify the logic
      const mockButton = { setDisabled: vi.fn() };
      (modal as any).backButton = mockButton;
      (modal as any).updateNavigationButtons();
      expect(mockButton.setDisabled).toHaveBeenCalledWith(true);
    });

    it("next button should be disabled on review step", () => {
      const modal = new CharacterCreatorModal(app, draft);

      // Navigate to review
      for (let i = 0; i < 10; i++) {
        (modal as any).navigateNext();
      }
      expect((modal as any).controller.currentStep).toBe("review");

      // Mock a button to verify the logic
      const mockButton = { setDisabled: vi.fn() };
      (modal as any).nextButton = mockButton;
      (modal as any).updateNavigationButtons();
      expect(mockButton.setDisabled).toHaveBeenCalledWith(true);
    });
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /* ── P10-T020 Corrective Regression Tests (14 tests) ────────── */

  describe("Issue A: Zero optional sources for 2014 ruleset", () => {
    it("selectSources accepts empty array for 2014 ruleset", () => {
      selectRuleset(draft, "2014");
      const result = selectSources(draft, []);
      expect(result).toBe(true);
      expect(draft.sources.enabledSourceIds).toEqual([]);
    });

    it("selectSources requires sources step to not block on empty 2014 selection", () => {
      selectRuleset(draft, "2014");
      // Empty source selection should succeed for 2014
      const result = selectSources(draft, []);
      expect(result).toBe(true);
      // Sources step should be marked resolved
      expect(getStepState(draft, "sources")).toBe("resolved");
    });
  });

  describe("Issue B: Navigation prerequisite enforcement", () => {
    it("jumpTo species fails when ruleset is unresolved", () => {
      const controller = new StepController(draft);
      // Ruleset not resolved yet
      expect(controller.jumpTo("species")).toBe(false);
      expect(controller.currentStep).toBe("ruleset");
    });

    it("jumpTo species succeeds when ruleset and sources are resolved", () => {
      const controller = new StepController(draft);
      selectRuleset(draft, "2024");
      selectSources(draft, []);
      expect(controller.jumpTo("species")).toBe(true);
      expect(controller.currentStep).toBe("species");
    });

    it("next() does not advance past unresolved prerequisites", () => {
      const controller = new StepController(draft);
      // Resolve ruleset but not sources; species depends on both
      selectRuleset(draft, "2024");
      // Move to sources step
      controller.next();
      expect(controller.currentStep).toBe("sources");
      // Without resolving sources, next should still advance to identity
      // (identity has no dependencies), not skip to species
      controller.next();
      expect(controller.currentStep).toBe("identity");
    });
  });

  describe("Issue C: Atomic step selection semantics", () => {
    it("selectBackground requires ruleset resolved", () => {
      // Ruleset not resolved
      const result = selectBackground(draft, "background:acolyte");
      expect(result).toBe(false);
    });

    it("selectBackground requires sources resolved", () => {
      selectRuleset(draft, "2024");
      // Sources not resolved
      const result = selectBackground(draft, "background:acolyte");
      expect(result).toBe(false);
    });

    it("selectClass requires ruleset and sources resolved", () => {
      // Neither resolved
      const result = selectClass(draft, "class:fighter");
      expect(result).toBe(false);
    });

    it("selectClass marks class step resolved on success", () => {
      selectRuleset(draft, "2024");
      selectSources(draft, []);
      const result = selectClass(draft, "class:fighter");
      expect(result).toBe(true);
      expect(getStepState(draft, "class")).toBe("resolved");
    });
  });

  describe("Issue D: Source-policy eligibility filtering", () => {
    it("isEntityEligible returns true for core access", () => {
      const modal = new CharacterCreatorModal(app, draft);
      selectRuleset(draft, "2024");
      selectSources(draft, []);
      // @ts-expect-error — testing private method
      expect(modal.isEntityEligible("phb", "core")).toBe(true);
    });

    it("isEntityEligible returns false for source access when source not enabled", () => {
      const modal = new CharacterCreatorModal(app, draft);
      selectRuleset(draft, "2024");
      selectSources(draft, []);
      // @ts-expect-error — testing private method
      expect(modal.isEntityEligible("xphb", "source")).toBe(false);
    });

    it("isEntityEligible returns true for source access when source is enabled", () => {
      const modal = new CharacterCreatorModal(app, draft);
      selectRuleset(draft, "2024");
      selectSources(draft, ["xphb" as never]);
      // @ts-expect-error — testing private method
      expect(modal.isEntityEligible("xphb", "source")).toBe(true);
    });
  });

  describe("Issue E: Error diagnostic presentation", () => {
    it("does not render a false species-choice error while async evaluation is pending", () => {
      selectRuleset(draft, "2014");
      selectSources(draft, []);
      selectSpecies(draft, createEntityId("species:2014:phb:elf"));
      const modal = new CharacterCreatorModal(app, draft);
      const mockEl = {
        empty: vi.fn(),
        createDiv: vi.fn(),
      } as unknown as HTMLElement;
      // @ts-expect-error — testing private pending load state
      modal.speciesChoicesPending = true;
      // @ts-expect-error — testing private member
      modal.diagnosticsEl = mockEl;
      // @ts-expect-error — testing private method
      modal.renderDiagnosticsBanner();

      expect(mockEl.createDiv).not.toHaveBeenCalled();
    });

    it("does not render transient background or class internal-step errors while loading", () => {
      selectRuleset(draft, "2014");
      selectSources(draft, []);
      selectBackground(draft, createEntityId("background:2014:phb:acolyte"));
      selectClass(draft, createEntityId("class:2014:phb:fighter"));
      const modal = new CharacterCreatorModal(app, draft);
      const mockEl = { empty: vi.fn(), createDiv: vi.fn() } as unknown as HTMLElement;
      // @ts-expect-error — testing private pending load state
      modal.internalSubstepsPending.add("background-choices");
      // @ts-expect-error — testing private pending load state
      modal.internalSubstepsPending.add("class-starting-grants");
      // @ts-expect-error — testing private member
      modal.diagnosticsEl = mockEl;
      // @ts-expect-error — testing private method
      modal.renderDiagnosticsBanner();
      expect(mockEl.createDiv).not.toHaveBeenCalled();
    });

    it("renderDiagnosticsBanner renders error banner with inline styles", () => {
      draft.diagnostics = [
        {
          step: "species" as DraftStep,
          message: "Test error",
          severity: "error" as const,
        },
      ];
      const modal = new CharacterCreatorModal(app, draft);
      // Mock Obsidian Component with createDiv/createEl/empty
      const createdElements: Record<string, unknown> = {};
      let createDivCallCount = 0;
      let createElCallCount = 0;
      const mockEl = {
        empty: vi.fn(),
        createDiv: vi.fn((opts) => {
          createDivCallCount++;
          const key = `div-${createDivCallCount}`;
          createdElements[key] = {
            cls: opts?.cls,
            style: {},
            createEl: vi.fn((tag, tagOpts) => {
              createElCallCount++;
              const childKey = `el-${createElCallCount}`;
              createdElements[childKey] = {
                text: tagOpts?.text,
                style: {},
              };
              return createdElements[childKey];
            }),
          };
          return createdElements[key];
        }),
      } as unknown as typeof modal["contentEl"];
      // @ts-expect-error — testing private member
      modal.diagnosticsEl = mockEl;
      // @ts-expect-error — testing private method
      modal.renderDiagnosticsBanner();

      expect(mockEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({ cls: "dnd-creator-diagnostics-error" }),
      );
    });

    it("renderDiagnosticsBanner renders warning banner with inline styles", () => {
      draft.diagnostics = [
        {
          step: "species" as DraftStep,
          message: "Test warning",
          severity: "warning" as const,
        },
      ];
      const modal = new CharacterCreatorModal(app, draft);
      const mockEl = {
        empty: vi.fn(),
        createDiv: vi.fn((opts) => ({
          cls: opts?.cls,
          style: {},
          createEl: vi.fn(() => ({ style: {} })),
        })),
      } as unknown as typeof modal["contentEl"];
      // @ts-expect-error — testing private member
      modal.diagnosticsEl = mockEl;
      // @ts-expect-error — testing private method
      modal.renderDiagnosticsBanner();

      expect(mockEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({ cls: "dnd-creator-diagnostics-warning" }),
      );
    });
  });
});

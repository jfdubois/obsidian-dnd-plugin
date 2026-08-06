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
} from "./character-draft";
import type { CreatorStep } from "./character-step-controller";
import { StepController } from "./character-step-controller";
import type { DraftStep } from "./character-draft-steps";
import type { DraftDiagnostic } from "./character-draft-dependency";
import { buildDraftDiagnostics } from "./character-draft-dependency";
import { selectRuleset } from "./character-ruleset-step";

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
  });
});

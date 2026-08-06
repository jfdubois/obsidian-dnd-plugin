/* ── Character creator modal: Obsidian UI host ───────────────────
   Hosts the 11-step character creation workflow defined in CRE-012.
   Renders step content, navigation, progress, diagnostics, and
   review screen. Uses only approved Obsidian APIs.               */

import type { App } from "obsidian";
import { Modal as ObsidianModal, ButtonComponent, Setting } from "obsidian";

import type { CharacterDraft } from "./character-draft";
import { isDraftComplete, hasErrors } from "./character-draft";
import type { CreatorStep } from "./character-step-controller";
import { StepController, CREATOR_STEPS } from "./character-step-controller";
import type { ReviewSnapshot } from "./character-review-snapshot";
import { buildReviewSnapshot } from "./character-review-snapshot";
import { finalizeCharacter } from "./character-finalize";

/* ── Modal factory ─────────────────────────────────────────────── */

/**
 * Opens a character creator modal bound to the given draft.
 * Returns the modal instance for programmatic control.
 */
export function openCharacterCreatorModal(
  app: App,
  draft: CharacterDraft,
): CharacterCreatorModal {
  const modal = new CharacterCreatorModal(app, draft);
  modal.open();
  return modal;
}

/* ── Step display names ────────────────────────────────────────── */

const STEP_LABELS: ReadonlyMap<CreatorStep, string> = new Map([
  ["ruleset", "Ruleset"],
  ["sources", "Sources"],
  ["identity", "Identity"],
  ["species", "Species"],
  ["background", "Background"],
  ["class", "Class"],
  ["abilities", "Ability Scores"],
  ["proficienciesAndLanguages", "Proficiencies & Languages"],
  ["equipment", "Equipment"],
  ["spells", "Spells"],
  ["review", "Review"],
]);

function getStepLabel(step: CreatorStep): string {
  return STEP_LABELS.get(step) ?? step;
}

/* ── Modal class ───────────────────────────────────────────────── */

export class CharacterCreatorModal extends ObsidianModal {
  private readonly controller: StepController;
  private saveButton: ButtonComponent | null = null;
  private nextButton: ButtonComponent | null = null;
  private backButton: ButtonComponent | null = null;
  private stepContentEl: HTMLElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private diagnosticsEl: HTMLElement | null = null;

  constructor(app: App, draft: CharacterDraft) {
    super(app);
    this.controller = new StepController(draft);
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  onOpen(): void {
    this.titleEl.setText("Create Character");
    this.buildLayout();
    this.renderCurrentStep();
    this.registerKeyboardShortcuts();
  }

  onClose(): void {
    this.stepContentEl?.empty();
    this.progressBarEl?.empty();
    this.diagnosticsEl?.empty();
    this.stepContentEl = null;
    this.progressBarEl = null;
    this.diagnosticsEl = null;
  }

  /* ── Keyboard shortcuts ────────────────────────────────────── */

  private registerKeyboardShortcuts(): void {
    // Escape closes the modal
    this.scope.register([], "Escape", () => {
      this.close();
    });
  }

  /* ── Layout construction ───────────────────────────────────── */

  private buildLayout(): void {
    const content = this.contentEl;
    content.empty();
    content.addClass("dnd-character-creator-modal");

    // Progress bar
    this.progressBarEl = content.createDiv({
      cls: "dnd-creator-progress",
    });

    // Diagnostics banner
    this.diagnosticsEl = content.createDiv({
      cls: "dnd-creator-diagnostics",
    });

    // Step content area
    this.stepContentEl = content.createDiv({
      cls: "dnd-creator-step-content",
    });

    // Navigation footer
    const footer = content.createDiv({
      cls: "dnd-creator-footer",
    });
    this.buildNavigation(footer);
  }

  private buildNavigation(container: HTMLElement): void {
    const navSetting = new Setting(container);
    navSetting.clear();

    // Back button
    this.backButton = new ButtonComponent(container)
      .setButtonText("Back")
      .onClick(() => this.navigatePrevious());

    // Spacer
    container.createSpan({ cls: "dnd-creator-nav-spacer" });

    // Next button
    this.nextButton = new ButtonComponent(container)
      .setButtonText("Next")
      .onClick(() => this.navigateNext());

    // Save button (initially disabled)
    this.saveButton = new ButtonComponent(container)
      .setButtonText("Save Character")
      .setCta()
      .setDisabled(true)
      .onClick(() => this.handleSave());
  }

  /* ── Progress bar ──────────────────────────────────────────── */

  private renderProgressBar(): void {
    if (!this.progressBarEl) return;
    this.progressBarEl.empty();

    const currentStep = this.controller.currentStep;
    const currentIndex = this.controller.currentStepIndex;
    const totalSteps = this.controller.totalSteps;

    // Progress text
    const progressText = this.progressBarEl.createDiv({
      cls: "dnd-creator-progress-text",
    });
    progressText.setText(
      `Step ${currentIndex + 1} of ${totalSteps}: ${getStepLabel(currentStep)}`,
    );

    // Step indicators
    const indicators = this.progressBarEl.createDiv({
      cls: "dnd-creator-step-indicators",
    });

    for (let i = 0; i < CREATOR_STEPS.length; i++) {
      const step = CREATOR_STEPS[i];
      if (step === undefined) continue;
      const dot = indicators.createSpan({
        cls: "dnd-creator-step-dot",
      });

      if (i === currentIndex) {
        dot.addClass("dnd-creator-step-dot-active");
      } else if (this.controller.isStepResolved(step)) {
        dot.addClass("dnd-creator-step-dot-resolved");
      }

      dot.setText(getStepLabel(step));
      dot.onClickEvent(() => {
        if (this.controller.canNavigateTo(step)) {
          this.controller.jumpTo(step);
          this.renderCurrentStep();
        }
      });
    }
  }

  /* ── Diagnostics banner ────────────────────────────────────── */

  private renderDiagnosticsBanner(): void {
    if (!this.diagnosticsEl) return;
    this.diagnosticsEl.empty();

    const diagnostics = this.controller.draft.diagnostics;
    if (diagnostics.length === 0) return;

    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warning");

    if (errors.length > 0) {
      const errorBanner = this.diagnosticsEl.createDiv({
        cls: "dnd-creator-diagnostics-error",
      });
      errorBanner.createEl("strong", { text: "Errors:" });
      for (const diag of errors) {
        errorBanner.createEl("div", {
          cls: "dnd-creator-diagnostic-item",
          text: diag.message,
        });
      }
    }

    if (warnings.length > 0) {
      const warningBanner = this.diagnosticsEl.createDiv({
        cls: "dnd-creator-diagnostics-warning",
      });
      warningBanner.createEl("strong", { text: "Warnings:" });
      for (const diag of warnings) {
        warningBanner.createEl("div", {
          cls: "dnd-creator-diagnostic-item",
          text: diag.message,
        });
      }
    }
  }

  /* ── Step rendering ────────────────────────────────────────── */

  private renderCurrentStep(): void {
    if (!this.stepContentEl) return;
    this.stepContentEl.empty();

    const currentStep = this.controller.currentStep;

    this.renderProgressBar();
    this.renderDiagnosticsBanner();

    if (currentStep === "review") {
      this.renderReviewStep();
    } else {
      this.renderStepContent(currentStep);
    }

    this.updateNavigationButtons();
  }

  private renderStepContent(step: CreatorStep): void {
    if (!this.stepContentEl) return;

    const heading = this.stepContentEl.createEl("h2", {
      text: getStepLabel(step),
    });
    heading.addClass("dnd-creator-step-heading");

    const body = this.stepContentEl.createDiv({
      cls: "dnd-creator-step-body",
    });

    // Render step-specific content based on step type
    switch (step) {
      case "ruleset":
        this.renderRulesetStep(body);
        break;
      case "identity":
        this.renderIdentityStep(body);
        break;
      default:
        this.renderPlaceholderStep(body, step);
        break;
    }
  }

  private renderRulesetStep(container: HTMLElement): void {
    const draft = this.controller.draft;
    const rulesetOptions: ReadonlyArray<string> = ["2014", "2024"];

    for (const ruleset of rulesetOptions) {
      const radioSetting = new Setting(container);
      radioSetting.setName(ruleset);
      radioSetting.setDesc(
        ruleset === "2024"
          ? "2024 One D&D playtest rules"
          : "2014 5th Edition rules",
      );

      const isSelected = draft.ruleset.ruleset === ruleset;
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "ruleset";
      radio.value = ruleset;
      radio.checked = isSelected;
      radio.setAttribute("aria-label", `Select ${ruleset} ruleset`);

      radio.addEventListener("change", () => {
        draft.ruleset.ruleset = ruleset as "2014" | "2024" | null;
        this.controller.markCurrentStepResolved();
        this.controller.invalidateCurrentDependents();
        this.renderCurrentStep();
      });

      radioSetting.controlEl.appendChild(radio);
    }
  }

  private renderIdentityStep(container: HTMLElement): void {
    const draft = this.controller.draft;

    new Setting(container)
      .setName("Character Name")
      .setDesc("Enter your character's name.")
      .addText((text) => {
        text.setPlaceholder("Character name")
          .setValue(draft.identity.name)
          .onChange((value) => {
            draft.identity.name = value;
            if (value.length > 0) {
              this.controller.markCurrentStepResolved();
            }
          });
      });

    new Setting(container)
      .setName("Player Name")
      .setDesc("Your name as the player.")
      .addText((text) => {
        text.setPlaceholder("Player name")
          .setValue(draft.identity.playerName ?? "")
          .onChange((value) => {
            draft.identity.playerName = value;
          });
      });

    new Setting(container)
      .setName("Pronouns")
      .setDesc("Character pronouns (optional).")
      .addText((text) => {
        text.setPlaceholder("he/him, she/her, they/them")
          .setValue(draft.identity.pronouns ?? "")
          .onChange((value) => {
            draft.identity.pronouns = value;
          });
      });

    new Setting(container)
      .setName("Alignment")
      .setDesc("Character alignment (optional).")
      .addText((text) => {
        text.setPlaceholder("Lawful Good, Chaotic Neutral, etc.")
          .setValue(draft.identity.alignment ?? "")
          .onChange((value) => {
            draft.identity.alignment = value;
          });
      });
  }

  private renderPlaceholderStep(container: HTMLElement, step: CreatorStep): void {
    const info = container.createDiv({
      cls: "dnd-creator-step-placeholder",
    });
    info.createEl("p", {
      text: `The ${getStepLabel(step)} step content will be implemented in a future task.`,
    });

    // Allow marking the step as resolved for navigation testing
    const markBtn = new ButtonComponent(container);
    markBtn.setButtonText("Mark as resolved (testing)")
      .setClass("dnd-creator-mark-resolved")
      .onClick(() => {
        this.controller.markCurrentStepResolved();
        this.renderCurrentStep();
      });
  }

  /* ── Review step ───────────────────────────────────────────── */

  private renderReviewStep(): void {
    if (!this.stepContentEl) return;

    const snapshot = buildReviewSnapshot(this.controller.draft);

    const heading = this.stepContentEl.createEl("h2", {
      text: "Review Character",
    });
    heading.addClass("dnd-creator-step-heading");

    if (!snapshot) {
      this.stepContentEl.createEl("p", {
        text: "Cannot display review: draft is not complete.",
      });
      return;
    }

    this.renderReviewSection(snapshot);
  }

  private renderReviewSection(snapshot: ReviewSnapshot): void {
    if (!this.stepContentEl) return;

    const sections: ReadonlyArray<{
      title: string;
      render: () => string;
    }> = [
      {
        title: "Ruleset",
        render: () => snapshot.ruleset.ruleset ?? "Not selected",
      },
      {
        title: "Identity",
        render: () => {
          const parts: string[] = [];
          if (snapshot.identity.name) parts.push(snapshot.identity.name);
          if (snapshot.identity.playerName)
            parts.push(`(${snapshot.identity.playerName})`);
          if (snapshot.identity.pronouns)
            parts.push(`[${snapshot.identity.pronouns}]`);
          if (snapshot.identity.alignment)
            parts.push(snapshot.identity.alignment);
          return parts.length > 0 ? parts.join(" ") : "Not set";
        },
      },
      {
        title: "Species",
        render: () => snapshot.species.speciesId ?? "Not selected",
      },
      {
        title: "Background",
        render: () => snapshot.background.backgroundId ?? "Not selected",
      },
      {
        title: "Class",
        render: () => {
          const parts: string[] = [];
          if (snapshot.class.classId) parts.push(snapshot.class.classId);
          if (snapshot.class.subclassId)
            parts.push(`(${snapshot.class.subclassId})`);
          return parts.length > 0 ? parts.join(" ") : "Not selected";
        },
      },
      {
        title: "Ability Scores",
        render: () => {
          if (!snapshot.abilities.scores) return "Not set";
          const entries = Object.entries(snapshot.abilities.scores);
          return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
        },
      },
      {
        title: "Proficiencies",
        render: () => {
          const skills = snapshot.proficiencies.skillProficiencies;
          const tools = snapshot.proficiencies.toolProficiencies;
          const all = [...skills, ...tools];
          if (all.length === 0) return "None selected";
          return all.join(", ");
        },
      },
      {
        title: "Languages",
        render: () => {
          if (snapshot.languages.languageIds.length === 0)
            return "None selected";
          return snapshot.languages.languageIds.join(", ");
        },
      },
      {
        title: "Equipment",
        render: () => {
          if (snapshot.equipment.items.length === 0)
            return "None selected";
          return snapshot.equipment.items.join(", ");
        },
      },
      {
        title: "Spell Eligibility",
        render: () =>
          snapshot.spellEligibility.isSpellcaster === true
            ? "Spellcaster"
            : "Non-spellcaster",
      },
      {
        title: "Spells",
        render: () => {
          if (snapshot.spells.selections.length === 0)
            return "No spells selected";
          return snapshot.spells.selections.join(", ");
        },
      },
    ];

    for (const section of sections) {
      const row = this.stepContentEl.createDiv({
        cls: "dnd-creator-review-row",
      });
      row.createEl("strong", {
        cls: "dnd-creator-review-label",
        text: section.title + ":",
      });
      row.createSpan({
        cls: "dnd-creator-review-value",
        text: section.render(),
      });
    }
  }

  /* ── Navigation ────────────────────────────────────────────── */

  private navigateNext(): void {
    const nextStep = this.controller.next();
    if (nextStep !== this.controller.currentStep) {
      this.renderCurrentStep();
    }
  }

  private navigatePrevious(): void {
    const prevStep = this.controller.previous();
    if (prevStep !== this.controller.currentStep) {
      this.renderCurrentStep();
    }
  }

  private updateNavigationButtons(): void {
    const currentStep = this.controller.currentStep;
    const currentIndex = this.controller.currentStepIndex;

    // Back button: disabled on first step
    if (this.backButton) {
      this.backButton.setDisabled(currentIndex === 0);
    }

    // Next button: disabled on last step (review)
    if (this.nextButton) {
      const isLastStep = currentStep === "review";
      this.nextButton.setDisabled(isLastStep);
    }

    // Save button: enabled only on review step when draft is complete
    if (this.saveButton) {
      const canSave =
        currentStep === "review" &&
        isDraftComplete(this.controller.draft) &&
        !hasErrors(this.controller.draft);
      this.saveButton.setDisabled(!canSave);
    }
  }

  /* ── Save handler ──────────────────────────────────────────── */

  private async handleSave(): Promise<void> {
    const draft = this.controller.draft;

    // Gate: draft must be complete
    if (!isDraftComplete(draft)) {
      return;
    }

    // Gate: no errors
    if (hasErrors(draft)) {
      return;
    }

    const character = finalizeCharacter(draft);
    if (character === null) {
      // Finalize failed — draft incomplete or missing required fields
      return;
    }

    // Success: close the modal
    this.close();
  }
}

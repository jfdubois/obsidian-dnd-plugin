/* ── Character creator modal: Obsidian UI host ───────────────────
   Hosts the 11-step character creation workflow defined in CRE-012.
   Renders step content, navigation, progress, diagnostics, and
   review screen. Uses only approved Obsidian APIs.               */

import type { App } from "obsidian";
import {
  Modal as ObsidianModal,
  ButtonComponent,
  Setting,
  type TextComponent,
} from "obsidian";

import type { Character } from "@obsidian-dnd/character-contract";
import type { CharacterDraft } from "./character-draft";
import { isDraftComplete, hasErrors } from "./character-draft";
import type { CreatorStep } from "./character-step-controller";
import { StepController, CREATOR_STEPS } from "./character-step-controller";
import type { ReviewSnapshot } from "./character-review-snapshot";
import { buildReviewSnapshot } from "./character-review-snapshot";
import { finalizeCharacter } from "./character-finalize";
import type { Ability } from "@obsidian-dnd/domain";
import { createEntityId } from "@obsidian-dnd/domain";
import { selectRuleset } from "./character-ruleset-step";
import type { CatalogService } from "./catalog/catalog-service";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { selectBackground } from "./character-background-step";
import { selectClass } from "./character-class-step";
import { selectAbilityScores } from "./character-ability-scores-step";
import {
  selectProficiencies,
  selectLanguages,
} from "./character-proficiencies-step";
import { querySpellEligibility } from "./character-spell-eligibility-step";
import { selectSpells } from "./character-spell-selection-step";

/* ── Persistence callback ─────────────────────────────────────── */

/**
 * Optional callback invoked by the modal after the draft is
 * finalized into a Character. The runtime provides this callback
 * to wire the modal's save action to vault persistence.
 */
export type CharacterPersistenceCallback = (
  character: Character,
) => Promise<void>;

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
  private readonly persist: CharacterPersistenceCallback | undefined;
  private readonly catalogService: CatalogService | null;
  private saveButton: ButtonComponent | null = null;
  private nextButton: ButtonComponent | null = null;
  private backButton: ButtonComponent | null = null;
  private stepContentEl: HTMLElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private diagnosticsEl: HTMLElement | null = null;

  constructor(
    app: App,
    draft: CharacterDraft,
    persist?: CharacterPersistenceCallback,
    catalogService: CatalogService | null = null,
  ) {
    super(app);
    this.controller = new StepController(draft);
    this.persist = persist;
    this.catalogService = catalogService;
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

    const diagnostics = this.controller.draft.diagnostics.filter(
      (d) => d.message != null && d.message.trim().length > 0,
    );
    if (diagnostics.length === 0) return;

    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warning");

    if (errors.length > 0) {
      const errorBanner = this.diagnosticsEl.createDiv({
        cls: "dnd-creator-diagnostics-error",
      });
      errorBanner.style.borderLeft = "3px solid var(--text-error)";
      errorBanner.style.backgroundColor = "var(--background-secondary)";
      errorBanner.style.padding = "8px 12px";
      errorBanner.style.marginBottom = "8px";
      errorBanner.style.borderRadius = "4px";
      const errorTitle = errorBanner.createEl("strong", { text: "Errors:" });
      errorTitle.style.color = "var(--text-error)";
      errorTitle.style.display = "block";
      errorTitle.style.marginBottom = "4px";
      for (const diag of errors) {
        const item = errorBanner.createEl("div", {
          cls: "dnd-creator-diagnostic-item",
          text: diag.message,
        });
        item.style.color = "var(--text-error)";
        item.style.fontSize = "0.85em";
        item.style.paddingLeft = "4px";
      }
    }

    if (warnings.length > 0) {
      const warningBanner = this.diagnosticsEl.createDiv({
        cls: "dnd-creator-diagnostics-warning",
      });
      warningBanner.style.borderLeft = "3px solid var(--text-warning)";
      warningBanner.style.backgroundColor = "var(--background-secondary)";
      warningBanner.style.padding = "8px 12px";
      warningBanner.style.marginBottom = "8px";
      warningBanner.style.borderRadius = "4px";
      const warningTitle = warningBanner.createEl("strong", { text: "Warnings:" });
      warningTitle.style.color = "var(--text-warning)";
      warningTitle.style.display = "block";
      warningTitle.style.marginBottom = "4px";
      for (const diag of warnings) {
        const item = warningBanner.createEl("div", {
          cls: "dnd-creator-diagnostic-item",
          text: diag.message,
        });
        item.style.color = "var(--text-warning)";
        item.style.fontSize = "0.85em";
        item.style.paddingLeft = "4px";
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
      case "sources":
        void this.renderSourcesStep(body);
        break;
      case "identity":
        this.renderIdentityStep(body);
        break;
      case "species":
        void this.renderSpeciesStep(body);
        break;
      case "background":
        void this.renderBackgroundStep(body);
        break;
      case "class":
        void this.renderClassStep(body);
        break;
      case "abilities":
        this.renderAbilitiesStep(body);
        break;
      case "proficienciesAndLanguages":
        void this.renderProficienciesAndLanguagesStep(body);
        break;
      case "equipment":
        this.renderEquipmentStep(body);
        break;
      case "spells":
        void this.renderSpellsStep(body);
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
        selectRuleset(draft, ruleset);
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

  /* ── Catalog-aware step renderers ─────────────────────────────── */

  /**
   * Filters catalog entity summaries by source-policy eligibility.
   * Core entities are always eligible; source entities are only
   * eligible if their sourceId is in the draft's enabledSourceIds.
   */
  private isEntityEligible(sourceId: string, access: string): boolean {
    const enabled = this.controller.draft.sources.enabledSourceIds;
    // Core entities are always eligible
    if (access === "core") return true;
    // Source entities require their source to be enabled
    return enabled.includes(sourceId as never);
  }

  /**
   * Renders the Sources step: checkboxes for source books filtered
   * by the draft's selected ruleset. Uses catalog data when available.
   */
  private async renderSourcesStep(container: HTMLElement): Promise<void> {
    const draft = this.controller.draft;
    const ruleset = draft.ruleset.ruleset;

    if (ruleset === null) {
      container.createEl("p", {
        text: "Please select a ruleset first.",
      });
      return;
    }

    const catalog = this.catalogService;
    if (catalog === null) {
      container.createEl("p", {
        text: "Catalog service is not available. Configure a catalog URL in settings.",
      });
      return;
    }

    const status = catalog.getRuntimeStatus();
    const revision = status.activeRevision;
    if (revision === undefined) {
      container.createEl("p", {
        text: "Catalog is not active. Refresh the catalog in plugin settings.",
      });
      return;
    }

    // Show loading state
    const loadingEl = container.createDiv({
      cls: "dnd-creator-loading",
    });
    loadingEl.createEl("p", { text: "Loading sources..." });

    try {
      const sources = await catalog.fetchSources(revision);
      loadingEl.remove();

      const filtered = sources.filter((s) => s.ruleset === ruleset);
      if (filtered.length === 0) {
        // 2014 ruleset: no optional sources required; show info and auto-confirm
        if (ruleset === "2014") {
          const infoEl = container.createEl("p", {
            cls: "dnd-creator-info-message",
            text: "The 2014 ruleset uses core rules only — no optional source books are required.",
          });
          infoEl.style.borderLeft = "3px solid var(--text-accent)";
          infoEl.style.paddingLeft = "8px";
          infoEl.style.color = "var(--text-muted)";

          // Auto-confirm empty source selection
          if (selectSources(draft, [])) {
            this.renderCurrentStep();
          }
        } else {
          container.createEl("p", {
            text: `No source books available for the ${ruleset} ruleset.`,
          });
        }
        return;
      }

      // Track selected source IDs
      const selectedIds = new Set(draft.sources.enabledSourceIds);

      // Render checkboxes for each source
      for (const source of filtered) {
        const setting = new Setting(container);
        setting.setName(source.name);
        setting.setDesc(`${source.abbreviation} — ${source.category}`);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedIds.has(source.id);
        checkbox.setAttribute("aria-label", `Select ${source.name}`);

        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedIds.add(source.id);
          } else {
            selectedIds.delete(source.id);
          }
        });

        setting.controlEl.appendChild(checkbox);
      }

      // Confirm button to apply selection
      const confirmBtn = new ButtonComponent(container);
      confirmBtn.setButtonText("Confirm Sources")
        .setClass("dnd-creator-confirm-sources")
        .onClick(() => {
          const ids = [...selectedIds];
          if (selectSources(draft, ids)) {
            this.renderCurrentStep();
          }
        });
    } catch {
      loadingEl.remove();
      container.createEl("p", {
        text: "Failed to load sources. Check your connection and try again.",
      });
    }
  }

  /**
   * Renders the Species step: dropdown for species selection filtered
   * by ruleset and enabled sources. Uses catalog data when available.
   */
  private async renderSpeciesStep(container: HTMLElement): Promise<void> {
    const draft = this.controller.draft;
    const ruleset = draft.ruleset.ruleset;

    if (ruleset === null) {
      container.createEl("p", { text: "Please select a ruleset first." });
      return;
    }

    const catalog = this.catalogService;
    if (catalog === null) {
      container.createEl("p", {
        text: "Catalog service is not available.",
      });
      return;
    }

    const status = catalog.getRuntimeStatus();
    const revision = status.activeRevision;
    if (revision === undefined) {
      container.createEl("p", { text: "Catalog is not active." });
      return;
    }

    const loadingEl = container.createDiv({ cls: "dnd-creator-loading" });
    loadingEl.createEl("p", { text: "Loading species..." });

    try {
      const speciesIndex = await catalog.fetchIndex(revision, "species");
      loadingEl.remove();

      const filtered = speciesIndex.filter((s) =>
        s.ruleset === ruleset && this.isEntityEligible(s.sourceId, s.access),
      );
      if (filtered.length === 0) {
        container.createEl("p", {
          text: `No species available for the ${ruleset} ruleset with your selected sources.`,
        });
        return;
      }

      // Sort by name for consistent display
      const sorted = [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const setting = new Setting(container);
      setting.setName("Species");
      setting.setDesc("Select your character's species.");

      const currentId = draft.species.speciesId ?? "";
      const options: Record<string, string> = {};
      options[""] = "— Select species —";
      for (const entry of sorted) {
        options[entry.id] = entry.name;
      }

      setting.addDropdown((dropdown) => {
        dropdown.addOptions(options)
          .setValue(currentId)
          .onChange((value) => {
            if (value !== "" && selectSpecies(draft, value)) {
              this.renderCurrentStep();
            }
          });
      });
    } catch {
      loadingEl.remove();
      container.createEl("p", {
        text: "Failed to load species. Check your connection and try again.",
      });
    }
  }

  /**
   * Renders the Background step: dropdown for background selection
   * filtered by ruleset. Uses catalog data when available.
   */
  private async renderBackgroundStep(container: HTMLElement): Promise<void> {
    const draft = this.controller.draft;
    const ruleset = draft.ruleset.ruleset;

    if (ruleset === null) {
      container.createEl("p", { text: "Please select a ruleset first." });
      return;
    }

    const catalog = this.catalogService;
    if (catalog === null) {
      container.createEl("p", { text: "Catalog service is not available." });
      return;
    }

    const status = catalog.getRuntimeStatus();
    const revision = status.activeRevision;
    if (revision === undefined) {
      container.createEl("p", { text: "Catalog is not active." });
      return;
    }

    const loadingEl = container.createDiv({ cls: "dnd-creator-loading" });
    loadingEl.createEl("p", { text: "Loading backgrounds..." });

    try {
      const bgIndex = await catalog.fetchIndex(revision, "background");
      loadingEl.remove();

      const filtered = bgIndex.filter((b) =>
        b.ruleset === ruleset && this.isEntityEligible(b.sourceId, b.access),
      );
      if (filtered.length === 0) {
        container.createEl("p", {
          text: `No backgrounds available for the ${ruleset} ruleset with your selected sources.`,
        });
        return;
      }

      const sorted = [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const setting = new Setting(container);
      setting.setName("Background");
      setting.setDesc("Select your character's background.");

      const currentId = draft.background.backgroundId ?? "";
      const options: Record<string, string> = {};
      options[""] = "— Select background —";
      for (const entry of sorted) {
        options[entry.id] = entry.name;
      }

      setting.addDropdown((dropdown) => {
        dropdown.addOptions(options)
          .setValue(currentId)
          .onChange((value) => {
            if (value !== "" && selectBackground(draft, value)) {
              this.renderCurrentStep();
            }
          });
      });
    } catch {
      loadingEl.remove();
      container.createEl("p", {
        text: "Failed to load backgrounds. Check your connection and try again.",
      });
    }
  }

  /**
   * Renders the Class step: dropdown for class selection filtered
   * by ruleset. Uses catalog data when available.
   */
  private async renderClassStep(container: HTMLElement): Promise<void> {
    const draft = this.controller.draft;
    const ruleset = draft.ruleset.ruleset;

    if (ruleset === null) {
      container.createEl("p", { text: "Please select a ruleset first." });
      return;
    }

    const catalog = this.catalogService;
    if (catalog === null) {
      container.createEl("p", { text: "Catalog service is not available." });
      return;
    }

    const status = catalog.getRuntimeStatus();
    const revision = status.activeRevision;
    if (revision === undefined) {
      container.createEl("p", { text: "Catalog is not active." });
      return;
    }

    const loadingEl = container.createDiv({ cls: "dnd-creator-loading" });
    loadingEl.createEl("p", { text: "Loading classes..." });

    try {
      const classIndex = await catalog.fetchIndex(revision, "class");
      loadingEl.remove();

      const filtered = classIndex.filter((c) =>
        c.ruleset === ruleset && this.isEntityEligible(c.sourceId, c.access),
      );
      if (filtered.length === 0) {
        container.createEl("p", {
          text: `No classes available for the ${ruleset} ruleset with your selected sources.`,
        });
        return;
      }

      const sorted = [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const setting = new Setting(container);
      setting.setName("Class");
      setting.setDesc("Select your character's class.");

      const currentId = draft.class.classId ?? "";
      const options: Record<string, string> = {};
      options[""] = "— Select class —";
      for (const entry of sorted) {
        options[entry.id] = entry.name;
      }

      setting.addDropdown((dropdown) => {
        dropdown.addOptions(options)
          .setValue(currentId)
          .onChange((value) => {
            if (value !== "" && selectClass(draft, value)) {
              this.renderCurrentStep();
            }
          });
      });
    } catch {
      loadingEl.remove();
      container.createEl("p", {
        text: "Failed to load classes. Check your connection and try again.",
      });
    }
  }

  /**
   * Renders the Ability Scores step: method selector and score inputs
   * for STR, DEX, CON, INT, WIS, CHA.
   */
  private renderAbilitiesStep(container: HTMLElement): void {
    const draft = this.controller.draft;

    // Method selector
    const methodSetting = new Setting(container);
    methodSetting.setName("Score Method");
    methodSetting.setDesc("How ability scores are determined.");

    const methods: Record<string, string> = {
      "standard-array": "Standard Array",
      "point-buy": "Point Buy",
      "rolling": "Rolling (4d6 drop lowest)",
      "custom": "Custom",
    };

    methodSetting.addDropdown((dropdown) => {
      dropdown.addOptions(methods)
        .setValue(draft.abilities.method ?? "standard-array")
        .onChange((value) => {
          draft.abilities.method = value as
            | "standard-array"
            | "point-buy"
            | "rolling"
            | "custom";
        });
    });

    // Ability score inputs
    const abilities: ReadonlyArray<{
      key: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
      label: string;
    }> = [
      { key: "STR", label: "Strength" },
      { key: "DEX", label: "Dexterity" },
      { key: "CON", label: "Constitution" },
      { key: "INT", label: "Intelligence" },
      { key: "WIS", label: "Wisdom" },
      { key: "CHA", label: "Charisma" },
    ];

    const scores: Record<Ability, number> =
      draft.abilities.scores ??
      ({} as Record<Ability, number>);
    const inputs: Record<Ability, TextComponent> = {} as Record<
      Ability,
      TextComponent
    >;

    for (const ability of abilities) {
      const scoreSetting = new Setting(container);
      scoreSetting.setName(ability.label);

      scoreSetting.addText((text) => {
        text.setPlaceholder("8-20")
          .setValue(String(scores[ability.key] ?? 10))
          .onChange((value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 1 && num <= 30) {
              scores[ability.key] = num;
            }
          });
        inputs[ability.key] = text;
      });
    }

    // Confirm button
    const confirmBtn = new ButtonComponent(container);
    confirmBtn.setButtonText("Confirm Ability Scores")
      .setClass("dnd-creator-confirm-abilities")
      .onClick(() => {
        const allFilled = abilities.every((a) => a.key in scores);
        if (allFilled && selectAbilityScores(draft, scores)) {
          this.renderCurrentStep();
        }
      });
  }

  /**
   * Renders the Proficiencies & Languages step: skill/tool checkboxes
   * and language selection from catalog.
   */
  private async renderProficienciesAndLanguagesStep(
    container: HTMLElement,
  ): Promise<void> {
    const draft = this.controller.draft;
    const ruleset = draft.ruleset.ruleset;

    if (ruleset === null) {
      container.createEl("p", { text: "Please select a ruleset first." });
      return;
    }

    // Skill proficiencies (static list of standard skills)
    const skillSection = container.createDiv({
      cls: "dnd-creator-section",
    });
    skillSection.createEl("h3", { text: "Skill Proficiencies" });

    const standardSkills: ReadonlyArray<{ id: string; name: string }> = [
      { id: "skill:2024:core:acrobatics", name: "Acrobatics" },
      { id: "skill:2024:core:animal-handling", name: "Animal Handling" },
      { id: "skill:2024:core:arcana", name: "Arcana" },
      { id: "skill:2024:core:athletics", name: "Athletics" },
      { id: "skill:2024:core:deception", name: "Deception" },
      { id: "skill:2024:core:history", name: "History" },
      { id: "skill:2024:core:insight", name: "Insight" },
      { id: "skill:2024:core:intimidation", name: "Intimidation" },
      { id: "skill:2024:core:investigation", name: "Investigation" },
      { id: "skill:2024:core:medicine", name: "Medicine" },
      { id: "skill:2024:core:nature", name: "Nature" },
      { id: "skill:2024:core:perception", name: "Perception" },
      { id: "skill:2024:core:performance", name: "Performance" },
      { id: "skill:2024:core:persuasion", name: "Persuasion" },
      { id: "skill:2024:core:religion", name: "Religion" },
      { id: "skill:2024:core:sleight-of-hand", name: "Sleight of Hand" },
      { id: "skill:2024:core:stealth", name: "Stealth" },
      { id: "skill:2024:core:survival", name: "Survival" },
    ];

    const selectedSkills = new Set(draft.proficiencies.skillProficiencies);

    for (const skill of standardSkills) {
      const setting = new Setting(skillSection);
      setting.setName(skill.name);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      const skillEntityId = createEntityId(skill.id);
      checkbox.checked = selectedSkills.has(skillEntityId);
      checkbox.setAttribute("aria-label", `Select ${skill.name} proficiency`);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedSkills.add(skillEntityId);
        } else {
          selectedSkills.delete(skillEntityId);
        }
      });

      setting.controlEl.appendChild(checkbox);
    }

    // Tool proficiencies
    const toolSection = container.createDiv({
      cls: "dnd-creator-section",
    });
    toolSection.createEl("h3", { text: "Tool Proficiencies" });

    const selectedTools = new Set(draft.proficiencies.toolProficiencies);

    // Tool proficiencies are loaded from catalog when available
    // Note: "tool" is not a standard RuleEntityKind, so we use a static list
    const staticTools: ReadonlyArray<{ id: string; name: string }> = [
      { id: "tool:2024:core:herbalism-kit", name: "Herbalism Kit" },
      { id: "tool:2024:core:musical-instrument", name: "Musical Instrument" },
      { id: "tool:2024:core:thieves-tools", name: "Thieves' Tools" },
      { id: "tool:2024:core:artisan-tools", name: "Artisan's Tools" },
      { id: "tool:2024:core:gaming-set", name: "Gaming Set" },
      { id: "tool:2024:core:vehicles-land", name: "Vehicles (Land)" },
      { id: "tool:2024:core:vehicles-water", name: "Vehicles (Water)" },
    ];

    for (const tool of staticTools) {
      const setting = new Setting(toolSection);
      setting.setName(tool.name);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      const toolEntityId = createEntityId(tool.id);
      checkbox.checked = selectedTools.has(toolEntityId);
      checkbox.setAttribute("aria-label", `Select ${tool.name}`);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedTools.add(toolEntityId);
        } else {
          selectedTools.delete(toolEntityId);
        }
      });

      setting.controlEl.appendChild(checkbox);
    }

    // Language selection
    const langSection = container.createDiv({
      cls: "dnd-creator-section",
    });
    langSection.createEl("h3", { text: "Languages" });

    const selectedLangs = new Set(draft.languages.languageIds);

    // Load languages from catalog
    let langOptions: ReadonlyArray<{ id: string; name: string }> = [];
    const catalog = this.catalogService;
    if (catalog !== null) {
      const status = catalog.getRuntimeStatus();
      const revision = status.activeRevision;
      if (revision !== undefined) {
        try {
          const langIndex = await catalog.fetchIndex(revision, "language");
          const filtered = langIndex.filter((l) => l.ruleset === ruleset);
          langOptions = filtered.map((l) => ({ id: l.id, name: l.name }));
        } catch {
          // Fall through to empty list
        }
      }
    }

    // Add standard languages as fallback
    if (langOptions.length === 0) {
      langOptions = [
        { id: "language:2024:core:common", name: "Common" },
        { id: "language:2024:core:dwarvish", name: "Dwarvish" },
        { id: "language:2024:core:elvish", name: "Elvish" },
        { id: "language:2024:core:giant", name: "Giant" },
        { id: "language:2024:core:goblin", name: "Goblin" },
        { id: "language:2024:core:gnomish", name: "Gnomish" },
        { id: "language:2024:core:halfling", name: "Halfling" },
        { id: "language:2024:core:orcish", name: "Orcish" },
        { id: "language:2024:core:sylvan", name: "Sylvan" },
        { id: "language:2024:core:undercommon", name: "Undercommon" },
      ];
    }

    for (const lang of langOptions) {
      const setting = new Setting(langSection);
      setting.setName(lang.name);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      const langEntityId = createEntityId(lang.id);
      checkbox.checked = selectedLangs.has(langEntityId);
      checkbox.setAttribute("aria-label", `Select ${lang.name}`);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedLangs.add(langEntityId);
        } else {
          selectedLangs.delete(langEntityId);
        }
      });

      setting.controlEl.appendChild(checkbox);
    }

    // Confirm button
    const confirmBtn = new ButtonComponent(container);
    confirmBtn.setButtonText("Confirm Proficiencies & Languages")
      .setClass("dnd-creator-confirm-proficiencies")
      .onClick(() => {
        const profOk = selectProficiencies(draft, {
          skillProficiencies: [...selectedSkills],
          toolProficiencies: [...selectedTools],
        });
        const langOk = selectLanguages(draft, {
          languageIds: [...selectedLangs],
        });
        if (profOk && langOk) {
          this.renderCurrentStep();
        }
      });
  }

  /**
   * Renders the Equipment step: starting equipment choices.
   * Shows current equipment and allows manual entry.
   */
  private renderEquipmentStep(container: HTMLElement): void {
    const draft = this.controller.draft;

    // Display current equipment choices
    const choices = draft.equipmentChoices.choices;
    const choiceKeys = Object.keys(choices);

    if (choiceKeys.length > 0) {
      const info = container.createDiv({ cls: "dnd-creator-info" });
      info.createEl("h3", { text: "Current Equipment Choices" });
      for (const key of choiceKeys) {
        const choice = choices[key as keyof typeof choices];
        if (choice) {
          const item = info.createDiv({ cls: "dnd-creator-equipment-item" });
          item.createEl("strong", { text: `${key}:` });
          item.createSpan({ text: String(choice) });
        }
      }
    } else {
      container.createEl("p", {
        text: "No equipment choices have been made yet. Select your starting equipment.",
      });
    }

    // Manual equipment entry
    const setting = new Setting(container);
    setting.setName("Add Equipment Item");
    setting.setDesc("Enter an equipment item ID or name.");

    setting.addText((text) => {
      text.setPlaceholder("Equipment item ID");
    });

    const addBtn = new ButtonComponent(container);
    addBtn.setButtonText("Add")
      .setClass("dnd-creator-add-equipment")
      .onClick(() => {
        // Equipment choices are resolved by the domain step
        this.controller.markStepResolved("equipment");
        this.renderCurrentStep();
      });
  }

  /**
   * Renders the Spells step: checks spell eligibility and allows
   * spell selection for spellcasters.
   */
  private async renderSpellsStep(container: HTMLElement): Promise<void> {
    const draft = this.controller.draft;

    // Check if character is a spellcaster
    if (draft.spellEligibility.isSpellcaster === false) {
      container.createEl("p", {
        text: "This character is not a spellcaster. No spells to select.",
      });
      return;
    }

    // Auto-query spell eligibility if not yet resolved
    if (draft.spellEligibility.isSpellcaster === undefined) {
      // Default to non-spellcaster if class doesn't indicate spellcasting
      const eligibility = {
        isSpellcaster: false,
        spellcastingAbility: undefined,
      };
      querySpellEligibility(draft, eligibility);
      container.createEl("p", {
        text: "This character is not a spellcaster. No spells to select.",
      });
      return;
    }

    const catalog = this.catalogService;
    const ruleset = draft.ruleset.ruleset;

    if (catalog === null || ruleset === null) {
      container.createEl("p", {
        text: "Catalog service is not available or ruleset not set.",
      });
      return;
    }

    const status = catalog.getRuntimeStatus();
    const revision = status.activeRevision;
    if (revision === undefined) {
      container.createEl("p", { text: "Catalog is not active." });
      return;
    }

    const loadingEl = container.createDiv({ cls: "dnd-creator-loading" });
    loadingEl.createEl("p", { text: "Loading spells..." });

    try {
      const spellIndex = await catalog.fetchIndex(revision, "spell");
      loadingEl.remove();

      const filtered = spellIndex.filter((s) => s.ruleset === ruleset);
      if (filtered.length === 0) {
        container.createEl("p", {
          text: `No spells available for the ${ruleset} ruleset.`,
        });
        return;
      }

      const sorted = [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const selectedSpellIds = new Set(
        draft.spells.selections.map((s) => s.spellId),
      );

      container.createEl("h3", { text: "Available Spells" });

      for (const spell of sorted) {
        const setting = new Setting(container);
        setting.setName(spell.name);
        setting.setDesc(`${spell.kind} — ${spell.access}`);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedSpellIds.has(spell.id);
        checkbox.setAttribute("aria-label", `Select ${spell.name}`);

        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedSpellIds.add(spell.id);
          } else {
            selectedSpellIds.delete(spell.id);
          }
        });

        setting.controlEl.appendChild(checkbox);
      }

      // Confirm button
      const confirmBtn = new ButtonComponent(container);
      confirmBtn.setButtonText("Confirm Spells")
        .setClass("dnd-creator-confirm-spells")
        .onClick(() => {
          const selections = [...selectedSpellIds].map((spellId) => ({
            spellId,
            acquisition: "known" as const,
          }));
          if (selectSpells(draft, selections)) {
            this.renderCurrentStep();
          }
        });
    } catch {
      loadingEl.remove();
      container.createEl("p", {
        text: "Failed to load spells. Check your connection and try again.",
      });
    }
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
    const prevStep = this.controller.currentStep;
    this.controller.next();
    if (this.controller.currentStep !== prevStep) {
      this.renderCurrentStep();
    }
  }

  private navigatePrevious(): void {
    const prevStep = this.controller.currentStep;
    this.controller.previous();
    if (this.controller.currentStep !== prevStep) {
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

    // Persist the character if a callback was provided
    if (this.persist !== undefined) {
      await this.persist(character);
    }

    // Success: close the modal
    this.close();
  }
}

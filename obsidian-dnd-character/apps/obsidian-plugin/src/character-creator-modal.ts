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

import type { Character, CharacterChoice } from "@obsidian-dnd/character-contract";
import type { CatalogEntitySummary, EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { CharacterDraft } from "./character-draft";
import { hasErrors } from "./character-draft";
import type { CreatorStep } from "./character-step-controller";
import { StepController, CREATOR_STEPS } from "./character-step-controller";
import type { ReviewSnapshot } from "./character-review-snapshot";
import { buildReviewSnapshot } from "./character-review-snapshot";
import { finalizeCharacterWithCatalogResult } from "./character-finalize";
import { loadCreatorConsequenceReadModel } from "./creator-consequence-read-model";
import type { Ability, ChoiceInstanceId, EntityId, RuleGrantId } from "@obsidian-dnd/domain";
import { selectRuleset } from "./character-ruleset-step";
import type { CatalogService } from "./catalog/catalog-service";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { renderSpeciesChoices } from "./character-species-choices-renderer";
import { selectBackground } from "./character-background-step";
import { selectClass } from "./character-class-step";
import { renderBackgroundChoices } from "./character-background-choices-renderer";
import { renderClassStartingGrants } from "./character-class-starting-grants-renderer";
import { selectAbilityScores } from "./character-ability-scores-step";
import { querySpellEligibility } from "./character-spell-eligibility-step";
import { selectSpells } from "./character-spell-selection-step";
import { clearCreatorChoice, deriveDraftConsequences, resolveCreatorRandomGrant, setCreatorChoices } from "./creator-draft-commands";
import { isOriginConsequenceComplete } from "./creator-origin-completion";
import { renderActiveCreatorChoices, type CreatorChoiceSubmission } from "./creator-active-choice-renderer";
import { openCreatorCatalogDetails } from "./creator-catalog-details-modal";
import { createCreatorRandomSource } from "./creator-random-source";
import type { RandomSource } from "./creator-random-grant-resolution";
import { renderOriginConsequences } from "./creator-origin-consequence-renderer";
import { deriveCreatorGlobalSummary, type CreatorSummaryEntry } from "./creator-global-summary";

/* ── Persistence callback ─────────────────────────────────────── */

/**
 * Optional callback invoked by the modal after the draft is
 * finalized into a Character. The runtime provides this callback
 * to wire the modal's save action to vault persistence.
 */
export type CharacterPersistenceCallback = (
  character: Character,
) => Promise<CharacterPersistenceResult>;

export type CharacterPersistenceResult =
  | { status: "created" }
  | {
    status: "failure";
    category: "persistence";
    message: string;
    reason: "invalid-character-path" | "folder-creation-failed" | "folder-file-collision" | "duplicate-id" | "serialization-failed" | "vault-write-failed" | "unknown-persistence-exception";
    cause?: unknown;
  };

/** Optional test/host observability for the save pipeline; it never renders or logs. */
export type CharacterSavePipelineStage = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S7" | "S8";

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

type InternalSubstep = "background-choices" | "class-starting-grants";
type CreatorOrigin = "species" | "background" | "class";
type CatalogChoiceSubstep = "species-choices" | "background-choices" | "class-starting-grants";

interface CatalogChoiceRegion {
  step: CatalogChoiceSubstep;
  element: HTMLElement;
  entities: readonly EntityDetailResponse[] | null;
  generation: number;
}

function getStepLabel(step: CreatorStep): string {
  return STEP_LABELS.get(step) ?? step;
}

function userFacingCreatorDiagnostic(code: string, fallback: string): string {
  if (code === "unresolved-choice") return "Choose the required origin option before creating the character.";
  if (code === "invalid-choice") return "Replace an invalid origin selection before creating the character.";
  if (code === "no-choice-candidates") return "A required origin choice has no valid candidates with the current catalog and source policy.";
  if (code === "unresolved-random-grant") return "Roll the required starting currency before creating the character.";
  if (code === "invalid-random-grant") return "The saved starting-currency result is invalid and must be corrected.";
  return fallback;
}

/* ── Modal class ───────────────────────────────────────────────── */

export class CharacterCreatorModal extends ObsidianModal {
  private readonly controller: StepController;
  private readonly persist: CharacterPersistenceCallback | undefined;
  private readonly catalogService: CatalogService | null;
  private readonly randomSource: RandomSource;
  private saveButton: ButtonComponent | null = null;
  private nextButton: ButtonComponent | null = null;
  private backButton: ButtonComponent | null = null;
  private stepContentEl: HTMLElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private diagnosticsEl: HTMLElement | null = null;
  /** Save-time failures are separate from draft diagnostics and survive Review refreshes. */
  private saveDiagnostic: { category: "creator" | "catalog" | "validation" | "persistence"; message: string } | null = null;
  private speciesChoicesPending = false;
  private speciesChoiceLoadError: string | null = null;
  private readonly internalSubstepsPending = new Set<InternalSubstep>();
  private readonly internalSubstepLoadErrors = new Map<InternalSubstep, string>();
  /** Stable local refresh root for the active catalog-owned choice UI. */
  private catalogChoiceRegion: CatalogChoiceRegion | null = null;
  private renderGeneration = 0;

  constructor(
    app: App,
    draft: CharacterDraft,
    persist?: CharacterPersistenceCallback,
    catalogService: CatalogService | null = null,
    randomSource: RandomSource = createCreatorRandomSource(),
    private readonly fiveEToolsWebBaseUrl = "",
    private readonly onSavePipelineStage?: (stage: CharacterSavePipelineStage) => void,
  ) {
    super(app);
    this.controller = new StepController(draft);
    this.persist = persist;
    this.catalogService = catalogService;
    this.randomSource = randomSource;
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

    const diagnostics = this.controller.draft.diagnostics.filter((d) => {
      const isPendingSpeciesChoiceDiagnostic = this.speciesChoicesPending
        && d.step === "species-choices"
        && d.message === "Species choices not yet resolved";
      const isPendingInternalDiagnostic = this.internalSubstepsPending.has(
        d.step as InternalSubstep,
      );
      return !isPendingSpeciesChoiceDiagnostic
        && !isPendingInternalDiagnostic
        && d.message != null
        && d.message.trim().length > 0;
    });
    if (this.saveDiagnostic !== null) {
      diagnostics.push({ step: "review", message: this.saveDiagnostic.message, severity: "error" });
    }
    if (this.speciesChoiceLoadError !== null) {
      diagnostics.push({
        step: "species-choices",
        message: this.speciesChoiceLoadError,
        severity: "error",
      });
    }
    for (const [step, message] of this.internalSubstepLoadErrors) {
      diagnostics.push({ step, message, severity: "error" });
    }
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

  private beginInternalSubstep(step: InternalSubstep): void {
    this.internalSubstepsPending.add(step);
    this.internalSubstepLoadErrors.delete(step);
  }

  private presentInternalSubstep(step: InternalSubstep): void {
    this.internalSubstepsPending.delete(step);
    this.renderDiagnosticsBanner();
    this.updateNavigationButtons();
  }

  private isCurrentRender(generation: number): boolean { return generation === this.renderGeneration; }

  /** Projects an authoritative consequence result to the controller and visible UI. */
  private projectOriginConsequenceCompletion(origin: CreatorOrigin, complete: boolean): void {
    this.controller.setOriginConsequenceCompletion(origin, complete);
    if (origin === "species") {
      this.speciesChoicesPending = false;
      if (complete) this.speciesChoiceLoadError = null;
    } else {
      this.internalSubstepsPending.delete(origin === "background" ? "background-choices" : "class-starting-grants");
    }
    this.renderProgressBar();
    this.renderDiagnosticsBanner();
    this.updateNavigationButtons();
  }

  /** Applies a presentation-only async result only while its render is still current. */
  private updateOriginConsequenceCompletion(origin: CreatorOrigin, complete: boolean, generation: number): void {
    if (!this.isCurrentRender(generation)) return;
    this.projectOriginConsequenceCompletion(origin, complete);
  }

  private originForCatalogSubstep(step: CatalogChoiceSubstep): CreatorOrigin {
    if (step === "species-choices") return "species";
    if (step === "background-choices") return "background";
    return "class";
  }

  private originIdForCatalogSubstep(step: CatalogChoiceSubstep): EntityId | null {
    const origin = this.originForCatalogSubstep(step);
    if (origin === "species") return this.controller.draft.species.speciesId;
    if (origin === "background") return this.controller.draft.background.backgroundId;
    return this.controller.draft.class.classId;
  }

  private projectCatalogCommandCompletion(step: CatalogChoiceSubstep, entities: readonly EntityDetailResponse[], activeIds: readonly string[]): void {
    const model = deriveDraftConsequences(this.controller.draft, entities);
    const origin = this.originForCatalogSubstep(step);
    const originId = this.originIdForCatalogSubstep(step);
    if (originId === null) throw new Error("Catalog choice origin is not selected");
    const matched = model.origins.find((entry) => entry.origin.id === originId);
    if (matched === undefined || matched.origin.kind !== origin) throw new Error("Catalog choice origin is inconsistent");
    for (const id of activeIds) {
      const owner = model.origins.find((entry) => entry.choices.some((choice) => choice.instanceId === id) || entry.grants.some((grant) => grant.grant.id === id));
      if (owner?.origin.id !== originId) throw new Error("Catalog command crosses origin boundaries");
    }
    this.projectOriginConsequenceCompletion(origin, isOriginConsequenceComplete(model, originId));
  }

  private creatorScrollElement(): HTMLElement | null {
    const content = this.contentEl;
    if (content === undefined || content === null) return null;
    if (content.scrollHeight > content.clientHeight) return content;
    return content.querySelector<HTMLElement>(".modal-content, .modal-scroll") ?? content;
  }

  private preserveCreatorScroll(action: () => void): void {
    const scroll = this.creatorScrollElement();
    const scrollTop = scroll?.scrollTop;
    action();
    if (scroll !== null && scrollTop !== undefined && scroll.scrollTop !== scrollTop) scroll.scrollTop = scrollTop;
  }

  private registerCatalogChoiceRegion(step: CatalogChoiceSubstep, element: HTMLElement, generation: number): void {
    this.catalogChoiceRegion = { step, element, entities: null, generation };
  }

  /** Refreshes only the origin consequences and active choices after a local command. */
  private refreshCatalogChoiceRegion(step: CatalogChoiceSubstep, entities: readonly EntityDetailResponse[]): void {
    const region = this.catalogChoiceRegion;
    if (region === null || region.step !== step || region.generation !== this.renderGeneration) return;
    const origin = this.originForCatalogSubstep(step);
    const originId = this.originIdForCatalogSubstep(step);
    if (originId === null) return;
    const model = deriveDraftConsequences(this.controller.draft, entities);
    const consequence = model.origins.find((entry) => entry.origin.id === originId && entry.origin.kind === origin);
    if (consequence === undefined) return;
    region.entities = entities;
    region.element.empty();
    const consequenceContainer = region.element.createDiv({ cls: "dnd-creator-origin-consequences-region" });
    const choicesContainer = region.element.createDiv({ cls: "dnd-creator-active-choices-region" });
    renderOriginConsequences(consequenceContainer, consequence, model.diagnostics, (grantId) => this.resolveOriginRandomGrant(step, entities, grantId));
    if (consequence.choices.length === 0) {
      choicesContainer.createEl("p", { text: "No additional choices for this origin.", cls: "dnd-creator-info" });
      return;
    }
    const heading = origin === "species" ? "Species Choices" : origin === "background" ? "Background Choices" : "Class Starting Choices";
    renderActiveCreatorChoices(
      choicesContainer,
      heading,
      consequence.choices,
      (submissions) => this.submitCatalogChoiceBatch(step, entities, submissions),
      (instanceId) => this.clearCatalogChoice(step, entities, instanceId),
    );
  }

  private submitCatalogChoiceBatch(step: CatalogChoiceSubstep, entities: readonly EntityDetailResponse[], choices: readonly CreatorChoiceSubmission[]): void {
    try {
      this.preserveCreatorScroll(() => {
        setCreatorChoices(this.controller.draft, entities, choices);
        this.projectCatalogCommandCompletion(step, entities, choices.map((choice) => choice.instanceId));
        this.resolveCatalogChoiceSubstep(step, entities);
      });
    } catch { /* Invalid batches leave the authoritative draft and current render unchanged. */ }
  }

  private failInternalSubstep(step: InternalSubstep, message: string): void {
    this.internalSubstepsPending.delete(step);
    this.internalSubstepLoadErrors.set(step, message);
    this.renderDiagnosticsBanner();
    this.updateNavigationButtons();
  }

  private resolveInternalSubstep(
    step: InternalSubstep,
    choices: Record<string, CharacterChoice>,
    apply: (draft: CharacterDraft, choices: Record<string, CharacterChoice>) => boolean,
  ): void {
    this.internalSubstepsPending.delete(step);
    this.internalSubstepLoadErrors.delete(step);
    if (apply(this.controller.draft, choices)) {
      this.renderCurrentStep();
    } else {
      this.renderDiagnosticsBanner();
      this.updateNavigationButtons();
    }
  }

  /** Completes a visual substep after its catalog choice command succeeded. */
  private resolveCatalogChoiceSubstep(step: CatalogChoiceSubstep, entities: readonly EntityDetailResponse[]): void {
    this.internalSubstepsPending.delete(step as InternalSubstep);
    this.internalSubstepLoadErrors.delete(step as InternalSubstep);
    this.refreshCatalogChoiceRegion(step, entities);
  }

  private addOriginDetailsAction(container: HTMLElement, label: string, summary: Pick<CatalogEntitySummary, "id" | "detailPath">): void {
    const catalog = this.catalogService;
    const revision = catalog?.getRuntimeStatus().activeRevision;
    if (catalog === null || revision === undefined) return;
    new Setting(container).setName(`${label} details`).addButton((button) => {
      button.setButtonText("(?)").setTooltip(`View ${label} details`).onClick(async () => {
        try { openCreatorCatalogDetails(this.app, (await catalog.fetchEntity(revision, summary.id, summary.detailPath)).data, this.fiveEToolsWebBaseUrl); }
        catch { /* The adjacent selector already reports catalog availability. */ }
      });
      button.buttonEl.setAttribute("aria-label", `View ${label} details`);
    });
  }

  private clearCatalogChoice(step: CatalogChoiceSubstep, entities: readonly EntityDetailResponse[], instanceId: ChoiceInstanceId): void {
    try {
      this.preserveCreatorScroll(() => {
        const before = deriveDraftConsequences(this.controller.draft, entities);
        const origin = this.originForCatalogSubstep(step);
        const originId = this.originIdForCatalogSubstep(step);
        if (originId === null || !before.origins.some((entry) => entry.origin.id === originId && entry.origin.kind === origin && entry.choices.some((choice) => choice.instanceId === instanceId))) throw new Error("Catalog choice is not active for this origin");
        clearCreatorChoice(this.controller.draft, instanceId);
        this.projectCatalogCommandCompletion(step, entities, []);
        this.refreshCatalogChoiceRegion(step, entities);
      });
    } catch { /* Invalid clear commands leave the authoritative draft and current render unchanged. */ }
  }

  private resolveOriginRandomGrant(step: CatalogChoiceSubstep, entities: readonly EntityDetailResponse[], grantId: RuleGrantId): void {
    try {
      this.preserveCreatorScroll(() => {
        resolveCreatorRandomGrant(this.controller.draft, entities, grantId, this.randomSource);
        this.projectCatalogCommandCompletion(step, entities, [grantId]);
        this.refreshCatalogChoiceRegion(step, entities);
      });
    } catch { /* The consequence panel continues to show the governed diagnostic. */ }
  }

  /* ── Step rendering ────────────────────────────────────────── */

  private renderCurrentStep(): void {
    if (!this.stepContentEl) return;
    const generation = ++this.renderGeneration;
    this.catalogChoiceRegion = null;
    this.stepContentEl.empty();

    const currentStep = this.controller.currentStep;

    if (currentStep === "species"
      && this.controller.draft.species.speciesId !== null
      && !this.controller.isStepResolved("species")
      && this.speciesChoiceLoadError === null) {
      this.speciesChoicesPending = true;
    }
    if (currentStep === "background" && this.controller.draft.background.backgroundId !== null
      && !this.controller.isStepResolved("background")
      && !this.internalSubstepLoadErrors.has("background-choices")) {
      this.internalSubstepsPending.add("background-choices");
    }
    if (currentStep === "class" && this.controller.draft.class.classId !== null
      && !this.controller.isStepResolved("class")
      && !this.internalSubstepLoadErrors.has("class-starting-grants")) {
      this.internalSubstepsPending.add("class-starting-grants");
    }

    this.renderProgressBar();
    this.renderDiagnosticsBanner();

    if (currentStep === "review") {
      this.renderReviewStep();
    } else {
      this.renderStepContent(currentStep, generation);
    }

    this.updateNavigationButtons();
  }

  private renderStepContent(step: CreatorStep, generation: number): void {
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
        void this.renderSpeciesStep(body, generation);
        break;
      case "background":
        void this.renderBackgroundStep(body, generation);
        break;
      case "class":
        void this.renderClassStep(body, generation);
        break;
      case "abilities":
        this.renderAbilitiesStep(body);
        break;
      case "proficienciesAndLanguages":
        void this.renderProficienciesAndLanguagesStep(body);
        break;
      case "equipment":
        void this.renderEquipmentStep(body);
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
  private async renderSpeciesStep(container: HTMLElement, generation: number): Promise<void> {
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
      if (!this.isCurrentRender(generation)) return;
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
              this.controller.setOriginConsequenceCompletion("species", false);
              this.speciesChoicesPending = true;
              this.speciesChoiceLoadError = null;
              this.renderCurrentStep();
            }
          });
      });

      // Render species choices section after species is selected
      if (draft.species.speciesId) {
        const selectedSpecies = sorted.find((entry) => entry.id === draft.species.speciesId);
        if (selectedSpecies === undefined) return;
        this.addOriginDetailsAction(container, "Species", selectedSpecies);
        const choiceRegion = container.createDiv({ cls: "dnd-creator-origin-choice-region" });
        this.registerCatalogChoiceRegion("species-choices", choiceRegion, generation);
        await renderSpeciesChoices(
          choiceRegion,
          draft,
          catalog,
          selectedSpecies,
          (sourceId, access) => this.isEntityEligible(sourceId, access),
          () => undefined,
          () => {
            if (!this.isCurrentRender(generation)) return;
            this.speciesChoicesPending = false;
            this.renderDiagnosticsBanner();
            this.updateNavigationButtons();
          },
          (message) => {
            if (!this.isCurrentRender(generation)) return;
            this.speciesChoiceLoadError = message;
            this.updateOriginConsequenceCompletion("species", false, generation);
          },
          (choices, entities) => {
            if (!this.isCurrentRender(generation)) return;
            this.submitCatalogChoiceBatch("species-choices", entities, choices);
          },
          (instanceId, entities) => this.clearCatalogChoice("species-choices", entities, instanceId),
          (grantId, entities) => this.resolveOriginRandomGrant("species-choices", entities, grantId),
          (complete) => this.updateOriginConsequenceCompletion("species", complete, generation),
        );
      }
    } catch {
      if (!this.isCurrentRender(generation)) return;
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
  private async renderBackgroundStep(container: HTMLElement, generation: number): Promise<void> {
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
      if (!this.isCurrentRender(generation)) return;
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
              this.controller.setOriginConsequenceCompletion("background", false);
              this.beginInternalSubstep("background-choices");
              this.renderCurrentStep();
            }
          });
      });

      if (draft.background.backgroundId) {
        const selected = sorted.find((entry) => entry.id === draft.background.backgroundId);
        if (selected === undefined) return;
        this.addOriginDetailsAction(container, "Background", selected);
        const choiceRegion = container.createDiv({ cls: "dnd-creator-origin-choice-region" });
        this.registerCatalogChoiceRegion("background-choices", choiceRegion, generation);
        await renderBackgroundChoices(
          choiceRegion, draft, catalog, selected,
          (sourceId, access) => this.isEntityEligible(sourceId, access),
          () => undefined,
          () => { if (this.isCurrentRender(generation)) this.presentInternalSubstep("background-choices"); },
          (message) => {
            if (!this.isCurrentRender(generation)) return;
            this.failInternalSubstep("background-choices", message);
            this.updateOriginConsequenceCompletion("background", false, generation);
          },
          (choices, entities) => {
            if (!this.isCurrentRender(generation)) return;
            this.submitCatalogChoiceBatch("background-choices", entities, choices);
          },
          (instanceId, entities) => this.clearCatalogChoice("background-choices", entities, instanceId),
          (grantId, entities) => this.resolveOriginRandomGrant("background-choices", entities, grantId),
          (complete) => this.updateOriginConsequenceCompletion("background", complete, generation),
        );
      }
    } catch {
      if (!this.isCurrentRender(generation)) return;
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
  private async renderClassStep(container: HTMLElement, generation: number): Promise<void> {
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
      if (!this.isCurrentRender(generation)) return;
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
              this.controller.setOriginConsequenceCompletion("class", false);
              this.beginInternalSubstep("class-starting-grants");
              this.renderCurrentStep();
            }
          });
      });

      if (draft.class.classId) {
        const selected = sorted.find((entry) => entry.id === draft.class.classId);
        if (selected === undefined) return;
        this.addOriginDetailsAction(container, "Class", selected);
        const choiceRegion = container.createDiv({ cls: "dnd-creator-origin-choice-region" });
        this.registerCatalogChoiceRegion("class-starting-grants", choiceRegion, generation);
        await renderClassStartingGrants(
          choiceRegion, draft, catalog, selected,
          (sourceId, access) => this.isEntityEligible(sourceId, access),
          () => undefined,
          () => { if (this.isCurrentRender(generation)) this.presentInternalSubstep("class-starting-grants"); },
          (message) => {
            if (!this.isCurrentRender(generation)) return;
            this.failInternalSubstep("class-starting-grants", message);
            this.updateOriginConsequenceCompletion("class", false, generation);
          },
          (choices, entities) => {
            if (!this.isCurrentRender(generation)) return;
            this.submitCatalogChoiceBatch("class-starting-grants", entities, choices);
          },
          (instanceId, entities) => this.clearCatalogChoice("class-starting-grants", entities, instanceId),
          (grantId, entities) => this.resolveOriginRandomGrant("class-starting-grants", entities, grantId),
          (complete) => this.updateOriginConsequenceCompletion("class", complete, generation),
          (capability) => {
            const { required, complete } = capability;
            if (!this.isCurrentRender(generation)) return;
            if (draft.spellEligibility.isSpellcaster !== required) querySpellEligibility(draft, { isSpellcaster: required });
            if (required && complete) this.controller.markStepResolved("spells");
            this.renderProgressBar();
            this.updateNavigationButtons();
          },
        );
      }
    } catch {
      if (!this.isCurrentRender(generation)) return;
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

  /** Origin-owned language and proficiency choices are presented once here. */
  private async renderProficienciesAndLanguagesStep(
    container: HTMLElement,
  ): Promise<void> {
    await this.renderDerivedGlobalSummary(container, "proficiencies");
  }

  /**
   * Renders the Equipment step: starting equipment choices.
   * Shows current equipment and allows manual entry.
   */
  private async renderEquipmentStep(container: HTMLElement): Promise<void> {
    await this.renderDerivedGlobalSummary(container, "equipment");
  }

  private async renderDerivedGlobalSummary(container: HTMLElement, page: "proficiencies" | "equipment"): Promise<void> {
    const catalog = this.catalogService;
    const revision = catalog?.getRuntimeStatus().activeRevision;
    const draft = this.controller.draft;
    if (catalog === null || revision === undefined) { container.createEl("p", { text: "Catalog is not active." }); return; }
    try {
      const [species, backgrounds, classes] = await Promise.all([catalog.fetchIndex(revision, "species"), catalog.fetchIndex(revision, "background"), catalog.fetchIndex(revision, "class")]);
      const summaries = [species.find((entry) => entry.id === draft.species.speciesId), backgrounds.find((entry) => entry.id === draft.background.backgroundId), classes.find((entry) => entry.id === draft.class.classId)];
      if (summaries.some((entry) => entry === undefined)) return;
      const origins = await Promise.all(summaries.map(async (summary) => (await catalog.fetchEntity(revision, summary!.id, summary!.detailPath)).data));
      const loaded = await loadCreatorConsequenceReadModel(draft, catalog, revision, origins);
      const summary = deriveCreatorGlobalSummary(loaded.model, loaded.entities);
      if (page === "proficiencies") { this.renderSummaryList(container, "Languages", summary.languages); this.renderSummaryList(container, "Proficiencies", summary.proficiencies); }
      else this.renderSummaryList(container, "Starting Equipment", summary.equipment, true);
    } catch { container.createEl("p", { text: "Unable to load derived creator summary." }); }
  }

  private renderSummaryList(container: HTMLElement, title: string, entries: readonly CreatorSummaryEntry[], quantities = false): void {
    const section = container.createDiv({ cls: "dnd-creator-section" }); section.createEl("h3", { text: title });
    if (entries.length === 0) { section.createEl("p", { text: "No derived entries." }); return; }
    for (const entry of entries) section.createEl("p", { text: `${entry.label}${quantities && "quantity" in entry && entry.quantity !== undefined ? ` ×${entry.quantity}` : ""} — ${entry.origin}` });
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
    } else {
      this.renderReviewSection(snapshot);
    }
    void this.renderConsequenceReview();
  }

  /** Loads a disposable consequence view for review; it never writes creator state. */
  private async renderConsequenceReview(): Promise<void> {
    const review = this.stepContentEl;
    const catalog = this.catalogService;
    const revision = catalog?.getRuntimeStatus().activeRevision;
    const draft = this.controller.draft;
    if (review === null || catalog === null || revision === undefined) return;
    try {
      const [species, backgrounds, classes] = await Promise.all([
        catalog.fetchIndex(revision, "species"), catalog.fetchIndex(revision, "background"), catalog.fetchIndex(revision, "class"),
      ]);
      const summaries = [
        species.find((entry) => entry.id === draft.species.speciesId),
        backgrounds.find((entry) => entry.id === draft.background.backgroundId),
        classes.find((entry) => entry.id === draft.class.classId),
      ];
      if (summaries.some((entry) => entry === undefined)) return;
      const origins = await Promise.all(summaries.map(async (summary) =>
        (await catalog.fetchEntity(revision, summary!.id, summary!.detailPath)).data));
      const model = await loadCreatorConsequenceReadModel(draft, catalog, revision, origins);
      const section = review.createDiv({ cls: "dnd-creator-review-consequences" });
      section.createEl("h3", { text: "Origin consequences" });
      for (const origin of model.model.origins) {
        section.createEl("h4", { text: origin.origin.name });
        renderOriginConsequences(section, origin, model.model.diagnostics);
      }
      const blockers = model.model.diagnostics.filter((entry) => entry.code !== "stale-choice");
      if (blockers.length > 0) {
        section.createEl("h3", { text: "Unresolved blockers" });
        for (const blocker of blockers) section.createEl("p", { text: userFacingCreatorDiagnostic(blocker.code, blocker.message), cls: "dnd-creator-error" });
      }
    } catch { /* Catalog availability is already represented by creator diagnostics. */ }
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
        this.controller.canSave() &&
        !hasErrors(this.controller.draft);
      this.saveButton.setDisabled(!canSave);
    }
  }

  /* ── Save handler ──────────────────────────────────────────── */

  private async handleSave(): Promise<void> {
    const draft = this.controller.draft;
    this.onSavePipelineStage?.("S0");

    // Gate: draft must be complete
    const canSave = this.controller.canSave();
    this.onSavePipelineStage?.("S1");
    if (!canSave) {
      this.presentSaveDiagnostic("creator", "Character could not be saved because required creator steps are incomplete.");
      return;
    }

    // Gate: no errors
    if (hasErrors(draft)) {
      this.presentSaveDiagnostic("creator", "Character could not be saved because creator errors must be resolved first.");
      return;
    }

    const catalog = this.catalogService;
    const revision = catalog?.getRuntimeStatus().activeRevision;
    if (catalog === null || catalog === undefined || revision === undefined) {
      this.presentSaveDiagnostic("catalog", "Character could not be saved because the active catalog is unavailable. Refresh the catalog and try again.");
      return;
    }
    let character: Character | undefined;
    try {
      const [species, backgrounds, classes] = await Promise.all([
        catalog.fetchIndex(revision, "species"),
        catalog.fetchIndex(revision, "background"),
        catalog.fetchIndex(revision, "class"),
      ]);
      const summaries = [
        species.find((entry) => entry.id === draft.species.speciesId),
        backgrounds.find((entry) => entry.id === draft.background.backgroundId),
        classes.find((entry) => entry.id === draft.class.classId),
      ];
      if (summaries.some((entry) => entry === undefined)) {
        this.presentSaveDiagnostic("catalog", "Character could not be saved because a selected origin is unavailable in the active catalog.");
        return;
      }
      const origins = await Promise.all(summaries.map(async (summary) =>
        (await catalog.fetchEntity(revision, summary!.id, summary!.detailPath)).data));
      const loaded = await loadCreatorConsequenceReadModel(draft, catalog, revision, origins);
      this.onSavePipelineStage?.("S2");
      this.onSavePipelineStage?.("S3");
      const finalization = finalizeCharacterWithCatalogResult(draft, loaded.entities);
      if (finalization.status === "failure") {
        this.onSavePipelineStage?.("S4");
        const diagnostic = finalization.diagnostics[0];
        this.presentSaveDiagnostic(
          finalization.code === "document-validation-failed" ? "validation" : "creator",
          diagnostic === undefined ? finalization.message : `${finalization.message} ${userFacingCreatorDiagnostic(diagnostic.code, diagnostic.message)}`,
        );
        return;
      }
      character = finalization.character;
      this.onSavePipelineStage?.("S4");
    } catch {
      this.presentSaveDiagnostic("catalog", "Character could not be saved because the active catalog could not be loaded. Refresh the catalog and try again.");
      return;
    }

    // Persist the character if a callback was provided
    if (this.persist !== undefined) {
      this.onSavePipelineStage?.("S5");
      try {
        const result = await this.persist(character);
        if (result.status === "failure") {
          this.onSavePipelineStage?.("S7");
          this.presentSaveDiagnostic("persistence", result.message);
          return;
        }
        this.onSavePipelineStage?.("S7");
      } catch {
        this.onSavePipelineStage?.("S7");
        this.presentSaveDiagnostic("persistence", "Character could not be saved because the vault write failed. Check the vault and try again.");
        return;
      }
    }

    // Success: close the modal
    this.onSavePipelineStage?.("S8");
    this.close();
  }

  private presentSaveDiagnostic(category: "creator" | "catalog" | "validation" | "persistence", message: string): void {
    this.saveDiagnostic = { category, message };
    this.renderDiagnosticsBanner();
  }
}

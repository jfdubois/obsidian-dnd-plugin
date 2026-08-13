/* ── Character creator runtime: Obsidian command & persistence ────
    Registers the "Create character" command, checks catalog
    availability, opens the modal wired to the active character
    repository, and persists the finalized character to the vault.
    Implements the P10-T020 runtime integration layer.             */

import type { App } from "obsidian";
import type { Character } from "@obsidian-dnd/character-contract";
import type { CharacterRepository } from "./character-repository";
import type { CatalogService } from "./catalog/catalog-service";
import { createEmptyCharacterDraft } from "./character-draft";
import {
  CharacterCreatorModal,
  type CharacterPersistenceCallback,
  type CharacterPersistenceResult,
} from "./character-creator-modal";

/* ── Runtime class ─────────────────────────────────────────────── */

/**
 * Runtime integration that connects the character creator modal
 * to the Obsidian plugin lifecycle: command registration, catalog
 * availability checks, and vault persistence.
 */
export class CharacterCreatorRuntime {
  private readonly app: App;
  private readonly repository: CharacterRepository;
  private catalogService: CatalogService | null;
  private readonly getFiveEToolsWebBaseUrl: () => string;

  constructor(
    app: App,
    repository: CharacterRepository,
    catalogService: CatalogService | null = null,
    getFiveEToolsWebBaseUrl: () => string = () => "",
  ) {
    this.app = app;
    this.repository = repository;
    this.catalogService = catalogService;
    this.getFiveEToolsWebBaseUrl = getFiveEToolsWebBaseUrl;
  }

  /**
   * Update the catalog service reference (e.g., after reconfiguration).
   */
  setCatalogService(service: CatalogService | null): void {
    this.catalogService = service;
  }

  /**
   * Check if the catalog is in a usable state for character creation.
   * Returns a human-readable reason if the catalog is not available.
   */
  checkCatalogAvailability(): string | null {
    const service = this.catalogService;
    if (service === null) {
      return "Catalog service is not initialized. Configure a catalog URL in settings.";
    }

    const status = service.getRuntimeStatus();
    const state = status.state;

    // Usable states
    if (
      state === "current" ||
      state === "cached-offline" ||
      state === "stale-offline" ||
      state === "update-available"
    ) {
      return null;
    }

    // Block states with specific messages
    if (state === "not-configured") {
      return "Catalog URL is not configured. Set a catalog URL in plugin settings.";
    }
    if (state === "inactive") {
      return "Catalog is not active. Refresh the catalog in plugin settings.";
    }
    if (state === "restoring" || state === "refreshing") {
      return "Catalog is currently updating. Please try again shortly.";
    }
    if (state === "incompatible") {
      return "Catalog schema is incompatible. Check plugin settings.";
    }
    if (state === "unavailable") {
      return "Catalog server is unavailable. Check network connection.";
    }
    if (state === "error") {
      const diagnostic = status.lastDiagnostic;
      return (
        `Catalog error: ${diagnostic?.message ?? "Unknown error"}. ` +
        "Check plugin settings."
      );
    }

    // Unknown state — allow with warning
    return null;
  }

  /**
   * Build the persistence callback that the modal uses to save
   * the finalized character to the vault. Handles success/failure
   * notifications internally.
   */
  buildPersistenceCallback(): CharacterPersistenceCallback {
    const repository = this.repository;
    const notifySuccess = this.notifySuccess.bind(this);
    const notifyError = this.notifyError.bind(this);
    return async (character: Character): Promise<CharacterPersistenceResult> => {
      let result;
      try {
        result = await repository.create(character);
      } catch (cause) {
        return { status: "failure", category: "persistence", reason: "unknown-persistence-exception", cause, message: "Character could not be saved because the vault write failed. Check the vault and try again." };
      }

      if (result.status === "created") {
        notifySuccess(
          `Character "${character.identity.name}" created successfully.`,
        );
        return { status: "created" };
      } else if (
        result.status === "error" &&
        result.reason === "duplicate-id"
      ) {
        const message = `Character could not be saved because "${character.identity.name}" already exists. Use a different name.`;
        notifyError(message);
        return { status: "failure", category: "persistence", reason: "duplicate-id", message };
      } else if (result.status === "error") {
        const message = "Character could not be saved because the vault write failed. Check the vault and try again.";
        notifyError(message);
        return { status: "failure", category: "persistence", reason: result.reason, cause: "cause" in result ? result.cause : undefined, message };
      }
      return { status: "failure", category: "persistence", reason: "unknown-persistence-exception", message: "Character could not be saved because persistence returned an unexpected result." };
    };
  }

  /**
   * Open the character creator modal with persistence wired to
   * the active repository. Checks catalog availability first.
   *
   * Returns the modal instance, or `null` if the catalog is
   * unavailable (a notification is shown in that case).
   */
  async openCreator(): Promise<CharacterCreatorModal | null> {
    // 1. Check catalog availability
    const unavailableReason = this.checkCatalogAvailability();
    if (unavailableReason !== null) {
      this.notifyUnavailable(unavailableReason);
      return null;
    }

    // 2. Create empty draft
    const draft = createEmptyCharacterDraft();

    // 3. Build persistence callback
    const persist = this.buildPersistenceCallback();

    // 4. Open modal with persistence and catalog wired in
    const baseUrl = this.getFiveEToolsWebBaseUrl();
    const modal = baseUrl.length === 0
      ? new CharacterCreatorModal(this.app, draft, persist, this.catalogService)
      : new CharacterCreatorModal(this.app, draft, persist, this.catalogService, undefined, baseUrl);
    modal.open();

    return modal;
  }

  /* ── Notification helpers (mobile-compatible) ───────────────── */

  private notifySuccess(message: string): void {
    this.notify(message, 3000);
  }

  private notifyError(message: string): void {
    this.notify(message, 5000);
  }

  private notifyUnavailable(message: string): void {
    this.notify(message, 5000);
  }

  private notify(message: string, duration: number): void {
    // Use the Obsidian notice API (mobile-compatible)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notice = (this.app as any).notice as
      | ((msg: string, dur?: number) => void)
      | undefined;
    if (typeof notice === "function") {
      notice(message, duration);
    } else {
      console.log(`[D&D Character] ${message}`);
    }
  }
}

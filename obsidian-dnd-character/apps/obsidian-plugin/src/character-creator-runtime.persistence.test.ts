/**
 * Tests for CharacterCreatorRuntime persistence callback and
 * modal opening behavior (P10-T020).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { App, TFile } from "obsidian";
import type { Character } from "@obsidian-dnd/character-contract";
import type { CatalogService } from "./catalog/catalog-service";
import type { CatalogRuntimeStatusState } from "./catalog/catalog-runtime-status";
import type { CreateCharacterResult } from "./character-create";

/* ── Mocks ─────────────────────────────────────────────────────── */

vi.mock("obsidian", () => ({
  Modal: class Modal {
    titleEl = { setText: vi.fn() };
    contentEl = { empty: vi.fn(), createDiv: vi.fn() };
    scope = { register: vi.fn() };
    open = vi.fn();
    close = vi.fn();
  },
  ButtonComponent: class ButtonComponent {
    setButtonText = vi.fn().mockReturnThis();
    setCta = vi.fn().mockReturnThis();
    setDisabled = vi.fn().mockReturnThis();
    onClick = vi.fn().mockReturnThis();
  },
  Setting: class Setting {},
}));

vi.mock("./character-draft", () => ({
  createEmptyCharacterDraft: vi.fn().mockReturnValue({
    version: 1,
    ruleset: "2024",
    identity: { name: "Test Character" },
  }),
}));

vi.mock("./character-creator-modal", () => {
  const CharacterCreatorModal = vi.fn().mockImplementation(function (
    app: App,
    draft: unknown,
    persist: ((character: Character) => Promise<void>) | undefined,
  ) {
    return {
      app,
      draft,
      persist,
      open: vi.fn(),
    };
  });
  return { CharacterCreatorModal };
});

vi.mock("./character-repository", () => ({
  CharacterRepository: class CharacterRepository {
    create = vi.fn();
  },
}));

/* ── Imports (after mocks) ─────────────────────────────────────── */

import { CharacterCreatorRuntime } from "./character-creator-runtime";
import * as characterDraft from "./character-draft";
import * as modalModule from "./character-creator-modal";
import type * as repositoryModule from "./character-repository";

/* ── Helpers ───────────────────────────────────────────────────── */

function createMockApp(): App & { notice: ReturnType<typeof vi.fn> } {
  return {
    workspace: { getLeavesOfType: vi.fn().mockReturnValue([]) },
    vault: {
      adapter: { exists: vi.fn(), read: vi.fn(), write: vi.fn() },
    },
    scope: { register: vi.fn(), unregister: vi.fn() },
    notice: vi.fn(),
  } as unknown as App & { notice: ReturnType<typeof vi.fn> };
}

function createMockCatalogService(
  state: CatalogRuntimeStatusState = "current",
): CatalogService {
  return {
    getRuntimeStatus: vi.fn().mockReturnValue({
      state,
      lastDiagnostic:
        state === "error"
          ? { message: "Test catalog error", timestamp: Date.now() }
          : undefined,
    }),
  } as unknown as CatalogService;
}

/* ── buildPersistenceCallback tests ────────────────────────────── */

describe("CharacterCreatorRuntime.buildPersistenceCallback", () => {
  let app: App & { notice: ReturnType<typeof vi.fn> };
  let repository: Record<string, unknown>;

  beforeEach(() => {
    app = createMockApp();
    repository = { create: vi.fn() };
  });

  it("calls repository.create with the finalized character", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    (repository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "created",
      filePath: "dnd/characters/char-001.json",
      file: {} as TFile,
    });

    const callback = runtime.buildPersistenceCallback();
    const mockCharacter = {
      version: 1,
      ruleset: "2024",
      identity: { name: "Hero", source: "test" },
    } as unknown as Character;

    await callback(mockCharacter);

    expect(repository.create).toHaveBeenCalledWith(mockCharacter);
  });

  it("notifies success on created result", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    (repository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "created",
      filePath: "dnd/characters/char-001.json",
      file: {} as TFile,
    });

    const callback = runtime.buildPersistenceCallback();
    const mockCharacter = {
      version: 1,
      ruleset: "2024",
      identity: { name: "Hero", source: "test" },
    } as unknown as Character;

    await callback(mockCharacter);

    const noticeFn = app.notice;
    expect(noticeFn).toHaveBeenCalledWith(
      expect.stringContaining("created successfully"),
      expect.any(Number),
    );
  });

  it("notifies error on duplicate-id result", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    (repository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "error",
      reason: "duplicate-id",
    } as unknown as CreateCharacterResult);

    const callback = runtime.buildPersistenceCallback();
    const mockCharacter = {
      version: 1,
      ruleset: "2024",
      identity: { name: "Hero", source: "test" },
    } as unknown as Character;

    await callback(mockCharacter);

    const noticeFn = app.notice;
    expect(noticeFn).toHaveBeenCalledWith(
      expect.stringContaining("already exists"),
      expect.any(Number),
    );
  });

  it("notifies generic error on other error results", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    (repository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "error",
      reason: "io-error",
    } as unknown as CreateCharacterResult);

    const callback = runtime.buildPersistenceCallback();
    const mockCharacter = {
      version: 1,
      ruleset: "2024",
      identity: { name: "Hero", source: "test" },
    } as unknown as Character;

    await callback(mockCharacter);

    const noticeFn = app.notice;
    expect(noticeFn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to create"),
      expect.any(Number),
    );
  });
});

/* ── openCreator tests ─────────────────────────────────────────── */

describe("CharacterCreatorRuntime.openCreator", () => {
  let app: App & { notice: ReturnType<typeof vi.fn> };
  let repository: Record<string, unknown>;

  beforeEach(() => {
    app = createMockApp();
    repository = { create: vi.fn() };
    vi.clearAllMocks();
  });

  it("returns modal when catalog is available", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("current"));

    const result = await runtime.openCreator();

    expect(result).not.toBeNull();
  });

  it("returns null and notifies when catalog is unavailable", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    const unavailableCatalog = createMockCatalogService("not-configured");
    runtime.setCatalogService(unavailableCatalog);

    const result = await runtime.openCreator();

    expect(result).toBeNull();
    const noticeFn = app.notice;
    expect(noticeFn).toHaveBeenCalledWith(
      expect.stringContaining("not configured"),
      expect.any(Number),
    );
  });

  it("returns null when catalog service is null", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(null);

    const result = await runtime.openCreator();

    expect(result).toBeNull();
    const noticeFn = app.notice;
    expect(noticeFn).toHaveBeenCalledWith(
      expect.stringContaining("not initialized"),
      expect.any(Number),
    );
  });

  it("passes persistence callback to modal constructor", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("current"));

    await runtime.openCreator();

    expect(modalModule.CharacterCreatorModal).toHaveBeenCalledWith(
      app,
      expect.objectContaining({ version: 1, ruleset: "2024" }),
      expect.any(Function),
    );
  });

  it("calls createEmptyCharacterDraft", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("current"));

    await runtime.openCreator();

    expect(characterDraft.createEmptyCharacterDraft).toHaveBeenCalled();
  });

  it("opens the modal", async () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("current"));

    const result = await runtime.openCreator();

    expect(result).not.toBeNull();
  });
});

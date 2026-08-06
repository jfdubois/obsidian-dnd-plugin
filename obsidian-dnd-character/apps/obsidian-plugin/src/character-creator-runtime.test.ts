/**
 * Tests for CharacterCreatorRuntime constructor, catalog service
 * wiring, and availability checks (P10-T020).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { App } from "obsidian";
import type { CatalogService } from "./catalog/catalog-service";
import type { CatalogRuntimeStatusState } from "./catalog/catalog-runtime-status";

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

vi.mock("./character-creator-modal", () => ({
  CharacterCreatorModal: vi.fn().mockImplementation(function (
    _app: App,
    _draft: unknown,
    _persist: unknown,
  ) {
    return { open: vi.fn() };
  }),
}));

vi.mock("./character-repository", () => ({
  CharacterRepository: class CharacterRepository {
    create = vi.fn();
  },
}));

/* ── Imports (after mocks) ─────────────────────────────────────── */

import { CharacterCreatorRuntime } from "./character-creator-runtime";
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

/* ── Constructor tests ─────────────────────────────────────────── */

describe("CharacterCreatorRuntime constructor", () => {
  let app: App & { notice: ReturnType<typeof vi.fn> };
  let repository: Record<string, never>;

  beforeEach(() => {
    app = createMockApp();
    repository = {};
  });

  it("stores the app reference", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    expect(runtime).toBeDefined();
  });

  it("stores the repository reference", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    expect(runtime).toBeDefined();
  });

  it("accepts catalog service as optional third argument", () => {
    const catalog = createMockCatalogService("current");
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>, catalog);
    expect(runtime).toBeDefined();
  });

  it("defaults catalog service to null when omitted", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("not initialized");
  });
});

/* ── setCatalogService tests ───────────────────────────────────── */

describe("CharacterCreatorRuntime.setCatalogService", () => {
  let app: App & { notice: ReturnType<typeof vi.fn> };
  let repository: Record<string, never>;

  beforeEach(() => {
    app = createMockApp();
    repository = {};
  });

  it("accepts a new catalog service", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    const catalog = createMockCatalogService("current");
    runtime.setCatalogService(catalog);
    expect(runtime.checkCatalogAvailability()).toBeNull();
  });

  it("accepts null to clear the catalog service", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("current"));
    runtime.setCatalogService(null);
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("not initialized");
  });
});

/* ── checkCatalogAvailability tests ────────────────────────────── */

describe("CharacterCreatorRuntime.checkCatalogAvailability", () => {
  let app: App & { notice: ReturnType<typeof vi.fn> };
  let repository: Record<string, never>;

  beforeEach(() => {
    app = createMockApp();
    repository = {};
  });

  it("returns null for 'current' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("current"));
    expect(runtime.checkCatalogAvailability()).toBeNull();
  });

  it("returns null for 'cached-offline' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("cached-offline"));
    expect(runtime.checkCatalogAvailability()).toBeNull();
  });

  it("returns null for 'stale-offline' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("stale-offline"));
    expect(runtime.checkCatalogAvailability()).toBeNull();
  });

  it("returns null for 'update-available' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("update-available"));
    expect(runtime.checkCatalogAvailability()).toBeNull();
  });

  it("returns reason for 'not-configured' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("not-configured"));
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("not configured");
  });

  it("returns reason for 'inactive' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("inactive"));
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("not active");
  });

  it("returns reason for 'restoring' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("restoring"));
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("updating");
  });

  it("returns reason for 'refreshing' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("refreshing"));
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("updating");
  });

  it("returns reason for 'incompatible' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("incompatible"));
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("incompatible");
  });

  it("returns reason for 'unavailable' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("unavailable"));
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("unavailable");
  });

  it("returns reason with diagnostic for 'error' state", () => {
    const runtime = new CharacterCreatorRuntime(app, repository as unknown as InstanceType<typeof repositoryModule.CharacterRepository>);
    runtime.setCatalogService(createMockCatalogService("error"));
    const reason = runtime.checkCatalogAvailability();
    expect(reason).toContain("error");
    expect(reason).toContain("Test catalog error");
  });
});

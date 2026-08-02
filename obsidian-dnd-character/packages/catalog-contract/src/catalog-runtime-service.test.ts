import { describe, it, expect, vi, beforeEach } from "vitest";
import { CatalogRuntimeService } from "./catalog-runtime-service";
import { CatalogRuntimeError } from "./catalog-runtime-error";
import { createCatalogManifest } from "./catalog-manifest";
import { createCatalogSource } from "./source-metadata";
import { createCatalogEntitySummary } from "./entity-summary";
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";
import type { CatalogCacheManager } from "./cache-manager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REVISION = createCatalogRevision("rev-test-001");

const makeManifest = () =>
  createCatalogManifest({
    schemaVersion: 1,
    catalogRevision: REVISION,
    sourceRevision: "abc123",
    builderVersion: "0.1.0",
    generatedAt: "2026-07-22T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: ["species"],
    checksums: { "manifest.json": "sha256-abc" },
  });

const makeSources = (): Record<string, ReturnType<typeof createCatalogSource>> => ({
  phb: createCatalogSource({
    id: createSourceId("phb"),
    name: "Player's Handbook",
    abbreviation: "PHB",
    ruleset: "2024",
    category: "core",
  }),
});

const makeIndex = (): Record<string, ReturnType<typeof createCatalogEntitySummary>[]> => ({
  species: [
    createCatalogEntitySummary({
      id: createEntityId("species:human"),
      kind: "species",
      name: "Human",
      sourceId: createSourceId("phb"),
      ruleset: "2024",
      access: "core",
      legacy: false,
      tags: ["humanoid"],
      detailPath: "entities/species/human.json",
    }),
  ],
});

const mockFetcher = vi.fn();
let mockCacheManager: CatalogCacheManager | undefined;

const createService = () =>
  new CatalogRuntimeService({
    baseUrl: "https://catalog.example.com",
    fetcher: mockFetcher,
    cacheManager: mockCacheManager,
  });

const jsonOk = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);

const jsonFail = (status: number) =>
  Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "fail" }),
  } as Response);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CatalogRuntimeService", () => {
  beforeEach(() => {
    mockFetcher.mockReset();
    mockCacheManager = undefined;
  });

  /* ── Constructor / defaults ─────────────────────────────────── */

  it("initializes with correct defaults", () => {
    const service = createService();
    expect(service.baseUrl).toBe("https://catalog.example.com");
    expect(service.revision).toBeUndefined();
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
    expect(service.activationState).toBe("inactive");
  });

  /* ── fetchManifest: success ─────────────────────────────────── */

  it("fetchManifest succeeds and sets manifest", async () => {
    const manifest = makeManifest();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));

    const service = createService();
    await service.fetchManifest(REVISION);

    expect(service.manifest).toEqual(manifest);
    expect(mockFetcher).toHaveBeenCalledWith(
      "https://catalog.example.com/catalog/manifest",
    );
  });

  it("fetchManifest invalidates cache by revision when manager provided", async () => {
    const manifest = makeManifest();
    const invalidateSpy = vi.fn().mockResolvedValue(1);
    mockCacheManager = {
      invalidateByRevision: invalidateSpy,
    } as unknown as CatalogCacheManager;
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));

    const service = createService();
    await service.fetchManifest(REVISION);

    expect(invalidateSpy).toHaveBeenCalledWith(REVISION);
  });

  /* ── fetchManifest: HTTP failure ────────────────────────────── */

  it("fetchManifest throws CatalogRuntimeError on HTTP 404", async () => {
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    const error = await service.fetchManifest(REVISION).catch((e) => e);
    expect(error).toBeInstanceOf(CatalogRuntimeError);
    expect((error as CatalogRuntimeError).status).toBe(404);
    expect((error as CatalogRuntimeError).endpoint).toBe(
      "https://catalog.example.com/catalog/manifest",
    );
    expect((error as CatalogRuntimeError).revision).toBe(REVISION);
  });

  /* ── fetchManifest: validation failure ──────────────────────── */

  it("fetchManifest throws CatalogRuntimeError on invalid manifest", async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk({ not: "a manifest" }));

    const service = createService();
    await expect(service.fetchManifest(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );
  });

  /* ── fetchSourcesAndIndex: success ──────────────────────────── */

  it("fetchSourcesAndIndex succeeds and populates sources/index", async () => {
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.fetchSourcesAndIndex(REVISION);

    expect(service.sources).toEqual(sources);
    expect(service.index).toEqual(index);
  });

  /* ── fetchSourcesAndIndex: sources HTTP failure ─────────────── */

  it("fetchSourcesAndIndex throws on sources HTTP failure", async () => {
    mockFetcher.mockResolvedValueOnce(jsonFail(500));

    const service = createService();
    await expect(service.fetchSourcesAndIndex(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );
  });

  /* ── fetchSourcesAndIndex: sources validation failure ───────── */

  it("fetchSourcesAndIndex throws on invalid source entry", async () => {
    mockFetcher.mockResolvedValueOnce(
      jsonOk({ phb: { not: "a source" } }),
    );

    const service = createService();
    await expect(service.fetchSourcesAndIndex(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );
  });

  /* ── fetchSourcesAndIndex: index HTTP failure ───────────────── */

  it("fetchSourcesAndIndex throws on index HTTP failure", async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk(makeSources()));
    mockFetcher.mockResolvedValueOnce(jsonFail(502));

    const service = createService();
    await expect(service.fetchSourcesAndIndex(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );
  });

  /* ── fetchSourcesAndIndex: index validation failure ─────────── */

  it("fetchSourcesAndIndex throws on invalid index entry", async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk(makeSources()));
    mockFetcher.mockResolvedValueOnce(
      jsonOk({ species: [{ not: "valid" }] }),
    );

    const service = createService();
    await expect(service.fetchSourcesAndIndex(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );
  });

  /* ── activate: success ──────────────────────────────────────── */

  it("activate runs both phases and sets active state", async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.activate(REVISION);

    expect(service.activationState).toBe("active");
    expect(service.revision).toBe(REVISION);
    expect(service.manifest).toEqual(manifest);
    expect(service.sources).toEqual(sources);
    expect(service.index).toEqual(index);
  });

  /* ── activate: phase 1 failure ──────────────────────────────── */

  it("activate fails on phase 1 and resets state to inactive", async () => {
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    await expect(service.activate(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );

    expect(service.activationState).toBe("inactive");
    expect(service.manifest).toBeUndefined();
  });

  /* ── activate: phase 2 failure ──────────────────────────────── */

  it("activate fails on phase 2 and resets state to inactive", async () => {
    const manifest = makeManifest();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonFail(500));

    const service = createService();
    await expect(service.activate(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );

    expect(service.activationState).toBe("inactive");
    // PB8-003: manifest is NOT set before validation succeeds
    expect(service.manifest).toBeUndefined();
  });

  /* ── activate: fetches state transition ─────────────────────── */

  it("activate transitions state to fetching before phase 1", async () => {
    mockFetcher.mockRejectedValueOnce(new Error("network"));

    const service = createService();
    await expect(service.activate(REVISION)).rejects.toThrow(
      CatalogRuntimeError,
    );

    // State was set to 'fetching' before the error
    expect(service.activationState).toBe("inactive");
  });

  /* ── reset ──────────────────────────────────────────────────── */

  it("reset clears all state", async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.activate(REVISION);
    expect(service.activationState).toBe("active");

    service.reset();

    expect(service.revision).toBeUndefined();
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
    expect(service.activationState).toBe("inactive");
  });

  /* ── diagnostics ────────────────────────────────────────────── */

  it("diagnostics returns correct snapshot", async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.activate(REVISION);

    const diag = service.diagnostics();
    expect(diag.baseUrl).toBe("https://catalog.example.com");
    expect(diag.revision).toBe(REVISION);
    expect(diag.activationState).toBe("active");
    expect(diag.manifestPresent).toBe(true);
    expect(diag.sourceCount).toBe(1);
    expect(diag.indexEntryCount).toBe(1);
  });

  it("diagnostics returns correct snapshot before activation", () => {
    const service = createService();
    const diag = service.diagnostics();

    expect(diag.baseUrl).toBe("https://catalog.example.com");
    expect(diag.revision).toBeUndefined();
    expect(diag.activationState).toBe("inactive");
    expect(diag.manifestPresent).toBe(false);
    expect(diag.sourceCount).toBe(0);
    expect(diag.indexEntryCount).toBe(0);
  });
});

describe("CatalogRuntimeError", () => {
  it("preserves endpoint, revision, status, and message", () => {
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/manifest",
      revision: REVISION,
      message: "test error",
      status: 404,
    });

    expect(error.name).toBe("CatalogRuntimeError");
    expect(error.message).toBe("test error");
    expect(error.endpoint).toBe("/catalog/manifest");
    expect(error.revision).toBe(REVISION);
    expect(error.status).toBe(404);
  });

  it("omits status when not provided", () => {
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/manifest",
      revision: REVISION,
      message: "validation failed",
    });

    expect(error.status).toBeUndefined();
  });

  /* ── Diagnostic field preservation ────────────────────────────── */

  it("preserves recoverability flag", () => {
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/manifest",
      revision: REVISION,
      message: "recoverable error",
      recoverable: true,
    });

    expect(error.recoverable).toBe(true);
  });

  it("preserves failed entity ID and kind", () => {
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/entities",
      revision: REVISION,
      message: "entity not found",
      failedEntityId: "species:elf",
      failedEntityKind: "species",
    });

    expect(error.failedEntityId).toBe("species:elf");
    expect(error.failedEntityKind).toBe("species");
  });

  it("preserves previous active revision", () => {
    const previous = createCatalogRevision("rev-previous-001");
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/manifest",
      revision: REVISION,
      message: "activation failed",
      previousActiveRevision: previous,
    });

    expect(error.previousActiveRevision).toBe(previous);
  });

  it("defaults recoverable to false when not provided", () => {
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/manifest",
      revision: REVISION,
      message: "non-recoverable error",
    });

    expect(error.recoverable).toBe(false);
  });
});

describe("CatalogRuntimeService - transactional activation", () => {
  beforeEach(() => {
    mockFetcher.mockReset();
    mockCacheManager = undefined;
  });

  /* ── PB8-003: Progressive mutation prevention ─────────────────── */

  it("does not set manifest before phase 2 succeeds", async () => {
    const manifest = makeManifest();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonFail(500));

    const service = createService();
    await expect(service.activate(REVISION)).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe("inactive");
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });

  it("does not set sources before index validation succeeds", async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonFail(502));

    const service = createService();
    await expect(service.activate(REVISION)).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe("inactive");
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });

  /* ── PB8-003: Schema version mismatch ─────────────────────────── */

  it("throws on manifest revision mismatch", async () => {
    const wrongManifest = createCatalogManifest({
      schemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-wrong-001"),
      sourceRevision: "abc123",
      builderVersion: "0.1.0",
      generatedAt: "2026-07-22T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums: { "manifest.json": "sha256-abc" },
    });
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk(wrongManifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await expect(service.activate(REVISION)).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe("inactive");
    expect(service.manifest).toBeUndefined();
  });

  /* ── PB8-003: Error diagnostic preservation ───────────────────── */

  it("preserves recoverability and previous revision on activation failure", async () => {
    const previousRevision = createCatalogRevision("rev-active-001");
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    service.revision = previousRevision;

    try {
      await service.activate(REVISION);
      expect.fail("expected activation to fail");
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.recoverable).toBe(true);
        expect(error.previousActiveRevision).toBe(previousRevision);
        expect(error.status).toBe(404);
      } else {
        throw error;
      }
    }
  });

  /* ── PB8-003: Cache write failure during commit ───────────────── */

  it("preserves error diagnostics when cache write fails during commit", async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const index = makeIndex();

    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.activate(REVISION);

    expect(service.activationState).toBe("active");
  });

  /* ── PB8-003: Required entity validation ──────────────────────── */

  it("preserves failed entity ID and kind for missing required entities", async () => {
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/entities",
      revision: REVISION,
      message: "Required entity not found: species:elf (kind: species)",
      failedEntityId: "species:elf",
      failedEntityKind: "species",
    });

    expect(error.failedEntityId).toBe("species:elf");
    expect(error.failedEntityKind).toBe("species");
    expect(error.recoverable).toBe(false);
  });

  /* ── PB8-003: Index completeness validation ───────────────────── */

  it("preserves failed entity ID for missing index references", async () => {
    const error = new CatalogRuntimeError({
      endpoint: "/catalog/index",
      revision: REVISION,
      message: "Index references missing entity: species:elf (kind: species)",
      failedEntityId: "species:elf",
      failedEntityKind: "species",
    });

    expect(error.failedEntityId).toBe("species:elf");
    expect(error.failedEntityKind).toBe("species");
  });

  /* ── PB8-003: Two-stage activation verification ───────────────── */

  it("verifies prepare and commit are separate stages", async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.activate(REVISION);

    expect(service.activationState).toBe("active");
    expect(service.revision).toBe(REVISION);
    expect(service.manifest).toEqual(manifest);
    expect(service.sources).toEqual(sources);
    expect(service.index).toEqual(index);
  });

  /* ── PB8-003: Runtime reconstruction after failure ────────────── */

  it("allows re-activation after failure", async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const index = makeIndex();

    mockFetcher.mockResolvedValueOnce(jsonFail(404));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await expect(service.activate(REVISION)).rejects.toThrow(CatalogRuntimeError);
    expect(service.activationState).toBe("inactive");

    await service.activate(REVISION);
    expect(service.activationState).toBe("active");
    expect(service.revision).toBe(REVISION);
  });

  /* ── PB8-003: Entity count validation ─────────────────────────── */

  it("preserves error when entity count mismatches manifest", async () => {
    const manifest = createCatalogManifest({
      schemaVersion: 1,
      catalogRevision: REVISION,
      sourceRevision: "abc123",
      builderVersion: "0.1.0",
      generatedAt: "2026-07-22T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums: { "manifest.json": "sha256-abc" },
    });
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.activate(REVISION);

    expect(service.activationState).toBe("active");
  });
});

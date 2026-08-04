import { describe, expect, it, vi } from "vitest";
import {
  CatalogRuntimeService,
  buildEntityCacheKey,
} from "@obsidian-dnd/catalog-contract";
import { CatalogService } from "./catalog-service";
import { createBackingPlugin, createClient } from "./catalog-service.test-helpers";
import {
  MemoryPointer,
  cacheGraph,
  fixture,
  integrationBaseUrl,
  integrationEntityId,
  recordingFetcher,
  revisionA,
  revisionB,
} from "../../../../packages/catalog-contract/src/catalog-transactional-integration-helpers";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

const requiredReferences = [{ entityId: integrationEntityId, kind: "species" as const }];

async function graph() {
  const cache = cacheGraph();
  const pointer = new MemoryPointer();
  const current: { value: typeof revisionA; incompatible?: boolean } = { value: revisionA };
  const runtime = new CatalogRuntimeService({
    baseUrl: integrationBaseUrl,
    fetcher: recordingFetcher(current, []),
    cacheManager: cache.manager,
    activeRevisionPersistence: pointer,
  });
  await runtime.activate({ requiredReferences });
  const client = createClient();
  client.fetchCurrentRevision = vi.fn(async () => revisionB);
  client.fetchManifest = vi.fn(async () => fixture(revisionB).manifest);
  client.negotiateSchema = vi.fn(() => ({ compatible: true, serverSchemaVersion: 1, pluginSchemaVersion: 1 }));
  const service = new CatalogService(createBackingPlugin({ data: null }), client, {
    baseUrl: integrationBaseUrl,
    runtimeService: runtime,
    now: () => new Date("2026-08-04T12:00:00.000Z"),
  });
  return { cache, client, current, pointer, runtime, service };
}

async function expectRollback(
  setupFailure: (value: Awaited<ReturnType<typeof graph>>) => Promise<void> | void,
  operation: "cache-write" | "active-revision-save" | undefined,
) {
  const value = await graph();
  await setupFailure(value);
  await expect(value.service.refreshCatalog({ requiredReferences })).resolves.toMatchObject({ success: false, reason: "activation-failed" });
  const diagnostic = value.service.getRuntimeStatus().lastDiagnostic;
  expect(value.runtime.revision).toBe(revisionA);
  expect(value.runtime.manifest?.catalogRevision).toBe(revisionA);
  expect(value.pointer.value).toBe(revisionA);
  expect(diagnostic).toMatchObject({ candidateRevision: revisionB, previousActiveRevision: revisionA });
  expect(diagnostic?.operation).toBe(operation);
}

describe("CatalogService refresh delegates transactional rollback", () => {
  it("projects a real candidate validation error while retaining revision A and its pointer", async () => {
    await expectRollback((value) => { value.current.value = revisionB; value.current.incompatible = true; }, undefined);
  });

  it("projects a real cache-stage failure while retaining revision A and its pointer", async () => {
    await expectRollback((value) => {
      value.current.value = revisionB;
      const originalSet = value.cache.store.set.bind(value.cache.store);
      value.cache.store.set = async (key, envelope) => {
        if (key === buildEntityCacheKey(revisionB, integrationEntityId)) throw new Error("cache rejection");
        await originalSet(key, envelope);
      };
    }, "cache-write");
  });

  it("projects a real pointer-save failure while retaining revision A and its pointer", async () => {
    await expectRollback((value) => {
      value.current.value = revisionB;
      const originalSave = value.pointer.save.bind(value.pointer);
      value.pointer.save = async (revision) => {
        if (revision === revisionB) throw new Error("pointer rejection");
        await originalSave(revision);
      };
    }, "active-revision-save");
  });
});

import { describe, expect, it } from "vitest";
import { CatalogRuntimeError } from "./catalog-runtime-error";
import { CatalogRuntimeService } from "./catalog-runtime-service";
import { buildEntityCacheKey, buildManifestCacheKey, buildSourcesCacheKey } from "./cache-keys";
import {
  cacheGraph, integrationBaseUrl, integrationEntityId, MemoryPointer,
  recordingFetcher, revisionA, revisionB,
} from "./catalog-transactional-integration-helpers";

const required = [{ entityId: integrationEntityId, kind: "species" as const }];
async function activeA() {
  const graph = cacheGraph(); const pointer = new MemoryPointer(); const current: { value: typeof revisionA; incompatible?: boolean } = { value: revisionA }; const requests: string[] = [];
  const service = new CatalogRuntimeService({ baseUrl: integrationBaseUrl, fetcher: recordingFetcher(current, requests), cacheManager: graph.manager, activeRevisionPersistence: pointer });
  await service.activate({ requiredReferences: required });
  return { ...graph, pointer, current, requests, service };
}

describe("CatalogRuntimeService transactional failure integration", () => {
  it("rejects incompatible B before candidate cache staging and preserves A", async () => {
    const graph = await activeA(); graph.current.value = revisionB; graph.current.incompatible = true;
    const error: CatalogRuntimeError = await graph.service.activate({ requiredReferences: required }).then(() => { throw new Error("expected activation failure"); }, (cause: unknown) => cause as CatalogRuntimeError);
    expect(error).toBeInstanceOf(CatalogRuntimeError); expect(error.message).toMatch(/schema/i); expect(error.operation).toBeUndefined(); expect(error.revision).toBe(revisionB); expect(error.previousActiveRevision).toBe(revisionA);
    expect(graph.service.revision).toBe(revisionA); expect(graph.service.manifest?.catalogRevision).toBe(revisionA); expect(graph.service.requiredEntities.get(integrationEntityId)?.id).toBe(integrationEntityId); expect(graph.pointer.value).toBe(revisionA); expect(await graph.store.get(buildManifestCacheKey(revisionA))).not.toBeNull(); expect(await graph.store.get(buildManifestCacheKey(revisionB))).toBeNull();
  });

  it("retains A when an entity cache write rejects after earlier B artifacts", async () => {
    const graph = await activeA(); graph.current.value = revisionB; const originalSet = graph.store.set.bind(graph.store); const cause = new Error("entity disk rejection"); const writes: string[] = [];
    graph.store.set = async (key, envelope) => { writes.push(key); if (key === buildEntityCacheKey(revisionB, integrationEntityId)) throw cause; await originalSet(key, envelope); };
    const error: CatalogRuntimeError = await graph.service.activate({ requiredReferences: required }).then(() => { throw new Error("expected activation failure"); }, (cause: unknown) => cause as CatalogRuntimeError);
    expect(writes).toContain(buildSourcesCacheKey(revisionB)); expect(error.operation).toBe("cache-write"); expect(error.artifact).toBe("entity"); expect(error.artifactKey).toBe(buildEntityCacheKey(revisionB, integrationEntityId)); expect(error.cause).toBe(cause); expect(error.candidateRevision).toBe(revisionB); expect(error.previousActiveRevision).toBe(revisionA);
    expect(graph.service.revision).toBe(revisionA); expect(graph.pointer.value).toBe(revisionA); expect(await graph.store.get(buildManifestCacheKey(revisionA))).not.toBeNull(); expect(await graph.store.get(buildManifestCacheKey(revisionB))).not.toBeNull(); expect(await graph.store.get(buildEntityCacheKey(revisionB, integrationEntityId))).toBeNull();
  });

  it("retains A when pointer B rejects after complete B staging", async () => {
    const graph = await activeA(); graph.current.value = revisionB; const cause = new Error("pointer rejected"); const originalSave = graph.pointer.save.bind(graph.pointer);
    graph.pointer.save = async (revision) => { if (revision === revisionB) throw cause; await originalSave(revision); };
    const error: CatalogRuntimeError = await graph.service.activate({ requiredReferences: required }).then(() => { throw new Error("expected activation failure"); }, (cause: unknown) => cause as CatalogRuntimeError);
    expect(error.operation).toBe("active-revision-save"); expect(error.artifact).toBe("active-pointer"); expect(error.cause).toBe(cause); expect(error.candidateRevision).toBe(revisionB); expect(error.previousActiveRevision).toBe(revisionA);
    expect(graph.service.revision).toBe(revisionA); expect(graph.service.manifest?.catalogRevision).toBe(revisionA); expect(graph.pointer.value).toBe(revisionA); expect(await graph.store.get(buildManifestCacheKey(revisionA))).not.toBeNull(); expect(await graph.store.get(buildManifestCacheKey(revisionB))).not.toBeNull(); expect(await graph.store.get(buildEntityCacheKey(revisionB, integrationEntityId))).not.toBeNull();
  });
});

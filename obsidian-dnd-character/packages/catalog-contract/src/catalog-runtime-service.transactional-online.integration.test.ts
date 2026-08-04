import { describe, expect, it } from "vitest";
import { CatalogRuntimeService } from "./catalog-runtime-service";
import { buildEntityCacheKey, buildIndexCacheKey, buildManifestCacheKey, buildSourcesCacheKey } from "./cache-keys";
import {
  cacheGraph, deferred, expectedUrls, integrationBaseUrl, integrationEntityId, integrationKinds,
  MemoryPointer, recordingFetcher, revisionA, revisionB,
} from "./catalog-transactional-integration-helpers";

const required = [{ entityId: integrationEntityId, kind: "species" as const }];
const artifactKeys = (revision: typeof revisionA) => [
  buildManifestCacheKey(revision), buildSourcesCacheKey(revision),
  ...integrationKinds.map((kind) => buildIndexCacheKey(revision, kind)),
  buildEntityCacheKey(revision, integrationEntityId),
];

async function expectCompleteArtifactCache(store: ReturnType<typeof cacheGraph>["store"], revision: typeof revisionA) {
  await Promise.all(artifactKeys(revision).map(async (key) => expect(await store.get(key)).not.toBeNull()));
}

describe("CatalogRuntimeService transactional online integration", () => {
  it("activates A with every immutable artifact, cache entry, and pointer", async () => {
    const { store, manager } = cacheGraph();
    await manager.set("unrelated/revision-z", { cacheSchemaVersion: 1, catalogRevision: revisionA, inputHash: "x", createdAt: new Date().toISOString(), expiration: { kind: "no-expiry" }, value: "keep" });
    const pointer = new MemoryPointer(); const current = { value: revisionA }; const requests: string[] = [];
    const service = new CatalogRuntimeService({ baseUrl: integrationBaseUrl, fetcher: recordingFetcher(current, requests), cacheManager: manager, activeRevisionPersistence: pointer });
    const staged: string[] = []; const originalSet = store.set.bind(store);
    store.set = async (key, envelope) => {
      if (staged.length === 0) expect(requests).toEqual(expectedUrls(revisionA));
      staged.push(key); await originalSet(key, envelope);
    };
    await service.activate({ requiredReferences: required });
    expect(requests).toEqual(expectedUrls(revisionA));
    expect(staged).toEqual(artifactKeys(revisionA));
    expect(service.revision).toBe(revisionA); expect(service.manifest?.catalogRevision).toBe(revisionA);
    expect(service.sources.phb?.id).toBe("phb"); expect(service.index.species?.[0]?.id).toBe(integrationEntityId); expect(service.requiredEntities.get(integrationEntityId)?.id).toBe(integrationEntityId);
    expect(pointer.value).toBe(revisionA); await expectCompleteArtifactCache(store, revisionA); expect(await store.get("unrelated/revision-z")).not.toBeNull();
  });

  it("stages B before pointer persistence and commits memory only after it resolves", async () => {
    const { store, manager } = cacheGraph(); const pointer = new MemoryPointer(); const current = { value: revisionA }; const requests: string[] = [];
    const service = new CatalogRuntimeService({ baseUrl: integrationBaseUrl, fetcher: recordingFetcher(current, requests), cacheManager: manager, activeRevisionPersistence: pointer });
    await service.activate({ requiredReferences: required }); current.value = revisionB;
    const aArtifacts = await Promise.all(artifactKeys(revisionA).map((key) => store.get(key)));
    const cacheGate = deferred<void>(); const pointerGate = deferred<void>(); const originalSet = store.set.bind(store); const originalSave = pointer.save.bind(pointer); let gateCache = true; let cachePending = false; let pointerPending = false;
    store.set = async (key, envelope) => { if (gateCache && key === buildManifestCacheKey(revisionB)) { cachePending = true; await cacheGate.promise; } await originalSet(key, envelope); };
    pointer.save = async (revision) => { if (revision === revisionB) { pointerPending = true; await pointerGate.promise; } await originalSave(revision); };
    const activation = service.activate({ requiredReferences: required }); for (let i = 0; i < 5 && !cachePending; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(cachePending).toBe(true);
    expect(service.revision).toBe(revisionA); expect(pointer.value).toBe(revisionA);
    gateCache = false; cacheGate.resolve(); for (let i = 0; i < 5 && !pointerPending; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(pointerPending).toBe(true);
    await expectCompleteArtifactCache(store, revisionB); expect(service.revision).toBe(revisionA); expect(pointer.value).toBe(revisionA);
    pointerGate.resolve(); await activation;
    expect(service.revision).toBe(revisionB); expect(service.manifest?.catalogRevision).toBe(revisionB); expect(pointer.value).toBe(revisionB); expect(service.requiredEntities.get(integrationEntityId)?.name).toBe("Human revision-b");
    await expectCompleteArtifactCache(store, revisionA); await expectCompleteArtifactCache(store, revisionB);
    await Promise.all(artifactKeys(revisionA).map(async (key, index) => expect(await store.get(key)).toEqual(aArtifacts[index])));
    expect(await store.get(buildManifestCacheKey(revisionA))).not.toEqual(await store.get(buildManifestCacheKey(revisionB)));
    expect(await store.get(buildEntityCacheKey(revisionA, integrationEntityId))).not.toEqual(await store.get(buildEntityCacheKey(revisionB, integrationEntityId)));
    expect(requests).toEqual([...expectedUrls(revisionA), ...expectedUrls(revisionB)]);
  });
});

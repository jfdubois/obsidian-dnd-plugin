import { describe, expect, it, vi } from "vitest";
import type { CatalogRuntimeError } from "@obsidian-dnd/catalog-contract";
import {
  activateAndPersist, createGraph, detailPath, humanId, keys, overwriteEntity,
  rev, seedUnrelated,
} from "./catalog-service.test-helpers";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

describe("CatalogService transactional offline integration", () => {
  it("reconstructs the persisted active catalog and serves required entities with zero network calls", async () => {
    const backing = { data: null }; const original = createGraph(backing);
    await activateAndPersist(original); await seedUnrelated(original); await original.service.dispose();
    const restored = createGraph(backing, { throwOnClientFetch: true });
    const result = await restored.service.initialize();
    const entity = await restored.service.fetchEntity(rev, humanId, detailPath);
    expect(result.success).toBe(true); expect(restored.runtime.revision).toBe(rev); expect(restored.runtime.manifest?.catalogRevision).toBe(rev); expect(restored.runtime.sources.phb?.id).toBe("phb"); expect(restored.runtime.index.species?.[0]?.id).toBe(humanId); expect(entity.data.id).toBe(humanId);
    expect(await restored.persistence.load()).toBe(rev); expect(restored.client.fetchEntity).not.toHaveBeenCalled(); expect(restored.fetcher).not.toHaveBeenCalled(); expect(await restored.manager.getCached("entity/rev-001/species:2024:phb:elf")).not.toBeNull();
  });

  it.each(["missing", "malformed"] as const)("reports structured ENTITY_UNRESOLVED context for a %s required cache entry", async (state) => {
    const backing = { data: null }; const original = createGraph(backing);
    await activateAndPersist(original); await seedUnrelated(original);
    if (state === "missing") await original.manager.invalidate(keys.entity());
    else await overwriteEntity(original, { ...(await original.manager.getCached(keys.entity()))!, value: { malformed: true } });
    await original.service.dispose();
    const restored = createGraph(backing, { throwOnClientFetch: true }); await restored.service.initialize();
    const error: CatalogRuntimeError = await restored.service.fetchEntity(rev, humanId, detailPath).then(() => { throw new Error("expected entity resolution failure"); }, (cause: unknown) => cause as CatalogRuntimeError);
    expect(error.code).toBe("ENTITY_UNRESOLVED"); expect(error.operation).toBe("entity-resolution"); expect(error.failedEntityId).toBe(humanId); expect(error.failedEntityKind).toBe("species"); expect(error.resultingActivationState).toBe("active"); expect(error.cacheOperation).toBe("cache-read"); expect(error.cacheFailureReason).toBe(state === "missing" ? "missing" : "malformed"); expect(error.networkOperation).toBe("entity-fetch"); expect(error.networkEndpoint).toBe(detailPath); expect(error.cause).toBeInstanceOf(Error);
    expect(await restored.persistence.load()).toBe(rev); expect(restored.runtime.revision).toBe(rev); expect(restored.runtime.manifest?.catalogRevision).toBe(rev); expect(restored.runtime.index.species?.[0]?.id).toBe(humanId); expect(await restored.manager.getCached("entity/rev-001/species:2024:phb:elf")).not.toBeNull(); expect(restored.client.fetchEntity).toHaveBeenCalledTimes(1);
  });
});

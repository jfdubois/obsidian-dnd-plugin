import { describe, expect, it, vi } from "vitest";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import { createTtlExpiration } from "@obsidian-dnd/catalog-contract";
import { CatalogRuntimeError } from "@obsidian-dnd/catalog-contract";
import {
  activateAndPersist,
  createGraph,
  createEntityResult,
  createHumanEntity,
  detailPath,
  entityEnvelope,
  humanId,
  keys,
  overwriteEntity,
  rev,
  seedUnrelated,
} from "./catalog-service.test-helpers";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

async function prepareInvalid(
  envelope: ReturnType<typeof entityEnvelope> | null,
  allowStale = false,
) {
  const backing = { data: null };
  const original = createGraph(backing);
  await activateAndPersist(original);
  await seedUnrelated(original);
  if (envelope === null) {
    await original.manager.invalidate(keys.entity());
    await original.store.flush();
  } else {
    await overwriteEntity(original, envelope);
  }
  await original.service.dispose();

  const restored = createGraph(backing, {
    throwOnClientFetch: true,
    allowStale,
  });
  await restored.store.initialize();
  const restore = await restored.runtime.restoreFromCache();
  return { restored, restore };
}

async function expectUnavailable(
  envelope: ReturnType<typeof entityEnvelope> | null,
  expectedReason: string,
) {
  const { restored, restore } = await prepareInvalid(envelope);

  const error = await restored.service.fetchEntity(rev, humanId, detailPath)
    .catch((failure: unknown) => failure);

  expect(error).toBeInstanceOf(CatalogRuntimeError);
  expect(error).toMatchObject({
    code: "ENTITY_UNRESOLVED",
    operation: "entity-resolution",
    failedEntityId: humanId,
    failedEntityKind: "species",
    revision: rev,
    cacheOperation: "cache-read",
    cacheKey: keys.entity(),
    cacheFailureReason: expectedReason,
    networkOperation: "entity-fetch",
    networkEndpoint: detailPath,
    offlineOrUnavailable: true,
    resultingActivationState: "active",
  });
  expect((error as CatalogRuntimeError).cause).toBeInstanceOf(Error);
  expect((error as CatalogRuntimeError).cause).toMatchObject({ message: "network unavailable" });
  expect(restore.success).toBe(true);
  expect(restored.runtime.revision).toBe(rev);
  expect(restored.runtime.manifest?.catalogRevision).toBe(rev);
  expect(await restored.manager.getCached("entity/rev-001/species:2024:phb:elf"))
    .not.toBeNull();
}

describe("CatalogService persistent invalid offline entity cache", () => {
  it("rejects wrong entity cache schema version", async () => {
    await expectUnavailable(entityEnvelope(createHumanEntity(), {
      cacheSchemaVersion: 99,
    }), "schema-incompatible");
  });

  it("rejects wrong entity cache revision", async () => {
    await expectUnavailable(entityEnvelope(createHumanEntity(), {
      catalogRevision: createCatalogRevision("rev-002"),
    }), "revision-mismatch");
  });

  it("rejects wrong entity cache input hash", async () => {
    await expectUnavailable(entityEnvelope(createHumanEntity(), {
      inputHash: "wrong-hash",
    }), "input-hash-mismatch");
  });

  it("rejects malformed entity cache value", async () => {
    await expectUnavailable(entityEnvelope({ invalid: "entity" }), "malformed");
  });

  it("reports unavailable when entity cache entry is missing", async () => {
    await expectUnavailable(null, "missing");
  });

  it("rejects expired entity cache when stale fallback is disabled", async () => {
    await expectUnavailable(entityEnvelope(createHumanEntity(), {
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000),
    }), "expired");
  });

  it("retains a non-Error network rejection inside the catalog diagnostic", async () => {
    const { restored } = await prepareInvalid(null);
    restored.client.fetchEntity = vi.fn(async () => Promise.reject({ unavailable: true }));

    const error = await restored.service.fetchEntity(rev, humanId, detailPath)
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(CatalogRuntimeError);
    expect(error).toMatchObject({
      code: "ENTITY_UNRESOLVED",
      failedEntityId: humanId,
      cacheFailureReason: "missing",
      cause: { unavailable: true },
    });
    expect(error).not.toEqual({ unavailable: true });
  });

  it("serves a later valid request after an unresolved entity failure", async () => {
    const { restored } = await prepareInvalid(null);
    await expect(restored.service.fetchEntity(rev, humanId, detailPath))
      .rejects.toBeInstanceOf(CatalogRuntimeError);
    restored.client.fetchEntity = vi.fn(async () => createEntityResult());

    const result = await restored.service.fetchEntity(rev, humanId, detailPath);

    expect(result.data.id).toBe(humanId);
    expect(result.cacheStatus).toBe("fresh");
    expect(restored.runtime.revision).toBe(rev);
    expect(restored.runtime.manifest?.catalogRevision).toBe(rev);
  });

  it("returns expired compatible entity only when stale fallback is enabled", async () => {
    const { restored, restore } = await prepareInvalid(entityEnvelope(
      createHumanEntity(),
      {
        createdAt: new Date(Date.now() - 5000).toISOString(),
        expiration: createTtlExpiration(1000),
      },
    ), true);

    const result = await restored.service.fetchEntity(rev, humanId, detailPath);

    expect(restore.success).toBe(true);
    expect(result.cacheStatus).toBe("stale-offline");
    expect(result.data.id).toBe(humanId);
    expect(result.data.kind).toBe("species");
    expect(restored.client.fetchEntity).toHaveBeenCalledTimes(1);
    expect(restored.runtime.revision).toBe(rev);
    expect(restored.runtime.manifest?.catalogRevision).toBe(rev);
    expect(await restored.manager.getCached("entity/rev-001/species:2024:phb:elf"))
      .not.toBeNull();
  });
});

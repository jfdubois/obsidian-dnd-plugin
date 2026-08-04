import { describe, expect, it, vi } from "vitest";
import {
  createCacheEnvelope,
  createNoExpiryExpiration,
} from "@obsidian-dnd/catalog-contract";
import {
  activateAndPersist,
  createGraph,
  createHumanEntity,
  createHumanSummary,
  createManifest,
  createSourcesRecord,
  detailPath,
  humanId,
  keys,
  rev,
  srcRevision,
} from "./catalog-service.test-helpers";
import type { EntityDetailResult } from "./client";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

describe("CatalogService authoritative source revision", () => {
  it("derives manifest, sources, index, and entity hashes from active manifest", async () => {
    const backing = { data: null };
    const graph = createGraph(backing);
    await activateAndPersist(graph);

    vi.mocked(graph.client.fetchManifest).mockClear();
    vi.mocked(graph.client.fetchSources).mockClear();
    vi.mocked(graph.client.fetchIndex).mockClear();
    vi.mocked(graph.client.fetchEntity).mockClear();

    const manifest = await graph.service.fetchManifest(rev);
    const sources = await graph.service.fetchSources(rev);
    const index = await graph.service.fetchIndex(rev, "species");
    const entity = await graph.service.fetchEntity(rev, humanId, detailPath);

    expect(manifest.sourceRevision).toBe(srcRevision);
    expect(sources[0]?.id).toBe("phb");
    expect(index[0]?.id).toBe(humanId);
    expect(entity.data.id).toBe(humanId);
    expect(graph.client.fetchManifest).not.toHaveBeenCalled();
    expect(graph.client.fetchSources).not.toHaveBeenCalled();
    expect(graph.client.fetchIndex).not.toHaveBeenCalled();
    expect(graph.client.fetchEntity).not.toHaveBeenCalled();
    expect((await graph.manager.getCached(keys.manifest()))?.inputHash).toBe(keys.manifestHash());
    expect((await graph.manager.getCached(keys.sources()))?.inputHash).toBe(keys.sourcesHash());
    expect((await graph.manager.getCached(keys.index("species")))?.inputHash).toBe(keys.indexHash("species"));
    expect((await graph.manager.getCached(keys.entity()))?.inputHash).toBe(keys.entityHash());
  });

  it("uses restored active manifest source revision after restart", async () => {
    const backing = { data: null };
    const original = createGraph(backing);
    await activateAndPersist(original);
    await original.service.dispose();

    const restored = createGraph(backing, { throwOnClientFetch: true });
    await restored.store.initialize();
    const restore = await restored.runtime.restoreFromCache();
    const entity = await restored.service.fetchEntity(rev, humanId, detailPath);

    expect(restore.success).toBe(true);
    expect(restored.runtime.manifest?.sourceRevision).toBe(srcRevision);
    expect(entity.data.id).toBe(humanId);
    expect(restored.client.fetchEntity).not.toHaveBeenCalled();
  });

  it("does not expose a public sourceRevision parameter", () => {
    const graph = createGraph({ data: null });

    expect(graph.service.fetchManifest.length).toBe(1);
    expect(graph.service.fetchSources.length).toBe(1);
    expect(graph.service.fetchIndex.length).toBe(2);
    expect(graph.service.fetchEntity.length).toBe(3);
  });

  it("returns actionable unavailable error when no active manifest exists", async () => {
    const graph = createGraph({ data: null });

    await expect(graph.service.fetchEntity(rev, humanId, detailPath))
      .rejects.toThrow("catalog unavailable: no active manifest");
  });

  it("prevents source revision override by ignoring incompatible caller data", async () => {
    const backing = { data: null };
    const graph = createGraph(backing);
    await graph.store.initialize();
    graph.runtime.revision = rev;
    graph.runtime.manifest = createManifest("authoritative-src");
    graph.runtime.activationState = "active";
    await graph.manager.set(keys.entity(), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: rev,
      inputHash: "authoritative-src:species:2024:phb:human",
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: createHumanEntity(),
    }));
    await graph.manager.set(keys.sources(), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: rev,
      inputHash: "authoritative-src",
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: createSourcesRecord(),
    }));
    await graph.manager.set(keys.index("species"), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: rev,
      inputHash: "authoritative-src:species",
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: [createHumanSummary()],
    }));

    const result: EntityDetailResult = await graph.service.fetchEntity(
      rev,
      humanId,
      detailPath,
    );

    expect(result.data.id).toBe(humanId);
    expect(graph.client.fetchEntity).not.toHaveBeenCalled();
  });
});

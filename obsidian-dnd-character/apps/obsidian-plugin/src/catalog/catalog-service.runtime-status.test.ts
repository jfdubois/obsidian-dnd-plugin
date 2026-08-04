import { describe, expect, it, vi } from "vitest";
import type { CatalogRestoreResult, CatalogRuntimeService } from "@obsidian-dnd/catalog-contract";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

import { CatalogService } from "./catalog-service";
import {
  createBackingPlugin, createClient, createEntityResult, createGraph, createManifest,
  detailPath, humanId, rev, srcRevision,
} from "./catalog-service.test-helpers";

function fakeRuntime(result: CatalogRestoreResult) {
  return {
    activationState: "inactive", revision: undefined, manifest: undefined,
    restoreFromCache: vi.fn(async () => result),
  } as unknown as CatalogRuntimeService;
}

function serviceFor(result: CatalogRestoreResult) {
  const client = createClient();
  const service = new CatalogService(createBackingPlugin({ data: null }), client, {
    baseUrl: "https://catalog.test", runtimeService: fakeRuntime(result),
  });
  return { client, service };
}

function expectNoNetwork(client: ReturnType<typeof createClient>) {
  expect(client.fetchCurrentRevision).not.toHaveBeenCalled();
  expect(client.fetchManifest).not.toHaveBeenCalled();
  expect(client.fetchSources).not.toHaveBeenCalled();
  expect(client.fetchIndex).not.toHaveBeenCalled();
  expect(client.fetchEntity).not.toHaveBeenCalled();
}

describe("CatalogService runtime status", () => {
  it("normalizes construction status and returns an immutable snapshot", () => {
    const plugin = createBackingPlugin({ data: null });
    const noUrl = new CatalogService(plugin, createClient(), { baseUrl: "  " });
    const configured = new CatalogService(plugin, createClient(), { baseUrl: " https://catalog.test " });
    expect(noUrl.getRuntimeStatus()).toMatchObject({ state: "not-configured", activationState: "inactive", connectivity: "unknown", cacheMode: "none", busy: false });
    expect(configured.getRuntimeStatus()).toMatchObject({ configuredUrl: "https://catalog.test", state: "inactive", busy: false });
    expect(Object.isFrozen(configured.getRuntimeStatus())).toBe(true);
    expect(configured.getRuntimeStatus()).not.toHaveProperty("activeRevision");
    expect(configured.getRuntimeStatus()).not.toHaveProperty("advertisedRevision");
  });

  it("publishes pending before successful offline restoration and retains it without listeners", async () => {
    let resolveRestore!: (result: CatalogRestoreResult) => void;
    const restore = new Promise<CatalogRestoreResult>((resolve) => { resolveRestore = resolve; });
    const runtime = fakeRuntime({ success: true, revision: rev });
    runtime.restoreFromCache = vi.fn(() => restore);
    Object.assign(runtime, { activationState: "active", revision: rev, manifest: createManifest(srcRevision) });
    const client = createClient();
    const service = new CatalogService(createBackingPlugin({ data: null }), client, { baseUrl: "https://catalog.test", runtimeService: runtime });
    const states: string[] = [];
    service.subscribeRuntimeStatus((status) => states.push(status.state));
    const initializing = service.initialize();
    await vi.waitFor(() => expect(service.getRuntimeStatus()).toMatchObject({ state: "restoring", busy: true }));
    resolveRestore({ success: true, revision: rev });
    await initializing;
    expect(states).toContain("restoring");
    expect(service.getRuntimeStatus()).toMatchObject({ state: "cached-offline", activationState: "active", activeRevision: rev, sourceRevision: srcRevision, cacheMode: "offline", connectivity: "unknown", busy: false });
    expect(service.getRuntimeStatus()).not.toHaveProperty("advertisedRevision");
    const later = vi.fn(); service.subscribeRuntimeStatus(later);
    expect(later).toHaveBeenCalledWith(service.getRuntimeStatus());
    expectNoNetwork(client);
  });

  it("immediately subscribes, isolates later listener failures, and supports idempotent unsubscribe", async () => {
    const { service } = serviceFor({ success: false, reason: "manifest-missing" });
    const throwing = vi.fn(() => { throw new Error("observer"); });
    const received = vi.fn();
    service.subscribeRuntimeStatus(throwing);
    const unsubscribe = service.subscribeRuntimeStatus(received);
    expect(received).toHaveBeenCalledTimes(1);
    await service.initialize();
    expect(throwing).toHaveBeenCalledTimes(3);
    expect(received).toHaveBeenCalledTimes(3);
    unsubscribe(); unsubscribe();
    await service.initialize();
    expect(received).toHaveBeenCalledTimes(3);
  });

  it("maps first-run invalid pointers to inactive without a corruption diagnostic", async () => {
    const { client, service } = serviceFor({ success: false, reason: "invalid-pointer" });
    await service.initialize();
    expect(service.getRuntimeStatus()).toMatchObject({ state: "inactive", activationState: "inactive", cacheMode: "none", connectivity: "unknown" });
    expect(service.getRuntimeStatus().lastDiagnostic).toBeUndefined();
    expectNoNetwork(client);
  });

  it.each([
    "manifest-missing", "manifest-malformed", "index-malformed", "manifest-revision-mismatch",
    "schema-incompatible", "no-persistence", "no-cache-manager",
  ] as const)("retains an actionable %s restoration diagnostic without network access", async (reason) => {
    const { client, service } = serviceFor({ success: false, reason });
    await service.initialize();
    expect(service.getRuntimeStatus()).toMatchObject({
      state: reason === "schema-incompatible" ? "incompatible" : "error",
      activationState: "inactive", lastDiagnostic: { reason },
    });
    expect(service.getRuntimeStatus().lastDiagnostic?.message).toBeTruthy();
    expect(service.getRuntimeStatus().activeRevision).toBeUndefined();
    expectNoNetwork(client);
  });

  it.each(["revision", "manifest"] as const)("rejects successful restoration without a runtime %s", async (missing) => {
    const runtime = fakeRuntime({ success: true, revision: rev });
    Object.assign(runtime, {
      activationState: "active",
      ...(missing === "revision" ? { manifest: createManifest(srcRevision) } : { revision: rev }),
    });
    const service = new CatalogService(createBackingPlugin({ data: null }), createClient(), { baseUrl: "https://catalog.test", runtimeService: runtime });
    await service.initialize();
    expect(service.getRuntimeStatus()).toMatchObject({ state: "error", activationState: "inactive", lastDiagnostic: { reason: "runtime-inconsistent" } });
    expect(service.getRuntimeStatus().activeRevision).toBeUndefined();
  });

  it("tracks unresolved IDs distinctly, projects safe diagnostics, and clears only a later success", async () => {
    const graph = createGraph({ data: null }, { throwOnClientFetch: true });
    await graph.store.initialize();
    graph.runtime.activationState = "active"; graph.runtime.revision = rev; graph.runtime.manifest = createManifest(srcRevision);
    const service = new CatalogService(graph.plugin, graph.client, { baseUrl: "https://catalog.test", cacheStore: graph.store, cacheManager: graph.manager, runtimeService: graph.runtime });
    graph.runtime.restoreFromCache = vi.fn(async (): Promise<CatalogRestoreResult> => ({ success: true, revision: rev }));
    await service.initialize();
    const statuses: number[] = [];
    service.subscribeRuntimeStatus((status) => statuses.push(status.unresolvedEntityCount));
    const elfId = "species:2024:phb:elf";
    await expect(service.fetchEntity(rev, humanId, detailPath)).rejects.toMatchObject({ code: "ENTITY_UNRESOLVED" });
    await expect(service.fetchEntity(rev, humanId, detailPath)).rejects.toMatchObject({ code: "ENTITY_UNRESOLVED" });
    await expect(service.fetchEntity(rev, elfId, "entities/species/elf.json")).rejects.toMatchObject({ code: "ENTITY_UNRESOLVED" });
    expect(service.getRuntimeStatus()).toMatchObject({ unresolvedEntityCount: 2, activeRevision: rev, sourceRevision: srcRevision, lastDiagnostic: { failedEntityId: elfId, failedEntityKind: "species" } });
    expect(service.getRuntimeStatus().lastDiagnostic).not.toHaveProperty("cause");
    expect(service.getRuntimeStatus().lastDiagnostic).not.toHaveProperty("stack");
    graph.client.fetchEntity = vi.fn(async () => createEntityResult());
    await service.fetchEntity(rev, humanId, detailPath);
    expect(service.getRuntimeStatus()).toMatchObject({ unresolvedEntityCount: 1, activeRevision: rev, sourceRevision: srcRevision });
    expect(statuses).toEqual(expect.arrayContaining([0, 1, 2, 1]));
  });

  it("clears listeners after flushing on disposal", async () => {
    const graph = createGraph({ data: null });
    const listener = vi.fn(); graph.service.subscribeRuntimeStatus(listener);
    const flush = vi.spyOn(graph.store, "flush");
    await graph.service.dispose();
    expect(flush).toHaveBeenCalledOnce();
    await graph.service.initialize();
    expect(listener).toHaveBeenCalledOnce();
  });
});

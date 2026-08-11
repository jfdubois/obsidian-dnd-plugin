import { describe, expect, it, vi } from "vitest";
import { CatalogRuntimeError, createCatalogManifest, type ActivateOptions, type CatalogRuntimeService } from "@obsidian-dnd/catalog-contract";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import { CatalogService } from "./catalog-service";
import { createBackingPlugin, createClient, createManifest, rev, srcRevision } from "./catalog-service.test-helpers";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

const revisionB = createCatalogRevision("rev-002");
function manifest(revision = revisionB, sourceRevision = "src-002") {
  return createCatalogManifest({ schemaVersion: 2, catalogRevision: revision, sourceRevision, builderVersion: "test", generatedAt: "2026-08-03T00:00:00Z", rulesets: ["2024"], entityKinds: ["species", "background", "class", "feat", "spell", "item"], checksums: { "manifest.json": "sha256-test" } });
}
function runtime(active = false) {
  return {
    activationState: active ? "active" : "inactive", revision: active ? rev : undefined,
    manifest: active ? createManifest(srcRevision) : undefined,
    activate: vi.fn(async (_options?: ActivateOptions) => undefined), restoreFromCache: vi.fn(),
  } as unknown as CatalogRuntimeService;
}
function setup(options: { active?: boolean; advertised?: typeof rev; now?: () => Date } = {}) {
  const client = createClient();
  const serviceRuntime = runtime(options.active);
  client.fetchCurrentRevision = vi.fn(async () => options.advertised ?? revisionB);
  client.fetchManifest = vi.fn(async (revision) => manifest(revision));
  client.negotiateSchema = vi.fn(() => ({ compatible: true, serverSchemaVersion: 1, pluginSchemaVersion: 1 }));
  const service = new CatalogService(createBackingPlugin({ data: null }), client, { baseUrl: "https://catalog.test", runtimeService: serviceRuntime, now: options.now });
  return { client, service, runtime: serviceRuntime };
}

describe("CatalogService online discovery and refresh", () => {
  it("discovers a current revision without activating or mutating the active runtime", async () => {
    const graph = setup({ active: true, advertised: rev, now: () => new Date("2026-08-03T12:00:00.000Z") });
    await expect(graph.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: true, updateAvailable: false });
    expect(graph.runtime.activate).not.toHaveBeenCalled();
    expect(graph.service.getRuntimeStatus()).toMatchObject({ state: "current", activeRevision: rev, advertisedRevision: rev, connectivity: "online", lastRefreshAt: "2026-08-03T12:00:00.000Z" });
  });

  it("retains an advertised update and activates only through the runtime transaction", async () => {
    const graph = setup({ active: true });
    graph.runtime.activate = vi.fn(async () => { Object.assign(graph.runtime, { activationState: "active", revision: revisionB, manifest: manifest() }); });
    const seen: string[] = []; graph.service.subscribeRuntimeStatus((status) => seen.push(status.state));
    await expect(graph.service.refreshCatalog()).resolves.toEqual({ success: true, activeRevision: revisionB, changed: true });
    expect(graph.runtime.activate).toHaveBeenCalledOnce();
    expect(seen).toContain("refreshing");
    expect(graph.service.getRuntimeStatus()).toMatchObject({ state: "current", activeRevision: revisionB, advertisedRevision: revisionB, sourceRevision: "src-002", connectivity: "online", cacheMode: "current" });
  });

  it("skips activation for an already current revision and passes options unchanged when needed", async () => {
    const current = setup({ active: true, advertised: rev });
    await expect(current.service.refreshCatalog()).resolves.toEqual({ success: true, activeRevision: rev, changed: false });
    expect(current.runtime.activate).not.toHaveBeenCalled();
    const updating = setup(); const options: ActivateOptions = { requiredReferences: [] };
    updating.runtime.activate = vi.fn(async () => { Object.assign(updating.runtime, { activationState: "active", revision: revisionB, manifest: manifest() }); });
    await updating.service.refreshCatalog(options);
    expect(updating.runtime.activate).toHaveBeenCalledWith(options);
  });

  it("blocks incompatible discovery and preserves the existing active revision", async () => {
    const graph = setup({ active: true });
    graph.client.negotiateSchema = vi.fn(() => ({ compatible: false, serverSchemaVersion: 2, pluginSchemaVersion: 1, reason: "schema differs" }));
    await expect(graph.service.refreshCatalog()).resolves.toMatchObject({ success: false, reason: "incompatible" });
    expect(graph.runtime.activate).not.toHaveBeenCalled();
    expect(graph.service.getRuntimeStatus()).toMatchObject({ state: "incompatible", activeRevision: rev, advertisedRevision: revisionB });
  });

  it("records activation failure and retains the rolled-back runtime state", async () => {
    const graph = setup({ active: true, now: () => new Date("2026-08-03T12:30:00.000Z") });
    graph.runtime.activate = vi.fn(async () => { throw new Error("candidate failed"); });
    await expect(graph.service.refreshCatalog()).resolves.toMatchObject({ success: false, reason: "activation-failed" });
    expect(graph.service.getRuntimeStatus()).toMatchObject({ state: "error", activeRevision: rev, advertisedRevision: revisionB, lastRefreshAt: "2026-08-03T12:30:00.000Z" });
  });

  it("is single-flight and clears the flight after completion", async () => {
    const graph = setup(); let release!: () => void;
    graph.runtime.activate = vi.fn(() => new Promise<void>((resolve) => { release = () => { Object.assign(graph.runtime, { activationState: "active", revision: revisionB, manifest: manifest() }); resolve(); }; }));
    const first = graph.service.refreshCatalog(); const second = graph.service.refreshCatalog();
    await vi.waitFor(() => expect(graph.runtime.activate).toHaveBeenCalledOnce()); release();
    await expect(Promise.all([first, second])).resolves.toEqual([{ success: true, activeRevision: revisionB, changed: true }, { success: true, activeRevision: revisionB, changed: true }]);
    await graph.service.refreshCatalog(); expect(graph.client.fetchCurrentRevision).toHaveBeenCalledTimes(2);
  });

  it("retains discovery facts without fabricating an active catalog", async () => {
    const graph = setup({ now: () => new Date("2026-08-03T13:00:00.000Z") });
    await expect(graph.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: true, advertisedRevision: revisionB, updateAvailable: true });
    expect(graph.service.getRuntimeStatus()).toMatchObject({ state: "inactive", activationState: "inactive", advertisedRevision: revisionB, connectivity: "online", lastRefreshAt: "2026-08-03T13:00:00.000Z" });
    expect(graph.service.getRuntimeStatus().activeRevision).toBeUndefined();
  });

  it("maps malformed discovery, HTTP, and schema failures without activation", async () => {
    const mismatch = setup({ active: true }); mismatch.client.fetchManifest = vi.fn(async () => manifest(rev));
    await expect(mismatch.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: false, reason: "invalid-response" });
    expect(mismatch.service.getRuntimeStatus()).toMatchObject({ activeRevision: rev, advertisedRevision: revisionB, connectivity: "online" });
    const http = setup({ active: true }); http.client.fetchCurrentRevision = vi.fn(async () => { throw { message: "not found", status: 404 }; });
    await expect(http.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: false, reason: "invalid-response" });
    expect(http.service.getRuntimeStatus()).toMatchObject({ activeRevision: rev, connectivity: "online" });
    const incompatible = setup({ active: true }); incompatible.client.negotiateSchema = vi.fn(() => ({ compatible: false, serverSchemaVersion: 2, pluginSchemaVersion: 1, reason: "different" }));
    await expect(incompatible.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: false, reason: "incompatible" });
    expect(incompatible.runtime.activate).not.toHaveBeenCalled();
  });

  it("does not infer offline state from an arbitrary TypeError", async () => {
    const graph = setup({ active: true }); graph.client.fetchManifest = vi.fn(async () => { throw new TypeError("validation"); });
    await expect(graph.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: false, reason: "invalid-response" });
    expect(graph.service.getRuntimeStatus()).toMatchObject({ activeRevision: rev, connectivity: "unknown" });
  });

  it("reports an inconsistent successful activation without inventing a revision", async () => {
    const graph = setup();
    await expect(graph.service.refreshCatalog()).resolves.toMatchObject({ success: false, reason: "runtime-inconsistent" });
    expect(graph.service.getRuntimeStatus()).toMatchObject({ state: "error", activationState: "inactive", advertisedRevision: revisionB });
    expect(graph.service.getRuntimeStatus().activeRevision).toBeUndefined();
  });

  it("reports each incomplete runtime success as inconsistent", async () => {
    for (const mutate of [
      (value: ReturnType<typeof setup>) => Object.assign(value.runtime, { activationState: "active", revision: undefined, manifest: undefined }),
      (value: ReturnType<typeof setup>) => Object.assign(value.runtime, { activationState: "active", revision: revisionB, manifest: undefined }),
      (value: ReturnType<typeof setup>) => Object.assign(value.runtime, { activationState: "active", revision: revisionB, manifest: manifest(rev) }),
    ]) {
      const graph = setup();
      graph.runtime.activate = vi.fn(async () => { mutate(graph); });
      await expect(graph.service.refreshCatalog()).resolves.toMatchObject({ success: false, reason: "runtime-inconsistent" });
      expect(graph.service.getRuntimeStatus()).toMatchObject({ state: "error", advertisedRevision: revisionB });
    }
  });

  it("keeps status snapshots immutable and retained after listeners close", async () => {
    const graph = setup({ now: () => new Date("2026-08-03T14:00:00.000Z") });
    const states: string[] = []; const unsubscribe = graph.service.subscribeRuntimeStatus((status) => states.push(status.state));
    await graph.service.checkForCatalogUpdate(); unsubscribe();
    const retained = graph.service.getRuntimeStatus();
    expect(Object.isFrozen(retained)).toBe(true);
    expect(retained.advertisedRevision).toBe(revisionB);
    const late = vi.fn(); graph.service.subscribeRuntimeStatus(late);
    expect(late).toHaveBeenCalledWith(retained);
    expect(states).toContain("refreshing");
    expect(retained.lastRefreshAt).toBe("2026-08-03T14:00:00.000Z");
  });

  it("uses structured transport failures as offline and preserves the active runtime", async () => {
    const graph = setup({ active: true });
    graph.client.fetchCurrentRevision = vi.fn(async () => { throw { message: "network unavailable", transport: true }; });
    await expect(graph.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: false, reason: "unavailable" });
    expect(graph.service.getRuntimeStatus()).toMatchObject({ activeRevision: rev, connectivity: "offline" });
    graph.client.fetchCurrentRevision = vi.fn(async () => revisionB);
    graph.client.fetchManifest = vi.fn(async () => { throw { message: "network unavailable", transport: true }; });
    await expect(graph.service.checkForCatalogUpdate()).resolves.toMatchObject({ success: false, reason: "unavailable" });
    expect(graph.service.getRuntimeStatus()).toMatchObject({ activeRevision: rev, advertisedRevision: revisionB, connectivity: "offline" });
  });

  it("clears flight after failure and permits a later successful retry", async () => {
    const graph = setup({ active: true });
    graph.runtime.activate = vi.fn(async () => { throw new Error("failed"); });
    await expect(graph.service.refreshCatalog()).resolves.toMatchObject({ success: false, reason: "activation-failed" });
    graph.runtime.activate = vi.fn(async () => { Object.assign(graph.runtime, { activationState: "active", revision: revisionB, manifest: manifest() }); });
    await expect(graph.service.refreshCatalog()).resolves.toEqual({ success: true, activeRevision: revisionB, changed: true });
    expect(graph.runtime.activate).toHaveBeenCalledOnce();
  });

  it.each([
    ["candidate validation", new CatalogRuntimeError({ endpoint: "manifest", revision: revisionB, message: "candidate invalid", candidateRevision: revisionB, previousActiveRevision: rev, resultingActivationState: "active" })],
    ["cache staging", new CatalogRuntimeError({ endpoint: "entity", revision: revisionB, message: "cache rejected", candidateRevision: revisionB, previousActiveRevision: rev, operation: "cache-write", artifact: "entity", resultingActivationState: "active" })],
    ["pointer save", new CatalogRuntimeError({ endpoint: "active", revision: revisionB, message: "pointer rejected", candidateRevision: revisionB, previousActiveRevision: rev, operation: "active-revision-save", artifact: "active-pointer", resultingActivationState: "active" })],
  ])("projects typed %s transaction failures without replacing the former catalog", async (_name, error) => {
    const graph = setup({ active: true });
    graph.runtime.activate = vi.fn(async () => { throw error; });
    await expect(graph.service.refreshCatalog()).resolves.toMatchObject({ success: false, reason: "activation-failed" });
    expect(graph.runtime.activate).toHaveBeenCalledOnce();
    expect(graph.service.getRuntimeStatus()).toMatchObject({ activeRevision: rev, sourceRevision: srcRevision, advertisedRevision: revisionB, lastDiagnostic: { candidateRevision: revisionB, previousActiveRevision: rev } });
  });

  it("coalesces concurrent checks and a check during refresh without duplicate discovery", async () => {
    const checking = setup({ active: true }); let releaseCheck!: () => void;
    checking.client.fetchCurrentRevision = vi.fn(() => new Promise<string>((resolve) => { releaseCheck = () => resolve(revisionB); }));
    const firstCheck = checking.service.checkForCatalogUpdate(); const secondCheck = checking.service.checkForCatalogUpdate();
    await vi.waitFor(() => expect(checking.client.fetchCurrentRevision).toHaveBeenCalledOnce()); releaseCheck();
    await expect(Promise.all([firstCheck, secondCheck])).resolves.toEqual([
      { success: true, advertisedRevision: revisionB, compatible: true, updateAvailable: true },
      { success: true, advertisedRevision: revisionB, compatible: true, updateAvailable: true },
    ]);

    const refreshing = setup(); let releaseActivation!: () => void;
    refreshing.runtime.activate = vi.fn(() => new Promise<void>((resolve) => { releaseActivation = () => { Object.assign(refreshing.runtime, { activationState: "active", revision: revisionB, manifest: manifest() }); resolve(); }; }));
    const refresh = refreshing.service.refreshCatalog(); await vi.waitFor(() => expect(refreshing.runtime.activate).toHaveBeenCalledOnce());
    const joinedCheck = refreshing.service.checkForCatalogUpdate(); releaseActivation();
    await expect(Promise.all([refresh, joinedCheck])).resolves.toEqual([
      { success: true, activeRevision: revisionB, changed: true },
      { success: true, advertisedRevision: revisionB, compatible: true, updateAvailable: false },
    ]);
    expect(refreshing.client.fetchCurrentRevision).toHaveBeenCalledOnce();
  });

  it("publishes exactly one pending and final transition and timestamps only completion", async () => {
    const graph = setup({ active: true, now: () => new Date("2026-08-03T15:00:00.000Z") }); let release!: () => void;
    graph.runtime.activate = vi.fn(() => new Promise<void>((resolve) => { release = () => { Object.assign(graph.runtime, { activationState: "active", revision: revisionB, manifest: manifest() }); resolve(); }; }));
    const received = vi.fn(); graph.service.subscribeRuntimeStatus(received); received.mockClear();
    const refresh = graph.service.refreshCatalog(); await vi.waitFor(() => expect(graph.runtime.activate).toHaveBeenCalledOnce());
    expect(received).toHaveBeenCalledTimes(1); expect(received).toHaveBeenLastCalledWith(expect.objectContaining({ state: "refreshing", busy: true, activeRevision: rev }));
    expect(graph.service.getRuntimeStatus().lastRefreshAt).toBeUndefined(); release(); await refresh;
    expect(received).toHaveBeenCalledTimes(2); expect(received).toHaveBeenLastCalledWith(expect.objectContaining({ state: "current", busy: false, lastRefreshAt: "2026-08-03T15:00:00.000Z" }));
    expect(graph.service.getRuntimeStatus()).toBe(graph.service.getRuntimeStatus());
  });
});

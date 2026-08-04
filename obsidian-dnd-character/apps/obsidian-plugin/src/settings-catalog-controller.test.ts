import { describe, expect, it, vi } from "vitest";

import type { CatalogService } from "./catalog/catalog-service";
import type { CatalogRuntimeStatusSnapshot } from "./catalog/catalog-runtime-status";
import { SettingsCatalogController } from "./settings-catalog-controller";

const current = (overrides: Partial<CatalogRuntimeStatusSnapshot> = {}): CatalogRuntimeStatusSnapshot => ({
  state: "current", activationState: "active", schemaCompatibility: "compatible",
  connectivity: "online", cacheMode: "current", unresolvedEntityCount: 0, busy: false,
  activeRevision: "active" as CatalogRuntimeStatusSnapshot["activeRevision"],
  advertisedRevision: "advertised" as CatalogRuntimeStatusSnapshot["advertisedRevision"],
  sourceRevision: "source", lastRefreshAt: "2026-08-04T00:00:00Z",
  lastDiagnostic: { message: "safe diagnostic" }, ...overrides,
});

function service(status = current()) {
  const listeners = new Set<(value: CatalogRuntimeStatusSnapshot) => void>();
  const instance = {
    getRuntimeStatus: vi.fn(() => status),
    subscribeRuntimeStatus: vi.fn((listener: (value: CatalogRuntimeStatusSnapshot) => void) => {
      listeners.add(listener); listener(status); return () => listeners.delete(listener);
    }),
    checkForCatalogUpdate: vi.fn(async () => undefined), refreshCatalog: vi.fn(async () => undefined),
    publish(value: CatalogRuntimeStatusSnapshot) { status = value; listeners.forEach((listener) => listener(value)); },
    listenerCount: () => listeners.size,
  };
  return instance;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("SettingsCatalogController", () => {
  it("binds retained service status and cleans up subscriptions on redisplay", async () => {
    const catalog = service(); const statuses: CatalogRuntimeStatusSnapshot[] = [];
    const plugin = { settings: { catalogServerUrl: "https://a", catalogRevision: "", charactersVaultPath: "dnd", schemaVersion: 1 }, getCatalogService: vi.fn(async () => catalog as unknown as CatalogService), setCatalogServerUrl: vi.fn(), saveSettings: vi.fn() };
    const controller = new SettingsCatalogController(plugin, { loading: vi.fn(), status: (value) => statuses.push(value), operationPending: vi.fn(), actionError: vi.fn(), urlApplied: vi.fn() });
    controller.display(); await Promise.resolve();
    expect(statuses[0]).toMatchObject({ activeRevision: "active", advertisedRevision: "advertised", sourceRevision: "source", lastRefreshAt: "2026-08-04T00:00:00Z", unresolvedEntityCount: 0, lastDiagnostic: { message: "safe diagnostic" } });
    controller.display(); await Promise.resolve();
    expect(catalog.listenerCount()).toBe(1);
    expect(catalog.subscribeRuntimeStatus).toHaveBeenCalledTimes(2);
    catalog.publish(current({ state: "update-available" }));
    expect(statuses[statuses.length - 1]?.state).toBe("update-available");
  });

  it("keeps the former binding on apply failure and binds the normalized replacement on retry", async () => {
    const former = service(); const replacement = service(current({ state: "not-configured", busy: false }));
    const plugin = { settings: { catalogServerUrl: "https://old", catalogRevision: "", charactersVaultPath: "dnd", schemaVersion: 1 }, getCatalogService: vi.fn(async () => former as unknown as CatalogService), setCatalogServerUrl: vi.fn().mockRejectedValueOnce(new Error("no")).mockImplementationOnce(async () => { plugin.settings.catalogServerUrl = ""; return replacement as unknown as CatalogService; }), saveSettings: vi.fn() };
    const errors: string[] = []; const urls: string[] = [];
    const controller = new SettingsCatalogController(plugin, { loading: vi.fn(), status: vi.fn(), operationPending: vi.fn(), actionError: (value) => errors.push(value), urlApplied: (value) => urls.push(value) });
    controller.display(); await Promise.resolve();
    await controller.applyUrl("  ");
    expect(former.listenerCount()).toBe(1); expect(errors).toEqual(["Could not apply the catalog URL."]);
    await controller.applyUrl("  ");
    expect(plugin.setCatalogServerUrl).toHaveBeenCalledTimes(2); expect(plugin.setCatalogServerUrl).toHaveBeenLastCalledWith("  ");
    expect(former.listenerCount()).toBe(0); expect(replacement.listenerCount()).toBe(1); expect(urls).toEqual([""]);
  });

  it("delegates actions once and catches unexpected action rejection without a status replacement", async () => {
    const catalog = service(); catalog.refreshCatalog.mockRejectedValueOnce(new Error("unexpected"));
    const plugin = { settings: { catalogServerUrl: "https://a", catalogRevision: "", charactersVaultPath: "dnd", schemaVersion: 1 }, getCatalogService: vi.fn(async () => catalog as unknown as CatalogService), setCatalogServerUrl: vi.fn(), saveSettings: vi.fn() };
    const errors: string[] = []; const controller = new SettingsCatalogController(plugin, { loading: vi.fn(), status: vi.fn(), operationPending: vi.fn(), actionError: (value) => errors.push(value), urlApplied: vi.fn() });
    controller.display(); await Promise.resolve();
    await controller.checkForUpdates(); await controller.refresh();
    expect(catalog.checkForCatalogUpdate).toHaveBeenCalledOnce(); expect(catalog.refreshCatalog).toHaveBeenCalledOnce();
    expect(errors).toEqual(["Catalog action could not be completed."]);
  });

  it("ignores stale service lookup and stale callbacks after redisplay", async () => {
    const first = deferred<CatalogService>(); const second = service();
    const plugin = { settings: { catalogServerUrl: "https://a", catalogRevision: "", charactersVaultPath: "dnd", schemaVersion: 1 }, getCatalogService: vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(second as unknown as CatalogService), setCatalogServerUrl: vi.fn(), saveSettings: vi.fn() };
    const seen: string[] = []; const controller = new SettingsCatalogController(plugin, { loading: vi.fn(), status: (value) => seen.push(value.state), operationPending: vi.fn(), actionError: vi.fn(), urlApplied: vi.fn() });
    controller.display(); controller.display(); await Promise.resolve();
    first.resolve(service(current({ state: "error" })) as unknown as CatalogService); await Promise.resolve();
    expect(seen).toEqual(["current"]); expect(second.listenerCount()).toBe(1);
  });

  it("does not let a stale URL replacement replace a newer binding", async () => {
    const former = service(); const newer = service(); const candidate = service(); const pending = deferred<CatalogService>();
    const plugin = { settings: { catalogServerUrl: "https://a", catalogRevision: "", charactersVaultPath: "dnd", schemaVersion: 1 }, getCatalogService: vi.fn().mockResolvedValueOnce(former as unknown as CatalogService).mockResolvedValueOnce(newer as unknown as CatalogService), setCatalogServerUrl: vi.fn(() => pending.promise), saveSettings: vi.fn() };
    const applyingStates: boolean[] = []; const operationPending = vi.fn();
    const controller = new SettingsCatalogController(plugin, { loading: vi.fn(), status: (_status, value) => applyingStates.push(value), operationPending, actionError: vi.fn(), urlApplied: vi.fn() });
    controller.display(); await Promise.resolve();
    const applying = controller.applyUrl("https://candidate"); controller.display(); await Promise.resolve();
    pending.resolve(candidate as unknown as CatalogService); await applying;
    expect(newer.listenerCount()).toBe(1); expect(candidate.listenerCount()).toBe(0);
    expect(applyingStates[applyingStates.length - 1]).toBe(false); expect(operationPending).toHaveBeenCalledWith(true);
  });
});

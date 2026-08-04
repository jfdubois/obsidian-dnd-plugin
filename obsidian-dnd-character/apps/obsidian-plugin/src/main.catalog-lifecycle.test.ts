import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockCatalogService {
  baseUrl: string;
  initialize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

const state = vi.hoisted(() => ({
  clients: [] as Array<{ baseUrl: string; timeoutMs?: number }>,
  services: [] as MockCatalogService[],
  initialize: new Map<string, () => Promise<void>>(),
}));

vi.mock("obsidian", () => ({
  Plugin: class {
    app = { workspace: {}, vault: { on: vi.fn() } };
    loadData = vi.fn(async () => null);
    saveData = vi.fn(async () => undefined);
    registerView = vi.fn(); addCommand = vi.fn(); registerEvent = vi.fn(); addSettingTab = vi.fn();
  },
  PluginSettingTab: class { constructor(..._args: unknown[]) {} },
  Setting: class {},
  ItemView: class { contentEl = { empty: vi.fn(), createEl: vi.fn() }; constructor(..._args: unknown[]) {} },
}));

vi.mock("./catalog/request-url-client", () => ({
  RequestUrlCatalogClient: class {
    constructor(config: { baseUrl: string; timeoutMs?: number }) { state.clients.push(config); }
  },
}));

vi.mock("./catalog/catalog-service", () => ({
  CatalogService: class {
    readonly initialize = vi.fn(async () => {
      await state.initialize.get(this.baseUrl)?.();
    });
    readonly dispose = vi.fn(async () => undefined);

    constructor(
      _plugin: unknown,
      _client: unknown,
      private readonly config: { baseUrl?: string },
    ) {
      state.services.push(this);
    }

    get baseUrl(): string {
      return this.config.baseUrl ?? "";
    }

    getRuntimeStatus() {
      return { state: this.baseUrl === "" ? "not-configured" : "inactive" };
    }
  },
}));

import DndCharacterPlugin, { normalizeCatalogServerUrl } from "./main";

function plugin(url = "") {
  const instance = new DndCharacterPlugin({} as never, {} as never);
  instance.settings = { catalogServerUrl: url, catalogRevision: "", charactersVaultPath: "characters", schemaVersion: 1 };
  return instance;
}

beforeEach(() => {
  state.clients.length = 0;
  state.services.length = 0;
  state.initialize.clear();
});

describe("plugin-owned catalog lifecycle", () => {
  it("normalizes settings and creates one not-configured service without network access", async () => {
    const instance = plugin("  ");
    await instance.loadSettings();
    const service = await instance.getCatalogService();
    expect(normalizeCatalogServerUrl("  https://catalog.test  ")).toBe("https://catalog.test");
    expect(service.getRuntimeStatus()).toMatchObject({ state: "not-configured" });
    expect(state.clients).toEqual([{ baseUrl: "", timeoutMs: 5000 }]);
    expect(await instance.getCatalogService()).toBe(service);
    expect((service as unknown as MockCatalogService).initialize).toHaveBeenCalledOnce();
  });

  it("is single-flight and clears a failed initialization for retry", async () => {
    const instance = plugin("https://a.test");
    const first = instance.getCatalogService();
    const second = instance.getCatalogService();
    await expect(first).resolves.toBe(await second);
    expect(state.services).toHaveLength(1);
    state.initialize.set("https://b.test", async () => { throw new Error("restore failed"); });
    await expect(instance.setCatalogServerUrl("https://b.test")).rejects.toThrow("restore failed");
    state.initialize.delete("https://b.test");
    const replacement = await instance.setCatalogServerUrl("https://b.test");
    expect(replacement).toBe(state.services[2]);
    expect(state.services[1]?.dispose).toHaveBeenCalledOnce();
  });

  it("reuses whitespace-equivalent URLs without saving, initializing, or disposing", async () => {
    const instance = plugin("https://a.test");
    const service = await instance.getCatalogService();
    const save = vi.spyOn(instance, "saveData");
    await expect(instance.setCatalogServerUrl("  https://a.test ")).resolves.toBe(service);
    expect(save).not.toHaveBeenCalled();
    expect(state.services).toHaveLength(1);
    expect((service as unknown as MockCatalogService).dispose).not.toHaveBeenCalled();
  });

  it("persists a configured replacement after candidate initialization and disposes its former service", async () => {
    const instance = plugin("https://a.test");
    const former = await instance.getCatalogService() as unknown as MockCatalogService;
    const replacement = await instance.setCatalogServerUrl("  https://b.test ") as unknown as MockCatalogService;
    expect(instance.settings.catalogServerUrl).toBe("https://b.test");
    expect(replacement.baseUrl).toBe("https://b.test");
    expect(state.clients[state.clients.length - 1]).toEqual({ baseUrl: "https://b.test", timeoutMs: 5000 });
    expect(former.dispose).toHaveBeenCalledOnce();
    expect(await instance.getCatalogService()).toBe(replacement);
    expect(replacement.initialize).toHaveBeenCalledOnce();
  });

  it("clears configuration to one not-configured service and supports first configuration without refresh", async () => {
    const instance = plugin("https://a.test");
    const former = await instance.getCatalogService() as unknown as MockCatalogService;
    const empty = await instance.setCatalogServerUrl("  ");
    expect(former.dispose).toHaveBeenCalledOnce();
    expect(empty.getRuntimeStatus()).toMatchObject({ state: "not-configured" });
    expect(await instance.getCatalogService()).toBe(empty);
    const configured = await instance.setCatalogServerUrl("https://a.test");
    expect(configured).not.toBe(empty);
    expect((configured as unknown as MockCatalogService).initialize).toHaveBeenCalledOnce();
  });

  it("retains the old setting and service when persistence or candidate initialization fails", async () => {
    const instance = plugin("https://a.test");
    const current = await instance.getCatalogService();
    vi.spyOn(instance, "saveData").mockRejectedValueOnce(new Error("disk full"));
    await expect(instance.setCatalogServerUrl("https://b.test")).rejects.toThrow("disk full");
    expect(instance.settings.catalogServerUrl).toBe("https://a.test");
    expect(await instance.getCatalogService()).toBe(current);
    state.initialize.set("https://b.test", async () => { throw new Error("bad candidate"); });
    await expect(instance.setCatalogServerUrl("https://b.test")).rejects.toThrow("bad candidate");
    expect(state.services[state.services.length - 1]?.dispose).toHaveBeenCalledOnce();
    expect(await instance.getCatalogService()).toBe(current);
  });

  it("serializes duplicate and rapid replacements; a getter observes the stable published service", async () => {
    const instance = plugin("https://a.test");
    const initial = await instance.getCatalogService();
    const b = instance.setCatalogServerUrl("https://b.test");
    const sameB = instance.setCatalogServerUrl(" https://b.test ");
    const getter = instance.getCatalogService();
    expect(await getter).toBe(initial);
    await expect(sameB).resolves.toBe(await b);
    const c = await instance.setCatalogServerUrl("https://c.test") as unknown as MockCatalogService;
    expect(c.baseUrl).toBe("https://c.test");
    expect((await instance.getCatalogService())).toBe(c);
    expect(state.services.filter((service) => service.baseUrl === "https://b.test")).toHaveLength(1);
  });

  it("joins a pending first replacement instead of publishing the old configured URL", async () => {
    const instance = plugin("https://a.test");
    let finishB: (() => void) | undefined;
    state.initialize.set("https://b.test", () => new Promise<void>((resolve) => { finishB = resolve; }));
    const replacement = instance.setCatalogServerUrl("https://b.test");
    await vi.waitFor(() => expect(state.services.map((service) => service.baseUrl)).toEqual(["https://b.test"]));
    const getter = instance.getCatalogService();
    expect(state.clients.map((client) => client.baseUrl)).toEqual(["https://b.test"]);
    finishB?.();
    const service = await replacement;
    await expect(getter).resolves.toBe(service);
    expect(instance.catalogService).toBe(service);
    expect(state.services.map((candidate) => candidate.baseUrl)).toEqual(["https://b.test"]);
  });

  it("disposes once on unload and rejects late or post-unload construction", async () => {
    const instance = plugin("https://a.test");
    const current = await instance.getCatalogService() as unknown as MockCatalogService;
    instance.onunload(); instance.onunload();
    await vi.waitFor(() => expect(current.dispose).toHaveBeenCalledOnce());
    await expect(instance.getCatalogService()).rejects.toThrow("unloads");
    await expect(instance.setCatalogServerUrl("https://b.test")).rejects.toThrow("unloads");
  });
});

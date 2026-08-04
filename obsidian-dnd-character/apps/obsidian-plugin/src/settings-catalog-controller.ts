import type { CatalogService } from "./catalog/catalog-service";
import type { CatalogRuntimeStatusSnapshot } from "./catalog/catalog-runtime-status";
import type { DndCharacterPluginSettings } from "./settings";

export interface CatalogSettingsPlugin {
  settings: DndCharacterPluginSettings;
  getCatalogService(): Promise<CatalogService>;
  setCatalogServerUrl(value: string): Promise<CatalogService>;
  saveSettings(): Promise<void>;
}

interface CatalogControllerView {
  loading(): void;
  status(snapshot: CatalogRuntimeStatusSnapshot, applying: boolean): void;
  operationPending(applying: boolean): void;
  actionError(message: string): void;
  urlApplied(value: string): void;
}

/** Coordinates settings-tab subscriptions without owning catalog runtime state. */
export class SettingsCatalogController {
  private service: CatalogService | undefined;
  private unsubscribe: (() => void) | undefined;
  private generation = 0;
  private applying = false;
  private applyToken = 0;

  constructor(
    private readonly plugin: CatalogSettingsPlugin,
    private readonly view: CatalogControllerView,
  ) {}

  display(): void {
    const generation = ++this.generation;
    ++this.applyToken;
    this.applying = false;
    this.unsubscribeCurrent();
    this.service = undefined;
    this.view.loading();
    void this.plugin.getCatalogService().then(
      (service) => {
        if (generation === this.generation) this.bind(service);
      },
      () => {
        if (generation === this.generation) this.view.actionError("Catalog service is unavailable.");
      },
    );
  }

  async applyUrl(draft: string): Promise<void> {
    if (this.applying) return;
    const generation = this.generation;
    this.applying = true;
    this.view.operationPending(true);
    const token = ++this.applyToken;
    this.renderBoundStatus();
    try {
      const replacement = await this.plugin.setCatalogServerUrl(draft);
      if (token !== this.applyToken) return;
      this.applying = false;
      if (generation !== this.generation) return;
      this.view.operationPending(false);
      if (this.service !== replacement) {
        this.view.urlApplied(this.plugin.settings.catalogServerUrl);
        this.bind(replacement);
      } else {
        this.view.urlApplied(this.plugin.settings.catalogServerUrl);
        this.renderBoundStatus();
      }
    } catch {
      if (token === this.applyToken) {
        this.applying = false;
        if (generation === this.generation) {
          this.view.operationPending(false);
          this.view.actionError("Could not apply the catalog URL.");
          this.renderBoundStatus();
        }
      }
    }
  }

  async checkForUpdates(): Promise<void> {
    await this.runAction((service) => service.checkForCatalogUpdate());
  }

  async refresh(): Promise<void> {
    await this.runAction((service) => service.refreshCatalog());
  }

  private async runAction(action: (service: CatalogService) => Promise<unknown>): Promise<void> {
    const service = this.service;
    if (service === undefined || this.applying) return;
    try {
      await action(service);
    } catch {
      this.view.actionError("Catalog action could not be completed.");
    }
  }

  private bind(service: CatalogService): void {
    this.unsubscribeCurrent();
    this.service = service;
    const generation = this.generation;
    this.unsubscribe = service.subscribeRuntimeStatus((snapshot) => {
      if (generation === this.generation && service === this.service) {
        this.view.status(snapshot, this.applying);
      }
    });
  }

  private renderBoundStatus(): void {
    if (this.service !== undefined) this.view.status(this.service.getRuntimeStatus(), this.applying);
  }

  private unsubscribeCurrent(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}

import { Plugin } from 'obsidian';
import type { TAbstractFile } from 'obsidian';

import type { DndCharacterPluginSettings } from './settings';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';
import { DndCharacterPluginSettingTab } from './settings-tab';
import {
	CharacterSheetView,
	DND_CHARACTER_SHEET_VIEW_TYPE,
} from './views/character-sheet-view';
import type { CatalogClient } from './catalog/client';
import { RequestUrlCatalogClient } from './catalog/request-url-client';
import { CatalogService } from './catalog/catalog-service';
import { ensureCharacterFolder } from './character-folder';
import { setupCharacterVaultEventListeners } from './character-vault-events';

export default class DndCharacterPlugin extends Plugin {
	settings: DndCharacterPluginSettings = DEFAULT_SETTINGS;
	/** Catalog runtime service, lazily initialized on first access. */
	catalogService: CatalogService | null = null;
	private catalogInitialization: Promise<CatalogService> | null = null;
	private readonly pendingCatalogReconfigurations = new Map<string, Promise<CatalogService>>();
	private lifecycleOperation: Promise<void> = Promise.resolve();
	private readonly disposedCatalogServices = new WeakSet<CatalogService>();
	private unloading = false;

	async onload() {
		console.log('Loading D&D Character Manager plugin');

		await this.loadSettings();

		// Ensure the character folder exists (P8-T004)
		await ensureCharacterFolder(this.app, this.settings.charactersVaultPath);

		// Register character sheet view (P6-T007)
		this.registerView(DND_CHARACTER_SHEET_VIEW_TYPE, (leaf) =>
			new CharacterSheetView(leaf),
		);

		// Register command to open character sheet in right sidebar (P6-T008)
		this.addCommand({
			id: 'open-character-sheet',
			name: 'Open character sheet',
			callback: async () => {
				const leaf = this.app.workspace.getRightLeaf(false);
				if (leaf) {
					await leaf.setViewState({
						type: DND_CHARACTER_SHEET_VIEW_TYPE,
						state: {},
					});
					await this.app.workspace.revealLeaf(leaf);
				}
			},
		});

		// Register character vault event listeners (P8-T009)
		const characterVaultEvents = setupCharacterVaultEventListeners(
			this.app,
			this.settings.charactersVaultPath,
			{
				onModified: (event) => {
					console.log(
						`[D&D Character] Character file modified: ${event.filePath}`,
					);
				},
				onCreated: (event) => {
					console.log(
						`[D&D Character] Character file created: ${event.filePath}`,
					);
				},
				onDeleted: (event) => {
					console.log(
						`[D&D Character] Character file deleted: ${event.filePath}`,
					);
				},
			},
		);
		this.registerEvent(characterVaultEvents.createRef);
		this.registerEvent(characterVaultEvents.modifyRef);
		this.registerEvent(characterVaultEvents.deleteRef);

		// Register rename event for diagnostics (P6-T009)
		this.registerEvent(
			this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
				console.log(
					`[D&D Character] Vault file renamed: ${oldPath} -> ${file.path}`,
				);
			}),
		);

		// Register settings tab (P6-T006)
		this.addSettingTab(new DndCharacterPluginSettingTab(this.app, this));

		console.log('D&D Character Manager plugin loaded!');
	}

	async loadSettings() {
		const raw = await this.loadData();
		this.settings = normalizeSettings(raw);
		this.settings.catalogServerUrl = normalizeCatalogServerUrl(this.settings.catalogServerUrl);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/**
	 * Get the catalog service, initializing it lazily on first access.
	 * The service uses the catalog URL from plugin settings.
	 */
	async getCatalogService(): Promise<CatalogService> {
		if (this.catalogService !== null) {
			return this.catalogService;
		}
		if (this.catalogInitialization !== null) {
			return this.catalogInitialization;
		}

		const initialization = this.enqueueLifecycle(() => this.createAndPublishService(
			normalizeCatalogServerUrl(this.settings.catalogServerUrl),
		));
		this.catalogInitialization = initialization;
		void initialization.then(
			() => this.clearCatalogInitialization(initialization),
			() => this.clearCatalogInitialization(initialization),
		);
		return initialization;
	}

	/**
	 * Update the catalog URL and replace the owned service when necessary.
	 * Lifecycle work is serialized. When no stable service exists, getters join
	 * the newest queued service operation instead of initializing an older URL.
	 */
	setCatalogServerUrl(value: string): Promise<CatalogService> {
		const normalizedUrl = normalizeCatalogServerUrl(value);
		const pending = this.pendingCatalogReconfigurations.get(normalizedUrl);
		if (pending !== undefined) return pending;

		const replacement = this.enqueueLifecycle(async () => {
			this.throwIfUnloading();
			const currentUrl = normalizeCatalogServerUrl(this.settings.catalogServerUrl);
			if (currentUrl === normalizedUrl) {
				return this.catalogService ?? this.createAndPublishService(normalizedUrl);
			}

			const previousSettings = this.settings;
			const previousService = this.catalogService;
			let candidate: CatalogService | null = null;
			try {
				// Initialize before persisting or discarding the published service, so a
				// failed candidate cannot leave settings and runtime ownership divergent.
				candidate = await this.createCatalogService(normalizedUrl);
				this.throwIfUnloading();
				this.settings = { ...previousSettings, catalogServerUrl: normalizedUrl };
				await this.saveSettings();
				this.throwIfUnloading();
				if (previousService !== null) {
					await this.disposeCatalogService(previousService);
				}
				this.catalogService = candidate;
				return candidate;
			} catch (error) {
				if (this.settings !== previousSettings) {
					this.settings = previousSettings;
					try {
						await this.saveSettings();
					} catch {
						// Preserve the original failure; a failed rollback is not hidden.
					}
				}
				if (candidate !== null && candidate !== this.catalogService) {
					await this.disposeCatalogService(candidate);
				}
				throw error;
			}
		});
		this.pendingCatalogReconfigurations.set(normalizedUrl, replacement);
		this.catalogInitialization = replacement;
		void replacement.then(
			() => this.clearPendingCatalogReconfiguration(normalizedUrl, replacement),
			() => this.clearPendingCatalogReconfiguration(normalizedUrl, replacement),
		);
		return replacement;
	}

	private enqueueLifecycle<T>(operation: () => Promise<T>): Promise<T> {
		const queued = this.lifecycleOperation.then(operation, operation);
		this.lifecycleOperation = queued.then(() => undefined, () => undefined);
		return queued;
	}

	private clearCatalogInitialization(initialization: Promise<CatalogService>): void {
		if (this.catalogInitialization === initialization) {
			this.catalogInitialization = null;
		}
	}

	private clearPendingCatalogReconfiguration(
		baseUrl: string,
		replacement: Promise<CatalogService>,
	): void {
		if (this.pendingCatalogReconfigurations.get(baseUrl) === replacement) {
			this.pendingCatalogReconfigurations.delete(baseUrl);
		}
		this.clearCatalogInitialization(replacement);
	}

	private async createAndPublishService(baseUrl: string): Promise<CatalogService> {
		this.throwIfUnloading();
		const service = await this.createCatalogService(baseUrl);
		if (this.unloading) {
			await this.disposeCatalogService(service);
			throw new Error('Catalog service is unavailable while the plugin unloads.');
		}
		this.catalogService = service;
		return service;
	}

	private async createCatalogService(baseUrl: string): Promise<CatalogService> {
		const client: CatalogClient = new RequestUrlCatalogClient({
			baseUrl,
			timeoutMs: 5000,
		});
		const service = new CatalogService(this, client, { baseUrl });
		try {
			await service.initialize();
			return service;
		} catch (error) {
			await this.disposeCatalogService(service);
			throw error;
		}
	}

	private async disposeCatalogService(service: CatalogService): Promise<void> {
		if (this.disposedCatalogServices.has(service)) return;
		this.disposedCatalogServices.add(service);
		await service.dispose();
	}

	private throwIfUnloading(): void {
		if (this.unloading) {
			throw new Error('Catalog service is unavailable while the plugin unloads.');
		}
	}

	onunload() {
		this.unloading = true;
		const service = this.catalogService;
		this.catalogService = null;
		this.catalogInitialization = null;
		this.pendingCatalogReconfigurations.clear();
		this.lifecycleOperation = Promise.resolve();
		// Persist catalog cache before unloading.
		if (service !== null) {
			void this.disposeCatalogService(service);
		}

		void this.saveData(this.settings);

		// Cleanup: Obsidian Component lifecycle automatically handles:
		// - Unregistering events registered via this.registerEvent()
		// - Removing DOM event listeners registered via this.registerDomEvent()
		// - Clearing intervals registered via this.registerInterval()
		// - Unloading child components registered via this.addChild()
		// - Unregistering commands registered via this.addCommand()
		// - Removing views registered via this.registerView()

		console.log('Unloading D&D Character Manager plugin');
	}
}

export function normalizeCatalogServerUrl(value: string): string {
	return value.trim();
}

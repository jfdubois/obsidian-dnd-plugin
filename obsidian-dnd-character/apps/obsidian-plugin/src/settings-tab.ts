/** Plugin settings tab UI for the D&D Character Manager. */

import type { App, ButtonComponent, Plugin } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';

import type { DndCharacterPluginSettings } from './settings';
import { RequestUrlCatalogClient } from './catalog/request-url-client';

interface PluginInstance {
	settings: DndCharacterPluginSettings;
	saveData: (data: DndCharacterPluginSettings) => Promise<void>;
}

export class DndCharacterPluginSettingTab extends PluginSettingTab {
	plugin: PluginInstance;
	catalogStatus: string;
	private statusSetting: Setting | null;
	private testButton: ButtonComponent | null;

	constructor(app: App, plugin: PluginInstance) {
		super(app, plugin as unknown as Plugin);
		this.plugin = plugin;
		this.catalogStatus = 'Not configured';
		this.statusSetting = null;
		this.testButton = null;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		/* ---------- Catalog section ---------- */

		new Setting(containerEl)
			.setName('Catalog')
			.setHeading();

		new Setting(containerEl)
			.setName('Catalog server URL')
			.setDesc('URL of the catalog server (leave empty to disable).')
			.addText((text) =>
				text
					.setPlaceholder('https://example.com/catalog')
					.setValue(this.plugin.settings.catalogServerUrl)
					.onChange(async (value) => {
						this.plugin.settings.catalogServerUrl = value;
						await this.plugin.saveData(this.plugin.settings);
						if (value === '') {
							this.updateStatus('Not configured');
						}
					}),
			);

		new Setting(containerEl)
			.setName('Catalog revision')
			.setDesc('Active catalog revision ID (leave empty to use latest).')
			.addText((text) =>
				text
					.setPlaceholder('e.g. rev-2024-01')
					.setValue(this.plugin.settings.catalogRevision)
					.onChange(async (value) => {
						this.plugin.settings.catalogRevision = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		/* ---------- Catalog status ---------- */

		this.statusSetting = new Setting(containerEl)
			.setName('Catalog status')
			.setDesc(this.catalogStatus)
			.setDisabled(true);

		new Setting(containerEl)
			.addButton((button) => {
				this.testButton = button;
				button
					.setButtonText('Test connection')
					.onClick(async () => {
						const url = this.plugin.settings.catalogServerUrl;
						if (url === '') {
							this.updateStatus('Not configured');
							return;
						}
						this.updateStatus('Testing...');
						button.setDisabled(true);
						try {
							const client = new RequestUrlCatalogClient({ baseUrl: url });
							const connected = await client.testConnection();
							this.updateStatus(connected ? 'Connected' : 'Disconnected');
						} catch {
							this.updateStatus('Disconnected');
						} finally {
							button.setDisabled(false);
						}
					});
			});

		/* ---------- Characters section ---------- */

		new Setting(containerEl)
			.setName('Characters')
			.setHeading();

		new Setting(containerEl)
			.setName('Characters vault path')
			.setDesc(
				'Vault-relative folder path where character files are stored.',
			)
			.addText((text) =>
				text
					.setPlaceholder('dnd-characters')
					.setValue(this.plugin.settings.charactersVaultPath)
					.onChange(async (value) => {
						this.plugin.settings.charactersVaultPath = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		/* ---------- About section ---------- */

		new Setting(containerEl)
			.setName('About')
			.setHeading();

		new Setting(containerEl)
			.setName('Settings schema version')
			.setDesc(`Current settings schema version: ${this.plugin.settings.schemaVersion}.`)
			.setDisabled(true);
	}

	private updateStatus(status: string): void {
		this.catalogStatus = status;
		if (this.statusSetting) {
			this.statusSetting.setDesc(status);
		}
	}
}

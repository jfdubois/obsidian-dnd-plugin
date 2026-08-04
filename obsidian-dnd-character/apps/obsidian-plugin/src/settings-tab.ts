/** Plugin settings tab UI for the D&D Character Manager. */

import type { App, ButtonComponent, Plugin, TextComponent } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';

import { formatCatalogRuntimeStatus } from './catalog/catalog-runtime-status';
import { SettingsCatalogController } from './settings-catalog-controller';
import type { CatalogSettingsPlugin } from './settings-catalog-controller';

export class DndCharacterPluginSettingTab extends PluginSettingTab {
	private readonly settingsPlugin: CatalogSettingsPlugin;
	private readonly catalogController: SettingsCatalogController;
	private statusSetting: Setting | undefined;
	private actionErrorSetting: Setting | undefined;
	private urlInput: TextComponent | undefined;
	private applyButton: ButtonComponent | undefined;
	private checkButton: ButtonComponent | undefined;
	private refreshButton: ButtonComponent | undefined;

	constructor(app: App, plugin: CatalogSettingsPlugin) {
		super(app, plugin as unknown as Plugin);
		this.settingsPlugin = plugin;
		this.catalogController = new SettingsCatalogController(plugin, {
			loading: () => this.renderLoading(),
			status: (snapshot, applying) => this.renderStatus(snapshot, applying),
			operationPending: (applying) => this.renderOperationPending(applying),
			actionError: (message) => this.renderActionError(message),
			urlApplied: (value) => { this.urlInput?.setValue(value); },
		});
	}

	display(): void {
		this.catalogController.display();
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Catalog').setHeading();
		new Setting(containerEl)
			.setName('Catalog server URL')
			.setDesc('URL of the catalog server (leave empty to disable).')
			.addText((text) => {
				this.urlInput = text
					.setPlaceholder('https://example.com/catalog')
					.setValue(this.settingsPlugin.settings.catalogServerUrl)
					.onChange(() => undefined);
			});
		new Setting(containerEl).addButton((button) => {
			this.applyButton = button.setButtonText('Apply catalog URL').onClick(() => {
				void this.catalogController.applyUrl(this.urlInput?.getValue() ?? '');
			});
		});

		this.statusSetting = new Setting(containerEl)
			.setName('Catalog status')
			.setDesc('Loading catalog status...')
			.setDisabled(true);
		this.actionErrorSetting = new Setting(containerEl)
			.setName('Catalog action')
			.setDesc('')
			.setDisabled(true);
		new Setting(containerEl).addButton((button) => {
			this.checkButton = button.setButtonText('Check for updates').setDisabled(true).onClick(() => {
				void this.catalogController.checkForUpdates();
			});
		});
		new Setting(containerEl).addButton((button) => {
			this.refreshButton = button.setButtonText('Refresh catalog').setDisabled(true).onClick(() => {
				void this.catalogController.refresh();
			});
		});

		new Setting(containerEl).setName('Characters').setHeading();
		new Setting(containerEl)
			.setName('Characters vault path')
			.setDesc('Vault-relative folder path where character files are stored.')
			.addText((text) => text
				.setPlaceholder('dnd-characters')
				.setValue(this.settingsPlugin.settings.charactersVaultPath)
				.onChange(async (value) => {
					this.settingsPlugin.settings.charactersVaultPath = value;
					await this.settingsPlugin.saveSettings();
				}));

		new Setting(containerEl).setName('About').setHeading();
		new Setting(containerEl)
			.setName('Settings schema version')
			.setDesc(`Current settings schema version: ${this.settingsPlugin.settings.schemaVersion}.`)
			.setDisabled(true);
	}

	private renderLoading(): void {
		this.statusSetting?.setName('Catalog status').setDesc('Loading catalog status...');
		this.setActionButtons(true);
	}

	private renderStatus(
		snapshot: Parameters<typeof formatCatalogRuntimeStatus>[0],
		applying: boolean,
	): void {
		const presentation = formatCatalogRuntimeStatus(snapshot);
		this.statusSetting
			?.setName(presentation.title)
			.setDesc([presentation.summary, ...presentation.details].join(' — '))
			.setClass(`dnd-catalog-status--${presentation.severity}`);
		this.setActionButtons(applying || !presentation.refreshEnabled);
		this.applyButton?.setDisabled(applying);
	}

	private renderActionError(message: string): void {
		this.actionErrorSetting?.setDesc(message);
	}

	private renderOperationPending(applying: boolean): void {
		this.applyButton?.setDisabled(applying);
		if (applying) this.setActionButtons(true);
	}

	private setActionButtons(disabled: boolean): void {
		this.checkButton?.setDisabled(disabled);
		this.refreshButton?.setDisabled(disabled);
	}
}

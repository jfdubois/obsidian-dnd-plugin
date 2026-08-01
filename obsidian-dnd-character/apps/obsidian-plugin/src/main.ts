import { Plugin } from 'obsidian';
import type { TAbstractFile } from 'obsidian';

import type { DndCharacterPluginSettings } from './settings';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';
import { DndCharacterPluginSettingTab } from './settings-tab';
import {
	CharacterSheetView,
	DND_CHARACTER_SHEET_VIEW_TYPE,
} from './views/character-sheet-view';

export default class DndCharacterPlugin extends Plugin {
	settings: DndCharacterPluginSettings = DEFAULT_SETTINGS;

	async onload() {
		console.log('Loading D&D Character Manager plugin');

		await this.loadSettings();

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

		// Register cleanup-safe vault events (P6-T009)
		this.registerEvent(
			this.app.vault.on('create', (file: TAbstractFile) => {
				console.log(`[D&D Character] Vault file created: ${file.path}`);
			}),
		);
		this.registerEvent(
			this.app.vault.on('modify', (file: TAbstractFile) => {
				console.log(`[D&D Character] Vault file modified: ${file.path}`);
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file: TAbstractFile) => {
				console.log(`[D&D Character] Vault file deleted: ${file.path}`);
			}),
		);
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
	}

	onunload() {
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

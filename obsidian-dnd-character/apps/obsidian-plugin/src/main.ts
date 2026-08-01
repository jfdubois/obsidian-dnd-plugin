import { Plugin } from 'obsidian';

import type { DndCharacterPluginSettings } from './settings';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

export default class DndCharacterPlugin extends Plugin {
	settings: DndCharacterPluginSettings = DEFAULT_SETTINGS;

	async onload() {
		console.log('Loading D&D Character Manager plugin');

		await this.loadSettings();

		// TODO (P6-T006): Register custom views (character sheet sidebar)
		// this.registerView(...);

		// TODO (P6-T007): Register plugin commands
		// this.addCommand(...);

		// TODO (P6-T008): Register event listeners
		// this.registerEvent(...);

		// TODO (P6-T009): Register settings tab
		// this.addSettingTab(...);

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

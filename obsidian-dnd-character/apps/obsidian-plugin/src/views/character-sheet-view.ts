/** Character sheet view placeholder for the D&D Character Manager. */

import type { WorkspaceLeaf } from 'obsidian';
import { ItemView } from 'obsidian';

export const DND_CHARACTER_SHEET_VIEW_TYPE = 'dnd-character-sheet';

export class CharacterSheetView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return DND_CHARACTER_SHEET_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Character Sheet';
	}

	protected async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createEl('h2', { text: 'Character Sheet' });
		this.contentEl.createEl('p', { text: 'Character sheet coming soon' });
	}

	protected async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}

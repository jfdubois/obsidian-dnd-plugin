/**
 * Character repository facade (P8-T010).
 *
 * Composes all character persistence operations into a single class
 * that encapsulates vault access, the configured characters folder
 * path, and event listener management. Delegates to the existing
 * persistence functions without reimplementing any logic.
 */

import type { App } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import {
	deserializeCharacter,
} from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';
import { characterIdStr } from '@obsidian-dnd/domain';

import { ensureCharacterFolder } from './character-folder';
import type { EnsureFolderResult } from './character-folder';
export { CharacterFolderOperationError } from './character-folder';

import { createCharacterInVault } from './character-create';
import type {
	CreateCharacterResult,
	CharacterCreatedResult,
	CharacterDuplicateError,
	CharacterSerializationErrorResult,
	CharacterVaultWriteError,
	CharacterFolderError,
} from './character-create';

import {
	readCharacterFromVault,
	listCharactersInVault,
} from './character-read';
import type {
	ReadCharacterResult,
	CharacterReadResult,
	CharacterNotFoundError,
	CharacterInvalidDataError,
	ListCharactersResult,
	SkippedCharacter,
	CharacterListEntry,
} from './character-read';

import { updateCharacterInVault } from './character-update';
import type {
	UpdateCharacterResult,
	CharacterUpdatedResult,
	CharacterUpdateNotFoundError,
	CharacterUpdateInvalidDataError,
	CharacterUpdateMutationFailedError,
	CharacterUpdateVaultWriteError,
} from './character-update';

import { deleteCharacterFromVault } from './character-delete';
import type {
	DeleteCharacterResult,
	CharacterDeletedResult,
	CharacterDeleteNotFoundError,
	CharacterDeleteVaultError,
} from './character-delete';

import {
	setupCharacterVaultEventListeners,
	isCharacterFile,
} from './character-vault-events';
import type {
	CharacterVaultEventCallbacks,
	CharacterVaultEventRegistration,
	CharacterVaultEvent,
	CharacterFileModifiedEvent,
	CharacterFileCreatedEvent,
	CharacterFileDeletedEvent,
	CharacterFileRenamedEvent,
	VaultEventDiagnostic,
} from './character-vault-events';

import {
	CharacterIndex,
} from './character-index';
import type {
	IndexedCharacter,
	IndexDiagnostic,
	CharacterIndexChangeEvent,
	CharacterIndexChangeListener,
	CharacterViewRefreshBoundary,
} from './character-index';

/* ── Re-export all result types for convenience ─────────────────── */

export type {
	EnsureFolderResult,

	CreateCharacterResult,
	CharacterCreatedResult,
	CharacterDuplicateError,
	CharacterSerializationErrorResult,
	CharacterVaultWriteError,
	CharacterFolderError,

	ReadCharacterResult,
	CharacterReadResult,
	CharacterNotFoundError,
	CharacterInvalidDataError,

	ListCharactersResult,
	SkippedCharacter,
	CharacterListEntry,

	UpdateCharacterResult,
	CharacterUpdatedResult,
	CharacterUpdateNotFoundError,
	CharacterUpdateInvalidDataError,
	CharacterUpdateMutationFailedError,
	CharacterUpdateVaultWriteError,

	DeleteCharacterResult,
	CharacterDeletedResult,
	CharacterDeleteNotFoundError,
	CharacterDeleteVaultError,

	CharacterVaultEventCallbacks,
	CharacterVaultEventRegistration,
	CharacterVaultEvent,
	CharacterFileModifiedEvent,
	CharacterFileCreatedEvent,
	CharacterFileDeletedEvent,
	CharacterFileRenamedEvent,
	VaultEventDiagnostic,

	IndexedCharacter,
	IndexDiagnostic,
	CharacterIndexChangeEvent,
	CharacterIndexChangeListener,
	CharacterViewRefreshBoundary,
};

/* ── Repository facade ─────────────────────────────────────────── */

/**
 * Facade that encapsulates all character persistence operations.
 *
 * Composes the existing persistence functions and manages vault
 * event listeners. The constructor accepts the Obsidian App
 * instance and the configured characters vault path, and all
 * methods pass these through to the underlying functions.
 */
export class CharacterRepository {
	private readonly app: App;
	private readonly charactersVaultPath: string;

	/**
	 * EventRefs for registered vault listeners. Set after
	 * `setupEventListeners` is called.
	 */
	public eventRefs: CharacterVaultEventRegistration | null = null;

	/**
	 * In-memory index of all known character files. Owned and
	 * maintained by this repository instance.
	 */
	public readonly index: CharacterIndex;

	/**
	 * View refresh boundary set during setupEventListeners.
	 * The repository subscribes to index change events and
	 * forwards them to this boundary (PER-006).
	 */
	private refreshBoundary: CharacterViewRefreshBoundary | null = null;

	public constructor(app: App, charactersVaultPath: string) {
		this.app = app;
		this.charactersVaultPath = charactersVaultPath;
		this.index = new CharacterIndex(null);
	}

	/**
	 * Ensure the character folder exists in the vault.
	 */
	public async ensureFolder(): Promise<EnsureFolderResult> {
		return ensureCharacterFolder(this.app, this.charactersVaultPath);
	}

	/**
	 * Create a new character file in the vault.
	 */
	public async create(character: Character): Promise<CreateCharacterResult> {
		return createCharacterInVault(
			this.app,
			character,
			this.charactersVaultPath,
		);
	}

	/**
	 * Read a single character from the vault by ID.
	 */
	public async read(characterId: CharacterId): Promise<ReadCharacterResult> {
		return readCharacterFromVault(
			this.app,
			characterIdStr(characterId),
			this.charactersVaultPath,
		);
	}

	/**
	 * List all characters in the configured folder.
	 */
	public async list(): Promise<ListCharactersResult> {
		return listCharactersInVault(this.app, this.charactersVaultPath);
	}

	/**
	 * Atomically update a character in the vault.
	 */
	public async update(
		characterId: CharacterId,
		mutation: (character: Character) => Character,
	): Promise<UpdateCharacterResult> {
		return updateCharacterInVault(
			this.app,
			characterId,
			mutation,
			this.charactersVaultPath,
		);
	}

	/**
	 * Delete a character file from the vault.
	 */
	public async delete(characterId: CharacterId): Promise<DeleteCharacterResult> {
		return deleteCharacterFromVault(
			this.app,
			characterId,
			this.charactersVaultPath,
		);
	}

	/**
	 * Initialize the in-memory index by scanning the vault for
	 * existing character files. Call once during plugin startup
	 * before setting up event listeners.
	 *
	 * Uses the actual vault-discovered file paths from the list
	 * result rather than fabricating paths from character IDs.
	 * Skipped files are recorded as index diagnostics.
	 */
	public async initializeIndex(): Promise<void> {
		const listResult = await this.list();
		// Use actual discovered paths; do not fabricate <folder>/<id>.json
		this.index.initializeFromVault(listResult.characters);
		// Record startup diagnostics for files that could not be indexed
		for (const skipped of listResult.skipped) {
			this.index.recordDiagnostic({
				filePath: skipped.filePath,
				reason: skipped.reason,
			});
		}
	}

	/**
	 * Set up vault event listeners for character file changes.
	 *
	 * Stores the returned EventRefs so they can be registered
	 * with a Component for automatic cleanup. All vault events
	 * are wired through the index mutation methods so the index
	 * stays synchronized with external changes.
	 *
	 * The refreshBoundary is used to notify active views when
	 * the indexed state for a character changes (PER-006). The
	 * repository subscribes to index change events and forwards
	 * them to the boundary.
	 */
	public setupEventListeners(
		refreshBoundary: CharacterViewRefreshBoundary | null,
	): CharacterVaultEventRegistration {
		this.refreshBoundary = refreshBoundary;

		// Subscribe to index change events and forward to refresh boundary (PER-006)
		if (refreshBoundary !== null) {
			this.index.subscribe((event) => {
				refreshBoundary.refreshCharacter(event.characterId);
			});
		}

		const callbacks: CharacterVaultEventCallbacks = {
			onCreated: (event) => {
				// On create, read the file and add to index
				void this.readAndIndex(event.filePath, 'create');
			},
			onModified: (event) => {
				// On modify, re-read and update index
				void this.readAndIndex(event.filePath, 'modify');
			},
			onDeleted: (event) => {
				this.index.handleDelete(event.filePath);
			},
			onRenamed: (event) => {
				this.handleRenameEvent(event.oldPath, event.filePath);
			},
			onDiagnostic: (diagnostic) => {
				// Route vault event diagnostics into the index
				this.index.recordDiagnostic({
					filePath: diagnostic.filePath,
					reason: diagnostic.reason,
				});
			},
		};

		this.eventRefs = setupCharacterVaultEventListeners(
			this.app,
			this.charactersVaultPath,
			callbacks,
		);
		return this.eventRefs;
	}

	/**
	 * Read a character from the vault and update the index.
	 *
	 * Uses the actual vault file path from the event rather than
	 * deriving an ID from the filename. For modify events, if the
	 * file content is invalid, a diagnostic is recorded but the
	 * existing valid entry in the index is preserved. This ensures
	 * external corruption does not silently lose character data.
	 */
	private async readAndIndex(
		filePath: string,
		eventType: 'create' | 'modify',
	): Promise<void> {
		const readResult = await this.readFromPath(filePath);
		if (readResult instanceof Object && 'character' in readResult) {
			const character = readResult.character;
			if (eventType === 'create') {
				this.index.handleCreate(character, filePath);
			} else {
				this.index.handleModify(character, filePath);
			}
		} else {
			// For modify: existing valid index entry is preserved; only
			// a diagnostic is recorded so the operator can investigate.
			// For create: the file simply does not enter the index.
			const reason = readResult instanceof Object && 'reason' in readResult
				? (readResult as { reason: string }).reason
				: 'unknown';
			this.index.recordDiagnostic({
				filePath,
				reason: `Failed to read character from vault (${reason})`,
			});
		}
	}

	/**
	 * Handle a vault rename event with folder-boundary awareness.
	 *
	 * - Rename within folder: update the indexed file path.
	 * - Rename out of folder: remove the character from the index.
	 * - Rename into folder: read, validate, and add the character.
	 */
	private handleRenameEvent(oldPath: string, newPath: string): void {
		const oldIsCharacter = isCharacterFile(oldPath, this.charactersVaultPath);
		const newIsCharacter = isCharacterFile(newPath, this.charactersVaultPath);

		if (oldIsCharacter && newIsCharacter) {
			// Rename within the character folder: update the path
			this.index.handleRename(oldPath, newPath);
		} else if (oldIsCharacter && !newIsCharacter) {
			// Renamed out of the character folder: remove from index
			this.index.handleRemoveByPath(oldPath);
		} else if (!oldIsCharacter && newIsCharacter) {
			// Renamed into the character folder: read, validate, and add
			void this.readAndIndex(newPath, 'create');
		}
		// else: neither path is a character file, ignore
	}

	/**
	 * Read a character from an exact vault-relative file path.
	 *
	 * Locates the file by its actual path, reads and deserializes it,
	 * and returns the character along with the real file path.
	 */
	private async readFromPath(
		filePath: string,
	): Promise<ReadCharacterResult> {
		const file = this.app.vault.getFileByPath(filePath);
		if (file === null) {
			return {
				status: 'error',
				reason: 'not-found',
				characterId: filePath,
			};
		}

		const content = await this.app.vault.cachedRead(file);
		try {
			const character = deserializeCharacter(content);
			return {
				status: 'read',
				character,
				filePath: file.path,
			};
		} catch (cause) {
			return {
				status: 'error',
				reason: 'invalid-data',
				characterId: filePath,
				cause,
			};
		}
	}
}

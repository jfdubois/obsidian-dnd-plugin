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
import type { CharacterId } from '@obsidian-dnd/domain';
import { characterIdStr } from '@obsidian-dnd/domain';

import { ensureCharacterFolder } from './character-folder';
import type { EnsureFolderResult } from './character-folder';

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

import { setupCharacterVaultEventListeners } from './character-vault-events';
import type {
	CharacterVaultEventCallbacks,
	CharacterVaultEventRegistration,
	CharacterVaultEvent,
	CharacterFileModifiedEvent,
	CharacterFileCreatedEvent,
	CharacterFileDeletedEvent,
} from './character-vault-events';

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

	public constructor(app: App, charactersVaultPath: string) {
		this.app = app;
		this.charactersVaultPath = charactersVaultPath;
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
	 * Set up vault event listeners for character file changes.
	 *
	 * Stores the returned EventRefs so they can be registered
	 * with a Component for automatic cleanup.
	 */
	public setupEventListeners(
		callbacks: CharacterVaultEventCallbacks,
	): CharacterVaultEventRegistration {
		this.eventRefs = setupCharacterVaultEventListeners(
			this.app,
			this.charactersVaultPath,
			callbacks,
		);
		return this.eventRefs;
	}
}

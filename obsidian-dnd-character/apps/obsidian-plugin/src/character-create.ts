/**
 * Character creation in the Obsidian vault.
 *
 * Serializes a Character domain object and writes it as a versioned
 * JSON file inside the configured characters folder. Uses discriminated
 * union result types to report success or specific failure reasons.
 */

import type { App, TFile } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import { serializeCharacter } from '@obsidian-dnd/character-contract';
import { ensureCharacterFolder } from './character-folder';
import { characterIdStr } from '@obsidian-dnd/domain';

/* ── Result types ──────────────────────────────────────────────── */

/** Successful character creation result. */
export interface CharacterCreatedResult {
	status: 'created';
	filePath: string;
	file: TFile;
}

/** Duplicate character ID error result. */
export interface CharacterDuplicateError {
	status: 'error';
	reason: 'duplicate-id';
	characterId: string;
}

/** Serialization failure error result. */
export interface CharacterSerializationErrorResult {
	status: 'error';
	reason: 'serialization-failed';
	cause: unknown;
}

/** Vault write failure error result. */
export interface CharacterVaultWriteError {
	status: 'error';
	reason: 'vault-write-failed';
	cause: unknown;
}

/** Folder creation failure error result. */
export interface CharacterFolderError {
	status: 'error';
	reason: 'folder-creation-failed';
	cause: unknown;
}

/**
 * Discriminated union result of a character creation attempt.
 *
 * On success the result carries the vault file path and the TFile
 * handle returned by `Vault.create`. On failure the result carries
 * a specific reason code and the original error cause.
 */
export type CreateCharacterResult =
	| CharacterCreatedResult
	| CharacterDuplicateError
	| CharacterSerializationErrorResult
	| CharacterVaultWriteError
	| CharacterFolderError;

/* ── Implementation ────────────────────────────────────────────── */

/**
 * Create a new character file in the Obsidian vault.
 *
 * Steps:
 * 1. Ensure the character folder exists using `ensureCharacterFolder`.
 * 2. Construct the target file path: `<charactersVaultPath>/<characterId>.json`.
 * 3. Check if a file already exists at that path (duplicate prevention).
 * 4. Serialize the character using `serializeCharacter`.
 * 5. Write the serialized JSON to the vault using `Vault.create`.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param character - The validated Character domain object to persist.
 * @param charactersVaultPath - The vault-relative folder path for characters.
 * @returns A discriminated union result indicating success or failure reason.
 */
export async function createCharacterInVault(
	app: App,
	character: Character,
	charactersVaultPath: string,
): Promise<CreateCharacterResult> {
	// 1. Ensure the character folder exists.
	try {
		await ensureCharacterFolder(app, charactersVaultPath);
	} catch (cause) {
		return {
			status: 'error',
			reason: 'folder-creation-failed',
			cause,
		};
	}

	// 2. Construct the target file path.
	const characterId = characterIdStr(character.id);
	const filePath = `${charactersVaultPath}/${characterId}.json`;

	// 3. Check for duplicate file.
	const existing = app.vault.getFileByPath(filePath);
	if (existing !== null) {
		return {
			status: 'error',
			reason: 'duplicate-id',
			characterId,
		};
	}

	// 4. Serialize the character.
	let serialized: string;
	try {
		serialized = serializeCharacter(character);
	} catch (cause) {
		return {
			status: 'error',
			reason: 'serialization-failed',
			cause,
		};
	}

	// 5. Write to the vault.
	try {
		const file = await app.vault.create(filePath, serialized);
		return {
			status: 'created',
			filePath,
			file,
		};
	} catch (cause) {
		return {
			status: 'error',
			reason: 'vault-write-failed',
			cause,
		};
	}
}

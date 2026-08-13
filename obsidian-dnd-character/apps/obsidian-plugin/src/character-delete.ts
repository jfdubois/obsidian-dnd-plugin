/**
 * Character deletion from the Obsidian vault.
 *
 * Deletes the character JSON file from the configured characters
 * folder. Uses discriminated union result types to report success
 * or specific failure reasons.
 */

import type { App } from 'obsidian';
import type { CharacterId } from '@obsidian-dnd/domain';
import { characterIdStr } from '@obsidian-dnd/domain';
import { characterVaultFilePath } from './character-vault-path';

/* ── Result types ──────────────────────────────────────────────── */

/** Successful character deletion result. */
export interface CharacterDeletedResult {
	status: 'deleted';
	filePath: string;
}

/** Character file not found error result. */
export interface CharacterDeleteNotFoundError {
	status: 'error';
	reason: 'not-found';
	characterId: string;
}

/** Vault delete operation failed error result. */
export interface CharacterDeleteVaultError {
	status: 'error';
	reason: 'vault-delete-failed';
	characterId: string;
	cause: unknown;
}

/**
 * Discriminated union result of a character deletion attempt.
 *
 * On success the result carries the vault file path that was deleted.
 * On failure the result carries a specific reason code and optional
 * error cause.
 */
export type DeleteCharacterResult =
	| CharacterDeletedResult
	| CharacterDeleteNotFoundError
	| CharacterDeleteVaultError;

/* ── Implementation ────────────────────────────────────────────── */

/**
 * Delete a character file from the Obsidian vault.
 *
 * Steps:
 * 1. Construct the file path: `<charactersVaultPath>/<characterId>.json`.
 * 2. Use `Vault.getFileByPath` to check if the file exists.
 * 3. If not found, return a not-found error.
 * 4. Use `Vault.delete` to remove the file.
 * 5. On success, return the deleted file path.
 * 6. On delete failure, return a vault-delete-failed error.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param characterId - The branded character ID to delete.
 * @param charactersVaultPath - The vault-relative folder path for characters.
 * @returns A discriminated union result indicating success or failure reason.
 */
export async function deleteCharacterFromVault(
	app: App,
	characterId: CharacterId,
	charactersVaultPath: string,
): Promise<DeleteCharacterResult> {
	// 1. Construct the file path.
	const idStr = characterIdStr(characterId);
	const path = characterVaultFilePath(charactersVaultPath, idStr);
	if (path.status === 'invalid') {
		return { status: 'error', reason: 'not-found', characterId: idStr };
	}
	const filePath = path.filePath;

	// 2. Check if the file exists.
	const file = app.vault.getFileByPath(filePath);
	if (file === null) {
		return {
			status: 'error',
			reason: 'not-found',
			characterId: idStr,
		};
	}

	// 3. Delete the file.
	try {
		await app.vault.delete(file);
		return {
			status: 'deleted',
			filePath,
		};
	} catch (cause) {
		return {
			status: 'error',
			reason: 'vault-delete-failed',
			characterId: idStr,
			cause,
		};
	}
}

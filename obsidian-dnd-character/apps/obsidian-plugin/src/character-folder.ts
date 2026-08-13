/**
 * Character folder management.
 *
 * Ensures the configured character folder exists in the vault. Uses the
 * Obsidian Vault API to check existence and create the folder if needed.
 */

import type { App, Vault } from 'obsidian';
import { normalizeCharacterFolderPath } from './character-vault-path';

/** Result of an ensure-folder operation. */
export type EnsureFolderResult =
	| { status: 'created' }
	| { status: 'exists' };

export class CharacterFolderOperationError extends Error {
	public constructor(
		public readonly reason: 'invalid-character-path' | 'folder-file-collision' | 'folder-creation-failed',
		public readonly cause: unknown,
	) {
		super(reason);
		this.name = 'CharacterFolderOperationError';
	}
}

/**
 * Ensure the character folder exists at the configured vault path.
 *
 * Checks if the folder already exists using `Vault.getFolderByPath`.
 * If it does not exist, creates it with `Vault.createFolder`.
 * If `createFolder` throws because the folder was created concurrently
 * (race condition), the error is suppressed and the result reports 'exists'.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param path - The vault-relative folder path (from settings).
 * @returns A result indicating whether the folder was created or already existed.
 * @throws If the vault operations fail for reasons other than the folder already existing.
 */
export async function ensureCharacterFolder(
	app: App,
	path: string,
): Promise<EnsureFolderResult> {
	const vault: Vault = app.vault;
	const normalizedPath = normalizeCharacterFolderPath(path);
	if (normalizedPath === null) {
		throw new CharacterFolderOperationError('invalid-character-path', path);
	}

	let created = false;
	let currentPath = '';
	for (const segment of normalizedPath.split('/')) {
		currentPath = currentPath.length === 0 ? segment : `${currentPath}/${segment}`;
		if (vault.getFolderByPath(currentPath) !== null) continue;
		if (vault.getFileByPath(currentPath) !== null) {
			throw new CharacterFolderOperationError('folder-file-collision', currentPath);
		}
		try {
			await vault.createFolder(currentPath);
			created = true;
		} catch (cause) {
			if (vault.getFolderByPath(currentPath) !== null) continue;
			throw new CharacterFolderOperationError('folder-creation-failed', cause);
		}
	}
	return { status: created ? 'created' : 'exists' };
}

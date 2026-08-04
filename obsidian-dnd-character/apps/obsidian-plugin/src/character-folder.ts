/**
 * Character folder management.
 *
 * Ensures the configured character folder exists in the vault. Uses the
 * Obsidian Vault API to check existence and create the folder if needed.
 */

import type { App, Vault } from 'obsidian';

/** Result of an ensure-folder operation. */
export type EnsureFolderResult =
	| { status: 'created' }
	| { status: 'exists' };

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

	// Check if the folder already exists.
	const existing = vault.getFolderByPath(path);
	if (existing !== null) {
		return { status: 'exists' };
	}

	// Folder does not exist; attempt to create it.
	try {
		await vault.createFolder(path);
		return { status: 'created' };
	} catch (error) {
		// createFolder throws if the folder already exists (race condition).
		// Suppress that error and report the folder as existing.
		if (isFolderAlreadyExistsError(error)) {
			return { status: 'exists' };
		}
		// Re-throw unexpected errors (disk full, permission denied, etc.).
		throw error;
	}
}

/**
 * Check if an error from `Vault.createFolder` indicates the folder already exists.
 *
 * Obsidian's createFolder throws a generic Error when the folder exists.
 * We match on the error message to distinguish this from other failures.
 */
function isFolderAlreadyExistsError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	const message = error.message.toLowerCase();
	return (
		message.includes('already exists') ||
		message.includes('already exist')
	);
}

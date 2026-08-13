/**
 * Character read and list operations for the Obsidian vault.
 *
 * Provides functions to read a single character by ID and list all
 * characters in the configured characters folder. Uses discriminated
 * union result types to report success or specific failure reasons.
 */

import type { App, TFile, TFolder } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import {
  deserializeCharacter,
  CharacterSerializationError,
} from '@obsidian-dnd/character-contract';
import { characterVaultFilePath } from './character-vault-path';

/* ── Read result types ─────────────────────────────────────────── */

/** Successful single-character read result. */
export interface CharacterReadResult {
  status: 'read';
  character: Character;
  filePath: string;
}

/** Character file not found error result. */
export interface CharacterNotFoundError {
  status: 'error';
  reason: 'not-found';
  characterId: string;
}

/** Character data invalid error result. */
export interface CharacterInvalidDataError {
  status: 'error';
  reason: 'invalid-data';
  characterId: string;
  cause: unknown;
}

/**
 * Discriminated union result of a character read attempt.
 *
 * On success the result carries the deserialized Character and the
 * vault file path. On failure the result carries a specific reason
 * code and optional error cause.
 */
export type ReadCharacterResult =
  | CharacterReadResult
  | CharacterNotFoundError
  | CharacterInvalidDataError;

/* ── List result types ─────────────────────────────────────────── */

/** A character file that could not be deserialized during listing. */
export interface SkippedCharacter {
  filePath: string;
  reason: string;
  cause?: unknown;
}

/** A character entry that includes the actual vault file path. */
export interface CharacterListEntry {
  character: Character;
  filePath: string;
}

/** Result of listing all characters in the configured folder. */
export interface ListCharactersResult {
  status: 'read';
  characters: CharacterListEntry[];
  skipped: SkippedCharacter[];
}

/* ── Read single character ─────────────────────────────────────── */

/**
 * Read a single character from the Obsidian vault by character ID.
 *
 * Steps:
 * 1. Construct the file path: `<charactersVaultPath>/<characterId>.json`.
 * 2. Use `Vault.getFileByPath` to locate the file.
 * 3. If not found, return a not-found error.
 * 4. Use `Vault.cachedRead` to read the file contents.
 * 5. Use `deserializeCharacter` to parse, migrate, and validate the JSON.
 * 6. On success, return the character and file path.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param characterId - The character ID to look up.
 * @param charactersVaultPath - The vault-relative folder path for characters.
 * @returns A discriminated union result indicating success or failure reason.
 */
export async function readCharacterFromVault(
  app: App,
  characterId: string,
  charactersVaultPath: string,
): Promise<ReadCharacterResult> {
	// 1. Construct the file path.
	const path = characterVaultFilePath(charactersVaultPath, characterId);
	if (path.status === 'invalid') {
		return { status: 'error', reason: 'not-found', characterId };
	}
	const filePath = path.filePath;

  // 2. Locate the file.
  const file = app.vault.getFileByPath(filePath);
  if (file === null) {
    return {
      status: 'error',
      reason: 'not-found',
      characterId,
    };
  }

  // 3. Read the file contents.
  const content = await app.vault.cachedRead(file);

  // 4. Deserialize and validate.
  try {
    const character = deserializeCharacter(content);
    return {
      status: 'read',
      character,
      filePath,
    };
  } catch (cause) {
    return {
      status: 'error',
      reason: 'invalid-data',
      characterId,
      cause,
    };
  }
}

/* ── List all characters ───────────────────────────────────────── */

/**
 * List all characters in the configured characters folder.
 *
 * Steps:
 * 1. Use `Vault.getFolderByPath` to find the characters folder.
 * 2. If folder not found, return an empty list (not an error).
 * 3. Collect all `.json` files in the folder (including nested subfolders).
 * 4. For each file, attempt to read and deserialize the character.
 * 5. Skip files that fail deserialization, collecting diagnostics.
 * 6. Return all successfully read characters and skipped file diagnostics.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param charactersVaultPath - The vault-relative folder path for characters.
 * @returns A result containing all readable characters and skipped file diagnostics.
 */
export async function listCharactersInVault(
  app: App,
  charactersVaultPath: string,
): Promise<ListCharactersResult> {
  // 1. Find the characters folder.
  const folder = app.vault.getFolderByPath(charactersVaultPath);
  if (folder === null) {
    return {
      status: 'read',
      characters: [],
      skipped: [],
    };
  }

  // 2. Collect all JSON files in the folder (including nested subfolders).
  const jsonFiles = collectJsonFiles(folder);

  // 3. Read and deserialize each file.
  const characters: CharacterListEntry[] = [];
  const skipped: SkippedCharacter[] = [];

  for (const file of jsonFiles) {
    try {
      const content = await app.vault.cachedRead(file);
      const character = deserializeCharacter(content);
      characters.push({ character, filePath: file.path });
    } catch (cause) {
      const reason = getCauseReason(cause);
      skipped.push({
        filePath: file.path,
        reason,
        cause,
      });
    }
  }

  return {
    status: 'read',
    characters,
    skipped,
  };
}

/* ── Helpers ───────────────────────────────────────────────────── */

/**
 * Collect all `.json` files in a folder, including nested subfolders.
 *
 * @param folder - The folder to collect files from.
 * @returns An array of TFile objects with `.json` extension.
 */
function collectJsonFiles(folder: TFolder): TFile[] {
  const result: TFile[] = [];

  for (const child of folder.children) {
    if (child instanceof Object && 'extension' in child && child.extension === 'json') {
      // child is a TFile with .json extension
      result.push(child as TFile);
    } else if ('children' in child && Array.isArray(child.children)) {
      // child is a TFolder; recurse into it
      result.push(...collectJsonFiles(child as TFolder));
    }
  }

  return result;
}

/**
 * Extract a human-readable reason from a deserialization error.
 *
 * @param cause - The error or unknown cause.
 * @returns A reason string for diagnostics.
 */
function getCauseReason(cause: unknown): string {
  if (cause instanceof CharacterSerializationError) {
    return cause.reason;
  }
  if (cause instanceof Error) {
    return cause.message;
  }
  return 'unknown-error';
}

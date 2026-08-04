/**
 * Atomic character mutation in the Obsidian vault.
 *
 * Uses `Vault.process` for atomic read-modify-write operations:
 * the file is read, the mutation function is applied, and the
 * result is written back in a single atomic transaction. This
 * prevents partial writes and concurrent modification issues.
 *
 * Requires Obsidian 1.1.0+ (Vault.process).
 */

import type { App } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';
import {
  deserializeCharacter,
  serializeCharacter,
} from '@obsidian-dnd/character-contract';
import { characterIdStr } from '@obsidian-dnd/domain';

/* ── Result types ──────────────────────────────────────────────── */

/** Successful character update result. */
export interface CharacterUpdatedResult {
  status: 'updated';
  character: Character;
}

/** Character file not found error result. */
export interface CharacterUpdateNotFoundError {
  status: 'error';
  reason: 'not-found';
  characterId: string;
}

/** Character data invalid error result. */
export interface CharacterUpdateInvalidDataError {
  status: 'error';
  reason: 'invalid-data';
  characterId: string;
  cause: unknown;
}

/** Mutation function threw an error result. */
export interface CharacterUpdateMutationFailedError {
  status: 'error';
  reason: 'mutation-failed';
  characterId: string;
  cause: unknown;
}

/** Vault write operation failed error result. */
export interface CharacterUpdateVaultWriteError {
  status: 'error';
  reason: 'vault-write-failed';
  characterId: string;
  cause: unknown;
}

/**
 * Discriminated union result of a character update attempt.
 *
 * On success the result carries the updated Character object.
 * On failure the result carries a specific reason code and
 * optional error cause.
 */
export type UpdateCharacterResult =
  | CharacterUpdatedResult
  | CharacterUpdateNotFoundError
  | CharacterUpdateInvalidDataError
  | CharacterUpdateMutationFailedError
  | CharacterUpdateVaultWriteError;

/* ── Implementation ────────────────────────────────────────────── */

/**
 * Atomically update a character in the Obsidian vault.
 *
 * Uses `Vault.process` for atomic read-modify-write:
 * 1. Locate the character file by path.
 * 2. If not found, return a not-found error.
 * 3. Call `Vault.process` with a callback that:
 *    a. Deserializes the raw JSON content.
 *    b. Applies the mutation function.
 *    c. Serializes the updated character back to JSON.
 * 4. On success, return the updated character.
 * 5. On any error, return the specific error reason.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param characterId - The branded character ID to update.
 * @param mutation - A pure function that transforms the character.
 * @param charactersVaultPath - The vault-relative folder path for characters.
 * @returns A discriminated union result indicating success or failure reason.
 */
export async function updateCharacterInVault(
  app: App,
  characterId: CharacterId,
  mutation: (character: Character) => Character,
  charactersVaultPath: string,
): Promise<UpdateCharacterResult> {
  // 1. Construct the file path.
  const idStr = characterIdStr(characterId);
  const filePath = `${charactersVaultPath}/${idStr}.json`;

  // 2. Locate the file.
  const file = app.vault.getFileByPath(filePath);
  if (file === null) {
    return {
      status: 'error',
      reason: 'not-found',
      characterId: idStr,
    };
  }

  // 3. Atomic read-modify-write using Vault.process.
  try {
    const writtenContent = await app.vault.process(file, (rawContent: string) => {
      // 3a. Deserialize the current character.
      let character: Character;
      try {
        character = deserializeCharacter(rawContent);
      } catch (cause) {
        throw new CharacterUpdateError('invalid-data', idStr, cause);
      }

      // 3b. Apply the mutation function.
      let updated: Character;
      try {
        updated = mutation(character);
      } catch (cause) {
        throw new CharacterUpdateError('mutation-failed', idStr, cause);
      }

      // 3c. Serialize the updated character.
      return serializeCharacter(updated);
    });

    // 4. Deserialize the written content to return the updated character.
    const updatedCharacter = deserializeCharacter(writtenContent);
    return {
      status: 'updated',
      character: updatedCharacter,
    };
  } catch (cause) {
    if (cause instanceof CharacterUpdateError) {
      return {
        status: 'error',
        reason: cause.reason as 'invalid-data' | 'mutation-failed',
        characterId: cause.characterId,
        cause: cause.cause,
      };
    }
    return {
      status: 'error',
      reason: 'vault-write-failed',
      characterId: idStr,
      cause,
    };
  }
}

/* ── Internal error type ───────────────────────────────────────── */

/**
 * Internal error used to propagate specific failure reasons
 * from inside the Vault.process callback to the outer handler.
 *
 * Vault.process does not distinguish between callback errors
 * and write errors, so we use a custom error class to carry
 * the reason code and character ID through the throw/catch chain.
 */
class CharacterUpdateError extends Error {
  public readonly reason: string;
  public readonly characterId: string;
  public readonly cause: unknown;

  public constructor(reason: string, characterId: string, cause: unknown) {
    super(`Character update failed: ${reason}`);
    this.name = 'CharacterUpdateError';
    this.reason = reason;
    this.characterId = characterId;
    this.cause = cause;
  }
}

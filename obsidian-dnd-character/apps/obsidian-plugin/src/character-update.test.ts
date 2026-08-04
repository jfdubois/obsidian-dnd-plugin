/**
 * Core behavior tests for updateCharacterInVault (P8-T007).
 *
 * Validates the core update pipeline: success, not-found,
 * invalid-data, mutation-failed, and vault-write-failed paths,
 * plus the Vault.process atomic update mechanism.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, App } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';

vi.mock('obsidian', () => ({
  App: class {},
  Vault: class {},
  TFile: class {},
  TFolder: class {},
}));

vi.mock('@obsidian-dnd/character-contract', () => ({
  serializeCharacter: vi.fn(),
  deserializeCharacter: vi.fn(),
  CharacterSerializationError: class CharacterSerializationError extends Error {
    public readonly reason: string;
    public readonly cause: unknown;
    constructor(options: { reason: string; message: string; cause?: unknown }) {
      super(options.message);
      this.name = 'CharacterSerializationError';
      this.reason = options.reason;
      this.cause = options.cause;
    }
  },
}));

vi.mock('@obsidian-dnd/domain', () => ({
  characterIdStr: vi.fn((id) => id),
}));

import { updateCharacterInVault } from './character-update';
import * as characterContract from '@obsidian-dnd/character-contract';
import * as domain from '@obsidian-dnd/domain';

describe('updateCharacterInVault core behavior', () => {
  let mockVault: Vault;
  let mockApp: App;
  const vaultPath = 'dnd-characters';
  const characterId = 'char-1' as const;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockFile = {} as TFile;
    mockVault = {
      getFileByPath: vi.fn(),
      process: vi.fn(),
    } as unknown as Vault;
    mockApp = { vault: mockVault } as unknown as App;

    vi.mocked(mockVault.getFileByPath).mockReturnValue(mockFile);
    vi.mocked(domain.characterIdStr).mockReturnValue('char-1');
  });

  it('updates character and returns updated result', async () => {
    const originalCharacter = { id: 'char-1', name: 'Frodo' } as unknown as Character;
    const updatedCharacter = { id: 'char-1', name: 'Frodo Baggins' } as unknown as Character;

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      const rawContent = '{"schemaVersion":1}';
      const serialized = callback(rawContent);
      return Promise.resolve(serialized);
    });

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce(originalCharacter)
      .mockReturnValueOnce(updatedCharacter);
    vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"name":"Frodo Baggins"}');

    const mutation = vi.fn((c: Character) => ({
      ...c,
      name: 'Frodo Baggins',
    }) as unknown as Character);

    const result = await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      mutation,
      vaultPath,
    );

    expect(result.status).toBe('updated');
    if (result.status === 'updated') {
      expect(result.character).toBe(updatedCharacter);
    }
    expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd-characters/char-1.json');
    expect(mockVault.process).toHaveBeenCalled();
    expect(mutation).toHaveBeenCalledWith(originalCharacter);
    expect(characterContract.serializeCharacter).toHaveBeenCalledWith(updatedCharacter);
  });

  it('uses Vault.process for atomic update', async () => {
    const originalCharacter = { id: 'char-1' } as unknown as Character;
    const updatedCharacter = { id: 'char-1', level: 2 } as unknown as Character;

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      const rawContent = '{"schemaVersion":1}';
      const serialized = callback(rawContent);
      return Promise.resolve(serialized);
    });

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce(originalCharacter)
      .mockReturnValueOnce(updatedCharacter);
    vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"level":2}');

    await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      (c: Character) => ({ ...c, level: 2 }) as unknown as Character,
      vaultPath,
    );

    expect(mockVault.process).toHaveBeenCalledWith(
      {},
      expect.any(Function),
    );
    expect(mockVault.modify).toBeUndefined();
  });

  it('returns not-found error when file does not exist', async () => {
    vi.mocked(mockVault.getFileByPath).mockReturnValue(null);

    const result = await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      (c: Character) => c,
      vaultPath,
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('not-found');
      if (result.reason === 'not-found') {
        expect(result.characterId).toBe('char-1');
      }
    }
    expect(mockVault.process).not.toHaveBeenCalled();
    expect(characterContract.deserializeCharacter).not.toHaveBeenCalled();
  });

  it('returns invalid-data error on malformed JSON', async () => {
    const serializationError = new (characterContract.CharacterSerializationError)({
      reason: 'invalid-json',
      message: 'Failed to parse character JSON',
    });

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      const rawContent = 'not valid json';
      try {
        const serialized = callback(rawContent);
        return Promise.resolve(serialized);
      } catch (err) {
        return Promise.reject(err);
      }
    });

    vi.mocked(characterContract.deserializeCharacter).mockImplementation(() => {
      throw serializationError;
    });

    const result = await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      (c: Character) => c,
      vaultPath,
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('invalid-data');
      if (result.reason === 'invalid-data') {
        expect(result.characterId).toBe('char-1');
        expect(result.cause).toBe(serializationError);
      }
    }
  });

  it('returns mutation-failed error when mutation throws', async () => {
    const mutationError = new Error('Mutation logic failed');

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      const rawContent = '{"schemaVersion":1}';
      try {
        const serialized = callback(rawContent);
        return Promise.resolve(serialized);
      } catch (err) {
        return Promise.reject(err);
      }
    });

    const originalCharacter = { id: 'char-1' } as unknown as Character;
    vi.mocked(characterContract.deserializeCharacter).mockReturnValue(originalCharacter);

    const throwingMutation = vi.fn(() => {
      throw mutationError;
    });

    const result = await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      throwingMutation,
      vaultPath,
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('mutation-failed');
      if (result.reason === 'mutation-failed') {
        expect(result.characterId).toBe('char-1');
        expect(result.cause).toBe(mutationError);
      }
    }
    expect(throwingMutation).toHaveBeenCalledWith(originalCharacter);
  });

  it('returns vault-write-failed error on Vault.process failure', async () => {
    const writeError = new Error('Vault write failed');
    vi.mocked(mockVault.process).mockRejectedValue(writeError);

    const result = await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      (c: Character) => c,
      vaultPath,
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('vault-write-failed');
      if (result.reason === 'vault-write-failed') {
        expect(result.characterId).toBe('char-1');
        expect(result.cause).toBe(writeError);
      }
    }
  });

  it('applies mutation function correctly', async () => {
    const originalCharacter = {
      id: 'char-1',
      progression: { classes: [], experiencePoints: 100 },
    } as unknown as Character;
    const expectedUpdated = {
      id: 'char-1',
      progression: { classes: [], experiencePoints: 200 },
    } as unknown as Character;

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      return Promise.resolve(callback('{"schemaVersion":1}'));
    });

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce(originalCharacter)
      .mockReturnValueOnce(expectedUpdated);
    vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"experiencePoints":200}');

    const mutation = (c: Character) => ({
      ...c,
      progression: { ...c.progression, experiencePoints: 200 },
    }) as unknown as Character;

    const result = await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      mutation,
      vaultPath,
    );

    expect(result.status).toBe('updated');
    if (result.status === 'updated') {
      expect(result.character.progression.experiencePoints).toBe(200);
    }
  });
});

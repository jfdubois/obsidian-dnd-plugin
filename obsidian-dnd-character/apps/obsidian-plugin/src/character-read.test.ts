/**
 * Tests for readCharacterFromVault (P8-T006).
 *
 * Validates that readCharacterFromVault:
 * - Reads a valid character and returns success result
 * - Returns not-found error when file does not exist
 * - Returns invalid-data error on malformed JSON
 * - Returns invalid-data error on invalid character structure
 * - Constructs correct file path from vault path and character id
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

import { readCharacterFromVault } from './character-read';
import * as characterContract from '@obsidian-dnd/character-contract';

describe('readCharacterFromVault', () => {
  let mockVault: Vault;
  let mockApp: App;
  const vaultPath = 'dnd-characters';

  beforeEach(() => {
    vi.clearAllMocks();

    mockVault = {
      getFileByPath: vi.fn(),
      cachedRead: vi.fn(),
    } as unknown as Vault;
    mockApp = { vault: mockVault } as unknown as App;

    // Default: file found, content valid, deserialization succeeds
    vi.mocked(mockVault.getFileByPath).mockReturnValue({} as TFile);
    vi.mocked(mockVault.cachedRead).mockResolvedValue('{"schemaVersion":1}');
    vi.mocked(characterContract.deserializeCharacter).mockReturnValue({
      id: 'char-1',
    } as unknown as Character);
  });

  it('reads valid character and returns read result', async () => {
    const result = await readCharacterFromVault(mockApp, 'char-1', vaultPath);

    expect(result.status).toBe('read');
    if (result.status === 'read') {
      expect(result.filePath).toBe('dnd-characters/char-1.json');
      expect(result.character).toBeDefined();
    }
    expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd-characters/char-1.json');
    expect(mockVault.cachedRead).toHaveBeenCalled();
    expect(characterContract.deserializeCharacter).toHaveBeenCalledWith('{"schemaVersion":1}');
  });

  it('returns not-found error when file does not exist', async () => {
    vi.mocked(mockVault.getFileByPath).mockReturnValue(null);

    const result = await readCharacterFromVault(mockApp, 'missing', vaultPath);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('not-found');
      if (result.reason === 'not-found') {
        expect(result.characterId).toBe('missing');
      }
    }
    expect(mockVault.cachedRead).not.toHaveBeenCalled();
    expect(characterContract.deserializeCharacter).not.toHaveBeenCalled();
  });

  it('returns invalid-data error on malformed JSON', async () => {
    const serializationError = new (characterContract.CharacterSerializationError)({
      reason: 'invalid-json',
      message: 'Failed to parse character JSON',
    });
    vi.mocked(characterContract.deserializeCharacter).mockImplementation(() => {
      throw serializationError;
    });

    const result = await readCharacterFromVault(mockApp, 'char-1', vaultPath);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('invalid-data');
      if (result.reason === 'invalid-data') {
        expect(result.characterId).toBe('char-1');
        expect(result.cause).toBe(serializationError);
      }
    }
  });

  it('returns invalid-data error on invalid character structure', async () => {
    const serializationError = new (characterContract.CharacterSerializationError)({
      reason: 'invalid-character-structure',
      message: 'Parsed JSON does not match the Character schema',
    });
    vi.mocked(characterContract.deserializeCharacter).mockImplementation(() => {
      throw serializationError;
    });

    const result = await readCharacterFromVault(mockApp, 'char-1', vaultPath);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('invalid-data');
      if (result.reason === 'invalid-data') {
        expect(result.characterId).toBe('char-1');
        expect(result.cause).toBe(serializationError);
      }
    }
  });

  it('constructs correct file path from vault path and character id', async () => {
    const result = await readCharacterFromVault(mockApp, 'my-hero', vaultPath);

    expect(result.status).toBe('read');
    if (result.status === 'read') {
      expect(result.filePath).toBe('dnd-characters/my-hero.json');
    }
    expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd-characters/my-hero.json');
  });

  it('uses custom vault path when provided', async () => {
    const result = await readCharacterFromVault(mockApp, 'char-1', 'my-characters');

    expect(result.status).toBe('read');
    if (result.status === 'read') {
      expect(result.filePath).toBe('my-characters/char-1.json');
    }
  });
});

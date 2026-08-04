/**
 * Path construction tests for updateCharacterInVault (P8-T007).
 *
 * Validates file path construction from vault path and character id,
 * custom vault paths, and nested folder paths.
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

describe('updateCharacterInVault path construction', () => {
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

  it('constructs correct file path from vault path and character id', async () => {
    const originalCharacter = { id: 'my-hero' } as unknown as Character;
    const updatedCharacter = { id: 'my-hero', level: 2 } as unknown as Character;

    vi.mocked(domain.characterIdStr).mockReturnValue('my-hero');
    vi.mocked(mockVault.getFileByPath).mockReturnValue({} as TFile);

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      return Promise.resolve(callback('{"schemaVersion":1}'));
    });

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce(originalCharacter)
      .mockReturnValueOnce(updatedCharacter);
    vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"level":2}');

    await updateCharacterInVault(
      mockApp,
      'my-hero' as unknown as domain.CharacterId,
      (c: Character) => ({ ...c, level: 2 }) as unknown as Character,
      vaultPath,
    );

    expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd-characters/my-hero.json');
  });

  it('uses custom vault path when provided', async () => {
    const originalCharacter = { id: 'char-1' } as unknown as Character;
    const updatedCharacter = { id: 'char-1', level: 2 } as unknown as Character;

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      return Promise.resolve(callback('{"schemaVersion":1}'));
    });

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce(originalCharacter)
      .mockReturnValueOnce(updatedCharacter);
    vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"level":2}');

    await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      (c: Character) => ({ ...c, level: 2 }) as unknown as Character,
      'my-characters',
    );

    expect(mockVault.getFileByPath).toHaveBeenCalledWith('my-characters/char-1.json');
  });

  it('handles nested folder paths correctly', async () => {
    const originalCharacter = { id: 'char-1' } as unknown as Character;
    const updatedCharacter = { id: 'char-1', level: 2 } as unknown as Character;

    vi.mocked(mockVault.process).mockImplementation((_file, callback) => {
      return Promise.resolve(callback('{"schemaVersion":1}'));
    });

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce(originalCharacter)
      .mockReturnValueOnce(updatedCharacter);
    vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"level":2}');

    await updateCharacterInVault(
      mockApp,
      characterId as unknown as domain.CharacterId,
      (c: Character) => ({ ...c, level: 2 }) as unknown as Character,
      'dnd/characters/active',
    );

    expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd/characters/active/char-1.json');
  });
});

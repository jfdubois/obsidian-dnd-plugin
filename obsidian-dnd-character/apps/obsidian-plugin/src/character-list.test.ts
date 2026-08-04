/**
 * Tests for listCharactersInVault (P8-T006).
 *
 * Validates that listCharactersInVault:
 * - Lists multiple valid characters
 * - Returns empty list for missing folder
 * - Returns empty list for empty folder
 * - Skips invalid files and continues listing
 * - Skips non-json files
 * - Recursively finds characters in nested subfolders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, TFolder, App } from 'obsidian';
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

import { listCharactersInVault } from './character-read';
import * as characterContract from '@obsidian-dnd/character-contract';

describe('listCharactersInVault', () => {
  let mockVault: Vault;
  let mockApp: App;
  const vaultPath = 'dnd-characters';

  beforeEach(() => {
    vi.clearAllMocks();

    mockVault = {
      getFolderByPath: vi.fn(),
      cachedRead: vi.fn(),
    } as unknown as Vault;
    mockApp = { vault: mockVault } as unknown as App;

    // Default: folder found with no children
    const mockFolder = {
      children: [],
    } as unknown as TFolder;
    vi.mocked(mockVault.getFolderByPath).mockReturnValue(mockFolder);
    vi.mocked(mockVault.cachedRead).mockResolvedValue('{"schemaVersion":1}');
    vi.mocked(characterContract.deserializeCharacter).mockReturnValue({
      id: 'char-1',
    } as unknown as Character);
  });

  it('returns empty list for missing folder', async () => {
    vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);

    const result = await listCharactersInVault(mockApp, vaultPath);

    expect(result.status).toBe('read');
    expect(result.characters).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(mockVault.cachedRead).not.toHaveBeenCalled();
  });

  it('returns empty list for empty folder', async () => {
    const result = await listCharactersInVault(mockApp, vaultPath);

    expect(result.status).toBe('read');
    expect(result.characters).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(mockVault.cachedRead).not.toHaveBeenCalled();
  });

  it('lists multiple valid characters', async () => {
    const mockFile1 = {
      path: 'dnd-characters/char-1.json',
      extension: 'json',
    } as unknown as TFile;
    const mockFile2 = {
      path: 'dnd-characters/char-2.json',
      extension: 'json',
    } as unknown as TFile;

    const mockFolder = {
      children: [mockFile1, mockFile2],
    } as unknown as TFolder;
    vi.mocked(mockVault.getFolderByPath).mockReturnValue(mockFolder);

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce({ id: 'char-1' } as unknown as Character)
      .mockReturnValueOnce({ id: 'char-2' } as unknown as Character);

    const result = await listCharactersInVault(mockApp, vaultPath);

    expect(result.status).toBe('read');
    expect(result.characters).toHaveLength(2);
    expect(result.characters[0]!.id).toBe('char-1');
    expect(result.characters[1]!.id).toBe('char-2');
    expect(result.skipped).toEqual([]);
    expect(mockVault.cachedRead).toHaveBeenCalledTimes(2);
  });

  it('skips invalid files and continues listing', async () => {
    const mockFile1 = {
      path: 'dnd-characters/valid.json',
      extension: 'json',
    } as unknown as TFile;
    const mockFile2 = {
      path: 'dnd-characters/invalid.json',
      extension: 'json',
    } as unknown as TFile;

    const mockFolder = {
      children: [mockFile1, mockFile2],
    } as unknown as TFolder;
    vi.mocked(mockVault.getFolderByPath).mockReturnValue(mockFolder);

    const serializationError = new (characterContract.CharacterSerializationError)({
      reason: 'invalid-json',
      message: 'Failed to parse character JSON',
    });

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce({ id: 'valid-char' } as unknown as Character)
      .mockImplementationOnce(() => {
        throw serializationError;
      });

    const result = await listCharactersInVault(mockApp, vaultPath);

    expect(result.status).toBe('read');
    expect(result.characters).toHaveLength(1);
    expect(result.characters[0]!.id).toBe('valid-char');
    expect(result.skipped).toHaveLength(1);
    if (result.skipped.length > 0) {
      expect(result.skipped[0]!.filePath).toBe('dnd-characters/invalid.json');
      expect(result.skipped[0]!.reason).toBe('invalid-json');
    }
  });

  it('skips non-json files', async () => {
    const mockFile = {
      path: 'dnd-characters/notes.md',
      extension: 'md',
    } as unknown as TFile;

    const mockFolder = {
      children: [mockFile],
    } as unknown as TFolder;
    vi.mocked(mockVault.getFolderByPath).mockReturnValue(mockFolder);

    const result = await listCharactersInVault(mockApp, vaultPath);

    expect(result.status).toBe('read');
    expect(result.characters).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(mockVault.cachedRead).not.toHaveBeenCalled();
  });

  it('recursively finds characters in nested subfolders', async () => {
    const mockNestedFolder = {
      children: [
        {
          path: 'dnd-characters/backup/old-char.json',
          extension: 'json',
        },
      ],
    } as unknown as TFolder;

    const mockFile = {
      path: 'dnd-characters/char-1.json',
      extension: 'json',
    } as unknown as TFile;

    const mockFolder = {
      children: [mockFile, mockNestedFolder],
    } as unknown as TFolder;
    vi.mocked(mockVault.getFolderByPath).mockReturnValue(mockFolder);

    vi.mocked(characterContract.deserializeCharacter)
      .mockReturnValueOnce({ id: 'char-1' } as unknown as Character)
      .mockReturnValueOnce({ id: 'old-char' } as unknown as Character);

    const result = await listCharactersInVault(mockApp, vaultPath);

    expect(result.status).toBe('read');
    expect(result.characters).toHaveLength(2);
    expect(mockVault.cachedRead).toHaveBeenCalledTimes(2);
  });

  it('uses custom vault path when provided', async () => {
    const mockFile = {
      path: 'my-characters/char-1.json',
      extension: 'json',
    } as unknown as TFile;

    const mockFolder = {
      children: [mockFile],
    } as unknown as TFolder;
    vi.mocked(mockVault.getFolderByPath).mockReturnValue(mockFolder);

    const result = await listCharactersInVault(mockApp, 'my-characters');

    expect(result.status).toBe('read');
    expect(result.characters).toHaveLength(1);
    expect(mockVault.getFolderByPath).toHaveBeenCalledWith('my-characters');
  });
});

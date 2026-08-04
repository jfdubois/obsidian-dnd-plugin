/**
 * Tests for character vault event listeners (P8-T009).
 *
 * Validates that setupCharacterVaultEventListeners:
 * - Registers vault event listeners for create, modify, delete
 * - Filters events to only character files in the characters folder
 * - Fires onCreated callback when a character file is created
 * - Fires onModified callback when a character file is modified
 * - Fires onDeleted callback when a character file is deleted
 * - Ignores non-character files
 * - Handles invalid JSON gracefully (logs diagnostic, no crash)
 * - Handles invalid character structure gracefully
 * - isCharacterFile correctly identifies character files
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, TAbstractFile, App, EventRef } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';

vi.mock('obsidian', () => ({
  App: class {},
  Vault: class {},
  TFile: class {},
  TAbstractFile: class {},
  EventRef: {},
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

import {
  setupCharacterVaultEventListeners,
  isCharacterFile,
} from './character-vault-events';
import * as characterContract from '@obsidian-dnd/character-contract';

describe('isCharacterFile', () => {
  it('identifies JSON files in the characters folder', () => {
    expect(isCharacterFile('dnd-characters/char-1.json', 'dnd-characters')).toBe(true);
  });

  it('identifies JSON files in nested subfolders', () => {
    expect(isCharacterFile('dnd-characters/active/char-1.json', 'dnd-characters')).toBe(true);
  });

  it('rejects non-JSON files in the characters folder', () => {
    expect(isCharacterFile('dnd-characters/notes.md', 'dnd-characters')).toBe(false);
  });

  it('rejects JSON files outside the characters folder', () => {
    expect(isCharacterFile('other-folder/char-1.json', 'dnd-characters')).toBe(false);
  });

  it('rejects files in similarly-named folders', () => {
    expect(isCharacterFile('dnd-characters-backup/char-1.json', 'dnd-characters')).toBe(false);
  });

  it('handles trailing slash in vault path', () => {
    expect(isCharacterFile('dnd-characters/char-1.json', 'dnd-characters/')).toBe(true);
  });

  it('handles nested vault paths', () => {
    expect(isCharacterFile('dnd/characters/char-1.json', 'dnd/characters')).toBe(true);
    expect(isCharacterFile('dnd/characters-backup/char-1.json', 'dnd/characters')).toBe(false);
  });
});

describe('setupCharacterVaultEventListeners', () => {
  let mockVault: Vault;
  let mockApp: App;
  const vaultPath = 'dnd-characters';

  beforeEach(() => {
    vi.clearAllMocks();

    // Track callbacks registered via vault.on
    const registeredCallbacks: Record<string, ((...args: unknown[]) => unknown) | undefined> = {};

    mockVault = {
      on: vi.fn().mockImplementation((name: string, callback: (...args: unknown[]) => unknown): EventRef => {
        registeredCallbacks[name] = callback;
        return { __name: name } as unknown as EventRef;
      }),
      cachedRead: vi.fn().mockResolvedValue('{"schemaVersion":1}'),
    } as unknown as Vault;
    mockApp = { vault: mockVault } as unknown as App;

    vi.mocked(characterContract.deserializeCharacter).mockReturnValue({
      id: 'char-1',
    } as unknown as Character);
  });

  it('returns registration object with three event refs', () => {
    const callbacks = {
      onCreated: vi.fn(),
      onModified: vi.fn(),
      onDeleted: vi.fn(),
    };

    const registration = setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    expect(registration.createRef).toBeDefined();
    expect(registration.modifyRef).toBeDefined();
    expect(registration.deleteRef).toBeDefined();
  });

  it('fires onCreated callback for character file creation', () => {
    const callbacks = {
      onCreated: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    // Trigger the create event
    const createCallback = vi.mocked(mockVault.on).mock.calls[0]![1] as (...args: unknown[]) => unknown;
    createCallback({ path: 'dnd-characters/char-1.json' } as TFile);

    expect(callbacks.onCreated).toHaveBeenCalledWith({
      type: 'created',
      filePath: 'dnd-characters/char-1.json',
    });
  });

  it('fires onModified callback for character file modification', async () => {
    const callbacks = {
      onModified: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    // Trigger the modify event
    const modifyCallback = vi.mocked(mockVault.on).mock.calls[1]![1] as (...args: unknown[]) => unknown;
    modifyCallback({ path: 'dnd-characters/char-1.json' } as TFile);

    // Wait for async deserialization
    await Promise.resolve();

    expect(callbacks.onModified).toHaveBeenCalledWith({
      type: 'modified',
      filePath: 'dnd-characters/char-1.json',
      character: { id: 'char-1' },
    });
  });

  it('fires onDeleted callback for character file deletion', () => {
    const callbacks = {
      onDeleted: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    // Trigger the delete event
    const deleteCallback = vi.mocked(mockVault.on).mock.calls[2]![1] as (...args: unknown[]) => unknown;
    deleteCallback({ path: 'dnd-characters/char-1.json' } as TAbstractFile);

    expect(callbacks.onDeleted).toHaveBeenCalledWith({
      type: 'deleted',
      filePath: 'dnd-characters/char-1.json',
    });
  });

  it('ignores non-character file create events', () => {
    const callbacks = {
      onCreated: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    const createCallback = vi.mocked(mockVault.on).mock.calls[0]![1] as (...args: unknown[]) => unknown;
    createCallback({ path: 'other-folder/notes.md' } as TFile);

    expect(callbacks.onCreated).not.toHaveBeenCalled();
  });

  it('ignores non-character file modify events', async () => {
    const callbacks = {
      onModified: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    const modifyCallback = vi.mocked(mockVault.on).mock.calls[1]![1] as (...args: unknown[]) => unknown;
    modifyCallback({ path: 'other-folder/data.json' } as TFile);

    await Promise.resolve();

    expect(callbacks.onModified).not.toHaveBeenCalled();
    expect(mockVault.cachedRead).not.toHaveBeenCalled();
  });

  it('ignores non-character file delete events', () => {
    const callbacks = {
      onDeleted: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    const deleteCallback = vi.mocked(mockVault.on).mock.calls[2]![1] as (...args: unknown[]) => unknown;
    deleteCallback({ path: 'other-folder/data.json' } as TAbstractFile);

    expect(callbacks.onDeleted).not.toHaveBeenCalled();
  });

  it('handles invalid JSON gracefully without crashing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const serializationError = new (characterContract.CharacterSerializationError)({
      reason: 'invalid-json',
      message: 'Failed to parse character JSON',
    });
    vi.mocked(characterContract.deserializeCharacter).mockImplementation(() => {
      throw serializationError;
    });

    const callbacks = {
      onModified: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    const modifyCallback = vi.mocked(mockVault.on).mock.calls[1]![1] as (...args: unknown[]) => unknown;
    modifyCallback({ path: 'dnd-characters/char-1.json' } as TFile);

    await Promise.resolve();

    expect(callbacks.onModified).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[D&D Character] Character file corrupted or invalid: dnd-characters/char-1.json (invalid-json)',
    );

    consoleSpy.mockRestore();
  });

  it('handles invalid character structure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const serializationError = new (characterContract.CharacterSerializationError)({
      reason: 'invalid-character-structure',
      message: 'Parsed JSON does not match the Character schema',
    });
    vi.mocked(characterContract.deserializeCharacter).mockImplementation(() => {
      throw serializationError;
    });

    const callbacks = {
      onModified: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    const modifyCallback = vi.mocked(mockVault.on).mock.calls[1]![1] as (...args: unknown[]) => unknown;
    modifyCallback({ path: 'dnd-characters/char-1.json' } as TFile);

    await Promise.resolve();

    expect(callbacks.onModified).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[D&D Character] Character file corrupted or invalid: dnd-characters/char-1.json (invalid-character-structure)',
    );

    consoleSpy.mockRestore();
  });

  it('handles vault read errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(mockVault.cachedRead).mockRejectedValue(new Error('Disk read error'));

    const callbacks = {
      onModified: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    const modifyCallback = vi.mocked(mockVault.on).mock.calls[1]![1] as (...args: unknown[]) => unknown;
    modifyCallback({ path: 'dnd-characters/char-1.json' } as TFile);

    await Promise.resolve();

    expect(callbacks.onModified).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[D&D Character] Character file corrupted or invalid: dnd-characters/char-1.json (Disk read error)',
    );

    consoleSpy.mockRestore();
  });

  it('does not fire callbacks when optional handlers are not provided', async () => {
    const callbacks = {};

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    const createCallback = vi.mocked(mockVault.on).mock.calls[0]![1] as (...args: unknown[]) => unknown;
    createCallback({ path: 'dnd-characters/char-1.json' } as TFile);

    const modifyCallback = vi.mocked(mockVault.on).mock.calls[1]![1] as (...args: unknown[]) => unknown;
    modifyCallback({ path: 'dnd-characters/char-1.json' } as TFile);

    await Promise.resolve();

    const deleteCallback = vi.mocked(mockVault.on).mock.calls[2]![1] as (...args: unknown[]) => unknown;
    deleteCallback({ path: 'dnd-characters/char-1.json' } as TAbstractFile);

    // No callbacks should have been called since none were provided
    expect(mockVault.cachedRead).not.toHaveBeenCalled();
  });

  it('registers exactly four vault event listeners', () => {
    const callbacks = {
      onCreated: vi.fn(),
      onModified: vi.fn(),
      onDeleted: vi.fn(),
      onRenamed: vi.fn(),
    };

    setupCharacterVaultEventListeners(mockApp, vaultPath, callbacks);

    expect(mockVault.on).toHaveBeenCalledTimes(4);
    expect(mockVault.on).toHaveBeenNthCalledWith(1, 'create', expect.any(Function));
    expect(mockVault.on).toHaveBeenNthCalledWith(2, 'modify', expect.any(Function));
    expect(mockVault.on).toHaveBeenNthCalledWith(3, 'delete', expect.any(Function));
    expect(mockVault.on).toHaveBeenNthCalledWith(4, 'rename', expect.any(Function));
  });
});

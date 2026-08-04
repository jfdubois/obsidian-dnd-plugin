/**
 * Tests for character creation in the vault (P8-T005).
 *
 * Validates that createCharacterInVault:
 * - Creates a character file and returns success result
 * - Returns duplicate-id error when file already exists
 * - Returns serialization-failed error on serialization failure
 * - Returns vault-write-failed error on vault write failure
 * - Returns folder-creation-failed error on folder creation failure
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
	serializeCharacter: vi.fn(),
}));

vi.mock('./character-folder', () => ({
	ensureCharacterFolder: vi.fn(),
}));

vi.mock('@obsidian-dnd/domain', () => ({
	characterIdStr: vi.fn((id) => id),
}));

import { createCharacterInVault } from './character-create';
import * as characterContract from '@obsidian-dnd/character-contract';
import * as characterFolder from './character-folder';
import * as domain from '@obsidian-dnd/domain';

describe('createCharacterInVault', () => {
	let mockVault: Vault;
	let mockApp: App;
	const vaultPath = 'dnd-characters';

	beforeEach(() => {
		vi.clearAllMocks();

		const mockFile = {} as TFile;
		mockVault = {
			getFileByPath: vi.fn(),
			create: vi.fn().mockResolvedValue(mockFile),
		} as unknown as Vault;
		mockApp = { vault: mockVault } as unknown as App;

		// Default: folder exists, no duplicate, serialization succeeds, vault create succeeds
		vi.mocked(characterFolder.ensureCharacterFolder).mockResolvedValue({ status: 'exists' });
		vi.mocked(mockVault.getFileByPath).mockReturnValue(null);
		vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"schemaVersion":1}');
		vi.mocked(domain.characterIdStr).mockReturnValue('char-1');
	});

	it('creates character file and returns success result', async () => {
		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, vaultPath);

		expect(result.status).toBe('created');
		if (result.status === 'created') {
			expect(result.filePath).toBe('dnd-characters/char-1.json');
			expect(result.file).toBeDefined();
		}
		expect(characterFolder.ensureCharacterFolder).toHaveBeenCalledWith(mockApp, vaultPath);
		expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd-characters/char-1.json');
		expect(characterContract.serializeCharacter).toHaveBeenCalledWith(character);
		expect(mockVault.create).toHaveBeenCalledWith('dnd-characters/char-1.json', '{"schemaVersion":1}');
	});

	it('constructs correct file path from vault path and character id', async () => {
		vi.mocked(domain.characterIdStr).mockReturnValue('my-hero');

		const character = { id: 'my-hero' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, vaultPath);

		expect(result.status).toBe('created');
		if (result.status === 'created') {
			expect(result.filePath).toBe('dnd-characters/my-hero.json');
		}
	});

	it('returns duplicate-id error when file already exists', async () => {
		vi.mocked(mockVault.getFileByPath).mockReturnValue({} as TFile);

		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, vaultPath);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('duplicate-id');
			if (result.reason === 'duplicate-id') {
				expect(result.characterId).toBe('char-1');
			}
		}
		expect(mockVault.create).not.toHaveBeenCalled();
	});

	it('returns serialization-failed error on serialization failure', async () => {
		const serializationError = new Error('Serialization failed');
		vi.mocked(characterContract.serializeCharacter).mockImplementation(() => {
			throw serializationError;
		});

		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, vaultPath);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('serialization-failed');
			if (result.reason === 'serialization-failed') {
				expect(result.cause).toBe(serializationError);
			}
		}
		expect(mockVault.create).not.toHaveBeenCalled();
	});

	it('returns vault-write-failed error on vault write failure', async () => {
		const writeError = new Error('Vault write failed');
		vi.mocked(mockVault.create).mockRejectedValue(writeError);

		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, vaultPath);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('vault-write-failed');
			if (result.reason === 'vault-write-failed') {
				expect(result.cause).toBe(writeError);
			}
		}
	});

	it('returns folder-creation-failed error on folder creation failure', async () => {
		const folderError = new Error('Cannot create folder');
		vi.mocked(characterFolder.ensureCharacterFolder).mockRejectedValue(folderError);

		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, vaultPath);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('folder-creation-failed');
			if (result.reason === 'folder-creation-failed') {
				expect(result.cause).toBe(folderError);
			}
		}
		expect(mockVault.getFileByPath).not.toHaveBeenCalled();
		expect(mockVault.create).not.toHaveBeenCalled();
	});

	it('uses custom vault path when provided', async () => {
		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, 'my-characters');

		expect(result.status).toBe('created');
		if (result.status === 'created') {
			expect(result.filePath).toBe('my-characters/char-1.json');
		}
		expect(characterFolder.ensureCharacterFolder).toHaveBeenCalledWith(mockApp, 'my-characters');
	});

	it('handles nested folder paths correctly', async () => {
		vi.mocked(domain.characterIdStr).mockReturnValue('char-1');

		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, 'dnd/characters/active');

		expect(result.status).toBe('created');
		if (result.status === 'created') {
			expect(result.filePath).toBe('dnd/characters/active/char-1.json');
		}
	});

	it('returns TFile handle in success result', async () => {
		const mockFile = { path: 'dnd-characters/char-1.json' } as TFile;
		vi.mocked(mockVault.create).mockResolvedValue(mockFile);

		const character = { id: 'char-1' } as unknown as Character;

		const result = await createCharacterInVault(mockApp, character, vaultPath);

		expect(result.status).toBe('created');
		if (result.status === 'created') {
			expect(result.file).toBe(mockFile);
		}
	});
});

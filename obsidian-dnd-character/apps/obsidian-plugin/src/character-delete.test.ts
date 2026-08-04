/**
 * Tests for deleteCharacterFromVault (P8-T008).
 *
 * Validates that deleteCharacterFromVault:
 * - Deletes an existing character file and returns success result
 * - Returns not-found error when file does not exist
 * - Returns vault-delete-failed error when Vault.delete throws
 * - Constructs correct file path from vault path and character id
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, App } from 'obsidian';

vi.mock('obsidian', () => ({
	App: class {},
	Vault: class {},
	TFile: class {},
	TFolder: class {},
}));

import { deleteCharacterFromVault } from './character-delete';
import { createCharacterId } from '@obsidian-dnd/domain';

describe('deleteCharacterFromVault', () => {
	let mockVault: Vault;
	let mockApp: App;
	const vaultPath = 'dnd-characters';

	beforeEach(() => {
		vi.clearAllMocks();

		mockVault = {
			getFileByPath: vi.fn(),
			delete: vi.fn(),
		} as unknown as Vault;
		mockApp = { vault: mockVault } as unknown as App;

		// Default: file found, delete succeeds
		vi.mocked(mockVault.getFileByPath).mockReturnValue({} as TFile);
		vi.mocked(mockVault.delete).mockResolvedValue(undefined);
	});

	it('deletes existing character and returns deleted result', async () => {
		const characterId = createCharacterId('char-1');
		const result = await deleteCharacterFromVault(mockApp, characterId, vaultPath);

		expect(result.status).toBe('deleted');
		if (result.status === 'deleted') {
			expect(result.filePath).toBe('dnd-characters/char-1.json');
		}
		expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd-characters/char-1.json');
		expect(mockVault.delete).toHaveBeenCalledTimes(1);
	});

	it('returns not-found error when file does not exist', async () => {
		vi.mocked(mockVault.getFileByPath).mockReturnValue(null);

		const characterId = createCharacterId('missing');
		const result = await deleteCharacterFromVault(mockApp, characterId, vaultPath);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('not-found');
			if (result.reason === 'not-found') {
				expect(result.characterId).toBe('missing');
			}
		}
		expect(mockVault.delete).not.toHaveBeenCalled();
	});

	it('returns vault-delete-failed error when Vault.delete throws', async () => {
		const error = new Error('Permission denied');
		vi.mocked(mockVault.delete).mockRejectedValue(error);

		const characterId = createCharacterId('char-1');
		const result = await deleteCharacterFromVault(mockApp, characterId, vaultPath);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('vault-delete-failed');
			if (result.reason === 'vault-delete-failed') {
				expect(result.characterId).toBe('char-1');
				expect(result.cause).toBe(error);
			}
		}
	});

	it('constructs correct file path from vault path and character id', async () => {
		const characterId = createCharacterId('my-hero');
		await deleteCharacterFromVault(mockApp, characterId, vaultPath);

		expect(mockVault.getFileByPath).toHaveBeenCalledWith('dnd-characters/my-hero.json');
	});

	it('uses custom vault path when provided', async () => {
		const characterId = createCharacterId('char-1');
		await deleteCharacterFromVault(mockApp, characterId, 'my-characters');

		expect(mockVault.getFileByPath).toHaveBeenCalledWith('my-characters/char-1.json');
	});
});

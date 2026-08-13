/**
 * Tests for character folder creation (P8-T004).
 *
 * Validates that ensureCharacterFolder:
 * - Returns 'exists' when the folder already exists
 * - Returns 'created' when the folder is created successfully
 * - Handles race conditions where createFolder throws
 * - Propagates unexpected errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFolder, App } from 'obsidian';

vi.mock('obsidian', () => ({
	App: class {},
	Vault: class {},
}));

import { ensureCharacterFolder } from './character-folder';

describe('ensureCharacterFolder', () => {
	let mockVault: Vault;
	let mockApp: App;

	beforeEach(() => {
	mockVault = {
			getFolderByPath: vi.fn(),
			getFileByPath: vi.fn(),
			createFolder: vi.fn(),
		} as unknown as Vault;
	mockApp = { vault: mockVault } as unknown as App;
	vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);
	vi.mocked(mockVault.getFileByPath).mockReturnValue(null);
	});

	it("returns 'exists' when folder already exists", async () => {
		const mockFolder = {} as TFolder;
		vi.mocked(mockVault.getFolderByPath).mockReturnValue(mockFolder);

		const result = await ensureCharacterFolder(mockApp, 'dnd-characters');

		expect(result).toEqual({ status: 'exists' });
		expect(mockVault.getFolderByPath).toHaveBeenCalledWith('dnd-characters');
		expect(mockVault.createFolder).not.toHaveBeenCalled();
	});

	it("returns 'created' when folder does not exist and creation succeeds", async () => {
		vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);
		vi.mocked(mockVault.createFolder).mockResolvedValue({} as TFolder);

		const result = await ensureCharacterFolder(mockApp, 'dnd-characters');

		expect(result).toEqual({ status: 'created' });
		expect(mockVault.getFolderByPath).toHaveBeenCalledWith('dnd-characters');
		expect(mockVault.createFolder).toHaveBeenCalledWith('dnd-characters');
	});

	it("returns 'exists' when a concurrent create makes the folder available", async () => {
		vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);
		vi.mocked(mockVault.createFolder).mockImplementation(async () => {
			vi.mocked(mockVault.getFolderByPath).mockReturnValue({} as TFolder);
			throw new Error('Folder already exists: dnd-characters');
		});

		const result = await ensureCharacterFolder(mockApp, 'dnd-characters');

		expect(result).toEqual({ status: 'exists' });
		expect(mockVault.createFolder).toHaveBeenCalledWith('dnd-characters');
	});

	it('throws a structured folder operation error when creation fails', async () => {
		vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);
		vi.mocked(mockVault.createFolder).mockRejectedValue(new Error('Disk full'));

		await expect(ensureCharacterFolder(mockApp, 'dnd-characters')).rejects.toMatchObject({
			reason: 'folder-creation-failed',
			cause: expect.objectContaining({ message: 'Disk full' }),
		});
	});

	it('detects a file collision at a required folder path', async () => {
		vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);
		vi.mocked(mockVault.getFileByPath).mockReturnValue({} as never);

		await expect(ensureCharacterFolder(mockApp, 'dnd-characters')).rejects.toMatchObject({ reason: 'folder-file-collision' });
	});

	it('uses the configured path from settings', async () => {
		vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);
		vi.mocked(mockVault.createFolder).mockResolvedValue({} as TFolder);

		await ensureCharacterFolder(mockApp, 'my-custom-characters');

		expect(mockVault.getFolderByPath).toHaveBeenCalledWith('my-custom-characters');
		expect(mockVault.createFolder).toHaveBeenCalledWith('my-custom-characters');
	});

	it('handles nested folder paths', async () => {
		vi.mocked(mockVault.getFolderByPath).mockReturnValue(null);
		vi.mocked(mockVault.createFolder).mockResolvedValue({} as TFolder);

		const result = await ensureCharacterFolder(
			mockApp,
			'dnd/characters/active',
		);

		expect(result).toEqual({ status: 'created' });
		expect(mockVault.createFolder).toHaveBeenCalledWith('dnd/characters/active');
	});
});

/**
 * Tests for the CharacterRepository facade (P8-T010).
 *
 * Validates that the repository correctly delegates to the
 * underlying persistence functions and manages event listeners.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TFile, App, EventRef } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';

/* ── Mocks ─────────────────────────────────────────────────────── */

vi.mock('obsidian', () => ({
	App: class {},
	Vault: class {},
	TFile: class {},
	TFolder: class {},
	EventRef: class {},
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

vi.mock('./character-folder', () => ({
	ensureCharacterFolder: vi.fn(),
}));

vi.mock('./character-create', () => ({
	createCharacterInVault: vi.fn(),
}));

vi.mock('./character-read', () => ({
	readCharacterFromVault: vi.fn(),
	listCharactersInVault: vi.fn(),
}));

vi.mock('./character-update', () => ({
	updateCharacterInVault: vi.fn(),
}));

vi.mock('./character-delete', () => ({
	deleteCharacterFromVault: vi.fn(),
}));

vi.mock('./character-vault-events', () => ({
	setupCharacterVaultEventListeners: vi.fn(),
}));

vi.mock('@obsidian-dnd/domain', () => ({
	characterIdStr: vi.fn((id) => id),
}));

/* ── Imports (after mocks) ─────────────────────────────────────── */

import { CharacterRepository } from './character-repository';
import * as characterFolder from './character-folder';
import * as characterCreate from './character-create';
import * as characterRead from './character-read';
import * as characterUpdate from './character-update';
import * as characterDelete from './character-delete';
import * as characterVaultEvents from './character-vault-events';
import * as domain from '@obsidian-dnd/domain';

/* ── Tests ─────────────────────────────────────────────────────── */

describe('CharacterRepository', () => {
	let mockApp: App;
	let repo: CharacterRepository;
	const vaultPath = 'dnd-characters';

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = {
			vault: {
				getFileByPath: vi.fn(),
				getFolderByPath: vi.fn(),
				create: vi.fn(),
				createFolder: vi.fn(),
				cachedRead: vi.fn(),
				process: vi.fn(),
				delete: vi.fn(),
				on: vi.fn().mockReturnValue({} as EventRef),
			},
		} as unknown as App;
		repo = new CharacterRepository(mockApp, vaultPath);
	});

	it('initializes with null eventRefs', () => {
		expect(repo.eventRefs).toBeNull();
	});

	it('ensureFolder delegates to ensureCharacterFolder', async () => {
		const result = { status: 'exists' as const };
		vi.mocked(characterFolder.ensureCharacterFolder).mockResolvedValue(result);
		const res = await repo.ensureFolder();
		expect(res).toBe(result);
		expect(characterFolder.ensureCharacterFolder).toHaveBeenCalledWith(mockApp, vaultPath);
	});

	it('create delegates to createCharacterInVault', async () => {
		const character = { id: 'char-1' } as unknown as Character;
		const result = { status: 'created' as const, filePath: 'dnd-characters/char-1.json', file: {} as TFile };
		vi.mocked(characterCreate.createCharacterInVault).mockResolvedValue(result);
		const res = await repo.create(character);
		expect(res).toBe(result);
		expect(characterCreate.createCharacterInVault).toHaveBeenCalledWith(mockApp, character, vaultPath);
	});

	it('read delegates to readCharacterFromVault with unbranded id', async () => {
		const characterId = 'char-1' as unknown as CharacterId;
		const character = { id: 'char-1' } as unknown as Character;
		const result = { status: 'read' as const, character, filePath: 'dnd-characters/char-1.json' };
		vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue(result);
		vi.mocked(domain.characterIdStr).mockReturnValue('char-1');
		const res = await repo.read(characterId);
		expect(res).toBe(result);
		expect(characterRead.readCharacterFromVault).toHaveBeenCalledWith(mockApp, 'char-1', vaultPath);
		expect(domain.characterIdStr).toHaveBeenCalledWith(characterId);
	});

	it('list delegates to listCharactersInVault', async () => {
		const result = { status: 'read' as const, characters: [], skipped: [] };
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue(result);
		const res = await repo.list();
		expect(res).toBe(result);
		expect(characterRead.listCharactersInVault).toHaveBeenCalledWith(mockApp, vaultPath);
	});

	it('list returns characters from underlying function', async () => {
		const characters = [{ id: 'char-1' }] as unknown as Character[];
		const result = { status: 'read' as const, characters, skipped: [] };
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue(result);
		const res = await repo.list();
		expect(res.status).toBe('read');
		if (res.status === 'read') expect(res.characters).toHaveLength(1);
	});

	it('update delegates to updateCharacterInVault', async () => {
		const characterId = 'char-1' as unknown as CharacterId;
		const mutation = vi.fn((c: Character) => c);
		const updated = { id: 'char-1' } as unknown as Character;
		const result = { status: 'updated' as const, character: updated };
		vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue(result);
		const res = await repo.update(characterId, mutation);
		expect(res).toBe(result);
		expect(characterUpdate.updateCharacterInVault).toHaveBeenCalledWith(mockApp, characterId, mutation, vaultPath);
	});

	it('delete delegates to deleteCharacterFromVault', async () => {
		const characterId = 'char-1' as unknown as CharacterId;
		const result = { status: 'deleted' as const, filePath: 'dnd-characters/char-1.json' };
		vi.mocked(characterDelete.deleteCharacterFromVault).mockResolvedValue(result);
		const res = await repo.delete(characterId);
		expect(res).toBe(result);
		expect(characterDelete.deleteCharacterFromVault).toHaveBeenCalledWith(mockApp, characterId, vaultPath);
	});

	it('setupEventListeners delegates and stores refs', () => {
		const callbacks = { onModified: vi.fn(), onCreated: vi.fn(), onDeleted: vi.fn() };
		const mockRefs = { createRef: {} as EventRef, modifyRef: {} as EventRef, deleteRef: {} as EventRef };
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(mockRefs);
		const res = repo.setupEventListeners(callbacks);
		expect(res).toBe(mockRefs);
		expect(characterVaultEvents.setupCharacterVaultEventListeners).toHaveBeenCalledWith(mockApp, vaultPath, callbacks);
		expect(repo.eventRefs).toBe(mockRefs);
	});

	it('propagates error results through facade methods', async () => {
		// create: duplicate-id
		const char = { id: 'char-1' } as unknown as Character;
		vi.mocked(characterCreate.createCharacterInVault).mockResolvedValue({
			status: 'error' as const, reason: 'duplicate-id' as const, characterId: 'char-1',
		});
		const createRes = await repo.create(char);
		expect(createRes.status).toBe('error');

		// read: not-found
		const cid = 'missing' as unknown as CharacterId;
		vi.mocked(domain.characterIdStr).mockReturnValue('missing');
		vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
			status: 'error' as const, reason: 'not-found' as const, characterId: 'missing',
		});
		const readRes = await repo.read(cid);
		expect(readRes.status).toBe('error');

		// update: not-found
		vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue({
			status: 'error' as const, reason: 'not-found' as const, characterId: 'missing',
		});
		const updateRes = await repo.update(cid, vi.fn());
		expect(updateRes.status).toBe('error');

		// delete: not-found
		vi.mocked(characterDelete.deleteCharacterFromVault).mockResolvedValue({
			status: 'error' as const, reason: 'not-found' as const, characterId: 'missing',
		});
		const deleteRes = await repo.delete(cid);
		expect(deleteRes.status).toBe('error');
	});
});

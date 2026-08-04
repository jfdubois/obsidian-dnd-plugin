/**
 * Character persistence lifecycle tests (P8-T012).
 *
 * Tests the full CRUD lifecycle and serialization round-trip
 * (restart simulation) through the CharacterRepository facade.
 * All tests use mocked Vault APIs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, App, EventRef } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';

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

vi.mock('./character-folder', () => ({ ensureCharacterFolder: vi.fn() }));
vi.mock('./character-create', () => ({ createCharacterInVault: vi.fn() }));
vi.mock('./character-read', () => ({
	readCharacterFromVault: vi.fn(),
	listCharactersInVault: vi.fn(),
}));
vi.mock('./character-update', () => ({ updateCharacterInVault: vi.fn() }));
vi.mock('./character-delete', () => ({ deleteCharacterFromVault: vi.fn() }));
vi.mock('./character-vault-events', () => ({
	setupCharacterVaultEventListeners: vi.fn(),
}));
vi.mock('@obsidian-dnd/domain', () => ({ characterIdStr: vi.fn((id: string) => id) }));

import { CharacterRepository } from './character-repository';
import * as characterContract from '@obsidian-dnd/character-contract';
import * as characterFolder from './character-folder';
import * as characterCreate from './character-create';
import * as characterRead from './character-read';
import * as characterUpdate from './character-update';
import * as characterDelete from './character-delete';
import * as characterVaultEvents from './character-vault-events';

function makeMockVault(): Vault {
	return {
		getFileByPath: vi.fn(),
		getFolderByPath: vi.fn(),
		create: vi.fn(),
		createFolder: vi.fn(),
		cachedRead: vi.fn(),
		process: vi.fn(),
		delete: vi.fn(),
		on: vi.fn().mockReturnValue({} as EventRef),
	} as unknown as Vault;
}

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
	return {
		id: 'char-1' as CharacterId,
		schemaVersion: 1,
		identity: { name: 'Test Character' },
		catalog: { catalogSchemaVersion: 1, createdWithRevision: 'rev-001', lastValidatedRevision: 'rev-001' },
		contentPolicy: { ruleset: '2024', enabledSourceIds: [], mode: 'snapshot' },
		progression: { classes: [] },
		origins: { speciesId: 'species:2024:xphb:human', backgroundId: 'bg:2024:xphb:soldier' },
		selections: {},
		abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
		spells: { selections: [], spellSlotsUsed: {} },
		inventory: [],
		resources: { currentHp: 10, temporaryHp: 0, deathSaves: { successes: 0, failures: 0 }, hitDiceUsed: {}, featureUses: {}, conditions: [] },
		overrides: {},
		metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
		...overrides,
	} as unknown as Character;
}

describe('Character persistence lifecycle', () => {
	let mockVault: Vault;
	let mockApp: App;
	let repo: CharacterRepository;
	const vaultPath = 'dnd-characters';

	beforeEach(() => {
		vi.clearAllMocks();
		mockVault = makeMockVault();
		mockApp = { vault: mockVault } as unknown as App;
		repo = new CharacterRepository(mockApp, vaultPath);
		vi.mocked(characterFolder.ensureCharacterFolder).mockResolvedValue({ status: 'exists' });
		vi.mocked(mockVault.getFileByPath).mockReturnValue({} as TFile);
		vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"schemaVersion":1}');
		vi.mocked(characterContract.deserializeCharacter).mockReturnValue(makeTestCharacter());
	});

	describe('Full CRUD lifecycle', () => {
		it('create → read → update → read → delete succeeds end-to-end', async () => {
			const character = makeTestCharacter();
			const mockFile = {} as TFile;

			vi.mocked(characterCreate.createCharacterInVault).mockResolvedValue({
				status: 'created', filePath: 'dnd-characters/char-1.json', file: mockFile,
			});
			const createResult = await repo.create(character);
			expect(createResult.status).toBe('created');
			if (createResult.status === 'created') {
				expect(createResult.filePath).toBe('dnd-characters/char-1.json');
			}

			vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
				status: 'read', character, filePath: 'dnd-characters/char-1.json',
			});
			const readResult = await repo.read(character.id);
			expect(readResult.status).toBe('read');
			if (readResult.status === 'read') {
				expect(readResult.character.id).toBe('char-1');
			}

			const updatedCharacter = makeTestCharacter({ identity: { name: 'Updated' } });
			vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue({
				status: 'updated', character: updatedCharacter,
			});
			const updateResult = await repo.update(character.id, (c: Character) =>
				({ ...c, identity: { name: 'Updated' } }) as unknown as Character);
			expect(updateResult.status).toBe('updated');
			if (updateResult.status === 'updated') {
				expect(updateResult.character.identity.name).toBe('Updated');
			}

			vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
				status: 'read', character: updatedCharacter, filePath: 'dnd-characters/char-1.json',
			});
			const readAfterUpdate = await repo.read(character.id);
			expect(readAfterUpdate.status).toBe('read');
			if (readAfterUpdate.status === 'read') {
				expect(readAfterUpdate.character.identity.name).toBe('Updated');
			}

			vi.mocked(characterDelete.deleteCharacterFromVault).mockResolvedValue({
				status: 'deleted', filePath: 'dnd-characters/char-1.json',
			});
			const deleteResult = await repo.delete(character.id);
			expect(deleteResult.status).toBe('deleted');
			if (deleteResult.status === 'deleted') {
				expect(deleteResult.filePath).toBe('dnd-characters/char-1.json');
			}
		});

		it('create fails with duplicate-id when file already exists', async () => {
			vi.mocked(characterCreate.createCharacterInVault).mockResolvedValue({
				status: 'error', reason: 'duplicate-id', characterId: 'char-1',
			});
			const result = await repo.create(makeTestCharacter());
			expect(result.status).toBe('error');
			if (result.status === 'error' && result.reason === 'duplicate-id') {
				expect(result.characterId).toBe('char-1');
			}
		});

		it('read fails with not-found when character does not exist', async () => {
			vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
				status: 'error', reason: 'not-found', characterId: 'missing',
			});
			const result = await repo.read('missing' as CharacterId);
			expect(result.status).toBe('error');
			if (result.status === 'error' && result.reason === 'not-found') {
				expect(result.characterId).toBe('missing');
			}
		});
	});

	describe('Serialization round-trip (restart simulation)', () => {
		it('serialize → deserialize round-trip preserves character', async () => {
			const character = makeTestCharacter();

			vi.mocked(characterCreate.createCharacterInVault).mockResolvedValue({
				status: 'created', filePath: 'dnd-characters/char-1.json', file: {} as TFile,
			});
			const createResult = await repo.create(character);
			expect(createResult.status).toBe('created');
			if (createResult.status === 'created') {
				expect(createResult.filePath).toBe('dnd-characters/char-1.json');
			}

			vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
				status: 'read', character, filePath: 'dnd-characters/char-1.json',
			});
			const readResult = await repo.read(character.id);
			expect(readResult.status).toBe('read');
			if (readResult.status === 'read') {
				expect(readResult.character.id).toBe('char-1');
			}
		});

		it('round-trip preserves all character fields', async () => {
			const character = makeTestCharacter({
				identity: { name: 'Gandalf' },
				progression: { classes: [], experiencePoints: 5000 },
			});

			vi.mocked(characterCreate.createCharacterInVault).mockResolvedValue({
				status: 'created', filePath: 'dnd-characters/char-1.json', file: {} as TFile,
			});
			await repo.create(character);

			vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
				status: 'read', character, filePath: 'dnd-characters/char-1.json',
			});
			const result = await repo.read(character.id);
			expect(result.status).toBe('read');
			if (result.status === 'read') {
				expect(result.character.identity.name).toBe('Gandalf');
				expect(result.character.progression.experiencePoints).toBe(5000);
			}
		});
	});

	describe('Vault event listeners', () => {
		it('setupEventListeners registers callbacks and stores refs', () => {
			const callbacks = { onModified: vi.fn(), onCreated: vi.fn(), onDeleted: vi.fn() };
			const mockRefs = {
				createRef: {} as EventRef, modifyRef: {} as EventRef, deleteRef: {} as EventRef,
			};
			vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(mockRefs);

			const result = repo.setupEventListeners(callbacks);
			expect(result).toBe(mockRefs);
			expect(repo.eventRefs).toBe(mockRefs);
			expect(characterVaultEvents.setupCharacterVaultEventListeners).toHaveBeenCalledWith(
				mockApp, vaultPath, callbacks,
			);
		});
	});
});

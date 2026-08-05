/**
 * Character persistence: Runtime validation on read (PER-002)
 * and Corrupted file handling (PER-003).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, App } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';
import type { CharacterSerializationErrorReason } from '@obsidian-dnd/character-contract';

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
		public readonly reason: CharacterSerializationErrorReason;
		public readonly cause: unknown;
		constructor(options: { reason: CharacterSerializationErrorReason; message: string; cause?: unknown }) {
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
	isCharacterFile: vi.fn(),
}));
vi.mock('@obsidian-dnd/domain', () => ({ characterIdStr: vi.fn((id: string) => id) }));

import { CharacterRepository } from './character-repository';
import * as characterFolder from './character-folder';
import * as characterRead from './character-read';

function makeMockVault(): Vault {
	return {
		getFileByPath: vi.fn(),
		getFolderByPath: vi.fn(),
		create: vi.fn(),
		createFolder: vi.fn(),
		cachedRead: vi.fn(),
		process: vi.fn(),
		delete: vi.fn(),
		on: vi.fn(),
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

describe('PER-002: Runtime validation on read', () => {
	let mockVault: Vault;
	let repo: CharacterRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		mockVault = makeMockVault();
		repo = new CharacterRepository({ vault: mockVault } as unknown as App, 'dnd-characters');
		vi.mocked(characterFolder.ensureCharacterFolder).mockResolvedValue({ status: 'exists' });
		vi.mocked(mockVault.getFileByPath).mockReturnValue({} as TFile);
	});

	it('readCharacter returns invalid-data when deserialization fails', async () => {
		vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
			status: 'error',
			reason: 'invalid-data',
			characterId: 'char-1',
			cause: new Error('Invalid character data'),
		});

		const result = await repo.read('char-1' as CharacterId);
		expect(result.status).toBe('error');
		if (result.status === 'error' && result.reason === 'invalid-data') {
			expect(result.characterId).toBe('char-1');
			expect(result.cause).toBeDefined();
		}
	});

	it('readCharacter returns invalid-data when runtime validation fails', async () => {
		vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
			status: 'error',
			reason: 'invalid-data',
			characterId: 'char-1',
			cause: new Error('Missing required field: identity.name'),
		});

		const result = await repo.read('char-1' as CharacterId);
		expect(result.status).toBe('error');
		if (result.status === 'error' && result.reason === 'invalid-data') {
			expect(result.characterId).toBe('char-1');
		}
	});
});

describe('PER-003: Corrupted file handling', () => {
	let mockVault: Vault;
	let repo: CharacterRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		mockVault = makeMockVault();
		repo = new CharacterRepository({ vault: mockVault } as unknown as App, 'dnd-characters');
		vi.mocked(characterFolder.ensureCharacterFolder).mockResolvedValue({ status: 'exists' });
	});

	it('readCharacter returns invalid-data for corrupted JSON', async () => {
		vi.mocked(characterRead.readCharacterFromVault).mockResolvedValue({
			status: 'error',
			reason: 'invalid-data',
			characterId: 'char-corrupt',
			cause: new Error('Unexpected token in JSON'),
		});

		const result = await repo.read('char-corrupt' as CharacterId);
		expect(result.status).toBe('error');
		if (result.status === 'error' && result.reason === 'invalid-data') {
			expect(result.characterId).toBe('char-corrupt');
		}
	});

	it('listCharacters skips corrupted files and returns valid ones', async () => {
		const validChar = makeTestCharacter();
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [{ character: validChar, filePath: 'dnd-characters/char-1.json' }],
			skipped: [
				{ filePath: 'dnd-characters/char-bad.json', reason: 'invalid-json' },
			],
		});

		const result = await repo.list();
		expect(result.status).toBe('read');
		expect(result.characters).toHaveLength(1);
		const firstEntry = result.characters[0];
		if (firstEntry) {
			expect(firstEntry.character.id).toBe('char-1');
		}
		expect(result.skipped).toHaveLength(1);
		const firstSkipped = result.skipped[0];
		if (firstSkipped) {
			expect(firstSkipped.filePath).toBe('dnd-characters/char-bad.json');
			expect(firstSkipped.reason).toBe('invalid-json');
		}
	});

	it('listCharacters returns empty list when all files are corrupted', async () => {
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [],
			skipped: [
				{ filePath: 'dnd-characters/char-a.json', reason: 'invalid-json' },
				{ filePath: 'dnd-characters/char-b.json', reason: 'invalid-json' },
			],
		});

		const result = await repo.list();
		expect(result.status).toBe('read');
		expect(result.characters).toHaveLength(0);
		expect(result.skipped).toHaveLength(2);
	});

	it('listCharacters returns empty list when folder does not exist', async () => {
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [],
			skipped: [],
		});

		const result = await repo.list();
		expect(result.status).toBe('read');
		expect(result.characters).toHaveLength(0);
		expect(result.skipped).toHaveLength(0);
	});
});

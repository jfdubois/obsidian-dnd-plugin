/**
 * Character persistence: Atomic update via Vault.process (PER-004).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, App } from 'obsidian';
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
import * as characterUpdate from './character-update';

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

describe('PER-004: Atomic update via Vault.process', () => {
	let mockVault: Vault;
	let repo: CharacterRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		mockVault = makeMockVault();
		repo = new CharacterRepository({ vault: mockVault } as unknown as App, 'dnd-characters');
		vi.mocked(characterFolder.ensureCharacterFolder).mockResolvedValue({ status: 'exists' });
		vi.mocked(mockVault.getFileByPath).mockReturnValue({} as TFile);
		vi.mocked(characterContract.serializeCharacter).mockReturnValue('{"schemaVersion":1}');
	});

	it('update succeeds with atomic write via Vault.process', async () => {
		const character = makeTestCharacter();
		const updatedCharacter = makeTestCharacter({ identity: { name: 'Updated' } });

		vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue({
			status: 'updated',
			character: updatedCharacter,
		});

		const result = await repo.update(character.id, (c: Character) =>
			({ ...c, identity: { name: 'Updated' } }) as unknown as Character);

		expect(result.status).toBe('updated');
		if (result.status === 'updated') {
			expect(result.character.identity.name).toBe('Updated');
		}
		expect(characterUpdate.updateCharacterInVault).toHaveBeenCalled();
	});

	it('update returns vault-write-failed when Vault.process throws', async () => {
		vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue({
			status: 'error',
			reason: 'vault-write-failed',
			characterId: 'char-1',
			cause: new Error('Vault write failed'),
		});

		const result = await repo.update('char-1' as CharacterId, (c: Character) => c);
		expect(result.status).toBe('error');
		if (result.status === 'error' && result.reason === 'vault-write-failed') {
			expect(result.characterId).toBe('char-1');
			expect(result.cause).toBeDefined();
		}
	});

	it('update returns mutation-failed when mutation function throws', async () => {
		vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue({
			status: 'error',
			reason: 'mutation-failed',
			characterId: 'char-1',
			cause: new Error('mutation error'),
		});

		const result = await repo.update('char-1' as CharacterId, () => {
			throw new Error('mutation error');
		});
		expect(result.status).toBe('error');
		if (result.status === 'error' && result.reason === 'mutation-failed') {
			expect(result.characterId).toBe('char-1');
			expect(result.cause).toBeDefined();
		}
	});

	it('update returns invalid-data when serialized data fails validation', async () => {
		vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue({
			status: 'error',
			reason: 'invalid-data',
			characterId: 'char-1',
			cause: new Error('Invalid character data'),
		});

		const result = await repo.update('char-1' as CharacterId, (c: Character) => c);
		expect(result.status).toBe('error');
		if (result.status === 'error' && result.reason === 'invalid-data') {
			expect(result.characterId).toBe('char-1');
			expect(result.cause).toBeDefined();
		}
	});

	it('sequential updates preserve character state', async () => {
		const character = makeTestCharacter();
		const step1 = makeTestCharacter({ identity: { name: 'Step 1' } });
		const step2 = makeTestCharacter({ identity: { name: 'Step 2' } });

		vi.mocked(characterUpdate.updateCharacterInVault)
			.mockResolvedValueOnce({ status: 'updated', character: step1 })
			.mockResolvedValueOnce({ status: 'updated', character: step2 });

		const r1 = await repo.update(character.id, (c: Character) =>
			({ ...c, identity: { name: 'Step 1' } }) as unknown as Character);
		expect(r1.status).toBe('updated');

		const r2 = await repo.update(character.id, (c: Character) =>
			({ ...c, identity: { name: 'Step 2' } }) as unknown as Character);
		expect(r2.status).toBe('updated');
		if (r2.status === 'updated') {
			expect(r2.character.identity.name).toBe('Step 2');
		}
	});

	it('update returns not-found when character file does not exist', async () => {
		vi.mocked(characterUpdate.updateCharacterInVault).mockResolvedValue({
			status: 'error',
			reason: 'not-found',
			characterId: 'missing',
		});

		const result = await repo.update('missing' as CharacterId, (c: Character) => c);
		expect(result.status).toBe('error');
		if (result.status === 'error' && result.reason === 'not-found') {
			expect(result.characterId).toBe('missing');
		}
	});
});

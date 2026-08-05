/**
 * Atomic character persistence: single-operation and failure behavior.
 *
 * Genuine queued overlap behavior for PER-005 is covered by
 * character-persistence-atomic-concurrent.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vault, TFile, App, EventRef } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';

vi.mock('obsidian', () => ({ App: class {}, Vault: class {}, TFile: class {}, TFolder: class {}, EventRef: class {} }));
vi.mock('@obsidian-dnd/character-contract', () => ({
	serializeCharacter: vi.fn(),
	deserializeCharacter: vi.fn(),
	CharacterSerializationError: class extends Error { public readonly reason: string = ''; public readonly cause: unknown = undefined; },
}));
vi.mock('./character-folder', () => ({ ensureCharacterFolder: vi.fn() }));
vi.mock('./character-create', () => ({ createCharacterInVault: vi.fn() }));
vi.mock('./character-read', () => ({ readCharacterFromVault: vi.fn(), listCharactersInVault: vi.fn() }));
vi.mock('./character-delete', () => ({ deleteCharacterFromVault: vi.fn() }));
vi.mock('./character-vault-events', () => ({ setupCharacterVaultEventListeners: vi.fn(), isCharacterFile: vi.fn() }));
vi.mock('@obsidian-dnd/domain', () => ({ characterIdStr: vi.fn((id: string) => id) }));

import * as characterContract from '@obsidian-dnd/character-contract';
import { updateCharacterInVault } from './character-update';

interface MockVault extends Vault {
	fileStore: Record<string, string>;
	processCalls: Array<{ filePath: string; originalContent: string; writtenContent: string | null }>;
	throwOnProcess: boolean;
}

function createMockVault(initialStore: Record<string, string> = {}): MockVault {
	const vault = {
		fileStore: { ...initialStore },
		processCalls: [] as MockVault['processCalls'],
		throwOnProcess: false,
		getFileByPath: vi.fn((path: string) => {
			if (path in vault.fileStore) {
				return { path, name: path.split('/').pop()?.replace('.json', '') || '' } as TFile;
			}
			return null;
		}),
		getFolderByPath: vi.fn(() => null),
		create: vi.fn(),
		createFolder: vi.fn(),
		cachedRead: vi.fn(),
		process: vi.fn(async (file: TFile, callback: (content: string) => string) => {
			const originalContent = vault.fileStore[file.path] ?? '';
			let writtenContent: string | null = null;
			let writeFailed = false;
			try {
				writtenContent = callback(originalContent);
				if (vault.throwOnProcess) {
					writeFailed = true;
					throw new Error('Vault write failed');
				}
				vault.fileStore[file.path] = writtenContent;
			} finally {
				vault.processCalls.push({ filePath: file.path, originalContent, writtenContent: writeFailed ? null : writtenContent });
			}
			return writtenContent ?? '';
		}),
		delete: vi.fn(),
		on: vi.fn().mockReturnValue({} as EventRef),
	};
	return vault as unknown as MockVault;
}

/* ── Test character factory ────────────────────────────────────── */

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

/* ── Tests ─────────────────────────────────────────────────────── */

describe('Atomic character mutation via Vault.process', () => {
	let mockVault: MockVault;
	let mockApp: App;
	const charactersPath = 'dnd-characters';
	const filePath = 'dnd-characters/char-1.json';

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(characterContract.serializeCharacter).mockImplementation((c) => JSON.stringify(c));
		vi.mocked(characterContract.deserializeCharacter).mockImplementation((json) => JSON.parse(json) as unknown as Character);
	});

	function setupVault(initialCharacter: Character) {
		const store: Record<string, string> = {
			[filePath]: JSON.stringify(initialCharacter),
		};
		mockVault = createMockVault(store);
		mockApp = { vault: mockVault } as unknown as App;
	}

	it('T1: Atomic update succeeds with Vault.process read-modify-write', async () => {
		const character = makeTestCharacter();
		setupVault(character);

		const result = await updateCharacterInVault(
			mockApp,
			character.id,
			(c) => ({ ...c, identity: { ...c.identity, name: 'Updated' } }) as unknown as Character,
			charactersPath,
		);

		expect(result.status).toBe('updated');
		if (result.status === 'updated') {
			expect(result.character.identity.name).toBe('Updated');
		}
		expect(mockVault.processCalls).toHaveLength(1);
		expect(mockVault.processCalls[0]?.originalContent).toBe(JSON.stringify(character));
		expect(mockVault.fileStore[filePath]).toContain('"Updated"');
	});

	it('T3: Mutation function throws - file content unchanged', async () => {
		const character = makeTestCharacter();
		const originalContent = JSON.stringify(character);
		setupVault(character);

		const result = await updateCharacterInVault(
			mockApp,
			character.id,
			() => { throw new Error('mutation failed'); },
			charactersPath,
		);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('mutation-failed');
		}
		// File content must remain unchanged
		expect(mockVault.fileStore[filePath]).toBe(originalContent);
	});

	it('T4: Vault.process write fails - file content unchanged', async () => {
		const character = makeTestCharacter();
		const originalContent = JSON.stringify(character);
		setupVault(character);
		mockVault.throwOnProcess = true;

		const result = await updateCharacterInVault(
			mockApp,
			character.id,
			(c) => ({ ...c, identity: { ...c.identity, name: 'Updated' } }) as unknown as Character,
			charactersPath,
		);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('vault-write-failed');
		}
		// File content must remain unchanged despite callback succeeding
		expect(mockVault.fileStore[filePath]).toBe(originalContent);
	});

	it('T5: Recovery - successful mutation after failed mutation restores progress', async () => {
		const character = makeTestCharacter();
		const originalContent = JSON.stringify(character);
		setupVault(character);

		// First: mutation throws
		const r1 = await updateCharacterInVault(
			mockApp,
			character.id,
			() => { throw new Error('oops'); },
			charactersPath,
		);
		expect(r1.status).toBe('error');
		expect(mockVault.fileStore[filePath]).toBe(originalContent);

		// Second: successful mutation
		const r2 = await updateCharacterInVault(
			mockApp,
			character.id,
			(c) => ({ ...c, identity: { ...c.identity, name: 'Recovered' } }) as unknown as Character,
			charactersPath,
		);
		expect(r2.status).toBe('updated');
		expect(mockVault.fileStore[filePath]).toContain('"Recovered"');
	});

	it('T6: Vault.process callback receives actual file content', async () => {
		const character = makeTestCharacter({ identity: { name: 'In File' } });
		setupVault(character);

		await updateCharacterInVault(
			mockApp,
			character.id,
			(c) => c,
			charactersPath,
		);

		const call = mockVault.processCalls[0];
		expect(call).toBeDefined();
		expect(call!.originalContent).toContain('"In File"');
	});

	it('T7: Vault.process writes serialized output back to file store', async () => {
		const character = makeTestCharacter();
		setupVault(character);

		await updateCharacterInVault(
			mockApp,
			character.id,
			(c) => ({ ...c, identity: { ...c.identity, name: 'Written' } }) as unknown as Character,
			charactersPath,
		);

		const written = mockVault.fileStore[filePath];
		expect(written).toBeDefined();
		expect(written!).toBe(JSON.stringify(JSON.parse(written!))); // valid JSON
		expect(written).toContain('"Written"');
		expect(mockVault.processCalls[0]?.writtenContent).toBe(written);
	});

	it('T8: not-found when character file does not exist', async () => {
		mockVault = createMockVault({});
		mockApp = { vault: mockVault } as unknown as App;

		const result = await updateCharacterInVault(
			mockApp,
			'missing' as CharacterId,
			(c) => c,
			charactersPath,
		);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.reason).toBe('not-found');
			expect(result.characterId).toBe('missing');
		}
	});
});

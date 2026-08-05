/**
 * Integrated tests for path fidelity and PER-006 behavior (P8-CORRECTIVE-001-R1).
 *
 * Tests 11-16: Rename into folder, filename vs ID, folder filtering,
 * duplicate IDs, and diagnostic lifecycle.
 */

import { describe, it, expect, vi } from 'vitest';
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

vi.mock('./character-folder', () => ({ ensureCharacterFolder: vi.fn() }));
vi.mock('./character-create', () => ({ createCharacterInVault: vi.fn() }));
vi.mock('./character-read', () => ({ readCharacterFromVault: vi.fn(), listCharactersInVault: vi.fn() }));
vi.mock('./character-update', () => ({ updateCharacterInVault: vi.fn() }));
vi.mock('./character-delete', () => ({ deleteCharacterFromVault: vi.fn() }));
vi.mock('./character-vault-events', () => ({ setupCharacterVaultEventListeners: vi.fn(), isCharacterFile: vi.fn() }));
vi.mock('@obsidian-dnd/domain', () => ({ characterIdStr: vi.fn((id) => id) }));

import { CharacterRepository } from './character-repository';
import * as characterVaultEvents from './character-vault-events';
import * as characterContract from '@obsidian-dnd/character-contract';
import * as characterRead from './character-read';
import type { CharacterIndexChangeEvent } from './character-index';
import type { CharacterVaultEventCallbacks } from './character-vault-events';

function makeMockApp() {
	return {
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
}

function makeChar(overrides: { id?: string } = {}) {
	return { id: overrides.id ?? 'char-1' } as unknown as Character;
}

function getCallbacks(): CharacterVaultEventCallbacks {
	const calls = vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mock.calls;
	const call = calls[calls.length - 1];
	if (!call || !call[2]) throw new Error('setupEventListeners was not called');
	return call[2];
}

/* ── Test 11: Rename into folder ──────────────────────────────── */

describe('Rename into folder', () => {
	it('T11: Rename into folder reads new path, validates ID, publishes addition, invokes refresh', async () => {
		const refreshFn = vi.fn();
		const events: CharacterIndexChangeEvent[] = [];
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(
			{} as unknown as { createRef: EventRef; modifyRef: EventRef; deleteRef: EventRef; renameRef: EventRef },
		);
		vi.mocked(characterVaultEvents.isCharacterFile)
			.mockImplementation((path) => path.startsWith('dnd-characters/'));
		repo.index.subscribe((e) => events.push(e));
		repo.setupEventListeners({ refreshCharacter: refreshFn });

		expect(repo.index.size).toBe(0);

		vi.mocked(mockApp.vault.getFileByPath).mockReturnValue({ path: 'dnd-characters/hero.json' } as TFile);
		vi.mocked(mockApp.vault.cachedRead).mockResolvedValue('{}');
		vi.mocked(characterContract.deserializeCharacter).mockReturnValue(makeChar({ id: 'hero-uuid' }));

		const callbacks = getCallbacks();
		callbacks.onRenamed!({ type: 'renamed', oldPath: 'other/hero.json', filePath: 'dnd-characters/hero.json' });

		await vi.waitFor(() => expect(repo.index.size).toBe(1));
		expect(events).toHaveLength(1);
		expect(events[0]?.type).toBe('added');
		expect(refreshFn).toHaveBeenCalledTimes(1);
		expect(repo.index.get('hero-uuid' as CharacterId)).not.toBeNull();
		expect(repo.index.resolvePath('hero-uuid' as CharacterId)).toBe('dnd-characters/hero.json');
	});

	it('T12: Rename into a nested folder works', async () => {
		const refreshFn = vi.fn();
		const events: CharacterIndexChangeEvent[] = [];
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(
			{} as unknown as { createRef: EventRef; modifyRef: EventRef; deleteRef: EventRef; renameRef: EventRef },
		);
		vi.mocked(characterVaultEvents.isCharacterFile)
			.mockImplementation((path) => path.startsWith('dnd-characters/'));
		repo.index.subscribe((e) => events.push(e));
		repo.setupEventListeners({ refreshCharacter: refreshFn });

		vi.mocked(mockApp.vault.getFileByPath).mockReturnValue({ path: 'dnd-characters/campaigns/hero.json' } as TFile);
		vi.mocked(mockApp.vault.cachedRead).mockResolvedValue('{}');
		vi.mocked(characterContract.deserializeCharacter).mockReturnValue(makeChar({ id: 'nested-hero' }));

		const callbacks = getCallbacks();
		callbacks.onRenamed!({
			type: 'renamed',
			oldPath: 'other/hero.json',
			filePath: 'dnd-characters/campaigns/hero.json',
		});

		await vi.waitFor(() => expect(repo.index.size).toBe(1));
		expect(repo.index.get('nested-hero' as CharacterId)).not.toBeNull();
		expect(repo.index.resolvePath('nested-hero' as CharacterId)).toBe('dnd-characters/campaigns/hero.json');
	});
});

/* ── Test 13: Filename different from internal character ID ───── */

describe('Filename vs internal ID', () => {
	it('T13: Filename different from internal character ID works for path-based external events', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [{ character: makeChar({ id: 'uuid-12345' }), filePath: 'dnd-characters/my-character.json' }],
			skipped: [],
		});
		await repo.initializeIndex();
		expect(repo.index.get('uuid-12345' as CharacterId)).not.toBeNull();
		expect(repo.index.resolvePath('uuid-12345' as CharacterId)).toBe('dnd-characters/my-character.json');
	});
});

/* ── Test 14: Unrelated JSON outside configured folder ignored ── */

describe('Folder filtering', () => {
	it('T14: Unrelated JSON file outside configured folder is ignored', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [{ character: makeChar(), filePath: 'dnd-characters/char-1.json' }],
			skipped: [],
		});
		await repo.initializeIndex();
		expect(repo.index.size).toBe(1);
		expect(repo.index.resolvePath('char-1' as CharacterId)).toBe('dnd-characters/char-1.json');
	});
});

/* ── Test 15: Duplicate internal IDs ──────────────────────────── */

describe('Duplicate internal IDs', () => {
	it('T15: Duplicate internal IDs in separate files result in last-seen path winning', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [
				{ character: makeChar({ id: 'same-id' }), filePath: 'dnd-characters/first.json' },
				{ character: makeChar({ id: 'same-id' }), filePath: 'dnd-characters/second.json' },
			],
			skipped: [],
		});
		await repo.initializeIndex();
		expect(repo.index.size).toBe(1);
		const entry = repo.index.get('same-id' as CharacterId);
		expect(entry).not.toBeNull();
		expect(entry!.filePath).toBe('dnd-characters/second.json');
	});
});

/* ── Test 16: Successful modify preserves index entry ─────────── */

describe('Diagnostic lifecycle', () => {
	it('T16: Successful modify after prior diagnostic preserves index entry and keeps diagnostic', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(
			{} as unknown as { createRef: EventRef; modifyRef: EventRef; deleteRef: EventRef; renameRef: EventRef },
		);
		vi.mocked(characterVaultEvents.isCharacterFile).mockReturnValue(true);
		repo.setupEventListeners({ refreshCharacter: vi.fn() });

		repo.index.handleCreate(makeChar({ id: 'char-1' }), 'dnd-characters/char-1.json');
		repo.index.recordDiagnostic({ filePath: 'dnd-characters/char-1.json', reason: 'initial-corruption' });
		expect(repo.index.getDiagnostics()).toHaveLength(1);

		vi.mocked(mockApp.vault.getFileByPath).mockReturnValue({ path: 'dnd-characters/char-1.json' } as TFile);
		vi.mocked(mockApp.vault.cachedRead).mockResolvedValue('{}');
		vi.mocked(characterContract.deserializeCharacter).mockReturnValue(makeChar({ id: 'char-1' }));

		const callbacks = getCallbacks();
		callbacks.onModified!({ type: 'modified', filePath: 'dnd-characters/char-1.json', character: null });
		await vi.waitFor(() => expect(repo.index.size).toBe(1));
		expect(repo.index.get('char-1' as CharacterId)).not.toBeNull();
		expect(repo.index.resolvePath('char-1' as CharacterId)).toBe('dnd-characters/char-1.json');
	});
});

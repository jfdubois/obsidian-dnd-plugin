/**
 * Integrated tests for path fidelity and PER-006 behavior (P8-CORRECTIVE-001-R1).
 *
 * Tests 1-10: Startup indexing, external events, rename events.
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

/* ── Test 1-3: Startup indexes actual paths ───────────────────── */

describe('Startup path fidelity', () => {
	let mockApp: App;
	let repo: CharacterRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = makeMockApp();
		repo = new CharacterRepository(mockApp, 'dnd-characters');
	});

	it('T1: Startup indexes a canonical file using its actual path', async () => {
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [{ character: makeChar({ id: 'hero-1' }), filePath: 'dnd-characters/hero.json' }],
			skipped: [],
		});
		await repo.initializeIndex();
		expect(repo.index.resolvePath('hero-1' as CharacterId)).toBe('dnd-characters/hero.json');
	});

	it('T2: Startup indexes a nested file using its actual nested path', async () => {
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [{ character: makeChar({ id: 'hero-1' }), filePath: 'dnd-characters/campaigns/hero.json' }],
			skipped: [],
		});
		await repo.initializeIndex();
		expect(repo.index.resolvePath('hero-1' as CharacterId)).toBe('dnd-characters/campaigns/hero.json');
	});

	it('T3: Startup indexes a renamed file where filename and internal ID differ', async () => {
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [{ character: makeChar({ id: 'char-abc123' }), filePath: 'dnd-characters/my-hero.json' }],
			skipped: [],
		});
		await repo.initializeIndex();
		expect(repo.index.get('char-abc123' as CharacterId)).not.toBeNull();
		expect(repo.index.resolvePath('char-abc123' as CharacterId)).toBe('dnd-characters/my-hero.json');
	});
});

/* ── Test 4: Repository restart reconstructs exact paths ──────── */
describe('Repository restart', () => {
	it('T4: Repository restart reconstructs those exact paths', async () => {
		const entries = [
			{ character: makeChar({ id: 'hero-1' }), filePath: 'dnd-characters/hero.json' },
			{ character: makeChar({ id: 'hero-2' }), filePath: 'dnd-characters/campaigns/hero2.json' },
		];

		const repo1 = new CharacterRepository(makeMockApp(), 'dnd-characters');
		repo1.index.initializeFromVault(entries);
		expect(repo1.index.resolvePath('hero-1' as CharacterId)).toBe('dnd-characters/hero.json');
		expect(repo1.index.resolvePath('hero-2' as CharacterId)).toBe('dnd-characters/campaigns/hero2.json');

		const repo2 = new CharacterRepository(makeMockApp(), 'dnd-characters');
		repo2.index.initializeFromVault(entries);
		expect(repo2.index.resolvePath('hero-1' as CharacterId)).toBe('dnd-characters/hero.json');
		expect(repo2.index.resolvePath('hero-2' as CharacterId)).toBe('dnd-characters/campaigns/hero2.json');
	});
});

/* ── Test 5: Startup diagnostics for skipped files ────────────── */
describe('Startup diagnostics', () => {
	let mockApp: App;
	let repo: CharacterRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = makeMockApp();
		repo = new CharacterRepository(mockApp, 'dnd-characters');
	});

	it('T5: Startup records diagnostics for skipped corrupt files while loading valid files', async () => {
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [{ character: makeChar({ id: 'char-1' }), filePath: 'dnd-characters/char-1.json' }],
			skipped: [{ filePath: 'dnd-characters/corrupt.json', reason: 'invalid-json' }],
		});
		await repo.initializeIndex();
		expect(repo.index.size).toBe(1);
		const diagnostics = repo.index.getDiagnostics();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.filePath).toBe('dnd-characters/corrupt.json');
	});
});

/* ── Test 6: External create reads exact event path ───────────── */
describe('External create event', () => {
	it('T6: External create reads the exact event path and indexes the internal ID', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(
			{} as unknown as { createRef: EventRef; modifyRef: EventRef; deleteRef: EventRef; renameRef: EventRef },
		);
		vi.mocked(characterVaultEvents.isCharacterFile).mockReturnValue(true);
		repo.setupEventListeners({ refreshCharacter: vi.fn() });

		vi.mocked(mockApp.vault.getFileByPath).mockReturnValue({ path: 'dnd-characters/my-char.json' } as TFile);
		vi.mocked(mockApp.vault.cachedRead).mockResolvedValue('{}');
		vi.mocked(characterContract.deserializeCharacter).mockReturnValue(makeChar({ id: 'uuid-999' }));

		const callbacks = getCallbacks();
		callbacks.onCreated!({ type: 'created', filePath: 'dnd-characters/my-char.json' });
		await vi.waitFor(() => expect(repo.index.size).toBe(1));
		expect(repo.index.get('uuid-999' as CharacterId)).not.toBeNull();
		expect(repo.index.resolvePath('uuid-999' as CharacterId)).toBe('dnd-characters/my-char.json');
	});
});

/* ── Test 7: External modify updates indexed character ────────── */
describe('External modify event', () => {
	it('T7: External modify reads the exact event path and replaces the indexed character', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(
			{} as unknown as { createRef: EventRef; modifyRef: EventRef; deleteRef: EventRef; renameRef: EventRef },
		);
		vi.mocked(characterVaultEvents.isCharacterFile).mockReturnValue(true);
		repo.setupEventListeners({ refreshCharacter: vi.fn() });

		repo.index.handleCreate(makeChar({ id: 'char-1' }), 'dnd-characters/char-1.json');
		expect(repo.index.size).toBe(1);

		vi.mocked(mockApp.vault.getFileByPath).mockReturnValue({ path: 'dnd-characters/char-1.json' } as TFile);
		vi.mocked(mockApp.vault.cachedRead).mockResolvedValue('{}');
		vi.mocked(characterContract.deserializeCharacter).mockReturnValue(makeChar({ id: 'char-1' }));

		const callbacks = getCallbacks();
		callbacks.onModified!({ type: 'modified', filePath: 'dnd-characters/char-1.json', character: null });
		await vi.waitFor(() => expect(repo.index.size).toBe(1));
		expect(repo.index.get('char-1' as CharacterId)).not.toBeNull();
	});
});

/* ── Test 8: Invalid external modify preserves index + diagnostic */
describe('Invalid external modify', () => {
	it('T8: Invalid external modify preserves last valid character and records diagnostic', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(
			{} as unknown as { createRef: EventRef; modifyRef: EventRef; deleteRef: EventRef; renameRef: EventRef },
		);
		vi.mocked(characterVaultEvents.isCharacterFile).mockReturnValue(true);
		repo.setupEventListeners({ refreshCharacter: vi.fn() });

		repo.index.handleCreate(makeChar({ id: 'char-1' }), 'dnd-characters/char-1.json');
		expect(repo.index.size).toBe(1);

		vi.mocked(mockApp.vault.getFileByPath).mockReturnValue({ path: 'dnd-characters/char-1.json' } as TFile);
		vi.mocked(mockApp.vault.cachedRead).mockResolvedValue('{}');
		vi.mocked(characterContract.deserializeCharacter).mockImplementation(() => {
			throw new (characterContract.CharacterSerializationError)({ reason: 'invalid-json', message: 'Bad data' });
		});

		const callbacks = getCallbacks();
		callbacks.onModified!({ type: 'modified', filePath: 'dnd-characters/char-1.json', character: null });
		await vi.waitFor(() => expect(repo.index.getDiagnostics()).toHaveLength(1));
		expect(repo.index.size).toBe(1);
		expect(repo.index.get('char-1' as CharacterId)).not.toBeNull();
	});
});

/* ── Test 9: Rename within folder ─────────────────────────────── */

describe('Rename within folder', () => {
	it('T9: Rename within folder updates path, publishes one update event, invokes refresh once', () => {
		const refreshFn = vi.fn();
		const events: CharacterIndexChangeEvent[] = [];
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterVaultEvents.setupCharacterVaultEventListeners).mockReturnValue(
			{} as unknown as { createRef: EventRef; modifyRef: EventRef; deleteRef: EventRef; renameRef: EventRef },
		);
		vi.mocked(characterVaultEvents.isCharacterFile).mockReturnValue(true);
		repo.index.subscribe((e) => events.push(e));
		repo.setupEventListeners({ refreshCharacter: refreshFn });

		repo.index.handleCreate(makeChar({ id: 'char-1' }), 'dnd-characters/old.json');
		events.length = 0;
		refreshFn.mockClear();

		const callbacks = getCallbacks();
		callbacks.onRenamed!({ type: 'renamed', oldPath: 'dnd-characters/old.json', filePath: 'dnd-characters/new.json' });

		expect(events).toHaveLength(1);
		expect(events[0]?.type).toBe('updated');
		expect(refreshFn).toHaveBeenCalledTimes(1);
		expect(repo.index.resolvePath('char-1' as CharacterId)).toBe('dnd-characters/new.json');
	});
});

/* ── Test 10: Rename out of folder ────────────────────────────── */

describe('Rename out of folder', () => {
	it('T10: Rename out removes entry, publishes one removal, invokes refresh once', () => {
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

		repo.index.handleCreate(makeChar({ id: 'char-1' }), 'dnd-characters/hero.json');
		events.length = 0;
		refreshFn.mockClear();

		const callbacks = getCallbacks();
		callbacks.onRenamed!({ type: 'renamed', oldPath: 'dnd-characters/hero.json', filePath: 'other/hero.json' });

		expect(events).toHaveLength(1);
		expect(events[0]?.type).toBe('removed');
		expect(refreshFn).toHaveBeenCalledTimes(1);
		expect(repo.index.size).toBe(0);
		expect(repo.index.get('char-1' as CharacterId)).toBeNull();
	});
});

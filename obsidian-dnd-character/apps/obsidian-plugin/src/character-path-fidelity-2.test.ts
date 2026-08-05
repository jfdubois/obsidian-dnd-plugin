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
	it('T15: Duplicate internal IDs — first-seen (sorted by path) wins, duplicate rejected with diagnostic', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		vi.mocked(characterRead.listCharactersInVault).mockResolvedValue({
			status: 'read',
			characters: [
				{ character: makeChar({ id: 'same-id' }), filePath: 'dnd-characters/second.json' },
				{ character: makeChar({ id: 'same-id' }), filePath: 'dnd-characters/first.json' },
			],
			skipped: [],
		});
		await repo.initializeIndex();
		// Only one entry in the index
		expect(repo.index.size).toBe(1);
		// First-seen (alphabetically sorted) path wins
		const entry = repo.index.get('same-id' as CharacterId);
		expect(entry).not.toBeNull();
		expect(entry!.filePath).toBe('dnd-characters/first.json');
		// Duplicate diagnostic recorded
		const diagnostics = repo.index.getDiagnostics();
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0]!.filePath).toBe('dnd-characters/second.json');
		expect(diagnostics[0]!.reason).toContain('same-id');
	});

	it('T15b: handleCreate rejects duplicate ID and records diagnostic', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const c = makeChar({ id: 'dup-id' });
		const r1 = repo.index.handleCreate(c, 'dnd-characters/a.json');
		expect(r1.ok).toBe(true);
		expect(r1.ok ? r1.entry.filePath : undefined).toBe('dnd-characters/a.json');
		const r2 = repo.index.handleCreate(c, 'dnd-characters/b.json');
		expect(r2.ok).toBe(false);
		expect(r2.ok ? undefined : r2.diagnostic.existingPath).toBe('dnd-characters/a.json');
		expect(repo.index.size).toBe(1);
		expect(repo.index.getDiagnostics().length).toBe(1);
	});

	it('T15c: handleModify rejects duplicate ID at different path', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const c = makeChar({ id: 'dup-id' });
		repo.index.handleCreate(c, 'dnd-characters/a.json');
		const r = repo.index.handleModify(c, 'dnd-characters/b.json');
		expect(r.ok).toBe(false);
		expect(r.ok ? undefined : r.diagnostic.existingPath).toBe('dnd-characters/a.json');
		expect(repo.index.size).toBe(1);
	});

	it('T15d: handleModify accepts same-path update', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const c1 = makeChar({ id: 'upd-id' });
		repo.index.handleCreate(c1, 'dnd-characters/a.json');
		const c2 = makeChar({ id: 'upd-id' });
		const r = repo.index.handleModify(c2, 'dnd-characters/a.json');
		expect(r.ok).toBe(true);
		expect(repo.index.size).toBe(1);
	});

	it('T15e: initializeFromVault sorts by path — alphabetically first wins', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const results = repo.index.initializeFromVault([
			{ character: makeChar({ id: 'z-id' }), filePath: 'dnd-characters/z.json' },
			{ character: makeChar({ id: 'z-id' }), filePath: 'dnd-characters/a.json' },
		]);
		const successes = results.filter(r => r.ok);
		const failures = results.filter(r => !r.ok);
		expect(successes.length).toBe(1);
		expect(successes[0]!.entry.filePath).toBe('dnd-characters/a.json');
		expect(failures.length).toBe(1);
		expect(failures[0]!.ok ? undefined : failures[0]!.diagnostic.filePath).toBe('dnd-characters/z.json');
	});

	it('T15f: No index event published for rejected duplicate', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const c = makeChar({ id: 'no-event' });
		let eventCount = 0;
		repo.index.subscribe(() => { eventCount++; });
		repo.index.handleCreate(c, 'dnd-characters/a.json');
		expect(eventCount).toBe(1);
		repo.index.handleCreate(c, 'dnd-characters/b.json');
		expect(eventCount).toBe(1); // no event for rejected duplicate
	});

	it('T15g: Modify-event collision preserves both entries', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const c = makeChar({ id: 'collide' });
		repo.index.handleCreate(c, 'dnd-characters/a.json');
		repo.index.handleModify(c, 'dnd-characters/b.json');
		expect(repo.index.size).toBe(1);
		expect(repo.index.get('collide' as CharacterId)!.filePath).toBe('dnd-characters/a.json');
	});

	it('T15h: Recovery — corrected file accepted with exactly one event', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const c = makeChar({ id: 'recover' });
		const events: Array<{ type: string }> = [];
		repo.index.subscribe((e) => { events.push(e); });
		repo.index.handleCreate(c, 'dnd-characters/a.json');
		expect(events.length).toBe(1);
		repo.index.handleDelete('dnd-characters/a.json');
		expect(events.length).toBe(2);
		const r = repo.index.handleCreate(c, 'dnd-characters/a.json');
		expect(r.ok).toBe(true);
		expect(events.length).toBe(3);
		expect(events[2]!.type).toBe('added');
	});

	it('T15i: Multiple duplicates — only first (sorted) survives, rest rejected', async () => {
		const mockApp = makeMockApp();
		const repo = new CharacterRepository(mockApp, 'dnd-characters');
		const results = repo.index.initializeFromVault([
			{ character: makeChar({ id: 'multi' }), filePath: 'dnd-characters/c.json' },
			{ character: makeChar({ id: 'multi' }), filePath: 'dnd-characters/a.json' },
			{ character: makeChar({ id: 'multi' }), filePath: 'dnd-characters/b.json' },
		]);
		const successes = results.filter(r => r.ok);
		const failures = results.filter(r => !r.ok);
		expect(successes.length).toBe(1);
		expect(successes[0]!.entry.filePath).toBe('dnd-characters/a.json');
		expect(failures.length).toBe(2);
		expect(repo.index.size).toBe(1);
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

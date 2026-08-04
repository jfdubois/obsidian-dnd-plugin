/**
 * Tests for the in-memory CharacterIndex (P8-T011 corrective A).
 *
 * Validates index mutation handlers, read-only access, change
 * event notifications, diagnostics, and the refresh boundary.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';

import { CharacterIndex } from './character-index';
import type { CharacterIndexChangeEvent } from './character-index';

vi.mock('@obsidian-dnd/domain', () => ({
	characterIdStr: vi.fn((id) => typeof id === 'string' ? id : String(id)),
}));

function makeCharacter(overrides = {}) {
	return {
		id: 'char-1' as CharacterId,
		schemaVersion: 1,
		identity: { name: 'Test' },
		...overrides,
	} as unknown as Character;
}

/* ── Read-only access ──────────────────────────────────────────── */

describe('CharacterIndex read-only access', () => {
	let index: CharacterIndex;

	beforeEach(() => {
		index = new CharacterIndex(null);
	});

	it('returns null for unknown character', () => {
		expect(index.get('unknown' as CharacterId)).toBeNull();
	});

	it('returns indexed character after handleCreate', () => {
		const character = makeCharacter();
		index.handleCreate(character, 'dnd/char-1.json');
		const entry = index.get('char-1' as CharacterId);
		expect(entry).not.toBeNull();
		expect(entry!.character).toBe(character);
		expect(entry!.filePath).toBe('dnd/char-1.json');
	});

	it('returns all indexed characters via list', () => {
		const c1 = makeCharacter();
		const c2 = makeCharacter({ id: 'char-2' as CharacterId });
		index.handleCreate(c1, 'dnd/char-1.json');
		index.handleCreate(c2, 'dnd/char-2.json');
		expect(index.list()).toHaveLength(2);
	});

	it('reports correct size', () => {
		expect(index.size).toBe(0);
		index.handleCreate(makeCharacter(), 'dnd/char-1.json');
		expect(index.size).toBe(1);
	});

	it('resolves file path for indexed character', () => {
		index.handleCreate(makeCharacter(), 'dnd/char-1.json');
		expect(index.resolvePath('char-1' as CharacterId)).toBe('dnd/char-1.json');
	});

	it('returns null path for unknown character', () => {
		expect(index.resolvePath('unknown' as CharacterId)).toBeNull();
	});
});

/* ── Mutation handlers ─────────────────────────────────────────── */

describe('CharacterIndex mutation handlers', () => {
	let index: CharacterIndex;
	let listener: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		listener = vi.fn();
		index = new CharacterIndex(null);
		index.subscribe(listener as (event: CharacterIndexChangeEvent) => void);
	});

	it('handleCreate adds character and publishes added event', () => {
		const character = makeCharacter();
		index.handleCreate(character, 'dnd/char-1.json');
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith({
			type: 'added',
			characterId: 'char-1',
			filePath: 'dnd/char-1.json',
		});
	});

	it('handleCreate ignores duplicate id', () => {
		const character = makeCharacter();
		index.handleCreate(character, 'dnd/char-1.json');
		index.handleCreate(character, 'dnd/char-1.json');
		expect(listener).toHaveBeenCalledTimes(1);
		expect(index.size).toBe(1);
	});

	it('handleModify updates existing and publishes updated event', () => {
		const character = makeCharacter();
		index.handleCreate(character, 'dnd/char-1.json');
		listener.mockClear();
		const updated = makeCharacter({ identity: { name: 'Updated' } });
		index.handleModify(updated, 'dnd/char-1.json');
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith({
			type: 'updated',
			characterId: 'char-1',
			filePath: 'dnd/char-1.json',
		});
	});

	it('handleModify adds unknown and publishes added event', () => {
		const character = makeCharacter();
		index.handleModify(character, 'dnd/char-1.json');
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith({
			type: 'added',
			characterId: 'char-1',
			filePath: 'dnd/char-1.json',
		});
	});

	it('handleDelete removes character and publishes removed event', () => {
		const character = makeCharacter();
		index.handleCreate(character, 'dnd/char-1.json');
		listener.mockClear();
		index.handleDelete('dnd/char-1.json');
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith({
			type: 'removed',
			characterId: 'char-1',
			filePath: 'dnd/char-1.json',
		});
		expect(index.size).toBe(0);
	});

	it('handleDelete ignores unknown path', () => {
		index.handleDelete('dnd/unknown.json');
		expect(listener).not.toHaveBeenCalled();
	});

	it('handleRename updates path and returns change event', () => {
		const character = makeCharacter();
		index.handleCreate(character, 'dnd/char-1.json');
		const event = index.handleRename('dnd/char-1.json', 'dnd/renamed-char.json');
		expect(event).not.toBeNull();
		expect(event!.type).toBe('updated');
		expect(index.resolvePath('char-1' as CharacterId)).toBe('dnd/renamed-char.json');
	});

	it('handleRename returns null for unknown old path', () => {
		const event = index.handleRename('dnd/unknown.json', 'dnd/new.json');
		expect(event).toBeNull();
	});

	it('handleRemoveByPath removes and publishes removed event', () => {
		const character = makeCharacter();
		index.handleCreate(character, 'dnd/char-1.json');
		listener.mockClear();
		index.handleRemoveByPath('dnd/char-1.json');
		expect(listener).toHaveBeenCalledTimes(1);
		expect(index.size).toBe(0);
	});
});

/* ── Bulk initialization ───────────────────────────────────────── */

describe('CharacterIndex bulk initialization', () => {
	it('initializeFromVault loads multiple characters', () => {
		const index = new CharacterIndex(null);
		const c1 = makeCharacter();
		const c2 = makeCharacter({ id: 'char-2' as CharacterId });
		index.initializeFromVault([
			{ character: c1, filePath: 'dnd/char-1.json' },
			{ character: c2, filePath: 'dnd/char-2.json' },
		]);
		expect(index.size).toBe(2);
		expect(index.get('char-1' as CharacterId)).not.toBeNull();
		expect(index.get('char-2' as CharacterId)).not.toBeNull();
	});

	it('initializeFromVault clears existing entries', () => {
		const index = new CharacterIndex(null);
		index.handleCreate(makeCharacter(), 'dnd/old.json');
		expect(index.size).toBe(1);
		index.initializeFromVault([]);
		expect(index.size).toBe(0);
	});
});

/* ── Diagnostics ───────────────────────────────────────────────── */

describe('CharacterIndex diagnostics', () => {
	it('records and returns diagnostics', () => {
		const index = new CharacterIndex(null);
		index.recordDiagnostic({ filePath: 'dnd/bad.json', reason: 'invalid' });
		const diagnostics = index.getDiagnostics();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]!.filePath).toBe('dnd/bad.json');
	});
});

/* ── Subscription ──────────────────────────────────────────────── */

describe('CharacterIndex subscription', () => {
	it('unsubscribe stops receiving events', () => {
		const listener = vi.fn();
		const index = new CharacterIndex(null);
		const unsubscribe = index.subscribe(listener as (event: CharacterIndexChangeEvent) => void);
		index.handleCreate(makeCharacter(), 'dnd/char-1.json');
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
		index.handleCreate(makeCharacter({ id: 'char-2' as CharacterId }), 'dnd/char-2.json');
		expect(listener).toHaveBeenCalledTimes(1);
	});
});

/* ── Refresh boundary (PER-006) ────────────────────────────────── */

describe('CharacterIndex refresh boundary', () => {
	it('notifies refresh boundary on mutation', () => {
		const refreshFn = vi.fn();
		const index = new CharacterIndex({ refreshCharacter: refreshFn });
		index.handleCreate(makeCharacter(), 'dnd/char-1.json');
		expect(refreshFn).toHaveBeenCalledWith('char-1');
	});

	it('does not crash when refresh boundary is null', () => {
		const index = new CharacterIndex(null);
		expect(() => {
			index.handleCreate(makeCharacter(), 'dnd/char-1.json');
		}).not.toThrow();
	});
});

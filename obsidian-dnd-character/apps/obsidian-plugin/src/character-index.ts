/**
 * In-memory character index (P8-T011 corrective A).
 *
 * Maintains a typed, read-only index of validated characters
 * loaded from the vault. Provides operations to retrieve,
 * list, and diagnose indexed characters. The index is the
 * authoritative in-memory view of character state and is
 * synchronized by the repository against vault events.
 */

import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';
import { characterIdStr } from '@obsidian-dnd/domain';

/* ── Indexed entry ─────────────────────────────────────────────── */

/** A character entry in the in-memory index. */
export interface IndexedCharacter {
	/** The validated character domain object. */
	character: Character;
	/** The vault-relative file path the character was loaded from. */
	filePath: string;
	/** The branded character ID for fast lookup. */
	characterId: CharacterId;
}

/* ── Diagnostics ───────────────────────────────────────────────── */

/** A file that exists in the vault but could not enter the index. */
export interface IndexDiagnostic {
	/** The vault-relative file path that failed. */
	filePath: string;
	/** Human-readable reason the file was rejected. */
	reason: string;
	/** The original error or cause, if available. */
	cause?: unknown;
}

/* ── Change notification ───────────────────────────────────────── */

/** The index added a new character. */
export interface CharacterIndexAddedEvent {
	type: 'added';
	characterId: CharacterId;
	filePath: string;
}

/** The index replaced an existing character with updated data. */
export interface CharacterIndexUpdatedEvent {
	type: 'updated';
	characterId: CharacterId;
	filePath: string;
}

/** The index removed a character. */
export interface CharacterIndexRemovedEvent {
	type: 'removed';
	characterId: CharacterId;
	filePath: string;
}

/**
 * Discriminated union of all character index change events.
 * Published after each successful index transition.
 */
export type CharacterIndexChangeEvent =
	| CharacterIndexAddedEvent
	| CharacterIndexUpdatedEvent
	| CharacterIndexRemovedEvent;

/** Callback for character index change notifications. */
export interface CharacterIndexChangeListener {
	(event: CharacterIndexChangeEvent): void;
}

/* ── Active-view refresh boundary ──────────────────────────────── */

/**
 * Minimal application boundary for notifying active views
 * that a character's indexed state has changed.
 *
 * This is the PER-006 refresh boundary. Implementations are
 * responsible for asking the active view to re-read the
 * character from the index or vault.
 */
export interface CharacterViewRefreshBoundary {
	/**
	 * Called when the indexed state for a character changes.
	 * The view should refresh its display for the affected character.
	 */
	refreshCharacter(characterId: CharacterId): void;
}

/* ── Character Index ───────────────────────────────────────────── */

/**
 * In-memory index of validated characters.
 *
 * The index is owned by the CharacterRepository and provides
 * read-only access to indexed characters. All mutations go
 * through explicit handler methods that publish change events.
 */
export class CharacterIndex {
	private readonly entries = new Map<string, IndexedCharacter>();
	private readonly diagnostics = new Array<IndexDiagnostic>();
	private readonly listeners = new Set<CharacterIndexChangeListener>();
	private readonly refreshBoundary: CharacterViewRefreshBoundary | null;

	/**
	 * Create a new character index.
	 *
	 * @param refreshBoundary - Optional view refresh boundary for PER-006.
	 */
	constructor(refreshBoundary: CharacterViewRefreshBoundary | null = null) {
		this.refreshBoundary = refreshBoundary;
	}

	/* ── Read-only access ──────────────────────────────────────── */

	/**
	 * Retrieve an indexed character by ID.
	 * @returns The indexed character, or null if not found.
	 */
	public get(characterId: CharacterId): IndexedCharacter | null {
		return this.entries.get(characterIdStr(characterId)) ?? null;
	}

	/**
	 * List all indexed characters.
	 * @returns An array of all indexed characters.
	 */
	public list(): ReadonlyArray<IndexedCharacter> {
		return Array.from(this.entries.values());
	}

	/**
	 * Resolve the current file path for a character.
	 * @returns The file path, or null if the character is not indexed.
	 */
	public resolvePath(characterId: CharacterId): string | null {
		const entry = this.entries.get(characterIdStr(characterId));
		return entry?.filePath ?? null;
	}

	/**
	 * Get the number of indexed characters.
	 */
	public get size(): number {
		return this.entries.size;
	}

	/**
	 * Get all current diagnostics for files that could not enter the index.
	 */
	public getDiagnostics(): ReadonlyArray<IndexDiagnostic> {
		return this.diagnostics;
	}

	/* ── Change notification subscription ──────────────────────── */

	/**
	 * Subscribe to index change notifications.
	 * @returns An unsubscribe function.
	 */
	public subscribe(listener: CharacterIndexChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/* ── Mutation handlers ─────────────────────────────────────── */

	/**
	 * Add a character to the index (create event).
	 * Publishes an 'added' change event on success.
	 */
	public handleCreate(character: Character, filePath: string): void {
		const id = characterIdStr(character.id);
		if (this.entries.has(id)) {
			return;
		}
		const entry: IndexedCharacter = {
			character,
			filePath,
			characterId: character.id,
		};
		this.entries.set(id, entry);
		this.notify({ type: 'added', characterId: character.id, filePath });
	}

	/**
	 * Replace a character in the index (modify event).
	 * Publishes an 'updated' change event on success.
	 * If the character is not currently indexed, adds it.
	 */
	public handleModify(character: Character, filePath: string): void {
		const id = characterIdStr(character.id);
		const existing = this.entries.get(id);

		const entry: IndexedCharacter = {
			character,
			filePath,
			characterId: character.id,
		};
		this.entries.set(id, entry);

		if (existing !== undefined) {
			this.notify({ type: 'updated', characterId: character.id, filePath });
		} else {
			this.notify({ type: 'added', characterId: character.id, filePath });
		}
	}

	/**
	 * Remove a character from the index (delete event).
	 * Publishes a 'removed' change event if the character was indexed.
	 */
	public handleDelete(filePath: string): void {
		// Find the entry by file path
		let removed: IndexedCharacter | undefined;
		for (const [key, entry] of this.entries) {
			if (entry.filePath === filePath) {
				removed = entry;
				this.entries.delete(key);
				break;
			}
		}
		if (removed !== undefined) {
			this.notify({
				type: 'removed',
				characterId: removed.characterId,
				filePath,
			});
		}
	}

	/**
	 * Handle a rename event (old path → new path).
	 *
	 * If the old path was indexed:
	 * - New path is in the character folder: update the path.
	 * - New path is outside the character folder: remove the entry.
	 *
	 * If the old path was not indexed but the new path is in the
	 * character folder, the caller is responsible for validating
	 * and adding the character via handleModify or handleCreate.
	 *
	 * @param oldPath - The previous vault-relative file path.
	 * @param newPath - The new vault-relative file path.
	 * @returns The change event if a transition occurred, or null.
	 */
	public handleRename(oldPath: string, newPath: string): CharacterIndexChangeEvent | null {
		// Find the entry by old path
		let entry: IndexedCharacter | undefined;
		let key: string | undefined;
		for (const [k, e] of this.entries) {
			if (e.filePath === oldPath) {
				entry = e;
				key = k;
				break;
			}
		}

		if (entry === undefined) {
			// Old path was not indexed; caller may handle as new character
			return null;
		}

		// Old path was indexed - key is guaranteed to be defined at this point
		const entryKey = key!;

		// If new path is still a character file, update the path
		const updated: IndexedCharacter = {
			...entry,
			filePath: newPath,
		};
		this.entries.set(entryKey, updated);

		return {
			type: 'updated',
			characterId: entry.characterId,
			filePath: newPath,
		};
	}

	/**
	 * Remove a character from the index by file path (rename out of folder).
	 * Publishes a 'removed' change event.
	 */
	public handleRemoveByPath(filePath: string): void {
		for (const [key, entry] of this.entries) {
			if (entry.filePath === filePath) {
				this.entries.delete(key);
				this.notify({
					type: 'removed',
					characterId: entry.characterId,
					filePath,
				});
				return;
			}
		}
	}

	/**
	 * Bulk initialize the index from a list of validated characters.
	 * Used during startup/restart to reconstruct the index from vault files.
	 *
	 * @param characters - Array of character entries to add.
	 */
	public initializeFromVault(characters: Array<{ character: Character; filePath: string }>): void {
		this.entries.clear();
		this.diagnostics.length = 0;
		for (const { character, filePath } of characters) {
			const id = characterIdStr(character.id);
			this.entries.set(id, {
				character,
				filePath,
				characterId: character.id,
			});
		}
	}

	/**
	 * Record a diagnostic for a file that could not enter the index.
	 */
	public recordDiagnostic(diagnostic: IndexDiagnostic): void {
		this.diagnostics.push(diagnostic);
	}

	/* ── Internal notification ─────────────────────────────────── */

	private notify(event: CharacterIndexChangeEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
		if (this.refreshBoundary !== null) {
			this.refreshBoundary.refreshCharacter(event.characterId);
		}
	}
}

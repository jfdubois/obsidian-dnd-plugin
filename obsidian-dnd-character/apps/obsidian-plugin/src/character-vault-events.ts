/**
 * Vault event listeners for character files (P8-T009).
 *
 * Registers Obsidian Vault event listeners that detect modifications,
 * creations, and deletions of character JSON files in the configured
 * characters folder. Emits typed events through a callback interface
 * when character files change. Handles invalid data gracefully by
 * logging diagnostics without crashing the plugin.
 */

import type { App, TAbstractFile, TFile, EventRef } from 'obsidian';
import {
  deserializeCharacter,
  CharacterSerializationError,
} from '@obsidian-dnd/character-contract';

/* ── Event types ───────────────────────────────────────────────── */

/** A character file was modified and the new content is valid. */
export interface CharacterFileModifiedEvent {
  type: 'modified';
  filePath: string;
  character: unknown;
}

/** A character file was created (possibly outside the plugin). */
export interface CharacterFileCreatedEvent {
  type: 'created';
  filePath: string;
}

/** A character file was deleted (possibly outside the plugin). */
export interface CharacterFileDeletedEvent {
  type: 'deleted';
  filePath: string;
}

/** A character file was renamed (moved or renamed). */
export interface CharacterFileRenamedEvent {
  type: 'renamed';
  oldPath: string;
  filePath: string;
}

/**
 * Discriminated union of all character vault events.
 * Each variant carries the event type and the affected file path.
 */
export type CharacterVaultEvent =
  | CharacterFileModifiedEvent
  | CharacterFileCreatedEvent
  | CharacterFileDeletedEvent
  | CharacterFileRenamedEvent;

/* ── Callback interface ────────────────────────────────────────── */

/**
 * Callback interface for handling character vault events.
 *
 * Implementations receive typed events for character file changes.
 * The handler is responsible for any cache invalidation or state
 * synchronization required when external changes occur.
 */
export interface CharacterVaultEventCallbacks {
  /** Called when a character file is modified. */
  onModified?: (event: CharacterFileModifiedEvent) => void;
  /** Called when a character file is created. */
  onCreated?: (event: CharacterFileCreatedEvent) => void;
  /** Called when a character file is deleted. */
  onDeleted?: (event: CharacterFileDeletedEvent) => void;
  /** Called when a character file is renamed. */
  onRenamed?: (event: CharacterFileRenamedEvent) => void;
}

/* ── Registration result ───────────────────────────────────────── */

/**
 * Result of setting up character vault event listeners.
 * Contains EventRef handles for each registered listener.
 * Pass these to `Component.registerEvent()` for automatic
 * cleanup on plugin unload.
 */
export interface CharacterVaultEventRegistration {
  /** EventRef for the 'create' listener. */
  createRef: EventRef;
  /** EventRef for the 'modify' listener. */
  modifyRef: EventRef;
  /** EventRef for the 'delete' listener. */
  deleteRef: EventRef;
  /** EventRef for the 'rename' listener. */
  renameRef: EventRef;
}

/* ── Character file detection ──────────────────────────────────── */

/**
 * Check if a vault file path corresponds to a character file.
 *
 * A character file is a `.json` file whose path starts with the
 * configured characters vault path.
 *
 * @param filePath - The vault-relative file path to check.
 * @param charactersVaultPath - The configured characters folder path.
 * @returns true if the file is a character JSON file.
 */
export function isCharacterFile(
  filePath: string,
  charactersVaultPath: string,
): boolean {
  const prefix = charactersVaultPath.endsWith('/')
    ? charactersVaultPath
    : charactersVaultPath + '/';
  return filePath.startsWith(prefix) && filePath.endsWith('.json');
}

/* ── Event handlers ────────────────────────────────────────────── */

/**
 * Handle a character file modification event.
 *
 * Reads the file content, attempts to deserialize it as a character,
 * and invokes the onModified callback with the deserialized character.
 * If deserialization fails, logs a diagnostic and continues without
 * crashing the plugin.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param file - The TFile that was modified.
 * @param callbacks - The callback interface for character events.
 */
async function handleCharacterFileModified(
  app: App,
  file: TFile,
  callbacks: CharacterVaultEventCallbacks,
): Promise<void> {
  if (callbacks.onModified === undefined) return;

  try {
    const content = await app.vault.cachedRead(file);
    const character = deserializeCharacter(content);
    callbacks.onModified({
      type: 'modified',
      filePath: file.path,
      character,
    });
  } catch (error) {
    const reason = error instanceof CharacterSerializationError
      ? error.reason
      : error instanceof Error
        ? error.message
        : 'unknown';
    console.error(
      `[D&D Character] Character file corrupted or invalid: ${file.path} (${reason})`,
    );
  }
}

/**
 * Handle a character file creation event.
 *
 * Invokes the onCreated callback when a new character file is detected.
 *
 * @param file - The TFile that was created.
 * @param callbacks - The callback interface for character events.
 */
function handleCharacterFileCreated(
  file: TFile,
  callbacks: CharacterVaultEventCallbacks,
): void {
  if (callbacks.onCreated === undefined) return;

  callbacks.onCreated({
    type: 'created',
    filePath: file.path,
  });
}

/**
 * Handle a character file deletion event.
 *
 * Invokes the onDeleted callback when a character file is removed.
 *
 * @param file - The TAbstractFile that was deleted.
 * @param callbacks - The callback interface for character events.
 */
function handleCharacterFileDeleted(
  file: TAbstractFile,
  callbacks: CharacterVaultEventCallbacks,
): void {
  if (callbacks.onDeleted === undefined) return;

  callbacks.onDeleted({
    type: 'deleted',
    filePath: file.path,
  });
}

/**
 * Handle a character file rename event.
 *
 * Invokes the onRenamed callback when a character file is renamed.
 * The callback receives both the old path and the new path so the
 * caller can decide how to handle moves into, within, or out of
 * the configured character folder.
 *
 * @param file - The TAbstractFile with the new path.
 * @param oldPath - The previous vault-relative file path.
 * @param callbacks - The callback interface for character events.
 */
function handleCharacterFileRenamed(
  file: TAbstractFile,
  oldPath: string,
  callbacks: CharacterVaultEventCallbacks,
): void {
  if (callbacks.onRenamed === undefined) return;

  callbacks.onRenamed({
    type: 'renamed',
    oldPath,
    filePath: file.path,
  });
}

/* ── Public setup function ─────────────────────────────────────── */

/**
 * Set up vault event listeners for character files.
 *
 * Registers four Vault event listeners (create, modify, delete, rename)
 * that filter events to only character JSON files in the configured
 * characters folder. When a character file event occurs, the
 * corresponding callback is invoked with a typed event object.
 *
 * The returned registration object contains EventRef handles for
 * each listener. Pass these to `Component.registerEvent()` for
 * automatic cleanup on plugin unload.
 *
 * @param app - The Obsidian App instance providing vault access.
 * @param charactersVaultPath - The vault-relative folder path for characters.
 * @param callbacks - Callback interface for handling character events.
 * @returns Registration object with EventRef handles for cleanup.
 */
export function setupCharacterVaultEventListeners(
  app: App,
  charactersVaultPath: string,
  callbacks: CharacterVaultEventCallbacks,
): CharacterVaultEventRegistration {
  const vault = app.vault;

  const createRef = vault.on('create', (file: TAbstractFile) => {
    if (!isCharacterFile(file.path, charactersVaultPath)) return;
    handleCharacterFileCreated(file as TFile, callbacks);
  });

  const modifyRef = vault.on('modify', (file: TAbstractFile) => {
    if (!isCharacterFile(file.path, charactersVaultPath)) return;
    void handleCharacterFileModified(app, file as TFile, callbacks);
  });

  const deleteRef = vault.on('delete', (file: TAbstractFile) => {
    if (!isCharacterFile(file.path, charactersVaultPath)) return;
    handleCharacterFileDeleted(file, callbacks);
  });

  const renameRef = vault.on('rename', (file: TAbstractFile, oldPath: string) => {
    const oldIsCharacter = isCharacterFile(oldPath, charactersVaultPath);
    const newIsCharacter = isCharacterFile(file.path, charactersVaultPath);
    if (!oldIsCharacter && !newIsCharacter) return;
    handleCharacterFileRenamed(file, oldPath, callbacks);
  });

  return { createRef, modifyRef, deleteRef, renameRef };
}

/* ── Identity step: third step of character creation ──────────────
   Allows the user to enter the character's name and optional
   identity details (player name, pronouns, alignment).
   Pure TypeScript logic — no Obsidian UI.                        */

import type { CharacterDraft } from "./character-draft";
import type { DraftIdentityData } from "./character-draft-steps";
import {
  markStepResolved,
  invalidateDependentSteps,
} from "./character-draft";

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validates that the given value is a valid identity input.
 * Requires:
 * - The value is a non-null object
 * - The `name` field is a non-empty string
 * - Optional fields (playerName, pronouns, alignment) are strings if present
 */
export function validateIdentityInput(
  value: unknown,
): value is DraftIdentityData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Name is required and must be a non-empty string
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;

  // Optional fields must be strings if present
  if (obj.playerName !== undefined && typeof obj.playerName !== "string")
    return false;
  if (obj.pronouns !== undefined && typeof obj.pronouns !== "string")
    return false;
  if (obj.alignment !== undefined && typeof obj.alignment !== "string")
    return false;

  return true;
}

/* ── Selection ─────────────────────────────────────────────────── */

/**
 * Sets the character identity on the draft. Validates that:
 * - The name is a non-empty string
 * - Optional fields are valid strings if provided
 *
 * Identity step is independent — it does not depend on ruleset
 * or sources. Setting identity does not invalidate any downstream
 * steps since no other step depends on identity data.
 *
 * Sets the draft.identity data, marks the identity step as resolved,
 * and invalidates any downstream dependent steps (none for identity).
 *
 * Returns true if the identity was accepted and applied,
 * false if validation failed.
 */
export function selectIdentity(
  draft: CharacterDraft,
  identity: unknown,
): boolean {
  if (!validateIdentityInput(identity)) {
    return false;
  }

  draft.identity.name = identity.name;
  draft.identity.playerName = identity.playerName;
  draft.identity.pronouns = identity.pronouns;
  draft.identity.alignment = identity.alignment;

  markStepResolved(draft, "identity");
  invalidateDependentSteps(draft, "identity");
  return true;
}

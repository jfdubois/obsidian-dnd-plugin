/* ── Character identity ──────────────────────────────────────────
   Human-readable identity stored on the character document.        */

export interface CharacterIdentity {
  name: string;
  playerName?: string;
  portraitPath?: string;
  pronouns?: string;
  alignment?: string;
  notes?: string;
}

export function isCharacterIdentity(value: unknown): value is CharacterIdentity {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.length === 0) return false;

  if (obj.playerName !== undefined && typeof obj.playerName !== "string") return false;
  if (obj.portraitPath !== undefined && typeof obj.portraitPath !== "string") return false;
  if (obj.pronouns !== undefined && typeof obj.pronouns !== "string") return false;
  if (obj.alignment !== undefined && typeof obj.alignment !== "string") return false;
  if (obj.notes !== undefined && typeof obj.notes !== "string") return false;

  return true;
}

export function createCharacterIdentity(
  name: string,
  options?: {
    playerName?: string;
    portraitPath?: string;
    pronouns?: string;
    alignment?: string;
    notes?: string;
  },
): CharacterIdentity {
  return {
    name,
    playerName: options?.playerName,
    portraitPath: options?.portraitPath,
    pronouns: options?.pronouns,
    alignment: options?.alignment,
    notes: options?.notes,
  };
}

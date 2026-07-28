import type { RuleEntityKind, Ruleset } from "./enums";
import { isRuleEntityKind, isRuleset } from "./enums";
import type { EntityId, SourceId } from "./ids";
import { createEntityId, createSourceId } from "./ids";

/* ── Types ────────────────────────────────────────────────────── */

export interface CanonicalEntityKey {
  readonly kind: RuleEntityKind;
  readonly ruleset: Ruleset;
  readonly source: string;
  readonly name: string;
}

export interface CanonicalEntityIdDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly keyIndex?: number;
  readonly conflictingIndex?: number;
  readonly generatedId?: string;
  readonly key?: CanonicalEntityKey;
  readonly conflictingKey?: CanonicalEntityKey;
}

export type CanonicalEntityIdResult =
  | { readonly ok: true; readonly id: EntityId; readonly sourceId: SourceId; readonly canonicalKey: CanonicalEntityKey; }
  | { readonly ok: false; readonly diagnostic: CanonicalEntityIdDiagnostic; };

export interface CanonicalEntityIdBatchResult {
  readonly successes: ReadonlyArray<{ readonly id: EntityId; readonly sourceId: SourceId; readonly canonicalKey: CanonicalEntityKey; readonly keyIndex: number; }>;
  readonly diagnostics: ReadonlyArray<CanonicalEntityIdDiagnostic>;
}

/* ── Pure JS percent-encoding (no Buffer) ─────────────────────── */

function encodeSegment(raw: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(raw);
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if ((b >= 0x61 && b <= 0x7a) || (b >= 0x30 && b <= 0x39)) {
      parts.push(String.fromCharCode(b));
    } else {
      parts.push("%" + b.toString(16).toUpperCase().padStart(2, "0"));
    }
  }
  return parts.join("");
}

/* ── canonicalSourceId ────────────────────────────────────────── */

export function canonicalSourceId(source: string): SourceId {
  const trimmed = source.trim();
  if (source !== trimmed || trimmed.length === 0) {
    throw new Error("canonicalSourceId: source must be a non-empty trimmed string");
  }
  const normalized = trimmed.normalize("NFKC").toLowerCase();
  const encoded = encodeSegment(normalized);
  return createSourceId(encoded);
}

/* ── canonicalEntityNameSegment ───────────────────────────────── */

export function canonicalEntityNameSegment(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("canonicalEntityNameSegment: name must be a non-empty trimmed string");
  }
  const normalized = trimmed.normalize("NFKC").toLowerCase();
  const words = normalized.split(/\s+/);
  const encodedWords = words.map(encodeSegment);
  return encodedWords.join("-");
}

/* ── Helpers ──────────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) return false;
  return true;
}

/* ── createCanonicalEntityId ──────────────────────────────────── */

export function createCanonicalEntityId(key: unknown): CanonicalEntityIdResult {
  if (!isPlainObject(key)) {
    return Object.freeze({
      ok: false as const,
      diagnostic: Object.freeze({
        code: "INVALID_CANONICAL_ENTITY_KEY",
        message: "Key must be a plain object with exactly {kind, ruleset, source, name}",
      }),
    });
  }

  const record = key as Record<string, unknown>;
  const expectedFields = new Set(["kind", "ruleset", "source", "name"]);
  const ownKeys = Object.keys(record);

  if (ownKeys.length !== 4 || !expectedFields.has(ownKeys[0]!) || !expectedFields.has(ownKeys[1]!) || !expectedFields.has(ownKeys[2]!) || !expectedFields.has(ownKeys[3]!)) {
    return Object.freeze({
      ok: false as const,
      diagnostic: Object.freeze({
        code: "INVALID_CANONICAL_ENTITY_KEY",
        message: "Key must be a plain object with exactly {kind, ruleset, source, name}",
      }),
    });
  }

  for (const field of ownKeys) {
    const desc = Object.getOwnPropertyDescriptor(record, field);
    if (desc === undefined || desc.get !== undefined || desc.set !== undefined) {
      return Object.freeze({
        ok: false as const,
        diagnostic: Object.freeze({
          code: "INVALID_CANONICAL_ENTITY_KEY",
          message: "Key fields must be data properties, not accessors",
        }),
      });
    }
  }

  const { kind, ruleset, source, name } = record;

  if (!isRuleEntityKind(kind)) {
    return Object.freeze({
      ok: false as const,
      diagnostic: Object.freeze({
        code: "INVALID_CANONICAL_ENTITY_KEY",
        message: `Invalid kind: ${JSON.stringify(kind)}`,
      }),
    });
  }

  if (!isRuleset(ruleset)) {
    return Object.freeze({
      ok: false as const,
      diagnostic: Object.freeze({
        code: "INVALID_CANONICAL_ENTITY_KEY",
        message: `Invalid ruleset: ${JSON.stringify(ruleset)}`,
      }),
    });
  }

  if (typeof source !== "string" || source.trim().length === 0) {
    return Object.freeze({
      ok: false as const,
      diagnostic: Object.freeze({
        code: "INVALID_CANONICAL_ENTITY_KEY",
        message: "Source must be a non-empty trimmed string",
      }),
    });
  }

  if (typeof name !== "string" || name.trim().length === 0) {
    return Object.freeze({
      ok: false as const,
      diagnostic: Object.freeze({
        code: "INVALID_CANONICAL_ENTITY_KEY",
        message: "Name must be a non-empty trimmed string",
      }),
    });
  }

  const canonicalSource = canonicalSourceId(source);
  const canonicalName = canonicalEntityNameSegment(name);
  const idStr = `${kind}:${ruleset}:${canonicalSource}:${canonicalName}`;

  const canonicalKey = Object.freeze<CanonicalEntityKey>({
    kind: kind as RuleEntityKind,
    ruleset: ruleset as Ruleset,
    source: canonicalSource,
    name: canonicalName,
  });

  return Object.freeze({
    ok: true as const,
    id: createEntityId(idStr),
    sourceId: canonicalSource,
    canonicalKey,
  });
}

/* ── createCanonicalEntityIds ─────────────────────────────────── */

export function createCanonicalEntityIds(keys: readonly unknown[]): CanonicalEntityIdBatchResult {
  const successes: Array<{ readonly id: EntityId; readonly sourceId: SourceId; readonly canonicalKey: CanonicalEntityKey; readonly keyIndex: number; }> = [];
  const diagnostics: Array<CanonicalEntityIdDiagnostic> = [];
  const seen = new Map<string, { index: number; key: CanonicalEntityKey }>();

  for (let i = 0; i < keys.length; i++) {
    const result = createCanonicalEntityId(keys[i]);

    if (!result.ok) {
      diagnostics.push(Object.freeze({
        code: "INVALID_CANONICAL_ENTITY_KEY",
        message: result.diagnostic.message,
        keyIndex: i,
      }));
      continue;
    }

    const idStr = result.id;
    if (seen.has(idStr)) {
      const prev = seen.get(idStr)!;
      diagnostics.push(Object.freeze({
        code: "CANONICAL_ENTITY_ID_COLLISION",
        message: `Duplicate canonical ID: ${idStr}`,
        keyIndex: i,
        conflictingIndex: prev.index,
        generatedId: idStr,
        key: result.canonicalKey,
        conflictingKey: prev.key,
      }));
      continue;
    }

    seen.set(idStr, { index: i, key: result.canonicalKey });
    successes.push(Object.freeze({
      id: result.id,
      sourceId: result.sourceId,
      canonicalKey: result.canonicalKey,
      keyIndex: i,
    }));
  }

  return Object.freeze({
    successes: Object.freeze(successes),
    diagnostics: Object.freeze(diagnostics),
  });
}

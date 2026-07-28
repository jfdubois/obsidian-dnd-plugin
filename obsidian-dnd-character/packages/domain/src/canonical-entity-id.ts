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

export type CanonicalEntityIdDiagnosticCode =
  | "INVALID_CANONICAL_ENTITY_KEY"
  | "CANONICAL_ENTITY_ID_COLLISION";

export interface CanonicalEntityIdDiagnostic {
  readonly code: CanonicalEntityIdDiagnosticCode;
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
  if (name !== trimmed || trimmed.length === 0) {
    throw new Error("canonicalEntityNameSegment: name must be a non-empty trimmed string");
  }
  const normalized = trimmed.normalize("NFKC").toLowerCase();
  const words = normalized.split(/\s+/);
  const encodedWords = words.map(encodeSegment);
  return encodedWords.join("-");
}

/* ── Helpers ──────────────────────────────────────────────────── */

function isValidPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  // Allow Object.prototype or null prototype (plain objects only)
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) return false;
  return true;
}

function makeInvalidDiagnostic(message: string): CanonicalEntityIdDiagnostic {
  return Object.freeze({
    code: "INVALID_CANONICAL_ENTITY_KEY" as CanonicalEntityIdDiagnosticCode,
    message,
  });
}

function makeFailureResult(message: string) {
  return Object.freeze({
    ok: false as const,
    diagnostic: makeInvalidDiagnostic(message),
  });
}

/* ── Exact own-key validation ─────────────────────────────────── */

const REQUIRED_KEYS = new Set(["kind", "ruleset", "source", "name"]);

function validateKeyShape(record: Record<string, unknown>): { ok: true } | { ok: false; message: string } {
  // Use Reflect.ownKeys to get ALL own properties (string + symbol, enumerable + non-enumerable)
  const allKeys = Reflect.ownKeys(record);

  // Must have exactly 4 own keys
  if (allKeys.length !== 4) {
    return { ok: false, message: "Key must have exactly 4 own properties: kind, ruleset, source, name" };
  }

  // All keys must be strings (no symbol keys)
  for (const key of allKeys) {
    if (typeof key !== "string") {
      return { ok: false, message: "Key must not have symbol properties" };
    }
    if (!REQUIRED_KEYS.has(key)) {
      return { ok: false, message: `Key must not have unknown property: ${key}` };
    }
  }

  // All four required keys must be present as enumerable data properties
  for (const required of REQUIRED_KEYS) {
    const desc = Object.getOwnPropertyDescriptor(record, required);
    if (desc === undefined) {
      return { ok: false, message: `Key is missing required property: ${required}` };
    }
    // Must be a data property (not an accessor)
    if (typeof desc.get === "function" || typeof desc.set === "function") {
      return { ok: false, message: `Key property "${required}" must be a data property, not an accessor` };
    }
    // Must be enumerable
    if (desc.enumerable === false) {
      return { ok: false, message: `Key property "${required}" must be enumerable` };
    }
  }

  return { ok: true };
}

/* ── createCanonicalEntityId ──────────────────────────────────── */

export function createCanonicalEntityId(key: unknown): CanonicalEntityIdResult {
  if (!isValidPlainObject(key)) {
    return makeFailureResult("Key must be a plain object with exactly {kind, ruleset, source, name}");
  }

  const record = key as Record<string, unknown>;

  // Validate exact own-key shape (symbols, non-enumerable, accessors, extra/missing keys)
  const shapeCheck = validateKeyShape(record);
  if (!shapeCheck.ok) {
    return makeFailureResult(shapeCheck.message);
  }

  const { kind, ruleset, source, name } = record;

  if (!isRuleEntityKind(kind)) {
    return makeFailureResult(`Invalid kind: ${JSON.stringify(kind)}`);
  }

  if (!isRuleset(ruleset)) {
    return makeFailureResult(`Invalid ruleset: ${JSON.stringify(ruleset)}`);
  }

  // Validate source: must be string, non-empty after trim, and not padded
  if (typeof source !== "string") {
    return makeFailureResult("Source must be a non-empty trimmed string");
  }
  if (source !== source.trim() || source.trim().length === 0) {
    return makeFailureResult("Source must be a non-empty trimmed string");
  }

  // Validate name: must be string, non-empty after trim, and not padded
  if (typeof name !== "string") {
    return makeFailureResult("Name must be a non-empty trimmed string");
  }
  if (name !== name.trim() || name.trim().length === 0) {
    return makeFailureResult("Name must be a non-empty trimmed string");
  }

  // Safe to call canonical helpers now (prevalidated)
  const canonicalSource = canonicalSourceId(source);
  const canonicalName = canonicalEntityNameSegment(name);
  const idStr = `${kind}:${ruleset}:${canonicalSource}:${canonicalName}`;

  // Preserve original structured key (cloned and frozen)
  const canonicalKey = Object.freeze<CanonicalEntityKey>({
    kind: kind as RuleEntityKind,
    ruleset: ruleset as Ruleset,
    source,
    name,
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
        code: "INVALID_CANONICAL_ENTITY_KEY" as CanonicalEntityIdDiagnosticCode,
        message: result.diagnostic.message,
        keyIndex: i,
      }));
      continue;
    }

    const idStr = result.id;
    if (seen.has(idStr)) {
      const prev = seen.get(idStr)!;
      // Clone and freeze both keys for collision diagnostics
      const clonedKey = Object.freeze<CanonicalEntityKey>({
        kind: result.canonicalKey.kind,
        ruleset: result.canonicalKey.ruleset,
        source: result.canonicalKey.source,
        name: result.canonicalKey.name,
      });
      const clonedConflictingKey = Object.freeze<CanonicalEntityKey>({
        kind: prev.key.kind,
        ruleset: prev.key.ruleset,
        source: prev.key.source,
        name: prev.key.name,
      });
      diagnostics.push(Object.freeze({
        code: "CANONICAL_ENTITY_ID_COLLISION" as CanonicalEntityIdDiagnosticCode,
        message: `Duplicate canonical ID: ${idStr}`,
        keyIndex: i,
        conflictingIndex: prev.index,
        generatedId: idStr,
        key: clonedKey,
        conflictingKey: clonedConflictingKey,
      }));
      continue;
    }

    // Store a clone of the canonical key in the seen map
    const storedKey = Object.freeze<CanonicalEntityKey>({
      kind: result.canonicalKey.kind,
      ruleset: result.canonicalKey.ruleset,
      source: result.canonicalKey.source,
      name: result.canonicalKey.name,
    });
    seen.set(idStr, { index: i, key: storedKey });
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

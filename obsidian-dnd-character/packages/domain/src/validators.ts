import type {
  EntityId,
  SourceId,
  CharacterId,
  CatalogRevision,
  ChoiceDefinitionId,
  ChoiceInstanceId,
  ClassInstanceId,
  ItemInstanceId,
  ResourceId,
} from "./ids";

/* ── Branded ID validators ──────────────────────────────────────
   These functions accept `unknown` and return a type-narrowed guard.
   They are used at external and persistence boundaries.            */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isEntityId(value: unknown): value is EntityId {
  return isNonEmptyString(value);
}

export function isSourceId(value: unknown): value is SourceId {
  return isNonEmptyString(value);
}

export function isCharacterId(value: unknown): value is CharacterId {
  return isNonEmptyString(value);
}

export function isCatalogRevision(value: unknown): value is CatalogRevision {
  return isNonEmptyString(value);
}

export function isChoiceDefinitionId(value: unknown): value is ChoiceDefinitionId {
  return isNonEmptyString(value);
}

export function isChoiceInstanceId(value: unknown): value is ChoiceInstanceId {
  return isNonEmptyString(value);
}

export function isClassInstanceId(value: unknown): value is ClassInstanceId {
  return isNonEmptyString(value);
}

export function isItemInstanceId(value: unknown): value is ItemInstanceId {
  return isNonEmptyString(value);
}

export function isResourceId(value: unknown): value is ResourceId {
  return isNonEmptyString(value);
}

/* ── Runtime assertion helpers ────────────────────────────────── */

export function assertEntityId(value: unknown, context?: string): asserts value is EntityId {
  if (!isEntityId(value)) {
    throw new Error(`Invalid EntityId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertSourceId(value: unknown, context?: string): asserts value is SourceId {
  if (!isSourceId(value)) {
    throw new Error(`Invalid SourceId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertCharacterId(value: unknown, context?: string): asserts value is CharacterId {
  if (!isCharacterId(value)) {
    throw new Error(`Invalid CharacterId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertCatalogRevision(value: unknown, context?: string): asserts value is CatalogRevision {
  if (!isCatalogRevision(value)) {
    throw new Error(`Invalid CatalogRevision${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertChoiceDefinitionId(value: unknown, context?: string): asserts value is ChoiceDefinitionId {
  if (!isChoiceDefinitionId(value)) {
    throw new Error(`Invalid ChoiceDefinitionId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertChoiceInstanceId(value: unknown, context?: string): asserts value is ChoiceInstanceId {
  if (!isChoiceInstanceId(value)) {
    throw new Error(`Invalid ChoiceInstanceId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertClassInstanceId(value: unknown, context?: string): asserts value is ClassInstanceId {
  if (!isClassInstanceId(value)) {
    throw new Error(`Invalid ClassInstanceId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertItemInstanceId(value: unknown, context?: string): asserts value is ItemInstanceId {
  if (!isItemInstanceId(value)) {
    throw new Error(`Invalid ItemInstanceId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

export function assertResourceId(value: unknown, context?: string): asserts value is ResourceId {
  if (!isResourceId(value)) {
    throw new Error(`Invalid ResourceId${context ? ` in ${context}` : ""}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}

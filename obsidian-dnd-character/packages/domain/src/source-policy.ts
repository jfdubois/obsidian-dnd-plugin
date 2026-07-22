import type { SourceId } from "./ids";
import type { Ruleset } from "./enums";
import { isSourceId } from "./validators";
import { isRuleset } from "./enums";

/* ── Source profile origin ────────────────────────────────────── */

export interface SourceProfileOrigin {
  profileId: string;
  profileRevision: number;
}

function isSourceProfileOrigin(value: unknown): value is SourceProfileOrigin {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.profileId === "string" &&
    typeof obj.profileRevision === "number" &&
    Number.isFinite(obj.profileRevision) &&
    obj.profileRevision >= 0
  );
}

/* ── Character content policy ─────────────────────────────────── */

export interface CharacterContentPolicy {
  ruleset: Ruleset;
  enabledSourceIds: SourceId[];
  mode: "snapshot";
  sourceProfileOrigin?: SourceProfileOrigin;
}

export function isCharacterContentPolicy(value: unknown): value is CharacterContentPolicy {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isRuleset(obj.ruleset)) return false;

  if (!Array.isArray(obj.enabledSourceIds)) return false;
  if (!obj.enabledSourceIds.every((id) => isSourceId(id))) return false;

  if (obj.mode !== "snapshot") return false;

  if (obj.sourceProfileOrigin !== undefined && !isSourceProfileOrigin(obj.sourceProfileOrigin)) {
    return false;
  }

  return true;
}

export function createCharacterContentPolicy(
  ruleset: Ruleset,
  enabledSourceIds: SourceId[],
  options?: { sourceProfileOrigin?: SourceProfileOrigin },
): CharacterContentPolicy {
  return {
    ruleset,
    enabledSourceIds: [...enabledSourceIds],
    mode: "snapshot",
    sourceProfileOrigin: options?.sourceProfileOrigin,
  };
}

/* ── Query context (source policy for catalog queries) ────────── */

export interface QueryContext {
  ruleset: Ruleset;
  enabledSourceIds: SourceId[];
  requiredSourceIds: SourceId[];
  includeCore: true;
}

export function isQueryContext(value: unknown): value is QueryContext {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isRuleset(obj.ruleset)) return false;

  if (!Array.isArray(obj.enabledSourceIds)) return false;
  if (!obj.enabledSourceIds.every((id) => isSourceId(id))) return false;

  if (!Array.isArray(obj.requiredSourceIds)) return false;
  if (!obj.requiredSourceIds.every((id) => isSourceId(id))) return false;

  if (obj.includeCore !== true) return false;

  return true;
}

export function createQueryContext(
  ruleset: Ruleset,
  enabledSourceIds: SourceId[],
  requiredSourceIds: SourceId[],
): QueryContext {
  return {
    ruleset,
    enabledSourceIds: [...enabledSourceIds],
    requiredSourceIds: [...requiredSourceIds],
    includeCore: true,
  };
}

/* ── Derived helpers ──────────────────────────────────────────── */

export function policyContainsSource(
  policy: CharacterContentPolicy,
  sourceId: SourceId,
): boolean {
  return policy.enabledSourceIds.includes(sourceId);
}

export function queryContextContainsSource(
  context: QueryContext,
  sourceId: SourceId,
): boolean {
  return (
    context.enabledSourceIds.includes(sourceId) ||
    context.requiredSourceIds.includes(sourceId)
  );
}

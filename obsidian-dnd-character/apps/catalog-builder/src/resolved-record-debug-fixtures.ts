import {
  isCopyResolutionFailure,
  resolveCopy,
  getRecordIdentity,
  recordMatchesIdentity,
  type CopyChainStep,
  type CopyResolverContext,
} from "./copy-resolver";
import {
  materializeCopyWithMods,
  type CopyModContext,
  type CopyModRawRecord,
} from "./mod-copy-resolver";
import type { MaterializationDiagnostic } from "./mod-types";

export interface ResolvedRecordDebugIdentity {
  readonly entityKind: string;
  readonly name: string;
  readonly source: string;
  readonly [key: string]: unknown;
}

export interface ResolvedRecordDebugChainStep extends CopyChainStep {
  readonly identity: ResolvedRecordDebugIdentity;
}

export interface ResolvedRecordFieldInventory {
  readonly envelope: readonly string[];
  readonly remaining: readonly string[];
  readonly all: readonly string[];
}

export interface ResolvedRecordDebugFixture {
  readonly sourcePath: string;
  readonly sourceEntityKind: string;
  readonly identity: ResolvedRecordDebugIdentity;
  readonly inheritanceChain: readonly ResolvedRecordDebugChainStep[];
  readonly terminalBase: {
    readonly name: string;
    readonly source: string;
    readonly entityKind: string;
    readonly sourcePath: string;
    readonly identity: Record<string, unknown>;
  };
  readonly resolvedFieldInventory: ResolvedRecordFieldInventory;
  readonly resolvedRecord: CopyModRawRecord;
  readonly diagnostics: readonly MaterializationDiagnostic[];
  readonly deferredPreserve?: unknown;
}

export interface ResolvedRecordDebugDiagnostic {
  readonly code:
    | "SOURCE_PATH_NOT_FOUND"
    | "SOURCE_ENTITY_KIND_REQUIRED"
    | "INVALID_SOURCE_ENTITY_KIND"
    | "SOURCE_RECORD_NOT_FOUND"
    | "SOURCE_RECORD_AMBIGUOUS"
    | "COPY_RESOLUTION_FAILED"
    | "MOD_RESOLUTION_FAILED";
  readonly message: string;
  readonly sourcePath?: string;
  readonly sourceEntityKind?: string;
  readonly identity: {
    readonly name: string;
    readonly source: string;
  };
  readonly candidates?: readonly ResolvedRecordDebugIdentity[];
  readonly materializationDiagnostic?: MaterializationDiagnostic;
}

export type ResolvedRecordDebugFixtureResult =
  | {
      readonly ok: true;
      readonly fixture: ResolvedRecordDebugFixture;
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ResolvedRecordDebugDiagnostic[];
    };

export interface ResolvedRecordDebugFixtureOptions {
  readonly sourcePath: string;
  readonly sourceEntityKind: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }
  if (isPlainObject(value)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      cloned[key] = cloneUnknown(item);
    }
    return cloned;
  }
  return value;
}

function cloneRecord(record: CopyModRawRecord): CopyModRawRecord {
  return {
    name: record.name,
    source: record.source,
    remaining: cloneUnknown(record.remaining) as Record<string, unknown>,
  };
}

/**
 * Locates the source record using full structured identity comparison
 * within the specified sourcePath and sourceEntityKind. Detects ambiguity
 * when multiple records share the same structured identity.
 */
function locateSourceRecord(
  context: CopyResolverContext,
  record: CopyModRawRecord,
  sourcePath: string,
  sourceEntityKind: string,
):
  | { record: CopyModRawRecord; found: true }
  | { found: false; reason: string; candidates?: readonly ResolvedRecordDebugIdentity[] } {
  const envelope = context.validatedFiles[sourcePath];
  if (envelope === undefined) {
    return { found: false, reason: `Source path "${sourcePath}" not found in validated files` };
  }

  const collection = envelope.collections.find((c) => c.entityKind === sourceEntityKind);
  if (collection === undefined) {
    const availableKinds = envelope.collections.map((c) => c.entityKind).join(", ");
    return {
      found: false,
      reason: `Entity kind "${sourceEntityKind}" not found in "${sourcePath}". Available kinds: ${availableKinds}`,
    };
  }

  const targetIdentity = getRecordIdentity(record);
  const matches = collection.records.filter(
    (candidate) => recordMatchesIdentity(candidate, targetIdentity),
  );

  if (matches.length === 0) {
    return {
      found: false,
      reason: `Record with structured identity [name="${record.name}", source="${record.source}"] not found in "${sourceEntityKind}" collection of "${sourcePath}"`,
    };
  }

  if (matches.length > 1) {
    const candidates: ResolvedRecordDebugIdentity[] = matches.map((m) => {
      const id = getRecordIdentity(m);
      return {
        entityKind: sourceEntityKind,
        name: String(id.name ?? ""),
        ...id,
      } as ResolvedRecordDebugIdentity;
    });
    return {
      found: false,
      reason: `Found ${matches.length} records matching structured identity [name="${record.name}", source="${record.source}"] in "${sourceEntityKind}" collection of "${sourcePath}". Ambiguous match.`,
      candidates,
    };
  }

  return { record: matches[0] as CopyModRawRecord, found: true };
}

export function collectResolvedFieldInventory(
  record: CopyModRawRecord,
): ResolvedRecordFieldInventory {
  const remaining = Object.keys(record.remaining).sort();
  return {
    envelope: ["name", "source"],
    remaining,
    all: ["name", "source", ...remaining],
  };
}

export function createResolvedRecordDebugFixture(
  record: CopyModRawRecord,
  context: CopyResolverContext,
  options: ResolvedRecordDebugFixtureOptions,
): ResolvedRecordDebugFixtureResult {
  const { sourcePath, sourceEntityKind } = options;

  // Locate the source record using exact path + entity kind
  const located = locateSourceRecord(context, record, sourcePath, sourceEntityKind);
  if (!located.found) {
    const code: ResolvedRecordDebugDiagnostic["code"] =
      context.validatedFiles[sourcePath] === undefined
        ? "SOURCE_PATH_NOT_FOUND"
        : (located.candidates?.length ?? 0) > 0
          ? "SOURCE_RECORD_AMBIGUOUS"
          : "SOURCE_RECORD_NOT_FOUND";
    return {
      ok: false,
      diagnostics: [
        {
          code,
          message: located.reason,
          sourcePath,
          sourceEntityKind,
          identity: { name: record.name, source: record.source },
          ...(located.candidates ? { candidates: located.candidates } : {}),
        },
      ],
    };
  }

  const boundaryRecord = located.record;

  const modContext: CopyModContext = { sourcePath, sourceEntityKind };
  const copyResult = resolveCopy(boundaryRecord, context, modContext);

  // Direct record: no _copy field
  const isDirectRecord =
    isCopyResolutionFailure(copyResult) && copyResult.diagnostic.code === "NO_COPY_FIELD";

  if (isCopyResolutionFailure(copyResult) && !isDirectRecord) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "COPY_RESOLUTION_FAILED",
          message: copyResult.diagnostic.message,
          sourcePath,
          sourceEntityKind,
          identity: { name: record.name, source: record.source },
        },
      ],
    };
  }

  let resolvedRecord: CopyModRawRecord;
  let inheritanceChain: readonly CopyChainStep[];
  let terminalBase: ResolvedRecordDebugFixture["terminalBase"];
  let diagnostics: readonly MaterializationDiagnostic[] = [];
  let deferredPreserve: unknown = undefined;

  if (isDirectRecord) {
    resolvedRecord = cloneRecord(boundaryRecord);
    inheritanceChain = [];
    const boundaryIdentity = getRecordIdentity(boundaryRecord);
    terminalBase = {
      name: boundaryRecord.name,
      source: boundaryRecord.source,
      entityKind: sourceEntityKind,
      sourcePath,
      identity: boundaryIdentity,
    };
  } else {
    // Use materializeCopyWithMods for full MaterializedResolvedRecord contract
    const materialized = materializeCopyWithMods(boundaryRecord, context, modContext);

    if (!materialized.ok) {
      return {
        ok: false,
        diagnostics: [
          {
            code: "MOD_RESOLUTION_FAILED",
            message: materialized.diagnostics[0]?.message ?? "Materialization failed",
            sourcePath,
            sourceEntityKind,
            identity: { name: record.name, source: record.source },
            materializationDiagnostic: materialized.diagnostics[0],
          },
        ],
      };
    }

    const result = materialized.result;
    resolvedRecord = result.record;
    inheritanceChain = result.inheritanceChain;
    terminalBase = result.terminalBase;
    diagnostics = result.metadata.diagnostics;
    deferredPreserve = result.metadata.deferredPreserve;
  }

  const chainSteps: ResolvedRecordDebugChainStep[] = inheritanceChain.map((step) => ({
    ...step,
    identity: {
      entityKind: step.entityKind,
      name: String(step.identity.name ?? step.entityName),
      ...step.identity,
    } as ResolvedRecordDebugIdentity,
  }));

  const recordIdentity = getRecordIdentity(boundaryRecord);
  const fixture: ResolvedRecordDebugFixture = {
    sourcePath,
    sourceEntityKind,
    identity: {
      entityKind: sourceEntityKind,
      name: String(recordIdentity.name ?? boundaryRecord.name),
      ...recordIdentity,
    } as ResolvedRecordDebugIdentity,
    inheritanceChain: chainSteps,
    terminalBase,
    resolvedFieldInventory: collectResolvedFieldInventory(resolvedRecord),
    resolvedRecord,
    diagnostics,
  };

  // Only add deferredPreserve if present
  if (deferredPreserve !== undefined) {
    return {
      ok: true,
      fixture: {
        ...fixture,
        deferredPreserve,
      },
    };
  }

  return { ok: true, fixture };
}

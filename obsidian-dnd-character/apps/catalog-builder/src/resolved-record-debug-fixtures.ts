import {
  isCopyResolutionFailure,
  isCopyResolutionSuccess,
  resolveCopy,
  type CopyChainStep,
  type CopyResolverContext,
  type CopyResolverDiagnostic,
} from "./copy-resolver";
import {
  resolveCopyWithMods,
  type CopyModRawRecord,
} from "./mod-copy-resolver";

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
  readonly identity: ResolvedRecordDebugIdentity;
  readonly inheritanceChain: readonly ResolvedRecordDebugChainStep[];
  readonly resolvedFieldInventory: ResolvedRecordFieldInventory;
  readonly resolvedRecord: CopyModRawRecord;
}

export interface ResolvedRecordDebugDiagnostic {
  readonly code: "SOURCE_PATH_NOT_FOUND" | "COPY_RESOLUTION_FAILED" | "MOD_RESOLUTION_FAILED";
  readonly message: string;
  readonly sourcePath?: string;
  readonly identity: {
    readonly name: string;
    readonly source: string;
  };
  readonly copyDiagnostic?: CopyResolverDiagnostic;
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
  readonly sourcePath?: string;
}

interface RecordLocation {
  readonly sourcePath: string;
  readonly entityKind: string;
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

function findRecordLocation(
  context: CopyResolverContext,
  record: CopyModRawRecord,
  preferredSourcePath?: string,
): RecordLocation | undefined {
  if (preferredSourcePath !== undefined) {
    const preferred = context.validatedFiles[preferredSourcePath];
    if (preferred !== undefined && preferred.collections.length > 0) {
      return {
        sourcePath: preferredSourcePath,
        entityKind: preferred.collections[0]!.entityKind,
      };
    }
  }

  for (const [sourcePath, envelope] of Object.entries(context.validatedFiles)) {
    for (const collection of envelope.collections) {
      const matchesRecord = collection.records.some(
        (candidate) => candidate.name === record.name && candidate.source === record.source,
      );
      if (matchesRecord) {
        return {
          sourcePath,
          entityKind: collection.entityKind,
        };
      }
    }
  }
  return undefined;
}

function findChainStepLocation(
  context: CopyResolverContext,
  step: CopyChainStep,
): RecordLocation | undefined {
  for (const [sourcePath, envelope] of Object.entries(context.validatedFiles)) {
    for (const collection of envelope.collections) {
      const matchesRecord = collection.records.some(
        (record) => record.name === step.entityName && record.source === step.sourceAbbr,
      );
      if (matchesRecord) {
        return {
          sourcePath,
          entityKind: collection.entityKind,
        };
      }
    }
  }
  return undefined;
}

function createIdentity(
  record: CopyModRawRecord,
  location: RecordLocation,
): ResolvedRecordDebugIdentity {
  return {
    entityKind: location.entityKind,
    name: record.name,
    source: record.source,
  };
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
  options: ResolvedRecordDebugFixtureOptions = {},
): ResolvedRecordDebugFixtureResult {
  const sourceLocation = findRecordLocation(context, record, options.sourcePath);
  if (sourceLocation === undefined) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "SOURCE_PATH_NOT_FOUND",
          message: `Could not locate source path for "${record.name}" (${record.source}).`,
          identity: { name: record.name, source: record.source },
        },
      ],
    };
  }

  const copyResult = resolveCopy(record, context, {
    sourceEntityKind: sourceLocation.entityKind,
    sourcePath: sourceLocation.sourcePath,
  });
  const isDirectRecord =
    isCopyResolutionFailure(copyResult) && copyResult.diagnostic.code === "NO_COPY_FIELD";

  if (isCopyResolutionFailure(copyResult) && !isDirectRecord) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "COPY_RESOLUTION_FAILED",
          message: copyResult.diagnostic.message,
          sourcePath: sourceLocation.sourcePath,
          identity: { name: record.name, source: record.source },
          copyDiagnostic: copyResult.diagnostic,
        },
      ],
    };
  }

  const resolvedRecord = isCopyResolutionSuccess(copyResult)
    ? resolveCopyWithMods(record, context, {
        sourcePath: sourceLocation.sourcePath,
        sourceEntityKind: sourceLocation.entityKind,
      })
    : { ok: true as const, record: cloneRecord(record), diagnostics: [] };

  if (!resolvedRecord.ok) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "MOD_RESOLUTION_FAILED",
          message: `Could not apply _mod operations for "${record.name}" (${record.source}).`,
          sourcePath: sourceLocation.sourcePath,
          identity: { name: record.name, source: record.source },
        },
      ],
    };
  }

  const inheritanceChain = isCopyResolutionSuccess(copyResult)
    ? copyResult.chain.map((step) => {
        const location = findChainStepLocation(context, step) ?? sourceLocation;
        return {
          ...step,
          sourcePath: location.sourcePath,
          identity: {
            entityKind: location.entityKind,
            name: step.entityName,
            source: step.sourceAbbr,
          },
        };
      })
    : [];
  const clonedResolvedRecord = cloneRecord(resolvedRecord.record);

  return {
    ok: true,
    fixture: {
      sourcePath: sourceLocation.sourcePath,
      identity: createIdentity(record, sourceLocation),
      inheritanceChain,
      resolvedFieldInventory: collectResolvedFieldInventory(clonedResolvedRecord),
      resolvedRecord: clonedResolvedRecord,
    },
  };
}

import type { StructuredIdentity } from "./copy-resolver";
import { cloneUnknown, deepFreeze } from "./copy-materialization-merge";
import type { MaterializationDiagnostic } from "./mod-types";
import type { DiagnosticSeverity } from "./raw-loader";

export type RaceSubraceDiagnosticCode =
  | "PARENT_RACE_NOT_FOUND"
  | "PARENT_RACE_AMBIGUOUS"
  | "MALFORMED_PARENT_DISCRIMINATOR"
  | "PARENT_COPY_MATERIALIZATION_FAILURE"
  | "SUBRACE_COPY_MATERIALIZATION_FAILURE"
  | "PARENT_SUBRACE_MERGE_FAILURE";

export interface RaceSubraceCandidateDiagnostic {
  readonly name: string;
  readonly source: string;
  readonly entityKind: string;
  readonly sourcePath: string;
  readonly sourceRole: string;
  readonly identity: StructuredIdentity;
}

export interface RaceSubraceMaterializationDiagnostic {
  readonly code: RaceSubraceDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly sourcePath: string;
  readonly sourceEntityKind: "subrace";
  readonly recordName: string;
  readonly recordSource: string;
  readonly raceName?: string;
  readonly raceSource?: string;
  readonly parentSourcePath?: string;
  readonly requestedIdentity?: StructuredIdentity;
  readonly candidates?: readonly RaceSubraceCandidateDiagnostic[];
  readonly ineligibleCandidates?: readonly RaceSubraceCandidateDiagnostic[];
  readonly inheritanceChain?: MaterializationDiagnostic["inheritanceChain"];
  readonly materializationCode?: string;
  readonly fieldTarget?: string;
  readonly mode?: string;
  readonly rawPayload?: unknown;
  readonly underlyingDiagnostics?: readonly MaterializationDiagnostic[];
}

function cloneIdentity(identity: StructuredIdentity): StructuredIdentity {
  return deepFreeze(cloneUnknown(identity) as StructuredIdentity);
}

export function makeRaceSubraceDiagnostic(
  diagnostic: Omit<RaceSubraceMaterializationDiagnostic, "severity" | "sourceEntityKind"> & {
    readonly severity?: DiagnosticSeverity;
  },
): RaceSubraceMaterializationDiagnostic {
  return Object.freeze({
    ...diagnostic,
    severity: diagnostic.severity ?? "error",
    sourceEntityKind: "subrace",
    requestedIdentity: diagnostic.requestedIdentity
      ? cloneIdentity(diagnostic.requestedIdentity)
      : undefined,
  });
}

export function parentIdentity(raceName: string, raceSource: string): StructuredIdentity {
  return deepFreeze({ name: raceName, source: raceSource });
}

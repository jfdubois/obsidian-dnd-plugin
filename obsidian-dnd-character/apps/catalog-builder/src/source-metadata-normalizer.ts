import type { Ruleset } from "@obsidian-dnd/domain";
import type {
  ContentAccess,
  RecordAccessClassification,
} from "./record-access-classifier";
import type {
  RulesetClassificationDiagnostic,
  RulesetClassificationDiagnosticCode,
  RulesetClassificationMethod,
} from "./ruleset-classifier";
import { RULESET_SOURCE_CLASSIFICATIONS } from "./ruleset-classifier";
import type { SourceManifest } from "./source-manifest";

export type SourceMetadataNormalizerDiagnosticCode =
  | "INVALID_SOURCE_METADATA"
  | "UPSTREAM_RULESET_EXCLUSION";

export interface SourceMetadataProvenance {
  readonly sourceManifest: {
    readonly commitHash: string;
    readonly shortHash: string;
    readonly date: string;
  };
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
  readonly recordName?: string;
}

export interface NormalizedSourceMetadata {
  readonly key: string;
  readonly source: string;
  readonly ruleset: Ruleset;
  readonly access: ContentAccess;
  readonly classification: {
    readonly rulesetMethod: RulesetClassificationMethod;
    readonly accessMethod: RecordAccessClassification["method"];
    readonly coreMarker?: RecordAccessClassification["coreMarker"];
  };
  readonly provenance: readonly SourceMetadataProvenance[];
}

export interface SourceMetadataNormalizerDiagnostic {
  readonly code: SourceMetadataNormalizerDiagnosticCode;
  readonly severity: "warning";
  readonly message: string;
  readonly source?: string;
  readonly ruleset?: Ruleset;
  readonly access?: ContentAccess;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
  readonly recordName?: string;
  readonly upstreamCode?: RulesetClassificationDiagnosticCode;
}

export interface SourceMetadataInput {
  readonly sourceManifest: SourceManifest;
  readonly accessClassifications: readonly RecordAccessClassification[];
  readonly rulesetDiagnostics?: readonly RulesetClassificationDiagnostic[];
}

export interface SourceMetadataNormalizerResult {
  readonly metadata: readonly NormalizedSourceMetadata[];
  readonly diagnostics: readonly SourceMetadataNormalizerDiagnostic[];
}

type MutableMetadata = Omit<NormalizedSourceMetadata, "provenance"> & {
  provenance: SourceMetadataProvenance[];
};

function createMetadataKey(
  ruleset: Ruleset,
  source: string,
  access: ContentAccess,
): string {
  return `${ruleset}:${source}:${access}`;
}

function createProvenance(
  sourceManifest: SourceManifest,
  classification: RecordAccessClassification,
): SourceMetadataProvenance {
  return Object.freeze({
    sourceManifest: Object.freeze({
      commitHash: sourceManifest.commitHash,
      shortHash: sourceManifest.shortHash,
      date: sourceManifest.date,
    }),
    sourcePath: classification.sourcePath,
    entityKind: classification.entityKind,
    recordIndex: classification.recordIndex,
    recordName: classification.record.name,
  });
}

function createInvalidSourceDiagnostic(
  classification: RecordAccessClassification,
  message: string,
): SourceMetadataNormalizerDiagnostic {
  return Object.freeze({
    code: "INVALID_SOURCE_METADATA",
    severity: "warning",
    message,
    source: classification.source,
    ruleset: classification.ruleset,
    access: classification.access,
    sourcePath: classification.sourcePath,
    entityKind: classification.entityKind,
    recordIndex: classification.recordIndex,
    recordName: classification.record.name,
  });
}

function createUpstreamDiagnostic(
  diagnostic: RulesetClassificationDiagnostic,
): SourceMetadataNormalizerDiagnostic {
  return Object.freeze({
    code: "UPSTREAM_RULESET_EXCLUSION",
    severity: "warning",
    message: diagnostic.message,
    source: diagnostic.source,
    ruleset: diagnostic.ruleset,
    sourcePath: diagnostic.sourcePath,
    entityKind: diagnostic.entityKind,
    recordIndex: diagnostic.recordIndex,
    recordName: diagnostic.recordName,
    upstreamCode: diagnostic.code,
  });
}

function freezeMetadata(metadata: MutableMetadata): NormalizedSourceMetadata {
  return Object.freeze({
    ...metadata,
    classification: Object.freeze(metadata.classification),
    provenance: Object.freeze(metadata.provenance),
  });
}

function compareMetadata(
  left: NormalizedSourceMetadata,
  right: NormalizedSourceMetadata,
): number {
  return left.key.localeCompare(right.key);
}

function findRulesetMethod(
  source: string,
  ruleset: Ruleset,
): RulesetClassificationMethod | undefined {
  return RULESET_SOURCE_CLASSIFICATIONS.find((classification) => (
    classification.source === source && classification.ruleset === ruleset
  ))?.method;
}

export function normalizeSourceMetadata(
  input: SourceMetadataInput,
): SourceMetadataNormalizerResult {
  const metadataByKey = new Map<string, MutableMetadata>();
  const diagnostics: SourceMetadataNormalizerDiagnostic[] = [];

  for (const upstreamDiagnostic of input.rulesetDiagnostics ?? []) {
    diagnostics.push(createUpstreamDiagnostic(upstreamDiagnostic));
  }

  for (const classification of input.accessClassifications) {
    if (classification.source.length === 0) {
      diagnostics.push(createInvalidSourceDiagnostic(
        classification,
        "Record access classification cannot produce source metadata without a source abbreviation.",
      ));
      continue;
    }

    const rulesetMethod = findRulesetMethod(
      classification.source,
      classification.ruleset,
    );
    if (rulesetMethod === undefined) {
      diagnostics.push(createInvalidSourceDiagnostic(
        classification,
        `No reviewed ruleset classification exists for source "${classification.source}".`,
      ));
      continue;
    }

    const key = createMetadataKey(
      classification.ruleset,
      classification.source,
      classification.access,
    );
    const existing = metadataByKey.get(key);
    const provenance = createProvenance(input.sourceManifest, classification);

    if (existing) {
      existing.provenance.push(provenance);
      continue;
    }

    metadataByKey.set(key, {
      key,
      source: classification.source,
      ruleset: classification.ruleset,
      access: classification.access,
      classification: Object.freeze({
        rulesetMethod,
        accessMethod: classification.method,
        coreMarker: classification.coreMarker,
      }),
      provenance: [provenance],
    });
  }

  return Object.freeze({
    metadata: Object.freeze(
      Array.from(metadataByKey.values()).map(freezeMetadata).sort(compareMetadata),
    ),
    diagnostics: Object.freeze(diagnostics),
  });
}

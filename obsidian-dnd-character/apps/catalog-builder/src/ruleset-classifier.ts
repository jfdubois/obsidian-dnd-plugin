import type { Ruleset } from "@obsidian-dnd/domain";
import type { RawRecord } from "./raw-boundary";

export type RulesetClassificationMethod = "reviewed-source-map";

export interface RulesetSourceClassification {
  readonly source: string;
  readonly ruleset: Ruleset;
  readonly method: RulesetClassificationMethod;
}

export const RULESET_SOURCE_CLASSIFICATIONS: readonly RulesetSourceClassification[] = Object.freeze([
  { source: "PHB", ruleset: "2014", method: "reviewed-source-map" },
  { source: "DMG", ruleset: "2014", method: "reviewed-source-map" },
  { source: "MM", ruleset: "2014", method: "reviewed-source-map" },
  { source: "XPHB", ruleset: "2024", method: "reviewed-source-map" },
  { source: "XDMG", ruleset: "2024", method: "reviewed-source-map" },
  { source: "XMM", ruleset: "2024", method: "reviewed-source-map" },
]);

export type RulesetClassificationDiagnosticCode =
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "EXCLUDED_RULESET";

export interface RulesetClassificationDiagnostic {
  readonly code: RulesetClassificationDiagnosticCode;
  readonly severity: "warning";
  readonly message: string;
  readonly source?: string;
  readonly ruleset?: Ruleset;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordName?: string;
  readonly recordIndex?: number;
}

export interface RulesetRecordClassification {
  readonly record: RawRecord;
  readonly ruleset: Ruleset;
  readonly source: string;
  readonly method: RulesetClassificationMethod;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export type RulesetClassificationResult =
  | { readonly ok: true; readonly classification: RulesetRecordClassification }
  | { readonly ok: false; readonly diagnostic: RulesetClassificationDiagnostic };

export interface RulesetRecordInput {
  readonly record: RawRecord;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface RulesetClassifierOptions {
  readonly includedRulesets?: readonly Ruleset[];
}

export interface RulesetClassificationBatchResult {
  readonly classifications: readonly RulesetRecordClassification[];
  readonly diagnostics: readonly RulesetClassificationDiagnostic[];
  readonly representedRulesets: readonly Ruleset[];
}

const DEFAULT_INCLUDED_RULESETS: readonly Ruleset[] = Object.freeze(["2014", "2024"]);

const SOURCE_RULESET_BY_ABBREVIATION: ReadonlyMap<string, RulesetSourceClassification> = new Map(
  RULESET_SOURCE_CLASSIFICATIONS.map((classification) => [classification.source, classification]),
);

function createDiagnostic(
  input: RulesetRecordInput,
  diagnostic: Omit<RulesetClassificationDiagnostic, "sourcePath" | "entityKind" | "recordName" | "recordIndex">,
): RulesetClassificationDiagnostic {
  return {
    ...diagnostic,
    sourcePath: input.sourcePath,
    entityKind: input.entityKind,
    recordName: input.record.name,
    recordIndex: input.recordIndex,
  };
}

function normalizeInput(recordOrInput: RawRecord | RulesetRecordInput): RulesetRecordInput {
  if ("record" in recordOrInput) return recordOrInput;
  return { record: recordOrInput };
}

function includedRulesets(options: RulesetClassifierOptions | undefined): readonly Ruleset[] {
  return options?.includedRulesets ?? DEFAULT_INCLUDED_RULESETS;
}

export function classifyRecordRuleset(
  recordOrInput: RawRecord | RulesetRecordInput,
  options?: RulesetClassifierOptions,
): RulesetClassificationResult {
  const input = normalizeInput(recordOrInput);
  const source = input.record.source;

  if (source.length === 0) {
    return {
      ok: false,
      diagnostic: createDiagnostic(input, {
        code: "INVALID_SOURCE",
        severity: "warning",
        message: "Resolved raw record has an empty source abbreviation.",
        source,
      }),
    };
  }

  const sourceClassification = SOURCE_RULESET_BY_ABBREVIATION.get(source);
  if (!sourceClassification) {
    return {
      ok: false,
      diagnostic: createDiagnostic(input, {
        code: "UNKNOWN_SOURCE",
        severity: "warning",
        message: `No reviewed ruleset classification exists for source "${source}".`,
        source,
      }),
    };
  }

  if (!includedRulesets(options).includes(sourceClassification.ruleset)) {
    return {
      ok: false,
      diagnostic: createDiagnostic(input, {
        code: "EXCLUDED_RULESET",
        severity: "warning",
        message: `Source "${source}" belongs to excluded ruleset "${sourceClassification.ruleset}".`,
        source,
        ruleset: sourceClassification.ruleset,
      }),
    };
  }

  return {
    ok: true,
    classification: {
      record: input.record,
      source,
      ruleset: sourceClassification.ruleset,
      method: sourceClassification.method,
      sourcePath: input.sourcePath,
      entityKind: input.entityKind,
      recordIndex: input.recordIndex,
    },
  };
}

export function classifyResolvedRecordRulesets(
  inputs: readonly RulesetRecordInput[],
  options?: RulesetClassifierOptions,
): RulesetClassificationBatchResult {
  const classifications: RulesetRecordClassification[] = [];
  const diagnostics: RulesetClassificationDiagnostic[] = [];
  const representedRulesets: Ruleset[] = [];

  for (const input of inputs) {
    const result = classifyRecordRuleset(input, options);
    if (!result.ok) {
      diagnostics.push(result.diagnostic);
      continue;
    }

    classifications.push(result.classification);
    if (!representedRulesets.includes(result.classification.ruleset)) {
      representedRulesets.push(result.classification.ruleset);
    }
  }

  return Object.freeze({
    classifications: Object.freeze(classifications),
    diagnostics: Object.freeze(diagnostics),
    representedRulesets: Object.freeze(representedRulesets),
  });
}

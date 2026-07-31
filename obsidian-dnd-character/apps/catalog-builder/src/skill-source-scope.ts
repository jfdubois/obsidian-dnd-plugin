import type { RawRecord } from "./raw-boundary";
import { classifyRecordRuleset } from "./ruleset-classifier";
import type { FrozenReadonlySet } from "./species-source-inventory";

/* ── Supported skill source registry ───────────────────────────── */

export const SUPPORTED_SKILL_SOURCES = Object.freeze([
  Object.freeze({ source: "PHB", ruleset: "2014" }),
  Object.freeze({ source: "XPHB", ruleset: "2024" }),
] as const);

export type SupportedSkillSourceEntry = (typeof SUPPORTED_SKILL_SOURCES)[number];
export type SupportedSkillSource = SupportedSkillSourceEntry["source"];
export type SupportedSkillRuleset = SupportedSkillSourceEntry["ruleset"];

const SUPPORTED_SOURCE_MAP: ReadonlyMap<string, SupportedSkillSourceEntry> = new Map(
  SUPPORTED_SKILL_SOURCES.map((entry) => [entry.source, entry]),
);

const SUPPORTED_SOURCE_NAMES: readonly string[] = Object.freeze(
  SUPPORTED_SKILL_SOURCES.map((entry) => entry.source),
);

/* ── Types ─────────────────────────────────────────────────────── */

export interface SkillSourceScopeContext {
  readonly knownPinnedSources: FrozenReadonlySet<string>;
}

export interface SkillSourceScopeInput {
  readonly record: RawRecord;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export type SkillSourceScopeDiagnosticCode =
  | "INVALID_SOURCE"
  | "UNSUPPORTED_SKILL_SOURCE"
  | "UNKNOWN_SOURCE";

export interface SkillSourceScopeDiagnostic {
  readonly code: SkillSourceScopeDiagnosticCode;
  readonly severity: "warning";
  readonly message: string;
  readonly source?: string;
  readonly recordIdentity: {
    readonly name: string;
    readonly source: string;
  };
  readonly recordName: string;
  readonly entityKind?: string;
  readonly sourcePath?: string;
  readonly recordIndex?: number;
  readonly supportedSources: readonly string[];
}

export type SkillSourceScopeSuccess =
  | { readonly ok: true; readonly record: RawRecord; readonly source: "PHB"; readonly ruleset: "2014"; }
  | { readonly ok: true; readonly record: RawRecord; readonly source: "XPHB"; readonly ruleset: "2024"; };

export interface SkillSourceScopeFailure {
  readonly ok: false;
  readonly diagnostic: SkillSourceScopeDiagnostic;
}

export type SkillSourceScopeResult = SkillSourceScopeSuccess | SkillSourceScopeFailure;

/* ── Diagnostic builder ────────────────────────────────────────── */

function buildDiagnostic(
  input: SkillSourceScopeInput,
  code: SkillSourceScopeDiagnosticCode,
  message: string,
  source?: string,
): SkillSourceScopeDiagnostic {
  return Object.freeze({
    code,
    severity: "warning" as const,
    message,
    source,
    recordIdentity: Object.freeze({
      name: input.record.name,
      source: input.record.source,
    }),
    recordName: input.record.name,
    entityKind: input.entityKind,
    sourcePath: input.sourcePath,
    recordIndex: input.recordIndex,
    supportedSources: SUPPORTED_SOURCE_NAMES,
  });
}

function lookupSupportedEntry(source: string): SupportedSkillSourceEntry | undefined {
  return SUPPORTED_SOURCE_MAP.get(source);
}

export function classifySkillSourceScope(
  input: SkillSourceScopeInput,
  context: SkillSourceScopeContext,
): SkillSourceScopeResult {
  const source = input.record.source;

  // 1. Invalid: empty or whitespace-padded
  if (source.length === 0 || source !== source.trim()) {
    return Object.freeze({
      ok: false,
      diagnostic: buildDiagnostic(
        input,
        "INVALID_SOURCE",
        "Skill record has a malformed source abbreviation (empty or whitespace-padded).",
        source,
      ),
    });
  }

  // 2. Supported: PHB or XPHB
  const supportedEntry = lookupSupportedEntry(source);
  if (supportedEntry !== undefined) {
    const rulesetResult = classifyRecordRuleset(input);
    if (!rulesetResult.ok) {
      return Object.freeze({
        ok: false,
        diagnostic: buildDiagnostic(
          input,
          "UNKNOWN_SOURCE",
          `Ruleset classifier could not classify supported skill source "${source}".`,
          source,
        ),
      });
    }
    if (rulesetResult.classification.ruleset !== supportedEntry.ruleset) {
      return Object.freeze({
        ok: false,
        diagnostic: buildDiagnostic(
          input,
          "UNKNOWN_SOURCE",
          `Ruleset mismatch for source "${source}": expected "${supportedEntry.ruleset}" but got "${rulesetResult.classification.ruleset}".`,
          source,
        ),
      });
    }

    if (source === "PHB") {
      return Object.freeze({
        ok: true,
        record: input.record,
        source: "PHB" as const,
        ruleset: "2014" as const,
      });
    }
    return Object.freeze({
      ok: true,
      record: input.record,
      source: "XPHB" as const,
      ruleset: "2024" as const,
    });
  }

  // 3. Known pinned but not in initial scope
  if (context.knownPinnedSources.has(source)) {
    return Object.freeze({
      ok: false,
      diagnostic: buildDiagnostic(
        input,
        "UNSUPPORTED_SKILL_SOURCE",
        `Source "${source}" is a known pinned source but is excluded from the initial skill normalizer scope (PHB and XPHB only).`,
        source,
      ),
    });
  }

  // 4. Unknown / fabricated source
  return Object.freeze({
    ok: false,
    diagnostic: buildDiagnostic(
      input,
      "UNKNOWN_SOURCE",
      `Source "${source}" is not recognized as a valid skill source.`,
      source,
    ),
  });
}

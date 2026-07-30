import type { RawRecord } from "./raw-boundary";
import { classifyBackgroundSourceScope, type BackgroundSourceScopeContext } from "./background-source-scope";
import {
  extractContent,
  extractSkillProficiencies,
  extractFeatureId,
  extractPage,
  extractSummary,
} from "./background-field-extractors";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createBackgroundRule, type BackgroundRule } from "@obsidian-dnd/catalog-contract";

export type BackgroundNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "INVALID_CANONICAL_ID"
  | "UNMAPPED_SKILL_PROFICIENCY"
  | "UNMAPPED_TOOL_PROFICIENCY"
  | "UNMAPPED_LANGUAGE"
  | "UNMAPPED_FEATURE"
  | "UNMAPPED_MECHANIC";

export interface BackgroundNormalizerDiagnostic {
  readonly code: BackgroundNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface BackgroundNormalizerInput {
  readonly records: readonly RawRecord[];
  readonly context: BackgroundSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
}

export interface BackgroundNormalizerResult {
  readonly backgrounds: readonly BackgroundRule[];
  readonly diagnostics: readonly BackgroundNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: BackgroundSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: BackgroundNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): BackgroundNormalizerDiagnostic {
  return Object.freeze({
    code,
    severity: (["INVALID_CANONICAL_ID", "INVALID_SOURCE"].includes(code) ? "error" : "warning") as "warning" | "error",
    message,
    recordName,
    source,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
}

type SingleResult =
  | { readonly ok: true; readonly background: BackgroundRule; readonly diagnostics: readonly BackgroundNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly BackgroundNormalizerDiagnostic[] };

function normalizeSingleBackground(record: RawRecord, opts: NormalizerOptions): SingleResult {
  const diagnostics: BackgroundNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifyBackgroundSourceScope(
    { record, sourcePath: opts.sourcePath, entityKind: opts.entityKind, recordIndex: opts.recordIndex },
    opts.context,
  );

  if (!scopeResult.ok) {
    const code = scopeResult.diagnostic.code === "INVALID_SOURCE"
      ? "INVALID_SOURCE"
      : "EXCLUDED_SOURCE";
    diagnostics.push(makeDiagnostic(code, scopeResult.diagnostic.message, record.name, opts, scopeResult.diagnostic.source));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Generate canonical ID
  const idResult = createCanonicalEntityId({
    kind: "background",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: record.name,
  });

  if (!idResult.ok) {
    diagnostics.push(makeDiagnostic("INVALID_CANONICAL_ID", idResult.diagnostic.message, record.name, opts));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 3. Extract skill proficiencies
  const { skillIds, unmapped: unmappedSkills } = extractSkillProficiencies(
    remaining,
    scopeResult.ruleset,
    scopeResult.source,
  );

  if (unmappedSkills.length > 0) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_SKILL_PROFICIENCY",
      `Background "${record.name}" has unmapped skill proficiencies: ${unmappedSkills.join(", ")}.`,
      record.name,
      opts,
    ));
  }

  // 4. Extract feature ID
  const { featureId, unmapped: unmappedFeature } = extractFeatureId(
    remaining,
    scopeResult.ruleset,
    scopeResult.source,
  );

  if (unmappedFeature) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_FEATURE",
      `Background "${record.name}" has an unmapped background feature.`,
      record.name,
      opts,
    ));
  }

  // 5. Extract page
  const page = extractPage(remaining);

  // 6. Extract summary
  const summary = extractSummary(remaining);

  // 7. Extract narrative content
  const content = extractContent(remaining);

  // 8. Log unmapped fields as diagnostics
  const unmappedTools = remaining.toolProficiencies;
  if (Array.isArray(unmappedTools) && unmappedTools.length > 0) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_TOOL_PROFICIENCY",
      `Background "${record.name}" has unmapped tool proficiencies.`,
      record.name,
      opts,
    ));
  }

  const unmappedLang = remaining.languageProficiencies;
  if (Array.isArray(unmappedLang) && unmappedLang.length > 0) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_LANGUAGE",
      `Background "${record.name}" has unmapped language proficiencies.`,
      record.name,
      opts,
    ));
  }

  const unmappedEquipment = remaining.startingEquipment;
  if (Array.isArray(unmappedEquipment) && unmappedEquipment.length > 0) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_MECHANIC",
      `Background "${record.name}" has unmapped starting equipment.`,
      record.name,
      opts,
    ));
  }

  // 9. Assemble BackgroundRule
  const background = createBackgroundRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    skillIds,
    content,
    [], // prerequisites (deferred)
    [], // effects (deferred for tool/language/equipment)
    [], // choices (deferred)
    [], // dependencies
    false, // legacy
    page,
    summary,
    featureId,
  );

  return { ok: true, background, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeBackgrounds(input: BackgroundNormalizerInput): BackgroundNormalizerResult {
  const backgrounds: BackgroundRule[] = [];
  const diagnostics: BackgroundNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleBackground(record, {
      context: input.context,
      sourcePath: input.sourcePath,
      entityKind: input.entityKind,
      recordIndex: i,
    });

    if (result.ok) {
      backgrounds.push(result.background);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    backgrounds: Object.freeze(backgrounds),
    diagnostics: Object.freeze(diagnostics),
  });
}

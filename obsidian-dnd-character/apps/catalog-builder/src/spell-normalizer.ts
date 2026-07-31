import type { CopyModRawRecord } from "./mod-types";
import { classifySpellSourceScope, type SpellSourceScopeContext } from "./spell-source-scope";
import {
  extractCastingTime,
  extractConcentration,
  extractContent,
  extractDuration,
  extractHigherLevelEffects,
  extractLevel,
  extractPage,
  extractRange,
  extractRitual,
  extractSummary,
  mapSchoolCode,
} from "./spell-normalizer-extractors";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createSpellRule, type SpellRule } from "@obsidian-dnd/catalog-contract";

/* ── Diagnostic types ──────────────────────────────────────────── */

export type SpellNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID"
  | "MISSING_SPELL_LEVEL"
  | "MISSING_CASTING_TIME"
  | "MISSING_RANGE"
  | "MISSING_DURATION"
  | "UNKNOWN_SCHOOL_CODE";

export interface SpellNormalizerDiagnostic {
  readonly code: SpellNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface SpellNormalizerInput {
  readonly records: readonly CopyModRawRecord[];
  readonly context: SpellSourceScopeContext;
}

export interface SpellNormalizerResult {
  readonly spells: readonly SpellRule[];
  readonly diagnostics: readonly SpellNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: SpellSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: SpellNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): SpellNormalizerDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "INVALID_CANONICAL_ID",
    "MISSING_SPELL_LEVEL",
    "MISSING_CASTING_TIME",
    "MISSING_RANGE",
    "MISSING_DURATION",
  ].includes(code);

  return Object.freeze({
    code,
    severity: isError ? "error" : "warning",
    message,
    recordName,
    source,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
}

type SingleResult =
  | { readonly ok: true; readonly spell: SpellRule; readonly diagnostics: readonly SpellNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly SpellNormalizerDiagnostic[] };

function normalizeSingleSpell(
  record: CopyModRawRecord,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: SpellNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifySpellSourceScope(
    {
      record,
      sourcePath: opts.sourcePath,
      entityKind: opts.entityKind,
      recordIndex: opts.recordIndex,
    },
    opts.context,
  );

  if (!scopeResult.ok) {
    const code = scopeResult.diagnostic.code === "INVALID_SOURCE"
      ? "INVALID_SOURCE"
      : scopeResult.diagnostic.code === "UNKNOWN_SOURCE"
        ? "UNKNOWN_SOURCE"
        : "EXCLUDED_SOURCE";
    diagnostics.push(makeDiagnostic(
      code,
      scopeResult.diagnostic.message,
      record.name,
      opts,
      scopeResult.diagnostic.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Generate canonical entity ID
  const idResult = createCanonicalEntityId({
    kind: "spell",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: record.name,
  });

  if (!idResult.ok) {
    diagnostics.push(makeDiagnostic(
      "INVALID_CANONICAL_ID",
      idResult.diagnostic.message,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 3. Extract spell-specific fields
  const schoolCode = remaining.school;
  if (typeof schoolCode !== "string" || schoolCode.length === 0) {
    diagnostics.push(makeDiagnostic(
      "UNKNOWN_SCHOOL_CODE",
      `Spell "${record.name}" is missing a school code.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const school = mapSchoolCode(schoolCode);
  if (school === undefined) {
    diagnostics.push(makeDiagnostic(
      "UNKNOWN_SCHOOL_CODE",
      `Spell "${record.name}" has unknown school code "${schoolCode}".`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const level = extractLevel(remaining);
  if (level === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_SPELL_LEVEL",
      `Spell "${record.name}" is missing a valid level.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const castingTime = extractCastingTime(remaining);
  if (castingTime === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_CASTING_TIME",
      `Spell "${record.name}" is missing a valid casting time.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const range = extractRange(remaining);
  if (range === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_RANGE",
      `Spell "${record.name}" is missing a valid range.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const duration = extractDuration(remaining);
  if (duration === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_DURATION",
      `Spell "${record.name}" is missing a valid duration.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const concentration = extractConcentration(remaining);
  const ritual = extractRitual(remaining);
  const content = extractContent(remaining);
  const higherLevelEffects = extractHigherLevelEffects(remaining);
  const page = extractPage(remaining);
  const summary = extractSummary(remaining);

  // 4. Build the spell rule
  const spell = createSpellRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    school,
    level,
    castingTime,
    range,
    duration,
    concentration,
    ritual,
    content,
    [],
    [],
    [],
    [],
    false,
    page,
    summary,
    higherLevelEffects,
  );

  return { ok: true, spell, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeSpells(input: SpellNormalizerInput): SpellNormalizerResult {
  const spells: SpellRule[] = [];
  const diagnostics: SpellNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleSpell(record, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "spell",
      recordIndex: i,
    });

    if (result.ok) {
      spells.push(result.spell);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    spells: Object.freeze(spells),
    diagnostics: Object.freeze(diagnostics),
  });
}

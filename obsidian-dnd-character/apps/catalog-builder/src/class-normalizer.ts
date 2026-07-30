import type { IndexedClassEntry } from "./class-index-types";
import { isAbility, createEntityId, createSourceId, type Ability } from "@obsidian-dnd/domain";
import {
  createClassRule,
  type ClassRule,
  type RenderNode,
} from "@obsidian-dnd/catalog-contract";
import {
  createRuleEffectMetadata,
  createAddProficiencyEffect,
  createProficiencySavingThrowRef,
  createEffectPresentation,
  createEffectOrigin,
  type RuleEffect,
} from "@obsidian-dnd/catalog-contract";

/* ── Diagnostic types ──────────────────────────────────────────── */

export type ClassNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID"
  | "MISSING_HIT_DIE"
  | "INVALID_HIT_DIE"
  | "MISSING_PRIMARY_ABILITIES"
  | "INVALID_PRIMARY_ABILITY"
  | "MISSING_SAVING_THROW_PROFICIENCIES"
  | "INVALID_SAVING_THROW_ABILITY"
  | "SUBCLASS_EXCLUDED";

export interface ClassNormalizerDiagnostic {
  readonly code: ClassNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

/* ── Input / Output ────────────────────────────────────────────── */

export interface ClassNormalizerInput {
  readonly entries: readonly IndexedClassEntry[];
}

export interface ClassNormalizerResult {
  readonly classes: readonly ClassRule[];
  readonly diagnostics: readonly ClassNormalizerDiagnostic[];
}

/* ── Internal helpers ──────────────────────────────────────────── */

interface NormalizerOptions {
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: ClassNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): ClassNormalizerDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "INVALID_CANONICAL_ID",
    "MISSING_HIT_DIE",
    "INVALID_HIT_DIE",
    "MISSING_PRIMARY_ABILITIES",
    "MISSING_SAVING_THROW_PROFICIENCIES",
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

/**
 * Converts a raw ability string array into validated Ability[].
 * Returns { abilities, invalid } where `invalid` lists unmapped strings.
 */
function validateAbilities(raw: readonly string[]): {
  readonly abilities: Ability[];
  readonly invalid: readonly string[];
} {
  const abilities: Ability[] = [];
  const invalid: string[] = [];

  for (const rawAbility of raw) {
    const upper = rawAbility.toUpperCase();
    if (isAbility(upper)) {
      abilities.push(upper);
    } else {
      invalid.push(rawAbility);
    }
  }

  return { abilities, invalid };
}

/**
 * Extracts narrative content from the resolved record's remaining fields.
 * Preserves narrative content as safe render nodes.
 */
function extractContent(remaining: Record<string, unknown>): RenderNode[] {
  const content: RenderNode[] = [];

  const entries = remaining.entries;
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (e.type === "paragraph" && typeof e.text === "string") {
        content.push({ type: "paragraph", text: e.text });
      } else if (e.type === "heading" && typeof e.text === "string") {
        const level = e.level;
        if (level === 2 || level === 3 || level === 4) {
          content.push({ type: "heading", level: level as 2 | 3 | 4, text: e.text });
        }
      } else if (e.type === "list" && Array.isArray(e.items)) {
        content.push({ type: "list", ordered: false, items: [] });
      } else {
        content.push({ type: "note", text: String(e.text ?? "") });
      }
    }
  }

  const description = remaining.description;
  if (typeof description === "string" && description.length > 0) {
    content.push({ type: "paragraph", text: description });
  }

  return content;
}

/**
 * Creates saving throw proficiency effects from validated abilities.
 */
function createSavingThrowEffects(
  abilities: Ability[],
  entityId: string,
  sourceId: string,
): RuleEffect[] {
  const effects: RuleEffect[] = [];

  const metadata = createRuleEffectMetadata(
    "full",
    createEffectPresentation("proficiencies", []),
    createEffectOrigin(createEntityId(entityId), createSourceId(sourceId), "structured"),
  );

  for (const ability of abilities) {
    effects.push(
      createAddProficiencyEffect(metadata, createProficiencySavingThrowRef(ability)),
    );
  }

  return effects;
}

type SingleResult =
  | { readonly ok: true; readonly classRule: ClassRule; readonly diagnostics: readonly ClassNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly ClassNormalizerDiagnostic[] };

function normalizeSingleClass(
  entry: IndexedClassEntry,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: ClassNormalizerDiagnostic[] = [];

  // 1. Subclass exclusion — only process top-level classes
  if (entry.isSubclass) {
    diagnostics.push(makeDiagnostic(
      "SUBCLASS_EXCLUDED",
      `Class "${entry.name}" is a subclass and excluded from class normalization.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Forward diagnostics from index loader
  for (const diag of entry.diagnostics) {
    const code = diag.code as ClassNormalizerDiagnosticCode;
    if (code === "EXCLUDED_SOURCE" || code === "INVALID_SOURCE" || code === "UNKNOWN_SOURCE") {
      diagnostics.push(makeDiagnostic(
        code,
        diag.message,
        entry.name,
        opts,
        diag.source,
      ));
      return { ok: false, diagnostics: Object.freeze(diagnostics) };
    }
    if (code === "MISSING_HIT_DIE" || code === "INVALID_HIT_DIE" ||
        code === "MISSING_PRIMARY_ABILITIES" || code === "MISSING_SAVING_THROW_PROFICIENCIES" ||
        code === "INVALID_CANONICAL_ID") {
      diagnostics.push(makeDiagnostic(
        code,
        diag.message,
        entry.name,
        opts,
        diag.source,
      ));
    }
  }

  // 3. Validate hit die
  const hitDie = entry.hitDie;
  if (hitDie === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_HIT_DIE",
      `Class "${entry.name}" is missing a valid hitdie field.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 4. Validate primary abilities
  const { abilities: primaryAbilities, invalid: invalidPrimary } = validateAbilities(entry.primaryAbilities);
  if (primaryAbilities.length === 0) {
    diagnostics.push(makeDiagnostic(
      "MISSING_PRIMARY_ABILITIES",
      `Class "${entry.name}" has no valid primary ability scores.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }
  if (invalidPrimary.length > 0) {
    diagnostics.push(makeDiagnostic(
      "INVALID_PRIMARY_ABILITY",
      `Class "${entry.name}" has invalid primary abilities: ${invalidPrimary.join(", ")}.`,
      entry.name,
      opts,
      entry.source,
    ));
  }

  // 5. Validate saving throw proficiencies
  const { abilities: savingThrowAbilities, invalid: invalidSaving } = validateAbilities(entry.savingThrowProficiencies);
  if (savingThrowAbilities.length === 0) {
    diagnostics.push(makeDiagnostic(
      "MISSING_SAVING_THROW_PROFICIENCIES",
      `Class "${entry.name}" has no valid saving throw proficiencies.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }
  if (invalidSaving.length > 0) {
    diagnostics.push(makeDiagnostic(
      "INVALID_SAVING_THROW_ABILITY",
      `Class "${entry.name}" has invalid saving throw abilities: ${invalidSaving.join(", ")}.`,
      entry.name,
      opts,
      entry.source,
    ));
  }

  // 6. Extract narrative content
  const content = extractContent(entry.record.remaining);

  // 7. Create saving throw proficiency effects
  const effects = createSavingThrowEffects(
    savingThrowAbilities,
    entry.id,
    entry.sourceId,
  );

  // 8. Assemble ClassRule
  const classRule = Object.freeze(createClassRule(
    createEntityId(entry.id),
    entry.name,
    createSourceId(entry.sourceId),
    entry.ruleset,
    "core", // access (PHB/XPHB are core)
    hitDie,
    primaryAbilities,
    savingThrowAbilities,
    [], // startingChoices (deferred to P4-T010)
    {}, // levels (deferred to P4-T010)
    [], // subclassIds (populated after subclass normalization)
    content,
    [], // prerequisites (deferred)
    effects,
    [], // choices (deferred)
    [], // dependencies (deferred)
    false, // legacy
  ));

  return { ok: true, classRule, diagnostics: Object.freeze(diagnostics) };
}

/* ── Public normalizer ─────────────────────────────────────────── */

export function normalizeClasses(input: ClassNormalizerInput): ClassNormalizerResult {
  const classes: ClassRule[] = [];
  const diagnostics: ClassNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.entries.length; i++) {
    const entry = input.entries[i];
    if (entry === undefined) continue;

    const result = normalizeSingleClass(entry, {
      sourcePath: undefined,
      entityKind: "class",
      recordIndex: i,
    });

    if (result.ok) {
      classes.push(result.classRule);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    classes: Object.freeze(classes),
    diagnostics: Object.freeze(diagnostics),
  });
}

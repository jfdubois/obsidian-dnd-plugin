import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary";
import type { CopyModRawRecord } from "./mod-types";
import type { ClassIndexDiagnostic, ClassIndexDiagnosticCode } from "./class-index-types";

/* ── Diagnostic builder ────────────────────────────────────────── */

export function makeDiagnostic(
  code: ClassIndexDiagnosticCode,
  message: string,
  recordName: string,
  opts: { sourcePath?: string; entityKind?: string; recordIndex?: number },
  source?: string,
): ClassIndexDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "UNKNOWN_SOURCE",
    "COPY_RESOLUTION_FAILED",
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

/* ── Subclass detection ────────────────────────────────────────── */

export function isSubclassRecord(record: CopyModRawRecord): boolean {
  const remaining = record.remaining;
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return true;
  }
  return false;
}

export function extractParentId(record: CopyModRawRecord): string | undefined {
  const remaining = record.remaining;
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return parent;
  }
  return undefined;
}

/* ── Field extractors ──────────────────────────────────────────── */

/**
 * Extracts hit die faces from 5eTools source shapes.
 *
 * Pinned source (3c5d9d3) uses: hd: { number, faces }
 * Legacy fallback: hitdie: number (for test fixtures)
 */
export function extractHitDie(remaining: Record<string, unknown>): number | undefined {
  // 1. Try pinned source shape: hd: { number, faces }
  const hd = remaining.hd;
  if (typeof hd === "object" && hd !== null && !Array.isArray(hd)) {
    const hdObj = hd as Record<string, unknown>;
    const faces = hdObj.faces;
    if (typeof faces === "number" && Number.isInteger(faces) && faces > 0) {
      return faces;
    }
  }

  // 2. Fallback: legacy hitdie: number (for test fixtures)
  const hitDie = remaining.hitdie;
  if (typeof hitDie === "number" && Number.isInteger(hitDie) && hitDie > 0) {
    return hitDie;
  }

  return undefined;
}

/**
 * Extracts primary abilities for 2014 ruleset.
 *
 * 2014 (PHB) classes use `proficiency: ["str", "con"]` as saving throw proficiencies.
 * Primary abilities are derived from the same `proficiency` array.
 */
export function extractPrimaryAbilities2014(remaining: Record<string, unknown>): readonly string[] {
  const proficiency = remaining.proficiency;
  if (Array.isArray(proficiency)) {
    return Object.freeze(
      proficiency
        .filter((v) => typeof v === "string" && v.length > 0)
        .map((v) => (v as string).toUpperCase()) as string[],
    );
  }
  return Object.freeze([]);
}

/**
 * Extracts primary abilities for 2024 ruleset.
 *
 * 2024 (XPHB) classes use `primaryAbility: [{ "str": true, "cha": true }]`
 * where each object has ability keys set to true.
 */
export function extractPrimaryAbilities2024(remaining: Record<string, unknown>): readonly string[] {
  const primaryAbility = remaining.primaryAbility;
  if (!Array.isArray(primaryAbility)) {
    return Object.freeze([]);
  }

  const abilities: string[] = [];
  for (const entry of primaryAbility) {
    if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
      for (const key of Object.keys(entry)) {
        const upper = key.toUpperCase();
        if (upper === "STR" || upper === "DEX" || upper === "CON" || upper === "INT" || upper === "WIS" || upper === "CHA") {
          if (!abilities.includes(upper)) {
            abilities.push(upper);
          }
        }
      }
    }
  }

  return Object.freeze(abilities);
}

/**
 * Extracts saving throw proficiencies for 2014 ruleset.
 *
 * 2014 (PHB) classes use `proficiency: ["str", "con"]` as saving throw proficiencies.
 */
export function extractSavingThrows2014(remaining: Record<string, unknown>): readonly string[] {
  const proficiency = remaining.proficiency;
  if (Array.isArray(proficiency)) {
    return Object.freeze(
      proficiency
        .filter((v) => typeof v === "string" && v.length > 0)
        .map((v) => (v as string).toUpperCase()) as string[],
    );
  }
  return Object.freeze([]);
}

/**
 * Extracts saving throw proficiencies for 2024 ruleset.
 *
 * 2024 (XPHB) classes use `proficiencies` array with entries like:
 * { name: "Athletics", type: "saving_throw", ability: "str" }
 */
export function extractSavingThrows2024(remaining: Record<string, unknown>): readonly string[] {
  const proficiencies = remaining.proficiencies;
  if (!Array.isArray(proficiencies)) {
    return Object.freeze([]);
  }

  const abilities: string[] = [];
  for (const entry of proficiencies) {
    if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
      const prof = entry as Record<string, unknown>;
      if (prof.type === "saving_throw") {
        const ability = prof.ability;
        if (typeof ability === "string" && ability.length > 0) {
          const upper = ability.toUpperCase();
          if (!abilities.includes(upper)) {
            abilities.push(upper);
          }
        }
      }
    }
  }

  return Object.freeze(abilities);
}

/**
 * Legacy helper: extracts a string array from a named field.
 * Kept for backward compatibility with test fixtures.
 */
export function extractAbilityArray(remaining: Record<string, unknown>, field: string): readonly string[] {
  const value = remaining[field];
  if (Array.isArray(value)) {
    return Object.freeze(value.filter((v) => typeof v === "string" && v.length > 0) as string[]);
  }
  return Object.freeze([]);
}

/* ── Record collection ─────────────────────────────────────────── */

export interface CollectedClassRecord {
  readonly record: RawRecord;
  readonly sourcePath: string;
  readonly entityKind: string;
  readonly recordIndex: number;
}

export function collectClassRecords(
  validatedFiles: Record<string, ValidatedFileEnvelope>,
  entityKind: string,
): readonly CollectedClassRecord[] {
  const results: CollectedClassRecord[] = [];

  for (const [filePath, envelope] of Object.entries(validatedFiles)) {
    for (const collection of envelope.collections) {
      if (collection.entityKind !== entityKind) continue;

      for (let i = 0; i < collection.records.length; i++) {
        const record = collection.records[i];
        if (record === undefined) continue;
        results.push({
          record,
          sourcePath: filePath,
          entityKind: collection.entityKind,
          recordIndex: i,
        });
      }
    }
  }

  return Object.freeze(results);
}

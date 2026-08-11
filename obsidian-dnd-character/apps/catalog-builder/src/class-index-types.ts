import type { CopyModRawRecord } from "./mod-types";

/* ── Diagnostic types ──────────────────────────────────────────── */

export type ClassIndexDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "COPY_RESOLUTION_FAILED"
  | "INVALID_CANONICAL_ID"
  | "MISSING_HIT_DIE"
  | "INVALID_HIT_DIE"
  | "MISSING_PRIMARY_ABILITIES"
  | "MISSING_SAVING_THROW_PROFICIENCIES";

export interface ClassIndexDiagnostic {
  readonly code: ClassIndexDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

/* ── Indexed class entry ───────────────────────────────────────── */

export interface IndexedClassEntry {
  readonly id: string;
  readonly sourceId: string;
  readonly name: string;
  readonly source: string;
  readonly ruleset: "2014" | "2024";
  readonly record: CopyModRawRecord;
  readonly isSubclass: boolean;
  readonly parentId?: string;
  readonly hitDie?: number;
  readonly primaryAbilities: readonly string[];
  readonly savingThrowProficiencies: readonly string[];
  readonly startingArmorProficiencies: readonly string[];
  readonly startingWeaponProficiencies: readonly StartingWeaponProficiency[];
  readonly startingToolProficiencies: readonly StartingToolProficiency[];
  readonly startingSkillChoices: readonly StartingSkillChoice[];
  readonly startingEquipmentGrants: readonly StartingEquipmentGrant[];
  readonly startingEquipmentChoices: readonly StartingEquipmentChoice[];
  readonly startingGold: readonly StartingGoldEntry[];
  readonly levelOneFeatures: readonly LevelOneFeature[];
  readonly diagnostics: readonly ClassIndexDiagnostic[];
}

/* ── Starting proficiency shapes ─────────────────────────────── */

/** A fixed weapon category proficiency (simple, martial). */
export interface StartingWeaponProficiencyCategory {
  readonly type: "category";
  readonly category: string;
}

/** A weapon filter proficiency (category + required properties). */
export interface StartingWeaponProficiencyFilter {
  readonly type: "filter";
  readonly category: string;
  readonly requiredProperties: readonly string[];
}

export type StartingWeaponProficiency =
  | StartingWeaponProficiencyCategory
  | StartingWeaponProficiencyFilter;

/** A fixed tool proficiency by entity reference. */
export interface StartingToolProficiencyFixed {
  readonly type: "fixed";
  readonly toolRef: string;
}

/** A tool proficiency choice (pick N from a group like artisan-tool). */
export interface StartingToolProficiencyChoice {
  readonly type: "choice";
  readonly count: number;
  readonly group: string;
}

export type StartingToolProficiency =
  | StartingToolProficiencyFixed
  | StartingToolProficiencyChoice;

/** A skill proficiency choice (pick N from a list or any). */
export interface StartingSkillChoice {
  readonly count: number;
  /** Explicit skill list or empty for "any" */
  readonly from: readonly string[];
  readonly isAny: boolean;
}

/* ── Starting equipment shapes ───────────────────────────────── */

/** An automatic equipment grant (item reference, named item, or currency). */
export interface StartingEquipmentGrant {
  readonly type: "item" | "named-item" | "currency";
  readonly itemId?: string;
  readonly name?: string;
  readonly quantity?: number;
  /** For currency: denomination (cp, sp, ep, gp, pp) */
  readonly denomination?: string;
  /** For currency: fixed value or dice expression */
  readonly fixedValue?: number;
  readonly diceCount?: number;
  readonly diceSides?: number;
  readonly diceMultiplier?: number;
}

/** A closed-option equipment choice (pick one of A, B, C packages). */
export interface StartingEquipmentChoice {
  readonly count: number;
  readonly options: readonly StartingEquipmentOption[];
}

export interface StartingEquipmentOption {
  readonly label: string;
  readonly grants: readonly StartingEquipmentGrant[];
}

/* ── Starting gold shapes ────────────────────────────────────── */

export interface StartingGoldEntry {
  /** Fixed amount like 15 */
  readonly fixedValue?: number;
  /** Dice expression like 5d4 */
  readonly diceCount?: number;
  readonly diceSides?: number;
  /** Multiplier like × 10 */
  readonly diceMultiplier?: number;
  /** Denomination, default "gp" */
  readonly denomination: string;
}

/* ── Level-one feature shapes ────────────────────────────────── */

export interface LevelOneFeature {
  readonly name: string;
  /** If the feature is a known entity reference */
  readonly featureRef?: string;
}

/* ── Loader input / output ─────────────────────────────────────── */

import type { CopyResolverContext } from "./copy-resolver";
import type { ValidatedFileEnvelope } from "./raw-boundary";
import type { ClassSourceScopeContext } from "./class-source-scope";

export interface ClassIndexLoaderInput {
  readonly validatedFiles: Record<string, ValidatedFileEnvelope>;
  readonly copyResolverContext: CopyResolverContext;
  readonly sourceScopeContext: ClassSourceScopeContext;
  readonly entityKind: string;
}

export interface ClassIndexLoaderResult {
  readonly classes: readonly IndexedClassEntry[];
  readonly diagnostics: readonly ClassIndexDiagnostic[];
  readonly summary: {
    readonly totalRecords: number;
    readonly indexedClasses: number;
    readonly baseClasses: number;
    readonly subclasses: number;
    readonly excludedRecords: number;
    readonly resolutionFailures: number;
  };
}

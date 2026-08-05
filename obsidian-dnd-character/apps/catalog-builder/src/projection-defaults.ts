import type { RuleEffectType, SheetProjection, EffectPresentation } from "@obsidian-dnd/catalog-contract";
import { isRuleEffectType, isSheetProjection } from "@obsidian-dnd/catalog-contract";

/* ── Mechanic projection ────────────────────────────────────────── */

export interface MechanicProjection {
  readonly effectType: RuleEffectType;
  readonly primary: SheetProjection;
  readonly secondary: readonly SheetProjection[];
}

export function isMechanicProjection(value: unknown): value is MechanicProjection {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isRuleEffectType(obj.effectType)) return false;
  if (!isSheetProjection(obj.primary)) return false;
  if (!Array.isArray(obj.secondary)) return false;
  return obj.secondary.every((s: unknown) => isSheetProjection(s));
}

/* ── Diagnostic codes ───────────────────────────────────────────── */

export type ProjectionDiagnosticCode =
  | "UNKNOWN_EFFECT_TYPE"
  | "INVALID_PRIMARY_PROJECTION"
  | "INVALID_SECONDARY_PROJECTION"
  | "DUPLICATE_PROJECTION";

/* ── Diagnostic ─────────────────────────────────────────────────── */

export interface ProjectionDiagnostic {
  readonly code: ProjectionDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly effectType?: RuleEffectType;
  readonly primaryProjection?: SheetProjection;
  readonly secondaryProjection?: SheetProjection;
}

/* ── Projection result ──────────────────────────────────────────── */

export interface ProjectionResult {
  readonly valid: boolean;
  readonly projection?: MechanicProjection;
  readonly diagnostics: readonly ProjectionDiagnostic[];
}

/* ── Default projections by effect type ─────────────────────────── */

const DEFAULT_PROJECTIONS_DATA: readonly MechanicProjection[] = Object.freeze([
  {
    effectType: "add-ability",
    primary: "abilities",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "set-ability",
    primary: "abilities",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-proficiency",
    primary: "proficiencies",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-expertise",
    primary: "proficiencies",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-language",
    primary: "proficiencies",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "set-movement",
    primary: "movement",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-movement",
    primary: "movement",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-sense",
    primary: "senses",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-resistance",
    primary: "defenses",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-immunity",
    primary: "defenses",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "conditional-roll-mode",
    primary: "saving-throws",
    secondary: ["skills"] as readonly SheetProjection[],
  },
  {
    effectType: "add-capability",
    primary: "features-and-traits",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "set-ac-formula",
    primary: "armor-class",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-ac",
    primary: "armor-class",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "grant-spell",
    primary: "spellcasting",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "grant-resource",
    primary: "resources",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "grant-attack",
    primary: "attacks",
    secondary: ["actions"] as readonly SheetProjection[],
  },
  {
    effectType: "grant-feature",
    primary: "features-and-traits",
    secondary: [] as readonly SheetProjection[],
  },
  {
    effectType: "add-hit-point-increase",
    primary: "resources",
    secondary: [] as readonly SheetProjection[],
  },
]);

export const DEFAULT_PROJECTIONS: ReadonlyMap<RuleEffectType, MechanicProjection> = Object.freeze(
  new Map(DEFAULT_PROJECTIONS_DATA.map((p) => [p.effectType, p])),
);

/* ── Resolution ─────────────────────────────────────────────────── */

export function getDefaultProjection(effectType: RuleEffectType): MechanicProjection | undefined {
  return DEFAULT_PROJECTIONS.get(effectType);
}

export function createDefaultEffectPresentation(
  effectType: RuleEffectType,
): EffectPresentation | undefined {
  const projection = DEFAULT_PROJECTIONS.get(effectType);
  if (projection === undefined) return undefined;
  return {
    primary: projection.primary,
    secondary: [...projection.secondary],
  };
}

/* ── Validation ─────────────────────────────────────────────────── */

export function validateProjectionAssignment(
  effectType: RuleEffectType,
  primary: SheetProjection,
  secondary: readonly SheetProjection[],
): ProjectionResult {
  const diagnostics: ProjectionDiagnostic[] = [];

  if (!isRuleEffectType(effectType)) {
    diagnostics.push(Object.freeze({
      code: "UNKNOWN_EFFECT_TYPE",
      severity: "error",
      message: `Cannot assign projection for unknown effect type "${effectType}".`,
    }));
    return Object.freeze({
      valid: false,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  if (!isSheetProjection(primary)) {
    diagnostics.push(Object.freeze({
      code: "INVALID_PRIMARY_PROJECTION",
      severity: "error",
      message: `Invalid primary projection "${primary}" for effect type "${effectType}".`,
      effectType,
      primaryProjection: primary,
    }));
  }

  for (const s of secondary) {
    if (!isSheetProjection(s)) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SECONDARY_PROJECTION",
        severity: "error",
        message: `Invalid secondary projection "${s}" for effect type "${effectType}".`,
        effectType,
        secondaryProjection: s,
      }));
    }
  }

  const allProjections = [primary, ...secondary];
  const seen = new Set<string>();
  for (const p of allProjections) {
    if (seen.has(p)) {
      diagnostics.push(Object.freeze({
        code: "DUPLICATE_PROJECTION",
        severity: "warning",
        message: `Duplicate projection "${p}" assigned for effect type "${effectType}".`,
        effectType,
        primaryProjection: p === primary ? p : undefined,
        secondaryProjection: p === primary ? undefined : p,
      }));
    }
    seen.add(p);
  }

  const valid = diagnostics.length === 0;

  const projection: MechanicProjection = Object.freeze({
    effectType,
    primary,
    secondary: Object.freeze(secondary),
  });

  return Object.freeze({
    valid,
    projection,
    diagnostics: Object.freeze(diagnostics),
  });
}

/* ── Registry validation ────────────────────────────────────────── */

export function validateDefaultProjections(): readonly ProjectionDiagnostic[] {
  const diagnostics: ProjectionDiagnostic[] = [];

  for (const projection of DEFAULT_PROJECTIONS_DATA) {
    const result = validateProjectionAssignment(
      projection.effectType,
      projection.primary,
      projection.secondary,
    );
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze(diagnostics);
}

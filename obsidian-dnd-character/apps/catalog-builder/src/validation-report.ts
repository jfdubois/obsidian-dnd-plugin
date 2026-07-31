import type {
  Ruleset,
  ContentAccess,
  EntityId,
  RuleEntityKind,
} from "@obsidian-dnd/domain";
import type {
  CatalogEntitySummary,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type {
  NormalizedEntity,
  ReferenceLink,
} from "./reference-resolver";

/* ── Diagnostic type ───────────────────────────────────────────── */

export interface Diagnostic {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly entityId?: EntityId;
  readonly entityKind?: RuleEntityKind;
}

/* ── Unresolved reference type ─────────────────────────────────── */

export interface UnresolvedReference {
  readonly fromId: string;
  readonly toId: string;
  readonly referenceKind: string;
}

/* ── Input type ────────────────────────────────────────────────── */

export interface ValidationReportInput {
  readonly entities: readonly NormalizedEntity[];
  readonly summaries: readonly CatalogEntitySummary[];
  readonly referenceLinks: readonly ReferenceLink[];
}

/* ── Validation report type ────────────────────────────────────── */

export interface ValidationReport {
  readonly valid: boolean;
  readonly duplicateIds: readonly string[];
  readonly unresolvedReferences: readonly UnresolvedReference[];
  readonly rulesetCoverage: readonly { readonly ruleset: Ruleset; readonly entityCount: number }[];
  readonly accessClassification: readonly { readonly access: ContentAccess; readonly entityCount: number }[];
  readonly effectsWithoutAutomation: number;
  readonly effectsWithoutProvenance: number;
  readonly unmappedNarrativeCount: number;
  readonly diagnostics: readonly Diagnostic[];
}

/* ── Helpers ───────────────────────────────────────────────────── */

function hasEffects(entity: NormalizedEntity): boolean {
  return "effects" in entity && Array.isArray((entity as NormalizedEntity & { effects: unknown }).effects) && (entity as NormalizedEntity & { effects: RuleEffect[] }).effects.length > 0;
}

function hasContent(entity: NormalizedEntity): boolean {
  return "content" in entity && Array.isArray((entity as NormalizedEntity & { content: unknown }).content) && (entity as NormalizedEntity & { content: unknown[] }).content.length > 0;
}

function getEffects(entity: NormalizedEntity): RuleEffect[] {
  if ("effects" in entity && Array.isArray((entity as NormalizedEntity & { effects: unknown }).effects)) {
    return (entity as NormalizedEntity & { effects: RuleEffect[] }).effects;
  }
  return [];
}

/* ── Build validation report ───────────────────────────────────── */

/**
 * Build a validation report from normalized entities, compact index
 * summaries, and resolved reference links. The report is frozen and
 * deterministic for a given input.
 */
export function buildValidationReport(input: ValidationReportInput): ValidationReport {
  const { entities, summaries, referenceLinks } = input;
  const diagnostics: Diagnostic[] = [];

  /* ── Duplicate ID detection ──────────────────────────────────── */
  const idSet = new Set<string>();
  const duplicateIds: string[] = [];

  for (const summary of summaries) {
    const idStr = summary.id;
    if (idSet.has(idStr)) {
      if (!duplicateIds.includes(idStr)) {
        duplicateIds.push(idStr);
      }
    } else {
      idSet.add(idStr);
    }
  }

  /* ── Unresolved references ───────────────────────────────────── */
  const unresolvedReferences: UnresolvedReference[] = [];
  for (const link of referenceLinks) {
    if (!link.resolved) {
      unresolvedReferences.push(Object.freeze({
        fromId: link.sourceId,
        toId: link.targetId,
        referenceKind: link.field,
      }));
    }
  }

  /* ── Ruleset coverage ────────────────────────────────────────── */
  const rulesetMap = new Map<Ruleset, number>();
  for (const summary of summaries) {
    const count = rulesetMap.get(summary.ruleset) ?? 0;
    rulesetMap.set(summary.ruleset, count + 1);
  }
  const rulesetCoverage: Array<{ readonly ruleset: Ruleset; readonly entityCount: number }> = [];
  for (const [ruleset, count] of rulesetMap) {
    rulesetCoverage.push(Object.freeze({ ruleset, entityCount: count }));
  }

  /* ── Access classification ───────────────────────────────────── */
  const accessMap = new Map<ContentAccess, number>();
  for (const summary of summaries) {
    const count = accessMap.get(summary.access) ?? 0;
    accessMap.set(summary.access, count + 1);
  }
  const accessClassification: Array<{ readonly access: ContentAccess; readonly entityCount: number }> = [];
  for (const [access, count] of accessMap) {
    accessClassification.push(Object.freeze({ access, entityCount: count }));
  }

  /* ── Effect completeness checks ──────────────────────────────── */
  let effectsWithoutAutomation = 0;
  let effectsWithoutProvenance = 0;
  let unmappedNarrativeCount = 0;

  for (const entity of entities) {
    const effects = getEffects(entity);

    /* Check each effect for automation status and provenance */
    for (const effect of effects) {
      /* automationStatus is required on RuleEffectMetadata */
      if (!effect.automationStatus) {
        effectsWithoutAutomation++;
      }

      /* origin is required on RuleEffectMetadata; provenance = origin exists */
      if (!effect.origin || !effect.origin.entityId || !effect.origin.sourceId) {
        effectsWithoutProvenance++;
      }
    }

    /* Unmapped narrative: entity has content but no effects */
    if (hasContent(entity) && !hasEffects(entity)) {
      unmappedNarrativeCount++;
      diagnostics.push(Object.freeze({
        code: "UNMAPPED_NARRATIVE",
        severity: "warning",
        message: `Entity "${entity.name}" has narrative content but no mechanical effects.`,
        entityId: entity.id,
        entityKind: entity.kind,
      }));
    }
  }

  /* ── Determine overall validity ──────────────────────────────── */
  const valid = duplicateIds.length === 0 && unresolvedReferences.length === 0;

  return Object.freeze({
    valid,
    duplicateIds: Object.freeze(duplicateIds),
    unresolvedReferences: Object.freeze(unresolvedReferences),
    rulesetCoverage: Object.freeze(rulesetCoverage),
    accessClassification: Object.freeze(accessClassification),
    effectsWithoutAutomation,
    effectsWithoutProvenance,
    unmappedNarrativeCount,
    diagnostics: Object.freeze(diagnostics),
  });
}

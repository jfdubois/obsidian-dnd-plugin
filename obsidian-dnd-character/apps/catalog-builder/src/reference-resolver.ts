import type { EntityId, RuleEntityKind } from "@obsidian-dnd/domain";
import type {
  SpeciesRule,
  BackgroundRule,
  ClassRule,
  SubclassRule,
  ClassFeatureRule,
  SubclassFeatureRule,
  FeatRule,
  SpellRule,
  ItemRule,
  OptionalFeatureRule,
  SkillRule,
  LanguageRule,
} from "@obsidian-dnd/catalog-contract";
import {
  isSpeciesRule,
  isBackgroundRule,
  isClassRule,
  isSubclassRule,
  isClassFeatureRule,
  isSubclassFeatureRule,
  extractSpeciesReferences,
  extractBackgroundReferences,
  extractClassReferences,
  extractSubclassReferences,
  extractClassFeatureReferences,
  extractSubclassFeatureReferences,
} from "./reference-resolver-extractors";

/* ── Normalized entity union ────────────────────────────────────── */

export type NormalizedEntity =
  | SpeciesRule
  | BackgroundRule
  | ClassRule
  | SubclassRule
  | ClassFeatureRule
  | SubclassFeatureRule
  | FeatRule
  | SpellRule
  | ItemRule
  | OptionalFeatureRule
  | SkillRule
  | LanguageRule;

/* ── Reference link ─────────────────────────────────────────────── */

export interface ReferenceLink {
  readonly sourceId: EntityId;
  readonly sourceKind: RuleEntityKind;
  readonly sourceName: string;
  readonly field: string;
  readonly targetId: EntityId;
  readonly resolved: boolean;
}

/* ── Diagnostic types ──────────────────────────────────────────── */

export type RefResolverDiagnosticCode =
  | "BROKEN_DEPENDENCY_REF"
  | "BROKEN_PREREQUISITE_REF"
  | "BROKEN_PARENT_REF"
  | "BROKEN_FEATURE_REF"
  | "BROKEN_SUBCLASS_REF"
  | "BROKEN_LANGUAGE_REF"
  | "BROKEN_SKILL_REF"
  | "BROKEN_BACKGROUND_FEATURE_REF";

export interface RefResolverDiagnostic {
  readonly code: RefResolverDiagnosticCode;
  readonly severity: "warning";
  readonly message: string;
  readonly sourceId: EntityId;
  readonly sourceKind: RuleEntityKind;
  readonly sourceName: string;
  readonly field: string;
  readonly missingId: EntityId;
}

/* ── Input / Output types ──────────────────────────────────────── */

export interface ReferenceResolverInput {
  readonly entities: readonly NormalizedEntity[];
}

export interface ReferenceResolverResult {
  readonly links: readonly ReferenceLink[];
  readonly diagnostics: readonly RefResolverDiagnostic[];
}

/* ── Internal helpers ──────────────────────────────────────────── */

function makeDiagnostic(
  code: RefResolverDiagnosticCode,
  message: string,
  sourceId: EntityId,
  sourceKind: RuleEntityKind,
  sourceName: string,
  field: string,
  missingId: EntityId,
): RefResolverDiagnostic {
  return Object.freeze({
    code,
    severity: "warning",
    message,
    sourceId,
    sourceKind,
    sourceName,
    field,
    missingId,
  });
}

function makeLink(
  sourceId: EntityId,
  sourceKind: RuleEntityKind,
  sourceName: string,
  field: string,
  targetId: EntityId,
  resolved: boolean,
): ReferenceLink {
  return Object.freeze({
    sourceId,
    sourceKind,
    sourceName,
    field,
    targetId,
    resolved,
  });
}

/* ── Main resolver ──────────────────────────────────────────────── */

export function resolveReferences(
  input: ReferenceResolverInput,
): ReferenceResolverResult {
  const entities = input.entities;

  if (entities.length === 0) {
    return Object.freeze({
      links: Object.freeze([]),
      diagnostics: Object.freeze([]),
    });
  }

  // Build entity index: entityId -> entity
  const entityIndex = new Map<string, NormalizedEntity>();
  for (const entity of entities) {
    entityIndex.set(entity.id, entity);
  }

  const links: ReferenceLink[] = [];
  const diagnostics: RefResolverDiagnostic[] = [];
  const seenLinks = new Set<string>();

  function addLinkOrDiagnostic(
    sourceId: EntityId,
    sourceKind: RuleEntityKind,
    sourceName: string,
    field: string,
    targetId: EntityId,
    code: RefResolverDiagnosticCode,
  ): void {
    const linkKey = `${sourceId}::${field}::${targetId}`;
    if (seenLinks.has(linkKey)) return;
    seenLinks.add(linkKey);

    const target = entityIndex.get(targetId);
    if (target === undefined) {
      diagnostics.push(makeDiagnostic(
        code,
        `${sourceName} references "${targetId}" in field "${field}" which does not exist in the entity set.`,
        sourceId,
        sourceKind,
        sourceName,
        field,
        targetId,
      ));
    } else {
      links.push(makeLink(
        sourceId,
        sourceKind,
        sourceName,
        field,
        targetId,
        true,
      ));
    }
  }

  for (const entity of entities) {
    const sourceId = entity.id;
    const sourceKind = entity.kind;
    const sourceName = entity.name;

    // ── Common fields: dependencies ──────────────────────────────
    if ("dependencies" in entity && Array.isArray(entity.dependencies)) {
      for (const depId of entity.dependencies) {
        addLinkOrDiagnostic(
          sourceId, sourceKind, sourceName,
          "dependencies", depId,
          "BROKEN_DEPENDENCY_REF",
        );
      }
    }

    // ── Common fields: entity-selection prerequisites ────────────
    if ("prerequisites" in entity && Array.isArray(entity.prerequisites)) {
      for (const prereq of entity.prerequisites) {
        if (prereq.type !== "entity-selection") continue;
        addLinkOrDiagnostic(
          sourceId, sourceKind, sourceName,
          "prerequisites[].entityId", prereq.entityId,
          "BROKEN_PREREQUISITE_REF",
        );
      }
    }

    // ── Entity-specific fields ───────────────────────────────────
    if (isSpeciesRule(entity)) {
      for (const ref of extractSpeciesReferences(entity)) {
        addLinkOrDiagnostic(sourceId, sourceKind, sourceName, ref.field, ref.targetId, "BROKEN_LANGUAGE_REF");
      }
    }
    if (isBackgroundRule(entity)) {
      for (const ref of extractBackgroundReferences(entity)) {
        const code = ref.field === "featureId" ? "BROKEN_BACKGROUND_FEATURE_REF" : "BROKEN_SKILL_REF";
        addLinkOrDiagnostic(sourceId, sourceKind, sourceName, ref.field, ref.targetId, code);
      }
    }
    if (isClassRule(entity)) {
      for (const ref of extractClassReferences(entity)) {
        const code = ref.field === "subclassIds" ? "BROKEN_SUBCLASS_REF" : "BROKEN_FEATURE_REF";
        addLinkOrDiagnostic(sourceId, sourceKind, sourceName, ref.field, ref.targetId, code);
      }
    }
    if (isSubclassRule(entity)) {
      for (const ref of extractSubclassReferences(entity)) {
        const code = ref.field === "parentId" ? "BROKEN_PARENT_REF" : "BROKEN_FEATURE_REF";
        addLinkOrDiagnostic(sourceId, sourceKind, sourceName, ref.field, ref.targetId, code);
      }
    }
    if (isClassFeatureRule(entity)) {
      for (const ref of extractClassFeatureReferences(entity)) {
        addLinkOrDiagnostic(sourceId, sourceKind, sourceName, ref.field, ref.targetId, "BROKEN_PARENT_REF");
      }
    }
    if (isSubclassFeatureRule(entity)) {
      for (const ref of extractSubclassFeatureReferences(entity)) {
        addLinkOrDiagnostic(sourceId, sourceKind, sourceName, ref.field, ref.targetId, "BROKEN_PARENT_REF");
      }
    }
  }

  // Sort links for determinism
  links.sort((a, b) => {
    const sourceDiff = a.sourceId.localeCompare(b.sourceId);
    if (sourceDiff !== 0) return sourceDiff;
    const fieldDiff = a.field.localeCompare(b.field);
    if (fieldDiff !== 0) return fieldDiff;
    return a.targetId.localeCompare(b.targetId);
  });

  // Sort diagnostics for determinism
  diagnostics.sort((a, b) => {
    const codeDiff = a.code.localeCompare(b.code);
    if (codeDiff !== 0) return codeDiff;
    const sourceDiff = a.sourceId.localeCompare(b.sourceId);
    if (sourceDiff !== 0) return sourceDiff;
    const fieldDiff = a.field.localeCompare(b.field);
    if (fieldDiff !== 0) return fieldDiff;
    return a.missingId.localeCompare(b.missingId);
  });

  return Object.freeze({
    links: Object.freeze(links),
    diagnostics: Object.freeze(diagnostics),
  });
}

import type {
  CatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";
import { createCatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import type {
  EntityId,
  RuleEntityKind,
} from "@obsidian-dnd/domain";
import {
  generateTags,
  type CatalogableEntity,
} from "./compact-index-tag-generator";

/* Re-export */
export type { CatalogableEntity } from "./compact-index-tag-generator";

/* ── Diagnostic types ──────────────────────────────────────────── */

export type CompactIndexDiagnosticCode =
  | "MISSING_ENTITY_NAME"
  | "MISSING_ENTITY_ID"
  | "INVALID_ENTITY_KIND"
  | "MISSING_REQUIRED_FIELD"
  | "DUPLICATE_ENTITY_ID";

export interface CompactIndexDiagnostic {
  readonly code: CompactIndexDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly entityId?: EntityId;
  readonly entityKind?: RuleEntityKind;
  readonly fieldName?: string;
}

/* ── Result types ──────────────────────────────────────────────── */

export interface CatalogIndexResult {
  readonly kind: RuleEntityKind;
  readonly summaries: readonly CatalogEntitySummary[];
  readonly count: number;
}

export interface CompactIndexResult {
  readonly index: readonly CatalogIndexResult[];
  readonly totalEntities: number;
  readonly totalKinds: number;
  readonly diagnostics: readonly CompactIndexDiagnostic[];
}

/* ── Detail path builder ───────────────────────────────────────── */

/**
 * Build the canonical detail path for an entity.
 * Format: entities/{kind}/{canonical-id}.json
 */
export function buildDetailPath(kind: RuleEntityKind, id: EntityId): string {
  return `entities/${kind}/${id}.json`;
}

/* ── Entity to summary conversion ──────────────────────────────── */

/**
 * Convert a single catalogable entity to a CatalogEntitySummary.
 * Returns undefined if the entity is missing required fields.
 */
export function entityToSummary(
  entity: CatalogableEntity,
  diagnostics: CompactIndexDiagnostic[],
): CatalogEntitySummary | undefined {
  // Validate required fields
  if (!entity.id) {
    diagnostics.push(Object.freeze({
      code: "MISSING_ENTITY_ID",
      severity: "error",
      message: `Entity "${entity.name ?? "unknown"}" is missing a required id field.`,
      entityKind: entity.kind,
      fieldName: "id",
    }));
    return undefined;
  }

  if (!entity.name || entity.name.length === 0) {
    diagnostics.push(Object.freeze({
      code: "MISSING_ENTITY_NAME",
      severity: "error",
      message: `Entity "${entity.id}" is missing a required name field.`,
      entityId: entity.id,
      entityKind: entity.kind,
      fieldName: "name",
    }));
    return undefined;
  }

  const tags = generateTags(entity);
  const detailPath = buildDetailPath(entity.kind, entity.id);
  // SkillRule and LanguageRule do not carry a `legacy` flag;
  // default to false for those kinds.
  const legacy = "legacy" in entity ? entity.legacy : false;

  return createCatalogEntitySummary({
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    sourceId: entity.sourceId,
    ruleset: entity.ruleset,
    access: entity.access,
    legacy,
    tags,
    detailPath,
  });
}

/* ── Compact index builder ─────────────────────────────────────── */

/**
 * Build a compact index from a collection of normalized catalogable entities.
 * Groups entities by kind, generates entity-specific tags, sorts
 * summaries within each kind by name (case-insensitive), sorts kind
 * groups alphabetically, and freezes the output.
 */
export function buildCompactIndex(
  entities: readonly CatalogableEntity[],
): CompactIndexResult {
  const diagnostics: CompactIndexDiagnostic[] = [];
  const kindGroups = new Map<RuleEntityKind, CatalogEntitySummary[]>();
  const seenIds = new Set<string>();

  for (const entity of entities) {
    const summary = entityToSummary(entity, diagnostics);
    if (summary === undefined) {
      continue;
    }

    // Deduplicate by canonical ID – keep first occurrence, skip rest
    if (seenIds.has(summary.id)) {
      diagnostics.push(Object.freeze({
        code: "DUPLICATE_ENTITY_ID",
        severity: "warning",
        message: `Duplicate entity ID "${summary.id}" (${entity.kind}) – skipping.`,
        entityId: entity.id,
        entityKind: entity.kind,
      }));
      continue;
    }
    seenIds.add(summary.id);

    const kind = entity.kind;
    if (!kindGroups.has(kind)) {
      kindGroups.set(kind, []);
    }
    kindGroups.get(kind)!.push(summary);
  }

  // Sort summaries within each kind by name (case-insensitive)
  const sortedGroups = new Map<RuleEntityKind, CatalogEntitySummary[]>();
  for (const [kind, summaries] of kindGroups) {
    const sorted = [...summaries].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "accent" }),
    );
    sortedGroups.set(kind, sorted);
  }

  // Sort kind groups alphabetically
  const sortedKinds = [...sortedGroups.keys()].sort();

  // Build catalog index results
  const index: CatalogIndexResult[] = sortedKinds.map((kind) => {
    const summaries = sortedGroups.get(kind)!;
    return Object.freeze({
      kind,
      summaries: Object.freeze(summaries),
      count: summaries.length,
    });
  });

  return Object.freeze({
    index: Object.freeze(index),
    totalEntities: entities.length,
    totalKinds: index.length,
    diagnostics: Object.freeze(diagnostics),
  });
}

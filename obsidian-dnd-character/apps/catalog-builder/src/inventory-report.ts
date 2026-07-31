import type {
  Ruleset,
  ContentAccess,
  SourceId,
  RuleEntityKind,
} from "@obsidian-dnd/domain";
import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";

/* ── Input type ────────────────────────────────────────────────── */

export interface InventoryReportInput {
  readonly summaries: readonly CatalogEntitySummary[];
}

/* ── Inventory report type ─────────────────────────────────────── */

export interface InventoryReport {
  readonly totalEntities: number;
  readonly byKind: readonly { readonly kind: RuleEntityKind; readonly count: number }[];
  readonly byRuleset: readonly { readonly ruleset: Ruleset; readonly count: number }[];
  readonly byAccess: readonly { readonly access: ContentAccess; readonly count: number }[];
  readonly sourcesUsed: readonly SourceId[];
  readonly generatedAt: string;
}

/* ── Build inventory report ────────────────────────────────────── */

/**
 * Build an inventory report from compact index summaries.
 * The report is frozen and deterministic except for the
 * `generatedAt` timestamp.
 */
export function buildInventoryReport(input: InventoryReportInput): InventoryReport {
  const { summaries } = input;

  /* ── Entity counts by kind ───────────────────────────────────── */
  const kindMap = new Map<RuleEntityKind, number>();
  for (const summary of summaries) {
    const count = kindMap.get(summary.kind) ?? 0;
    kindMap.set(summary.kind, count + 1);
  }
  const byKind: Array<{ readonly kind: RuleEntityKind; readonly count: number }> = [];
  for (const [kind, count] of kindMap) {
    byKind.push(Object.freeze({ kind, count }));
  }

  /* ── Entity counts by ruleset ────────────────────────────────── */
  const rulesetMap = new Map<Ruleset, number>();
  for (const summary of summaries) {
    const count = rulesetMap.get(summary.ruleset) ?? 0;
    rulesetMap.set(summary.ruleset, count + 1);
  }
  const byRuleset: Array<{ readonly ruleset: Ruleset; readonly count: number }> = [];
  for (const [ruleset, count] of rulesetMap) {
    byRuleset.push(Object.freeze({ ruleset, count }));
  }

  /* ── Entity counts by access level ───────────────────────────── */
  const accessMap = new Map<ContentAccess, number>();
  for (const summary of summaries) {
    const count = accessMap.get(summary.access) ?? 0;
    accessMap.set(summary.access, count + 1);
  }
  const byAccess: Array<{ readonly access: ContentAccess; readonly count: number }> = [];
  for (const [access, count] of accessMap) {
    byAccess.push(Object.freeze({ access, count }));
  }

  /* ── Unique sources used ─────────────────────────────────────── */
  const sourceSet = new Set<SourceId>();
  for (const summary of summaries) {
    sourceSet.add(summary.sourceId);
  }
  const sourcesUsed: SourceId[] = [...sourceSet].sort();

  return Object.freeze({
    totalEntities: summaries.length,
    byKind: Object.freeze(byKind),
    byRuleset: Object.freeze(byRuleset),
    byAccess: Object.freeze(byAccess),
    sourcesUsed: Object.freeze(sourcesUsed),
    generatedAt: new Date().toISOString(),
  });
}

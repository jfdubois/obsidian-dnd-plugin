import type { CopyModRawRecord } from "./mod-types";
import { classifyItemSourceScope, type ItemSourceScopeContext } from "./item-source-scope";
import { classifyRecordAccess } from "./record-access-classifier";
import { classifyRecordRuleset } from "./ruleset-classifier";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createItemRule, type ItemRule } from "@obsidian-dnd/catalog-contract";
import {
  extractItemContent,
  extractItemPage,
  extractItemSummary,
  extractItemCategory,
  extractItemRarity,
  extractItemCost,
  extractItemWeight,
  extractItemBodySlot,
  extractItemProperties,
  extractRequiresAttunement,
} from "./item-normalizer-extractors";
import { extractItemEquipmentGroups } from "./item-equipment-groups";

export type ItemNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID";

export interface ItemNormalizerDiagnostic {
  readonly code: ItemNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface ItemNormalizerInput {
  readonly records: readonly CopyModRawRecord[];
  readonly context: ItemSourceScopeContext;
}

export interface ItemNormalizerResult {
  readonly items: readonly ItemRule[];
  readonly diagnostics: readonly ItemNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: ItemSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: ItemNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): ItemNormalizerDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "INVALID_CANONICAL_ID",
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
  | { readonly ok: true; readonly item: ItemRule; readonly diagnostics: readonly ItemNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly ItemNormalizerDiagnostic[] };

function normalizeSingleItem(
  record: CopyModRawRecord,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: ItemNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifyItemSourceScope(
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
  const rulesetResult = classifyRecordRuleset({
    record,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
  if (!rulesetResult.ok) {
    diagnostics.push(makeDiagnostic(
      rulesetResult.diagnostic.code === "INVALID_SOURCE" ? "INVALID_SOURCE" : "UNKNOWN_SOURCE",
      rulesetResult.diagnostic.message,
      record.name,
      opts,
      rulesetResult.diagnostic.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }
  const access = classifyRecordAccess(rulesetResult.classification).access;

  // 2. Generate canonical entity ID
  const idResult = createCanonicalEntityId({
    kind: "item",
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

  // 3. Extract content and metadata
  const content = extractItemContent(remaining);
  const page = extractItemPage(remaining);
  const summary = extractItemSummary(remaining);

  // 4. Extract item-specific fields
  const category = extractItemCategory(remaining);
  const rarity = extractItemRarity(remaining);
  const cost = extractItemCost(remaining);
  const weight = extractItemWeight(remaining);
  const bodySlot = extractItemBodySlot(remaining);
  const properties = extractItemProperties(remaining);
  const requiresAttunement = extractRequiresAttunement(remaining);
  const equipmentGroups = extractItemEquipmentGroups(remaining);

  // 5. Build the item rule
  const item = createItemRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    access,
    category,
    properties,
    requiresAttunement,
    content,
    [],
    [],
    [],
    [],
    false,
    page,
    summary,
    rarity,
    cost,
    weight,
    bodySlot,
    equipmentGroups,
  );

  return { ok: true, item, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeItems(input: ItemNormalizerInput): ItemNormalizerResult {
  const items: ItemRule[] = [];
  const diagnostics: ItemNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleItem(record, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "item",
      recordIndex: i,
    });

    if (result.ok) {
      items.push(result.item);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    items: Object.freeze(items),
    diagnostics: Object.freeze(diagnostics),
  });
}

import type { SemanticMappingKey, SemanticMappingRegistry, SemanticMappingDiagnostic, MappingMethod, SemanticMappingResult } from "./semantic-mapping";
import { isSemanticMappingKey } from "./semantic-mapping";

/* ── Resolution ─────────────────────────────────────────────────── */

function createDiagnostic(
  overrides: Omit<SemanticMappingDiagnostic, "code" | "severity" | "message"> & {
    code: SemanticMappingDiagnostic["code"];
    severity: "warning" | "error";
    message: string;
  },
): SemanticMappingDiagnostic {
  return Object.freeze(overrides);
}

export function resolveSemanticMapping(
  registry: SemanticMappingRegistry,
  key: SemanticMappingKey,
): SemanticMappingResult {
  const diagnostics: SemanticMappingDiagnostic[] = [];

  if (!isSemanticMappingKey(key)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: "Resolution key is not a valid semantic mapping key.",
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "structured" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  const entry = registry.mappings.find(
    (m) => m.key.entityId === key.entityId && m.key.ruleset === key.ruleset,
  );

  if (entry === undefined) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "warning",
      message: `No reviewed semantic mapping exists for entity "${key.entityId}" ruleset "${key.ruleset}".`,
      entityId: key.entityId,
      ruleset: key.ruleset,
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "structured" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  return Object.freeze({
    mapped: true,
    entry,
    mappingMethod: "reviewed-mapping" as MappingMethod,
    diagnostics: Object.freeze([]),
  });
}

/* ── Batch resolution ───────────────────────────────────────────── */

export interface SemanticMappingBatchInput {
  readonly key: SemanticMappingKey;
}

export interface SemanticMappingBatchResult {
  readonly results: readonly SemanticMappingResult[];
  readonly mappedCount: number;
  readonly unmappedCount: number;
  readonly allDiagnostics: readonly SemanticMappingDiagnostic[];
}

export function resolveSemanticMappings(
  registry: SemanticMappingRegistry,
  inputs: readonly SemanticMappingBatchInput[],
): SemanticMappingBatchResult {
  const results: SemanticMappingResult[] = [];
  const allDiagnostics: SemanticMappingDiagnostic[] = [];
  let mappedCount = 0;
  let unmappedCount = 0;

  for (const input of inputs) {
    const result = resolveSemanticMapping(registry, input.key);
    results.push(result);
    allDiagnostics.push(...result.diagnostics);
    if (result.mapped) {
      mappedCount += 1;
    } else {
      unmappedCount += 1;
    }
  }

  return Object.freeze({
    results: Object.freeze(results),
    mappedCount,
    unmappedCount,
    allDiagnostics: Object.freeze(allDiagnostics),
  });
}

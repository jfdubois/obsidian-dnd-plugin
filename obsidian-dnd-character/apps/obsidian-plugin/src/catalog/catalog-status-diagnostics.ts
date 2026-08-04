import type {
  CatalogRestoreResult,
  CatalogRuntimeError,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogStatusDiagnosticInput } from "./catalog-runtime-status";

const RESTORE_MESSAGES: Record<Exclude<CatalogRestoreResult, { success: true }>['reason'], string> = {
  "no-persistence": "Catalog restoration requires active revision persistence.",
  "no-cache-manager": "Catalog restoration requires a cache manager.",
  "invalid-pointer": "No saved catalog revision is available.",
  "manifest-missing": "The saved catalog manifest is missing.",
  "manifest-envelope-invalid": "The saved catalog manifest cache is invalid.",
  "manifest-envelope-version-mismatch": "The saved catalog manifest cache version is incompatible.",
  "manifest-envelope-revision-mismatch": "The saved catalog manifest revision does not match the saved revision.",
  "manifest-malformed": "The saved catalog manifest is malformed.",
  "schema-incompatible": "The saved catalog schema is incompatible.",
  "missing-entity-kinds": "The saved catalog manifest is missing required entity kinds.",
  "manifest-revision-mismatch": "The saved catalog manifest revision does not match the saved revision.",
  "sources-missing": "The saved catalog sources are missing.",
  "sources-envelope-invalid": "The saved catalog sources cache is invalid.",
  "sources-envelope-version-mismatch": "The saved catalog sources cache version is incompatible.",
  "sources-envelope-revision-mismatch": "The saved catalog sources revision does not match the saved revision.",
  "sources-malformed": "The saved catalog sources are malformed.",
  "index-missing": "A saved catalog index is missing.",
  "index-envelope-invalid": "A saved catalog index cache is invalid.",
  "index-envelope-version-mismatch": "A saved catalog index cache version is incompatible.",
  "index-envelope-revision-mismatch": "A saved catalog index revision does not match the saved revision.",
  "index-malformed": "A saved catalog index is malformed.",
  "index-invariants-violated": "A saved catalog index is inconsistent.",
  "detail-path-invalid": "A saved catalog entity path is invalid.",
};

export function statusDiagnosticFromRestore(
  result: Exclude<CatalogRestoreResult, { success: true }>,
): CatalogStatusDiagnosticInput {
  return {
    message: RESTORE_MESSAGES[result.reason],
    reason: result.reason,
  };
}

export function statusDiagnosticFromRuntimeError(
  error: CatalogRuntimeError,
): CatalogStatusDiagnosticInput {
  return {
    message: error.message,
    ...(error.code === undefined ? {} : { code: error.code }),
    ...(error.cacheFailureReason === undefined ? {} : { reason: error.cacheFailureReason }),
    ...(error.operation === undefined ? {} : { operation: error.operation }),
    ...(error.artifact === undefined ? {} : { artifact: error.artifact }),
    ...(error.candidateRevision === undefined ? {} : { candidateRevision: error.candidateRevision }),
    ...(error.previousActiveRevision === undefined ? {} : { previousActiveRevision: error.previousActiveRevision }),
    ...(error.failedEntityId === undefined ? {} : { failedEntityId: error.failedEntityId }),
    ...(error.failedEntityKind === undefined ? {} : { failedEntityKind: error.failedEntityKind }),
    recoverable: error.recoverable,
  };
}

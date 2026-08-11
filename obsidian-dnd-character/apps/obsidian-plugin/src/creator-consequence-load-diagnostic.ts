import { CatalogRuntimeError } from "@obsidian-dnd/catalog-contract";

type OriginLabel = "species" | "background" | "class";

function catalogDetail(error: unknown): string {
  if (error instanceof CatalogRuntimeError) {
    const status = error.status === undefined ? "" : ` (HTTP ${error.status})`;
    return `${error.message}${status}`;
  }
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "The catalog did not provide the required consequence data.";
}

export function originEntityLoadDiagnostic(label: OriginLabel, detailPath: string, error: unknown): string {
  return `Could not load the selected ${label} entity at ${detailPath}. ${catalogDetail(error)} Refresh the catalog and try again.`;
}

export function originConsequenceLoadDiagnostic(label: OriginLabel, error: unknown): string {
  return `Could not load catalog consequence data for the selected ${label}. ${catalogDetail(error)} Refresh the catalog and try again.`;
}

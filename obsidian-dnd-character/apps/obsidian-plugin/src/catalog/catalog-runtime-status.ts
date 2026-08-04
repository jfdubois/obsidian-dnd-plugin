import type { CatalogRevision } from "@obsidian-dnd/domain";

export type CatalogRuntimeStatusState =
  | "not-configured" | "inactive" | "restoring" | "refreshing" | "current"
  | "update-available" | "cached-offline" | "stale-offline" | "incompatible"
  | "unavailable" | "error";

export interface CatalogStatusDiagnosticInput {
  message: string;
  code?: "ENTITY_UNRESOLVED";
  reason?: string;
  operation?: "cache-write" | "active-revision-save" | "entity-resolution";
  artifact?: "manifest" | "sources" | "index" | "entity" | "active-pointer";
  candidateRevision?: CatalogRevision;
  previousActiveRevision?: CatalogRevision;
  failedEntityId?: string;
  failedEntityKind?: string;
  recoverable?: boolean;
}

/** A display-safe subset of the existing runtime diagnostic fields. */
export type CatalogStatusDiagnostic = Readonly<CatalogStatusDiagnosticInput>;

/** Pure facts supplied by a future catalog-service integration. */
export interface CatalogRuntimeStatusInput {
  configuredUrl?: string;
  activationState: "inactive" | "fetching" | "active";
  activeRevision?: CatalogRevision;
  sourceRevision?: string;
  advertisedRevision?: CatalogRevision;
  schemaCompatibility: "unknown" | "compatible" | "incompatible";
  connectivity: "unknown" | "online" | "offline";
  cacheFreshness: "none" | "current" | "offline" | "stale";
  restoreOutcome: "idle" | "pending" | "restored-offline" | "stale-accepted" | "failed";
  refreshOutcome: "idle" | "pending" | "succeeded" | "failed";
  /** A non-mutating online discovery is in progress. */
  onlineCheckPending?: boolean;
  lastDiagnostic?: CatalogStatusDiagnosticInput;
  unresolvedEntityCount: number;
  lastRefreshAt?: string;
}

export interface CatalogRuntimeStatusSnapshot {
  readonly configuredUrl?: string;
  readonly state: CatalogRuntimeStatusState;
  readonly activationState: CatalogRuntimeStatusInput["activationState"];
  readonly activeRevision?: CatalogRevision;
  readonly advertisedRevision?: CatalogRevision;
  readonly sourceRevision?: string;
  readonly schemaCompatibility: CatalogRuntimeStatusInput["schemaCompatibility"];
  readonly connectivity: CatalogRuntimeStatusInput["connectivity"];
  readonly cacheMode: CatalogRuntimeStatusInput["cacheFreshness"];
  readonly lastRefreshAt?: string;
  readonly lastDiagnostic?: CatalogStatusDiagnostic;
  readonly unresolvedEntityCount: number;
  readonly busy: boolean;
}

export interface CatalogStatusPresentation {
  readonly title: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly severity: "neutral" | "success" | "warning" | "error";
  readonly refreshEnabled: boolean;
}

function present(value: string | undefined): string | undefined {
  return value !== undefined && value.trim().length > 0 ? value : undefined;
}

export function projectCatalogStatusDiagnostic(
  diagnostic: CatalogStatusDiagnosticInput | undefined,
): CatalogStatusDiagnostic | undefined {
  if (diagnostic === undefined) return undefined;
  return Object.freeze({
    message: diagnostic.message,
    ...(diagnostic.code === undefined ? {} : { code: diagnostic.code }),
    ...(diagnostic.reason === undefined ? {} : { reason: diagnostic.reason }),
    ...(diagnostic.operation === undefined ? {} : { operation: diagnostic.operation }),
    ...(diagnostic.artifact === undefined ? {} : { artifact: diagnostic.artifact }),
    ...(diagnostic.candidateRevision === undefined ? {} : { candidateRevision: diagnostic.candidateRevision }),
    ...(diagnostic.previousActiveRevision === undefined ? {} : { previousActiveRevision: diagnostic.previousActiveRevision }),
    ...(diagnostic.failedEntityId === undefined ? {} : { failedEntityId: diagnostic.failedEntityId }),
    ...(diagnostic.failedEntityKind === undefined ? {} : { failedEntityKind: diagnostic.failedEntityKind }),
    ...(diagnostic.recoverable === undefined ? {} : { recoverable: diagnostic.recoverable }),
  });
}

/**
 * Derive status with fixed precedence: unconfigured; restoring; refreshing;
 * incompatible; unavailable; offline cache; stale cache; online revision;
 * failed operation; usable unknown-connectivity; inactive. This order is
 * deliberate and never depends on input property order.
 */
export function deriveCatalogRuntimeStatus(input: CatalogRuntimeStatusInput): CatalogRuntimeStatusSnapshot {
  const configuredUrl = present(input.configuredUrl);
  const usable = input.activationState === "active" && input.activeRevision !== undefined;
  const busy = input.restoreOutcome === "pending" || input.refreshOutcome === "pending" || input.onlineCheckPending === true || input.activationState === "fetching";
  let state: CatalogRuntimeStatusState;
  if (configuredUrl === undefined) state = "not-configured";
  else if (input.restoreOutcome === "pending") state = "restoring";
  else if (input.refreshOutcome === "pending" || input.onlineCheckPending === true || input.activationState === "fetching") state = "refreshing";
  else if (input.schemaCompatibility === "incompatible") state = "incompatible";
  else if (input.restoreOutcome === "failed" || input.refreshOutcome === "failed") state = "error";
  else if (!usable && input.connectivity === "offline") state = "unavailable";
  else if (usable && (input.restoreOutcome === "restored-offline" || input.cacheFreshness === "offline")) state = "cached-offline";
  else if (usable && (input.restoreOutcome === "stale-accepted" || input.cacheFreshness === "stale")) state = "stale-offline";
  else if (usable && input.connectivity === "online" && input.advertisedRevision !== undefined && input.advertisedRevision !== input.activeRevision) state = "update-available";
  else if (usable && input.connectivity === "online" && input.advertisedRevision === input.activeRevision) state = "current";
  else if (usable) state = input.cacheFreshness === "offline" ? "cached-offline" : input.cacheFreshness === "stale" ? "stale-offline" : "current";
  else state = "inactive";
  return Object.freeze({
    ...(configuredUrl === undefined ? {} : { configuredUrl }), state,
    activationState: input.activationState,
    ...(input.activeRevision === undefined ? {} : { activeRevision: input.activeRevision }),
    ...(input.advertisedRevision === undefined ? {} : { advertisedRevision: input.advertisedRevision }),
    ...(present(input.sourceRevision) === undefined ? {} : { sourceRevision: present(input.sourceRevision) }),
    schemaCompatibility: input.schemaCompatibility, connectivity: input.connectivity,
    cacheMode: input.cacheFreshness,
    ...(present(input.lastRefreshAt) === undefined ? {} : { lastRefreshAt: present(input.lastRefreshAt) }),
    ...(projectCatalogStatusDiagnostic(input.lastDiagnostic) === undefined ? {} : { lastDiagnostic: projectCatalogStatusDiagnostic(input.lastDiagnostic) }),
    unresolvedEntityCount: input.unresolvedEntityCount, busy,
  });
}

const PRESENTATION: Record<CatalogRuntimeStatusState, Omit<CatalogStatusPresentation, "details" | "refreshEnabled">> = {
  "not-configured": { title: "Catalog not configured", summary: "Set a catalog URL to enable catalog data.", severity: "neutral" },
  inactive: { title: "Catalog inactive", summary: "The configured catalog is not active.", severity: "neutral" },
  restoring: { title: "Restoring catalog", summary: "Restoring the saved catalog cache.", severity: "neutral" },
  refreshing: { title: "Refreshing catalog", summary: "Checking and activating catalog data.", severity: "neutral" },
  current: { title: "Catalog current", summary: "The active catalog is current.", severity: "success" },
  "update-available": { title: "Catalog update available", summary: "A newer catalog revision is available.", severity: "warning" },
  "cached-offline": { title: "Using cached catalog", summary: "Using an active catalog restored while offline.", severity: "warning" },
  "stale-offline": { title: "Using stale catalog", summary: "Using an expired catalog allowed for offline use.", severity: "warning" },
  incompatible: { title: "Catalog incompatible", summary: "The catalog schema is not compatible.", severity: "error" },
  unavailable: { title: "Catalog unavailable", summary: "No usable catalog is available while offline.", severity: "error" },
  error: { title: "Catalog error", summary: "Catalog operation did not complete.", severity: "error" },
};

/** Format without locale, clock, DOM, or Obsidian dependencies. */
export function formatCatalogRuntimeStatus(status: CatalogRuntimeStatusSnapshot): CatalogStatusPresentation {
  const details: string[] = [];
  if (status.activeRevision !== undefined) details.push(`Active revision: ${status.activeRevision}`);
  if (status.advertisedRevision !== undefined) details.push(`Available revision: ${status.advertisedRevision}`);
  if (status.sourceRevision !== undefined) details.push(`Source revision: ${status.sourceRevision}`);
  if (status.lastRefreshAt !== undefined) details.push(`Last refresh: ${status.lastRefreshAt}`);
  if (status.unresolvedEntityCount > 0) details.push(`Unresolved entities: ${status.unresolvedEntityCount}`);
  if (status.lastDiagnostic !== undefined) details.push(`Diagnostic: ${status.lastDiagnostic.message}`);
  const base = PRESENTATION[status.state];
  return Object.freeze({ ...base, details: Object.freeze(details), refreshEnabled: !status.busy && status.state !== "not-configured" });
}

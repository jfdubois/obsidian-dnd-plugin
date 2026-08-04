import type { ActivateOptions, CatalogManifest, CatalogRuntimeService } from "@obsidian-dnd/catalog-contract";
import type { CatalogRevision } from "@obsidian-dnd/domain";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import type { CatalogClient, CatalogClientError } from "./client";
import type { CatalogStatusDiagnostic, CatalogRuntimeStatusSnapshot } from "./catalog-runtime-status";

export type CatalogUpdateCheckResult =
  | { success: true; advertisedRevision: CatalogRevision; compatible: true; updateAvailable: boolean }
  | { success: false; reason: "not-configured" | "unavailable" | "incompatible" | "invalid-response"; diagnostic?: CatalogStatusDiagnostic };

export type CatalogRefreshResult =
  | { success: true; activeRevision: CatalogRevision; changed: boolean }
  | { success: false; reason: "not-configured" | "incompatible" | "activation-failed" | "runtime-inconsistent"; status: CatalogRuntimeStatusSnapshot };

export type CatalogRefreshOptions = ActivateOptions;

/** A pure result of the two requests that make up online discovery. */
export type CatalogDiscoveryResult =
  | { kind: "compatible"; advertisedRevision: CatalogRevision; manifest: CatalogManifest }
  | { kind: "incompatible"; advertisedRevision: CatalogRevision; reason?: string }
  | { kind: "manifest-revision-mismatch"; advertisedRevision: CatalogRevision }
  | { kind: "failed"; advertisedRevision?: CatalogRevision; cause: unknown };

/**
 * Discover and validate the advertised revision.  This deliberately has no
 * runtime, cache, or persistence dependency, so an update check cannot stage
 * data or alter the active catalog.
 */
export async function discoverAdvertisedCatalog(client: CatalogClient): Promise<CatalogDiscoveryResult> {
  let advertisedRevision: CatalogRevision | undefined;
  try {
    advertisedRevision = createCatalogRevision(await client.fetchCurrentRevision());
    const manifest = await client.fetchManifest(advertisedRevision);
    if (manifest.catalogRevision !== advertisedRevision) {
      return { kind: "manifest-revision-mismatch", advertisedRevision };
    }
    const compatibility = client.negotiateSchema(manifest.schemaVersion);
    if (!compatibility.compatible) {
      return { kind: "incompatible", advertisedRevision, reason: compatibility.reason };
    }
    return { kind: "compatible", advertisedRevision, manifest };
  } catch (cause) {
    return { kind: "failed", ...(advertisedRevision === undefined ? {} : { advertisedRevision }), cause };
  }
}

export type RuntimeActivationResult =
  | { success: true; revision: CatalogRevision; manifest: CatalogManifest }
  | { success: false; kind: "activation-failed"; cause: unknown }
  | { success: false; kind: "runtime-inconsistent" };

/** Invoke the existing transaction and inspect only its committed outcome. */
export async function activateCatalogRuntime(
  runtime: CatalogRuntimeService,
  options: ActivateOptions | undefined,
): Promise<RuntimeActivationResult> {
  try {
    await runtime.activate(options);
  } catch (cause) {
    return { success: false, kind: "activation-failed", cause };
  }
  if (runtime.activationState !== "active" || runtime.revision === undefined || runtime.manifest === undefined || runtime.manifest.catalogRevision !== runtime.revision) {
    return { success: false, kind: "runtime-inconsistent" };
  }
  return { success: true, revision: runtime.revision, manifest: runtime.manifest };
}

/** Classifies only structured transport evidence, never error messages. */
export function connectivityFromDiscoveryFailure(error: unknown): "online" | "offline" | "unknown" {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return "online";
  // The client contract distinguishes a failed transport from validation
  // failures.  An arbitrary message-shaped value is not transport evidence.
  if (isTransportCatalogClientError(error)) return "offline";
  return "unknown";
}

function isTransportCatalogClientError(error: unknown): error is CatalogClientError {
  return typeof error === "object" && error !== null
    && "transport" in error && error.transport === true;
}

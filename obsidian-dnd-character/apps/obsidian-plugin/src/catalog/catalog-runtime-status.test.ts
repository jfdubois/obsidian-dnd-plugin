import { describe, expect, it } from "vitest";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import {
  deriveCatalogRuntimeStatus, formatCatalogRuntimeStatus, projectCatalogStatusDiagnostic,
  type CatalogRuntimeStatusInput,
} from "./catalog-runtime-status";

const active = createCatalogRevision("rev-active");
const advertised = createCatalogRevision("rev-advertised");
function facts(overrides: Partial<CatalogRuntimeStatusInput> = {}): CatalogRuntimeStatusInput {
  return { configuredUrl: "https://catalog.example", activationState: "inactive", schemaCompatibility: "compatible", connectivity: "unknown", cacheFreshness: "none", restoreOutcome: "idle", refreshOutcome: "idle", unresolvedEntityCount: 0, ...overrides };
}

describe("deriveCatalogRuntimeStatus", () => {
  it.each([
    ["no URL", facts({ configuredUrl: "" }), "not-configured"],
    ["inactive runtime", facts(), "inactive"],
    ["restoring", facts({ restoreOutcome: "pending" }), "restoring"],
    ["refreshing", facts({ refreshOutcome: "pending" }), "refreshing"],
    ["fetching activation", facts({ activationState: "fetching" }), "refreshing"],
    ["online equal revisions", facts({ activationState: "active", activeRevision: active, advertisedRevision: active, connectivity: "online" }), "current"],
    ["online new revision", facts({ activationState: "active", activeRevision: active, advertisedRevision: advertised, connectivity: "online" }), "update-available"],
    ["offline restored cache", facts({ activationState: "active", activeRevision: active, connectivity: "offline", restoreOutcome: "restored-offline" }), "cached-offline"],
    ["stale permitted cache", facts({ activationState: "active", activeRevision: active, cacheFreshness: "stale", restoreOutcome: "stale-accepted" }), "stale-offline"],
    ["incompatible schema", facts({ schemaCompatibility: "incompatible" }), "incompatible"],
    ["offline unavailable", facts({ connectivity: "offline" }), "unavailable"],
    ["unexpected failure", facts({ refreshOutcome: "failed" }), "error"],
  ] as const)("returns %s", (_name, input, expected) => expect(deriveCatalogRuntimeStatus(input).state).toBe(expected));

  it("uses stable precedence for conflicting facts", () => {
    expect(deriveCatalogRuntimeStatus(facts({ configuredUrl: "", restoreOutcome: "pending", schemaCompatibility: "incompatible" })).state).toBe("not-configured");
    expect(deriveCatalogRuntimeStatus(facts({ restoreOutcome: "pending", refreshOutcome: "pending", schemaCompatibility: "incompatible" })).state).toBe("restoring");
  });

  it("creates a mutation-isolated immutable snapshot", () => {
    const diagnostic = { message: "network failed", reason: "offline" };
    const status = deriveCatalogRuntimeStatus(facts({ activationState: "active", activeRevision: active, sourceRevision: "source-1", lastRefreshAt: "2026-08-03T12:00:00Z", lastDiagnostic: diagnostic }));
    diagnostic.message = "changed";
    expect(Object.isFrozen(status)).toBe(true); expect(status.lastDiagnostic?.message).toBe("network failed");
    expect(status.sourceRevision).toBe("source-1"); expect(status.lastRefreshAt).toBe("2026-08-03T12:00:00Z");
  });

  it("uses optional fields instead of empty string sentinels", () => {
    const status = deriveCatalogRuntimeStatus(facts({ configuredUrl: " ", sourceRevision: "", lastRefreshAt: "" }));
    expect(status).not.toHaveProperty("configuredUrl"); expect(status).not.toHaveProperty("sourceRevision"); expect(status).not.toHaveProperty("lastRefreshAt");
  });
});

describe("projectCatalogStatusDiagnostic", () => {
  it("retains only supported display fields", () => {
    const diagnostic = { message: "failed", code: "ENTITY_UNRESOLVED" as const, reason: "missing", operation: "entity-resolution" as const, artifact: "entity" as const, candidateRevision: advertised, previousActiveRevision: active, failedEntityId: "species:human", failedEntityKind: "species", recoverable: true, stack: "private trace" };
    const projection = projectCatalogStatusDiagnostic(diagnostic);
    expect(projection).toEqual({ message: "failed", code: "ENTITY_UNRESOLVED", reason: "missing", operation: "entity-resolution", artifact: "entity", candidateRevision: advertised, previousActiveRevision: active, failedEntityId: "species:human", failedEntityKind: "species", recoverable: true });
    expect(projection).not.toHaveProperty("stack");
    expect(Object.isFrozen(projection)).toBe(true);
  });
});

describe("formatCatalogRuntimeStatus", () => {
  it("disables refresh while busy and enables it for usable idle statuses", () => {
    expect(formatCatalogRuntimeStatus(deriveCatalogRuntimeStatus(
      facts({ refreshOutcome: "pending" }),
    )).refreshEnabled).toBe(false);
    expect(formatCatalogRuntimeStatus(deriveCatalogRuntimeStatus(
      facts({ activationState: "active", activeRevision: active }),
    )).refreshEnabled).toBe(true);
  });

  it("formats revisions, time, diagnostics, and unresolved entities deterministically", () => {
    const status = deriveCatalogRuntimeStatus(facts({ activationState: "active", activeRevision: active, advertisedRevision: advertised, sourceRevision: "src", lastRefreshAt: "2026-08-03T12:00:00Z", unresolvedEntityCount: 2, lastDiagnostic: { message: "entity unresolved", code: "ENTITY_UNRESOLVED" } }));
    const first = formatCatalogRuntimeStatus(status); const second = formatCatalogRuntimeStatus(status);
    expect(first).toEqual(second);
    expect(first.details).toEqual(["Active revision: rev-active", "Available revision: rev-advertised", "Source revision: src", "Last refresh: 2026-08-03T12:00:00Z", "Unresolved entities: 2", "Diagnostic: entity unresolved"]);
  });

  it("does not warn about zero unresolved entities", () => {
    const display = formatCatalogRuntimeStatus(deriveCatalogRuntimeStatus(facts({ activationState: "active", activeRevision: active })));
    expect(display.details.some((detail) => detail.includes("Unresolved"))).toBe(false);
  });
});

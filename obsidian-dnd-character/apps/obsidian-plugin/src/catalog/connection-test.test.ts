/**
 * Tests for the connection test validation logic.
 * Validates that validateConnection checks all FR-001 requirements:
 * manifest shape, API version, schema version, rulesets, entity indexes.
 */
import { describe, it, expect } from "vitest";
import { validateConnection } from "./connection-test";
import type { CatalogManifest } from "@obsidian-dnd/catalog-contract";
import {
  createCatalogManifest,
  CATALOG_API_VERSION,
  CATALOG_SCHEMA_VERSION,
} from "@obsidian-dnd/catalog-contract";
import { createCatalogRevision } from "@obsidian-dnd/domain";

/* ── Test helpers ──────────────────────────────────────────────── */

function createValidManifest(): CatalogManifest {
  return createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogRevision: createCatalogRevision("rev-001"),
    sourceRevision: "src-001",
    builderVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: [
      "species",
      "background",
      "class",
      "subclass",
      "class-feature",
      "subclass-feature",
      "feat",
      "spell",
      "item",
      "optional-feature",
      "skill",
      "language",
    ],
    checksums: {},
  });
}

/* ── Positive tests ────────────────────────────────────────────── */

describe("validateConnection — positive", () => {
  it("returns valid for a well-formed manifest", () => {
    const manifest = createValidManifest();
    const result = validateConnection(manifest);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns valid when rulesets includes both 2014 and 2024", () => {
    const manifest = createCatalogManifest({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2014", "2024"],
      entityKinds: [
        "species",
        "background",
        "class",
        "feat",
        "spell",
        "item",
      ],
      checksums: {},
    });

    const result = validateConnection(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns valid with only required entity kinds", () => {
    const manifest = createCatalogManifest({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species", "background", "class", "feat", "spell", "item"],
      checksums: {},
    });

    const result = validateConnection(manifest);
    expect(result.valid).toBe(true);
  });
});

/* ── Negative tests — manifest shape ───────────────────────────── */

describe("validateConnection — invalid manifest shape", () => {
  it("returns invalid for null", () => {
    const result = validateConnection(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid manifest");
  });

  it("returns invalid for undefined", () => {
    const result = validateConnection(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid manifest");
  });

  it("returns invalid for a plain object with missing fields", () => {
    const result = validateConnection({ foo: "bar" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid manifest");
  });

  it("returns invalid for an array", () => {
    const result = validateConnection([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid manifest");
  });

  it("returns invalid for a string", () => {
    const result = validateConnection("not a manifest");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid manifest");
  });
});

/* ── Negative tests — API version ──────────────────────────────── */

describe("validateConnection — invalid API version", () => {
  it("returns invalid when API version does not match", () => {
    // Construct a manifest-like object with wrong API version.
    // isCatalogManifest checks apiVersion === CATALOG_API_VERSION,
    // so a wrong value triggers the shape guard failure.
    const manifest = {
      apiVersion: 99,
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: "rev-001",
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums: {},
    };

    const result = validateConnection(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid manifest");
  });
});

/* ── Negative tests — schema version ───────────────────────────── */

describe("validateConnection — invalid schema version", () => {
  it("returns invalid when schema version does not match plugin version", () => {
    const manifest = createCatalogManifest({
      schemaVersion: 99,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: [
        "species",
        "background",
        "class",
        "feat",
        "spell",
        "item",
      ],
      checksums: {},
    });

    // Override the schema version to simulate a future server version
    const mismatched = { ...manifest, schemaVersion: 99 };
    const result = validateConnection(mismatched);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unsupported schema version");
    expect(result.errors[0]).toContain("99");
  });
});

/* ── Negative tests — rulesets ─────────────────────────────────── */

describe("validateConnection — invalid rulesets", () => {
  it("returns invalid when rulesets is empty", () => {
    // isCatalogManifest checks rulesets.length > 0, so empty
    // triggers the shape guard failure.
    const manifest = {
      apiVersion: CATALOG_API_VERSION,
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: "rev-001",
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: [],
      entityKinds: ["species"],
      checksums: {},
    };

    const result = validateConnection(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid manifest");
  });
});

/* ── Negative tests — required entity indexes ──────────────────── */

describe("validateConnection — missing required entity kinds", () => {
  it("returns invalid when species is missing", () => {
    const manifest = createCatalogManifest({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: [
        "background",
        "class",
        "feat",
        "spell",
        "item",
      ],
      checksums: {},
    });

    const result = validateConnection(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("species");
  });

  it("returns invalid when multiple required kinds are missing", () => {
    const manifest = createCatalogManifest({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: [
        "skill",
        "language",
      ],
      checksums: {},
    });

    const result = validateConnection(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Missing required entity kinds");
    expect(result.errors[0]).toContain("species");
    expect(result.errors[0]).toContain("background");
    expect(result.errors[0]).toContain("class");
  });

  it("returns invalid when all required kinds are missing", () => {
    const manifest = createCatalogManifest({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["skill"],
      checksums: {},
    });

    const result = validateConnection(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Missing required entity kinds");
  });
});

/* ── Multi-failure tests ───────────────────────────────────────── */

describe("validateConnection — multiple failures", () => {
  it("reports both schema version and missing entity kinds", () => {
    const manifest = createCatalogManifest({
      schemaVersion: 99,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["skill"],
      checksums: {},
    });

    const result = validateConnection(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
    expect(result.errors[0]).toContain("Unsupported schema version");
    expect(result.errors[1]).toContain("Missing required entity kinds");
  });
});

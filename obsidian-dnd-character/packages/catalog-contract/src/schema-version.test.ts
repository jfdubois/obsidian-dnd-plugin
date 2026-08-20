import { describe, it, expect } from "vitest";
import {
  CATALOG_API_VERSION,
  CATALOG_SCHEMA_VERSION,
  isSupportedApiVersion,
  isSupportedSchemaVersion,
} from "./schema-version";
import {
  createCatalogManifest,
  isCatalogManifest,
} from "./catalog-manifest";
import { createCatalogRevision } from "@obsidian-dnd/domain";

describe("schema version constants", () => {
  it("CATALOG_API_VERSION equals 1", () => {
    expect(CATALOG_API_VERSION).toBe(1);
  });

  it("CATALOG_SCHEMA_VERSION equals 4", () => {
    expect(CATALOG_SCHEMA_VERSION).toBe(4);
  });
});

describe("isSupportedApiVersion", () => {
  it("returns true for 1", () => {
    expect(isSupportedApiVersion(1)).toBe(true);
  });

  it("returns false for 0", () => {
    expect(isSupportedApiVersion(0)).toBe(false);
  });

  it("returns false for 2", () => {
    expect(isSupportedApiVersion(2)).toBe(false);
  });

  it('returns false for "1"', () => {
    expect(isSupportedApiVersion("1")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSupportedApiVersion(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSupportedApiVersion(undefined)).toBe(false);
  });

  it("returns false for {}", () => {
    expect(isSupportedApiVersion({})).toBe(false);
  });

  it("returns false for []", () => {
    expect(isSupportedApiVersion([])).toBe(false);
  });
});

describe("isSupportedSchemaVersion", () => {
  it("returns true for 2", () => {
    expect(isSupportedSchemaVersion(2)).toBe(true);
  });

  it("returns true for 3", () => {
    expect(isSupportedSchemaVersion(3)).toBe(true);
  });

  it("returns true for 4", () => {
    expect(isSupportedSchemaVersion(4)).toBe(true);
  });

  it("returns false for 0", () => {
    expect(isSupportedSchemaVersion(0)).toBe(false);
  });

  it("returns false for 1", () => {
    expect(isSupportedSchemaVersion(1)).toBe(false);
  });

  it('returns false for "1"', () => {
    expect(isSupportedSchemaVersion("1")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSupportedSchemaVersion(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSupportedSchemaVersion(undefined)).toBe(false);
  });

  it("returns false for {}", () => {
    expect(isSupportedSchemaVersion({})).toBe(false);
  });

  it("returns false for []", () => {
    expect(isSupportedSchemaVersion([])).toBe(false);
  });
});

describe("CatalogManifest with schema version constant", () => {
  it("validates manifest with current API version", () => {
    const manifest = createCatalogManifest({
      schemaVersion: 2,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "abc",
      builderVersion: "0.1.0",
      generatedAt: "2026-07-22T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums: {},
    });
    expect(isCatalogManifest(manifest)).toBe(true);
    expect(manifest.apiVersion).toBe(CATALOG_API_VERSION);
  });

  it("rejects manifest with wrong API version", () => {
    const invalid = {
      apiVersion: 2,
      schemaVersion: 2,
      catalogRevision: "rev-bad",
      sourceRevision: "abc",
      builderVersion: "0.1.0",
      generatedAt: "2026-07-22T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums: {},
    };
    expect(isCatalogManifest(invalid)).toBe(false);
  });
});

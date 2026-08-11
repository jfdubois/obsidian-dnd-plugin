import { describe, it, expect } from "vitest";
import {
  createCatalogManifest,
  isCatalogManifest,
  type CatalogManifest,
} from "./catalog-manifest";
import { createCatalogRevision } from "@obsidian-dnd/domain";

describe("CatalogManifest", () => {
  const validManifest: CatalogManifest = createCatalogManifest({
    schemaVersion: 2,
    catalogRevision: createCatalogRevision("rev-001"),
    sourceRevision: "3c5d9d3",
    builderVersion: "0.1.0",
    generatedAt: "2026-07-22T00:00:00Z",
    rulesets: ["2014", "2024"],
    entityKinds: ["species", "background", "class"],
    checksums: { "manifest.json": "abc123" },
  });

  it("factory produces valid manifest", () => {
    expect(isCatalogManifest(validManifest)).toBe(true);
  });

  it("apiVersion is always 1", () => {
    expect(validManifest.apiVersion).toBe(1);
  });

  it("creates immutable copies of arrays", () => {
    const rulesets: ("2014" | "2024")[] = ["2014"];
    const kinds: ("species" | "background")[] = ["species"];
    const manifest = createCatalogManifest({
      schemaVersion: 2,
      catalogRevision: createCatalogRevision("rev-002"),
      sourceRevision: "abc",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets,
      entityKinds: kinds,
      checksums: {},
    });
    rulesets.push("2024");
    kinds.push("background");
    expect(manifest.rulesets).toHaveLength(1);
    expect(manifest.entityKinds).toHaveLength(1);
  });

  it("creates immutable copy of checksums", () => {
    const checksums: Record<string, string> = { "manifest.json": "abc" };
    const manifest = createCatalogManifest({
      schemaVersion: 2,
      catalogRevision: createCatalogRevision("rev-003"),
      sourceRevision: "abc",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums,
    });
    checksums["sources.json"] = "def";
    expect(Object.keys(manifest.checksums)).toHaveLength(1);
  });

  it("validator accepts minimal valid manifest", () => {
    const minimal: unknown = {
      apiVersion: 1,
      schemaVersion: 2,
      catalogRevision: "rev-minimal",
      sourceRevision: "abc",
      builderVersion: "0.0.1",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums: {},
    };
    expect(isCatalogManifest(minimal)).toBe(true);
  });

  it("validator accepts manifest with multiple checksums", () => {
    const withChecksums: unknown = {
      apiVersion: 1,
      schemaVersion: 2,
      catalogRevision: "rev-multi",
      sourceRevision: "def456",
      builderVersion: "1.0.0",
      generatedAt: "2026-12-31T23:59:59Z",
      rulesets: ["2014", "2024"],
      entityKinds: ["species", "background", "class", "subclass", "feat", "spell", "item"],
      checksums: {
        "manifest.json": "aaa",
        "sources.json": "bbb",
        "indexes/species.json": "ccc",
      },
    };
    expect(isCatalogManifest(withChecksums)).toBe(true);
  });

  /* ── Negative: apiVersion ─────────────────────────────────── */

  it("validator rejects apiVersion other than 1", () => {
    const invalid: unknown = { ...validManifest, apiVersion: 2 };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing apiVersion", () => {
    const { apiVersion: _apiVersion, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: schemaVersion ──────────────────────────────── */

  it("validator rejects zero schemaVersion", () => {
    const invalid: unknown = { ...validManifest, schemaVersion: 0 };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects negative schemaVersion", () => {
    const invalid: unknown = { ...validManifest, schemaVersion: -1 };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects non-integer schemaVersion", () => {
    const invalid: unknown = { ...validManifest, schemaVersion: 1.5 };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects string schemaVersion", () => {
    const invalid: unknown = { ...validManifest, schemaVersion: "1" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing schemaVersion", () => {
    const { schemaVersion: _schemaVersion, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: catalogRevision ────────────────────────────── */

  it("validator rejects empty catalogRevision", () => {
    const invalid: unknown = { ...validManifest, catalogRevision: "" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing catalogRevision", () => {
    const { catalogRevision: _catalogRevision, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: sourceRevision ─────────────────────────────── */

  it("validator rejects empty sourceRevision", () => {
    const invalid: unknown = { ...validManifest, sourceRevision: "" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing sourceRevision", () => {
    const { sourceRevision: _sourceRevision, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  it("validator rejects non-string sourceRevision", () => {
    const invalid: unknown = { ...validManifest, sourceRevision: 123 };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  /* ── Negative: builderVersion ─────────────────────────────── */

  it("validator rejects empty builderVersion", () => {
    const invalid: unknown = { ...validManifest, builderVersion: "" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing builderVersion", () => {
    const { builderVersion: _builderVersion, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: generatedAt ────────────────────────────────── */

  it("validator rejects empty generatedAt", () => {
    const invalid: unknown = { ...validManifest, generatedAt: "" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing generatedAt", () => {
    const { generatedAt: _generatedAt, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: rulesets ───────────────────────────────────── */

  it("validator rejects empty rulesets array", () => {
    const invalid: unknown = { ...validManifest, rulesets: [] };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects non-array rulesets", () => {
    const invalid: unknown = { ...validManifest, rulesets: "2024" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects unknown ruleset value", () => {
    const invalid: unknown = { ...validManifest, rulesets: ["2025"] };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing rulesets", () => {
    const { rulesets: _rulesets, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: entityKinds ────────────────────────────────── */

  it("validator rejects empty entityKinds array", () => {
    const invalid: unknown = { ...validManifest, entityKinds: [] };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects non-array entityKinds", () => {
    const invalid: unknown = { ...validManifest, entityKinds: "species" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects unknown entity kind", () => {
    const invalid: unknown = { ...validManifest, entityKinds: ["monster"] };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing entityKinds", () => {
    const { entityKinds: _entityKinds, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: checksums ──────────────────────────────────── */

  it("validator rejects non-object checksums", () => {
    const invalid: unknown = { ...validManifest, checksums: "abc" };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects array checksums", () => {
    const invalid: unknown = { ...validManifest, checksums: [] };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects null checksums", () => {
    const invalid: unknown = { ...validManifest, checksums: null };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects checksum with empty key", () => {
    const invalid: unknown = { ...validManifest, checksums: { "": "abc" } };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects checksum with empty value", () => {
    const invalid: unknown = { ...validManifest, checksums: { "file.json": "" } };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects checksum with non-string value", () => {
    const invalid: unknown = { ...validManifest, checksums: { "file.json": 123 } };
    expect(isCatalogManifest(invalid)).toBe(false);
  });

  it("validator rejects missing checksums", () => {
    const { checksums: _checksums, ...rest } = validManifest;
    expect(isCatalogManifest(rest)).toBe(false);
  });

  /* ── Negative: type boundaries ────────────────────────────── */

  it("validator rejects null", () => {
    expect(isCatalogManifest(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isCatalogManifest(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isCatalogManifest("not-a-manifest")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isCatalogManifest(42)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isCatalogManifest([])).toBe(false);
  });
});

describe("round-trip", () => {
  it("factory + validator round-trips", () => {
    const manifest = createCatalogManifest({
      schemaVersion: 2,
      catalogRevision: createCatalogRevision("rev-rt"),
      sourceRevision: "abc123",
      builderVersion: "0.1.0",
      generatedAt: "2026-07-22T00:00:00Z",
      rulesets: ["2014", "2024"],
      entityKinds: ["species", "background", "class", "subclass", "feat", "spell", "item", "optional-feature", "skill", "language", "class-feature", "subclass-feature"],
      checksums: { "manifest.json": "sha256-abc", "sources.json": "sha256-def" },
    });
    expect(isCatalogManifest(manifest)).toBe(true);
    expect(manifest.apiVersion).toBe(1);
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.rulesets).toEqual(["2014", "2024"]);
    expect(Object.keys(manifest.checksums)).toHaveLength(2);
  });
});

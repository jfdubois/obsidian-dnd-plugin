import { describe, it, expect } from "vitest";
import { generateManifest } from "./manifest-generator";
import { computeChecksums } from "./checksum";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import { isCatalogManifest } from "@obsidian-dnd/catalog-contract";

describe("generateManifest", () => {
  const baseInput = {
    schemaVersion: 1,
    catalogRevision: createCatalogRevision("rev-001"),
    sourceRevision: "3c5d9d3",
    builderVersion: "0.1.0",
    rulesets: ["2014", "2024"] as const,
    entityKinds: ["species", "background", "class"] as const,
    checksums: computeChecksums({ "manifest.json": "{}" }),
  };

  it("produces a valid CatalogManifest", () => {
    const manifest = generateManifest(baseInput);
    expect(isCatalogManifest(manifest)).toBe(true);
  });

  it("sets apiVersion to 1", () => {
    const manifest = generateManifest(baseInput);
    expect(manifest.apiVersion).toBe(1);
  });

  it("preserves input fields", () => {
    const manifest = generateManifest(baseInput);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.catalogRevision).toBe("rev-001");
    expect(manifest.sourceRevision).toBe("3c5d9d3");
    expect(manifest.builderVersion).toBe("0.1.0");
    expect(manifest.rulesets).toEqual(["2014", "2024"]);
    expect(manifest.entityKinds).toEqual(["species", "background", "class"]);
  });

  it("sets generatedAt as ISO timestamp", () => {
    const manifest = generateManifest(baseInput);
    expect(manifest.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // Verify it parses as a valid date
    const parsed = new Date(manifest.generatedAt);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });

  it("freezes the manifest", () => {
    const manifest = generateManifest(baseInput);
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it("includes checksums", () => {
    const manifest = generateManifest(baseInput);
    expect(Object.keys(manifest.checksums)).toContain("manifest.json");
    expect(manifest.checksums["manifest.json"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic except for generatedAt", () => {
    const manifest1 = generateManifest(baseInput);
    const manifest2 = generateManifest(baseInput);

    // All fields except generatedAt should match
    expect(manifest1.apiVersion).toBe(manifest2.apiVersion);
    expect(manifest1.schemaVersion).toBe(manifest2.schemaVersion);
    expect(manifest1.catalogRevision).toBe(manifest2.catalogRevision);
    expect(manifest1.sourceRevision).toBe(manifest2.sourceRevision);
    expect(manifest1.builderVersion).toBe(manifest2.builderVersion);
    expect(manifest1.rulesets).toEqual(manifest2.rulesets);
    expect(manifest1.entityKinds).toEqual(manifest2.entityKinds);
    expect(manifest1.checksums).toEqual(manifest2.checksums);
  });

  it("handles single ruleset", () => {
    const manifest = generateManifest({
      ...baseInput,
      rulesets: ["2024"] as const,
    });
    expect(manifest.rulesets).toEqual(["2024"]);
    expect(isCatalogManifest(manifest)).toBe(true);
  });

  it("handles all entity kinds", () => {
    const manifest = generateManifest({
      ...baseInput,
      entityKinds: [
        "species", "background", "class", "subclass", "feat",
        "spell", "item", "optional-feature", "skill", "language",
        "class-feature", "subclass-feature",
      ] as const,
    });
    expect(manifest.entityKinds).toHaveLength(12);
    expect(isCatalogManifest(manifest)).toBe(true);
  });
});

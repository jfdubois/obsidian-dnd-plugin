import type { CatalogManifest } from "@obsidian-dnd/catalog-contract";
import { createCatalogManifest } from "@obsidian-dnd/catalog-contract";
import type { CatalogRevision, Ruleset, RuleEntityKind } from "@obsidian-dnd/domain";

/* ── Input type ────────────────────────────────────────────────── */

export interface ManifestGeneratorInput {
  schemaVersion: number;
  catalogRevision: CatalogRevision;
  sourceRevision: string;
  builderVersion: string;
  rulesets: readonly Ruleset[];
  entityKinds: readonly RuleEntityKind[];
  checksums: Record<string, string>;
}

/* ── Manifest generator ────────────────────────────────────────── */

/**
 * Assemble a CatalogManifest from build artifacts.
 * The `generatedAt` timestamp is the only non-deterministic field
 * (used for CAT-001 reproducibility verification).
 * Returns a frozen manifest object.
 */
export function generateManifest(input: ManifestGeneratorInput): CatalogManifest {
  const manifest = createCatalogManifest({
    schemaVersion: input.schemaVersion,
    catalogRevision: input.catalogRevision,
    sourceRevision: input.sourceRevision,
    builderVersion: input.builderVersion,
    generatedAt: new Date().toISOString(),
    rulesets: [...input.rulesets],
    entityKinds: [...input.entityKinds],
    checksums: input.checksums,
  });

  return Object.freeze(manifest);
}

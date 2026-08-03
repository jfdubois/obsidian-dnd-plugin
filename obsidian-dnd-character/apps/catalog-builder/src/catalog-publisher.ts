import * as fs from "node:fs";
import * as path from "node:path";
import type { CatalogManifest, CatalogEntitySummary, CatalogSource } from "@obsidian-dnd/catalog-contract";
import { KIND_INDEX_FILENAME } from "@obsidian-dnd/catalog-contract";
import type { RuleEntityKind } from "@obsidian-dnd/domain";
import type { ValidationReport } from "./validation-report";
import type { InventoryReport } from "./inventory-report";

/* ── Input type ────────────────────────────────────────────────── */

export interface CatalogPublisherInput {
  readonly outputDir: string;
  readonly manifest: CatalogManifest;
  readonly summaries: CatalogEntitySummary[];
  readonly entities: Record<string, string>;
  readonly validationReport: ValidationReport;
  readonly inventoryReport: InventoryReport;
  /** Optional source metadata. When present, emitted as sources.json. */
  readonly sources?: CatalogSource[];
}

/* ── Result type ───────────────────────────────────────────────── */

export interface PublishResult {
  readonly success: boolean;
  readonly revisionPath: string;
  readonly errors: readonly string[];
  readonly fileCount: number;
}

/* ── Helpers ───────────────────────────────────────────────────── */

/**
 * Build a flat map of relative-path → JSON-string for all files
 * that must be written into the revision directory.
 */
function buildFileMap(input: CatalogPublisherInput): Map<string, string> {
  const files = new Map<string, string>();

  /* Manifest */
  files.set("manifest.json", JSON.stringify(input.manifest, null, 2));

  /* Sources (optional) */
  if (input.sources !== undefined && input.sources.length > 0) {
    files.set("sources.json", JSON.stringify(input.sources, null, 2));
  }

  /* Reports */
  files.set("reports/validation.json", JSON.stringify(input.validationReport, null, 2));
  files.set("reports/inventory.json", JSON.stringify(input.inventoryReport, null, 2));

  /* Entity files (already keyed by relative path) */
  for (const [relPath, content] of Object.entries(input.entities)) {
    files.set(relPath, content);
  }

  /* Index files: group summaries by kind and serialize */
  const byKind = new Map<RuleEntityKind, CatalogEntitySummary[]>();
  for (const summary of input.summaries) {
    const existing = byKind.get(summary.kind);
    if (existing) {
      existing.push(summary);
    } else {
      byKind.set(summary.kind, [summary]);
    }
  }
  for (const [kind, summaries] of byKind) {
    const indexFilename = KIND_INDEX_FILENAME[kind];
    files.set(`indexes/${indexFilename}`, JSON.stringify(summaries, null, 2));
  }

  return files;
}

/**
 * Write all files from the map into the target directory.
 */
function writeFiles(files: Map<string, string>, targetDir: string): void {
  for (const [relPath, content] of files) {
    const fullPath = path.join(targetDir, relPath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }
}

/**
 * Verify that every file was written correctly by reading it back.
 */
function verifyFiles(files: Map<string, string>, targetDir: string): string | null {
  for (const [relPath, expected] of files) {
    const fullPath = path.join(targetDir, relPath);
    if (!fs.existsSync(fullPath)) {
      return `Missing file after write: ${relPath}`;
    }
    const actual = fs.readFileSync(fullPath, "utf8");
    if (actual !== expected) {
      return `Content mismatch for ${relPath}`;
    }
  }
  return null;
}

/**
 * Remove a directory tree, ignoring errors if the path does not exist.
 */
function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup; do not fail the operation
  }
}

/* ── Atomic publication ────────────────────────────────────────── */

/**
 * Publish a catalog revision atomically.
 *
 * Flow:
 * 1. Validate input (validation report must be valid).
 * 2. Create a temporary directory inside outputDir.
 * 3. Write all files into the temporary directory.
 * 4. Verify every file was written correctly.
 * 5. Rename the temporary directory to the final revision path
 *    (atomic on POSIX systems).
 *
 * On any failure, the temporary directory is cleaned up and a
 * failed PublishResult is returned.
 */
export function publishCatalog(input: CatalogPublisherInput): PublishResult {
  const errors: string[] = [];

  /* ── Step 1: Validate input ──────────────────────────────────── */
  if (input.validationReport.valid === false) {
    const diagCount = input.validationReport.diagnostics.length;
    errors.push(
      `Validation report failed: ${diagCount} diagnostic(s). `
      + `Duplicate IDs: ${input.validationReport.duplicateIds.length}, `
      + `Unresolved references: ${input.validationReport.unresolvedReferences.length}.`,
    );
    return Object.freeze({
      success: false,
      revisionPath: "",
      errors: Object.freeze(errors),
      fileCount: 0,
    });
  }

  /* ── Build file map ──────────────────────────────────────────── */
  const files = buildFileMap(input);
  const revisionId = input.manifest.catalogRevision;
  const finalDir = path.join(input.outputDir, "catalog", "v1", "revisions", revisionId);
  const tempDir = path.join(input.outputDir, ".publish-temp", `${revisionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  try {
    /* ── Step 2: Create temporary directory ────────────────────── */
    fs.mkdirSync(tempDir, { recursive: true });

    /* ── Step 3: Write all files ───────────────────────────────── */
    writeFiles(files, tempDir);

    /* ── Step 4: Verify all files ──────────────────────────────── */
    const verifyError = verifyFiles(files, tempDir);
    if (verifyError !== null) {
      errors.push(verifyError);
      throw new Error(verifyError);
    }

    /* ── Step 5: Atomic rename ─────────────────────────────────── */
    const parentDir = path.dirname(finalDir);
    fs.mkdirSync(parentDir, { recursive: true });
    fs.renameSync(tempDir, finalDir);

    /* ── Clean up empty temp parent directory ──────────────────── */
    const tempParent = path.dirname(tempDir);
    try {
      const entries = fs.readdirSync(tempParent);
      if (entries.length === 0) {
        fs.rmdirSync(tempParent);
      }
    } catch {
      // Best-effort cleanup
    }

    /* ── Success ───────────────────────────────────────────────── */
    return Object.freeze({
      success: true,
      revisionPath: finalDir,
      errors: Object.freeze([]),
      fileCount: files.size,
    });

  } catch (err) {
    /* ── Cleanup on failure ────────────────────────────────────── */
    cleanup(tempDir);
    const message = err instanceof Error ? err.message : String(err);
    if (!errors.includes(message)) {
      errors.push(message);
    }
    return Object.freeze({
      success: false,
      revisionPath: "",
      errors: Object.freeze(errors),
      fileCount: 0,
    });
  }
}

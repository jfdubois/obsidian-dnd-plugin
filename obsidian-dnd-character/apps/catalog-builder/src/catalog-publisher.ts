import * as fs from "node:fs";
import * as path from "node:path";
import type { CatalogManifest, CatalogEntitySummary, CatalogSource } from "@obsidian-dnd/catalog-contract";
import { isCatalogEntitySummary, isCatalogManifest, isCatalogSource, isEntityDetailResponse, createCurrentRevision, isCurrentRevision, KIND_INDEX_FILENAME } from "@obsidian-dnd/catalog-contract";
import { isCatalogRevision, type RuleEntityKind } from "@obsidian-dnd/domain";
import type { ValidationReport } from "./validation-report.js";
import type { InventoryReport } from "./inventory-report.js";

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
  /** Test-only hook for exercising pointer-rename failures without patching Node globals. */
  readonly pointerRename?: (from: string, to: string) => void;
}

/* ── Result type ───────────────────────────────────────────────── */

export interface PublishResult {
  readonly success: boolean;
  readonly revisionPath: string;
  readonly errors: readonly string[];
  readonly fileCount: number;
}

export interface PublishCurrentResult {
  readonly success: boolean;
  readonly pointerPath: string;
  readonly errors: readonly string[];
}

export interface PublishCatalogReleaseResult extends PublishResult {
  readonly pointerPath: string;
  readonly active: boolean;
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

/** Return every regular file in a published revision, relative to that revision. */
function readPublishedFileMap(targetDir: string): Map<string, string> {
  const files = new Map<string, string>();
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        files.set(path.relative(targetDir, fullPath), fs.readFileSync(fullPath, "utf8"));
      }
    }
  };
  visit(targetDir);
  return files;
}

function isInventoryReport(value: unknown): value is InventoryReport {
  if (typeof value !== "object" || value === null) return false;
  const report = value as Record<string, unknown>;
  const isCount = (entry: unknown, key: string): boolean => typeof entry === "object" && entry !== null
    && typeof (entry as Record<string, unknown>)[key] === "string"
    && typeof (entry as Record<string, unknown>).count === "number";
  return typeof report.totalEntities === "number"
    && Array.isArray(report.byKind) && report.byKind.every((entry) => isCount(entry, "kind"))
    && Array.isArray(report.byRuleset) && report.byRuleset.every((entry) => isCount(entry, "ruleset"))
    && Array.isArray(report.byAccess) && report.byAccess.every((entry) => isCount(entry, "access"))
    && Array.isArray(report.sourcesUsed) && report.sourcesUsed.every((entry) => typeof entry === "string")
    && typeof report.generatedAt === "string";
}

function parseTimestampTolerantJson(
  content: string,
  path: "manifest.json" | "reports/inventory.json",
): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(content);
    if (path === "manifest.json" ? !isCatalogManifest(value) : !isInventoryReport(value)) return undefined;
    return value as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Only these two declared publication timestamps are non-semantic. */
function timestampTolerantEqual(
  path: "manifest.json" | "reports/inventory.json",
  expected: string,
  actual: string,
): boolean {
  const expectedJson = parseTimestampTolerantJson(expected, path);
  const actualJson = parseTimestampTolerantJson(actual, path);
  if (expectedJson === undefined || actualJson === undefined) return false;
  const { generatedAt: _expectedGeneratedAt, ...expectedWithoutTimestamp } = expectedJson;
  const { generatedAt: _actualGeneratedAt, ...actualWithoutTimestamp } = actualJson;
  return stableJson(expectedWithoutTimestamp) === stableJson(actualWithoutTimestamp);
}

/** Existing immutable revisions may only be reactivated when all bytes match. */
function comparePublishedRevision(input: CatalogPublisherInput, revisionPath: string): string | null {
  const expected = buildFileMap(input);
  const actual = readPublishedFileMap(revisionPath);
  for (const [relativePath, content] of expected) {
    if (!actual.has(relativePath)) return `Immutable revision conflict: missing ${relativePath}.`;
    const existing = actual.get(relativePath)!;
    const timestampPath = relativePath === "manifest.json" || relativePath === "reports/inventory.json";
    if (existing !== content && (!timestampPath || !timestampTolerantEqual(relativePath, content, existing))) {
      return `Immutable revision conflict: content differs for ${relativePath}.`;
    }
  }
  for (const relativePath of actual.keys()) {
    if (!expected.has(relativePath)) return `Immutable revision conflict: unexpected ${relativePath}.`;
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

function parseJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

/** Validate the complete runtime artifact set before making it active. */
export function validatePublishedRevision(outputDir: string, revision: string): readonly string[] {
  const errors: string[] = [];
  if (!isCatalogRevision(revision)) return ["Catalog revision is invalid."];
  const revisionPath = path.join(outputDir, "catalog", "v1", "revisions", revision);
  if (!fs.existsSync(revisionPath) || !fs.statSync(revisionPath).isDirectory()) {
    return [`Revision directory does not exist: ${revisionPath}`];
  }
  if (path.basename(revisionPath).startsWith(".publish-temp")) {
    return ["Temporary publication directories cannot be activated."];
  }
  let manifest: CatalogManifest;
  try {
    const value = parseJsonFile(path.join(revisionPath, "manifest.json"));
    if (!isCatalogManifest(value)) throw new Error("manifest.json is not a valid runtime manifest.");
    manifest = value;
  } catch (error) {
    return [`Unable to validate manifest.json: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (manifest.catalogRevision !== revision) errors.push("Manifest catalogRevision does not match requested revision.");
  let sources: CatalogSource[];
  try {
    const value = parseJsonFile(path.join(revisionPath, "sources.json"));
    if (!Array.isArray(value) || !value.every(isCatalogSource)) throw new Error("sources.json is not a valid source list.");
    sources = value;
  } catch (error) {
    return [...errors, `Unable to validate sources.json: ${error instanceof Error ? error.message : String(error)}`];
  }
  const sourceIds = new Set(sources.map((source) => source.id));
  for (const kind of manifest.entityKinds) {
    const indexPath = path.join(revisionPath, "indexes", KIND_INDEX_FILENAME[kind]);
    try {
      const index = parseJsonFile(indexPath);
      if (!Array.isArray(index) || !index.every(isCatalogEntitySummary)) throw new Error("index is not a valid summary array.");
      for (const summary of index) {
        if (summary.kind !== kind) errors.push(`Index ${KIND_INDEX_FILENAME[kind]} contains a ${summary.kind} summary.`);
        if (!sourceIds.has(summary.sourceId)) errors.push(`Summary ${summary.id} references an unknown source.`);
        if (!summary.detailPath.startsWith(`entities/${kind}/`) || !summary.detailPath.endsWith(".json") || summary.detailPath.includes("..")) {
          errors.push(`Summary ${summary.id} has an invalid detail path.`);
        } else {
          const detailPath = path.join(revisionPath, summary.detailPath);
          if (!fs.existsSync(detailPath)) {
            errors.push(`Summary ${summary.id} detail file is missing.`);
          } else {
            const detail = parseJsonFile(detailPath);
            if (!isEntityDetailResponse(detail) || detail.id !== summary.id || detail.kind !== summary.kind || detail.sourceId !== summary.sourceId) {
              errors.push(`Summary ${summary.id} does not resolve to a valid matching detail.`);
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Unable to validate ${KIND_INDEX_FILENAME[kind]}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return Object.freeze(errors);
}

/** Atomically write the runtime's active-revision pointer after validating its target. */
export function publishCurrentCatalogRevision(input: { readonly outputDir: string; readonly revision: string; readonly pointerRename?: (from: string, to: string) => void }): PublishCurrentResult {
  const errors = [...validatePublishedRevision(input.outputDir, input.revision)];
  if (errors.length > 0) return Object.freeze({ success: false, pointerPath: "", errors: Object.freeze(errors) });
  const pointerDir = path.join(input.outputDir, "catalog", "v1");
  const pointerPath = path.join(pointerDir, "current.json");
  const tempPath = path.join(pointerDir, `.current-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    fs.mkdirSync(pointerDir, { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify(createCurrentRevision(input.revision), null, 2), "utf8");
    const pointer = parseJsonFile(tempPath);
    if (!isCurrentRevision(pointer) || Object.keys(pointer).length !== 1 || pointer.currentRevision !== input.revision) {
      throw new Error("Temporary current pointer failed runtime validation.");
    }
    (input.pointerRename ?? fs.renameSync)(tempPath, pointerPath);
    return Object.freeze({ success: true, pointerPath, errors: Object.freeze([]) });
  } catch (error) {
    try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort */ }
    return Object.freeze({ success: false, pointerPath: "", errors: Object.freeze([error instanceof Error ? error.message : String(error)]) });
  }
}

/** Publish an immutable revision, then atomically make it active. */
export function publishCatalogRelease(input: CatalogPublisherInput): PublishCatalogReleaseResult {
  const revision = input.manifest.catalogRevision;
  const finalPath = path.join(input.outputDir, "catalog", "v1", "revisions", revision);
  let publication: PublishResult;
  if (fs.existsSync(finalPath)) {
    const valid = validatePublishedRevision(input.outputDir, revision);
    if (valid.length > 0) return Object.freeze({ success: false, revisionPath: "", pointerPath: "", active: false, errors: Object.freeze(["Immutable revision conflict: existing revision is incomplete or invalid.", ...valid]), fileCount: 0 });
    try {
      const conflict = comparePublishedRevision(input, finalPath);
      if (conflict !== null) return Object.freeze({ success: false, revisionPath: finalPath, pointerPath: "", active: false, errors: Object.freeze([conflict]), fileCount: 0 });
    } catch (error) {
      return Object.freeze({ success: false, revisionPath: finalPath, pointerPath: "", active: false, errors: Object.freeze([`Unable to compare immutable revision: ${error instanceof Error ? error.message : String(error)}`]), fileCount: 0 });
    }
    publication = { success: true, revisionPath: finalPath, errors: [], fileCount: buildFileMap(input).size };
  } else {
    publication = publishCatalog(input);
    if (!publication.success) return Object.freeze({ ...publication, pointerPath: "", active: false });
  }
  const pointer = publishCurrentCatalogRevision({ outputDir: input.outputDir, revision, pointerRename: input.pointerRename });
  return Object.freeze({ success: pointer.success, revisionPath: publication.revisionPath, pointerPath: pointer.pointerPath, active: pointer.success, errors: pointer.errors, fileCount: publication.fileCount });
}

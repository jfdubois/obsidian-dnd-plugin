import { createHash } from "node:crypto";

/* ── Single-file SHA-256 checksum ──────────────────────────────── */

/**
 * Compute a SHA-256 hex digest of the given UTF-8 string.
 * Pure and deterministic: same input always produces the same output.
 */
export function computeChecksum(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/* ── Batch checksum computation ────────────────────────────────── */

/**
 * Compute SHA-256 checksums for a set of catalog files.
 * The returned record is sorted by file path for deterministic output.
 * The result object is frozen.
 */
export function computeChecksums(files: Record<string, string>): Record<string, string> {
  const checksums: Record<string, string> = {};
  const sortedPaths = Object.keys(files).sort();

  for (const path of sortedPaths) {
    const content = files[path];
    if (content !== undefined) {
      checksums[path] = computeChecksum(content);
    }
  }

  return Object.freeze(checksums);
}

import { execSync } from "child_process";
import { existsSync, statSync } from "fs";
import { resolve } from "path";

/* ── Error ─────────────────────────────────────────────────────── */

export class SourceManifestError extends Error {
  constructor(
    public readonly code: "NOT_GIT_REPO" | "PATH_NOT_FOUND" | "GIT_COMMAND_FAILED",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SourceManifestError";
  }
}

/* ── Types ─────────────────────────────────────────────────────── */

export interface SourceManifest {
  clonePath: string;
  commitHash: string;
  shortHash: string;
  subject: string;
  date: string;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isHex40(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function isHex7(value: string): boolean {
  return /^[0-9a-f]{7}$/.test(value);
}

function isIso8601Date(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/.test(value);
}

/* ── Validator ─────────────────────────────────────────────────── */

export function isSourceManifest(value: unknown): value is SourceManifest {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (!isNonEmptyString(obj.clonePath)) return false;
  if (typeof obj.commitHash !== "string" || !isHex40(obj.commitHash)) return false;
  if (typeof obj.shortHash !== "string" || !isHex7(obj.shortHash)) return false;
  if (!isNonEmptyString(obj.subject)) return false;
  if (typeof obj.date !== "string" || !isIso8601Date(obj.date)) return false;

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createSourceManifest(input: {
  clonePath: string;
  commitHash: string;
  shortHash: string;
  subject: string;
  date: string;
}): SourceManifest {
  return Object.freeze({
    clonePath: input.clonePath,
    commitHash: input.commitHash,
    shortHash: input.shortHash,
    subject: input.subject,
    date: input.date,
  });
}

/* ── Reader ────────────────────────────────────────────────────── */

function runGit(repoPath: string, args: string[]): string {
  try {
    return execSync(`git -C "${repoPath}" ${args.join(" ")}`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new SourceManifestError(
      "GIT_COMMAND_FAILED",
      `Git command failed: git ${args.join(" ")}`,
      error,
    );
  }
}

export function readSourceManifest(clonePath: string): SourceManifest {
  const resolvedPath = resolve(clonePath);

  if (!existsSync(resolvedPath)) {
    throw new SourceManifestError(
      "PATH_NOT_FOUND",
      `Path does not exist: ${resolvedPath}`,
    );
  }

  const stat = statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new SourceManifestError(
      "NOT_GIT_REPO",
      `Path is not a directory: ${resolvedPath}`,
    );
  }

  const gitDir = resolve(resolvedPath, ".git");
  if (!existsSync(gitDir)) {
    throw new SourceManifestError(
      "NOT_GIT_REPO",
      `Not a Git repository (no .git directory): ${resolvedPath}`,
    );
  }

  const commitHash = runGit(resolvedPath, ["rev-parse", "HEAD"]);
  const shortHash = runGit(resolvedPath, ["rev-parse", "--short", "HEAD"]);
  const subject = runGit(resolvedPath, ["log", "-1", "--format=%s"]);
  const date = runGit(resolvedPath, ["log", "-1", "--format=%aI"]);

  return createSourceManifest({
    clonePath: resolvedPath,
    commitHash,
    shortHash,
    subject,
    date,
  });
}

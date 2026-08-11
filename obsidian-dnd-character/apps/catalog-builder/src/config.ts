import type { Ruleset, SourceId } from "@obsidian-dnd/domain";
import { isRuleset } from "@obsidian-dnd/domain";
import { isSourceId } from "@obsidian-dnd/domain";

/* ── Build mode ───────────────────────────────────────────────── */

export type BuildMode = "full" | "incremental";

export const BUILD_MODES: readonly BuildMode[] = ["full", "incremental"];

/* ── Builder version ──────────────────────────────────────────── */

/**
 * Bumpable builder version suffix appended to catalog revisions.
 * Format: `5etools-{shortHash}-{BUILDER_VERSION}` (e.g., `5etools-3c5d9d3-b1`).
 * Bump this value whenever builder behavior changes that could alter catalog output
 * for the same source hash.
 */
export const BUILDER_VERSION = "b3";

export function isBuildMode(value: unknown): value is BuildMode {
  return value === "full" || value === "incremental";
}

/* ── Builder config ───────────────────────────────────────────── */

export interface BuilderConfig {
  clonePath: string;
  outputPath: string;
  includedRulesets: Ruleset[];
  contentPolicy: {
    enabledSourceIds: SourceId[];
    includeCore: true;
  };
  buildMode: BuildMode;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidRulesetArray(value: unknown): value is Ruleset[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  return value.every((item) => isRuleset(item));
}

function isValidSourceIdArray(value: unknown): value is SourceId[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => isSourceId(item));
}

function isValidContentPolicy(value: unknown): value is { enabledSourceIds: SourceId[]; includeCore: true; } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isValidSourceIdArray(obj.enabledSourceIds)) return false;
  if (obj.includeCore !== true) return false;
  return true;
}

export function isBuilderConfig(input: unknown): input is BuilderConfig {
  if (typeof input !== "object" || input === null) return false;
  const obj = input as Record<string, unknown>;

  if (!isNonEmptyString(obj.clonePath)) return false;
  if (!isNonEmptyString(obj.outputPath)) return false;
  if (!isValidRulesetArray(obj.includedRulesets)) return false;
  if (!isValidContentPolicy(obj.contentPolicy)) return false;
  if (!isBuildMode(obj.buildMode)) return false;

  return true;
}

/* ── Factory ──────────────────────────────────────────────────── */

export function createBuilderConfig(input: {
  clonePath: string;
  outputPath: string;
  includedRulesets: Ruleset[];
  contentPolicy: {
    enabledSourceIds: SourceId[];
    includeCore: true;
  };
  buildMode: BuildMode;
}): BuilderConfig {
  return Object.freeze({
    clonePath: input.clonePath,
    outputPath: input.outputPath,
    includedRulesets: Object.freeze([...input.includedRulesets]),
    contentPolicy: Object.freeze({
      enabledSourceIds: [...input.contentPolicy.enabledSourceIds],
      includeCore: true,
    }),
    buildMode: input.buildMode,
  }) as BuilderConfig;
}

/* ── Default configuration ────────────────────────────────────── */

export function defaultBuilderConfig(): BuilderConfig {
  return createBuilderConfig({
    clonePath: "./5eTools",
    outputPath: "./catalog",
    includedRulesets: ["2014", "2024"],
    contentPolicy: {
      enabledSourceIds: [],
      includeCore: true,
    },
    buildMode: "full",
  });
}

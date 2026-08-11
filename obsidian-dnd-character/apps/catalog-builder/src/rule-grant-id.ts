import { createRuleGrantId, type RuleGrantId } from "@obsidian-dnd/domain";

/**
 * Builds a catalog-owned consequence identity from its normalized owner and
 * source-local path. The path is semantic source provenance, never display
 * text, and must be unique in the supplied owner scope.
 */
export function createDeterministicRuleGrantId(ownerScope: string, sourcePath: string): RuleGrantId {
  const owner = normalizeSegment(ownerScope);
  const path = normalizeSegment(sourcePath);
  if (owner.length === 0 || path.length === 0) {
    throw new Error("RuleGrantId requires a non-empty owner scope and source path");
  }
  return createRuleGrantId(`grant:${owner}:${path}`);
}

function normalizeSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").replace(/-+/g, "-");
}

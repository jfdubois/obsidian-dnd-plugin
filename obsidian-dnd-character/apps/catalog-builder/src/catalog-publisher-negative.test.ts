import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { publishCatalog, type CatalogPublisherInput } from "./catalog-publisher";
import {
  createValidInput,
  createTempRoot,
  cleanupTempRoot,
} from "./catalog-publisher-test-helpers";

let tempRoot: string;

beforeEach(() => {
  tempRoot = createTempRoot();
});

afterEach(() => {
  cleanupTempRoot(tempRoot);
});

describe("publishCatalog — negative", () => {
  it("rejects invalid validation report", () => {
    const base = createValidInput(tempRoot);
    const input: CatalogPublisherInput = {
      ...base,
      validationReport: Object.freeze({
        valid: false,
        duplicateIds: Object.freeze(["human"]),
        unresolvedReferences: Object.freeze([]),
        rulesetCoverage: Object.freeze([]),
        accessClassification: Object.freeze([]),
        effectsWithoutAutomation: 0,
        effectsWithoutProvenance: 0,
        unmappedNarrativeCount: 0,
        diagnostics: Object.freeze([
          Object.freeze({
            code: "DUPLICATE_ID",
            severity: "error" as const,
            message: "Duplicate entity ID: human",
          }),
        ]),
      }),
    };

    const result = publishCatalog(input);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Validation report failed");
    expect(result.fileCount).toBe(0);
    expect(result.revisionPath).toBe("");
  });

  it("freezes failed result", () => {
    const base = createValidInput(tempRoot);
    const input: CatalogPublisherInput = {
      ...base,
      validationReport: Object.freeze({
        valid: false,
        duplicateIds: Object.freeze([]),
        unresolvedReferences: Object.freeze([]),
        rulesetCoverage: Object.freeze([]),
        accessClassification: Object.freeze([]),
        effectsWithoutAutomation: 0,
        effectsWithoutProvenance: 0,
        unmappedNarrativeCount: 0,
        diagnostics: Object.freeze([]),
      }),
    };

    const result = publishCatalog(input);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  it("does not create final directory on validation failure", () => {
    const base = createValidInput(tempRoot);
    const input: CatalogPublisherInput = {
      ...base,
      validationReport: Object.freeze({
        valid: false,
        duplicateIds: Object.freeze(["dup"]),
        unresolvedReferences: Object.freeze([]),
        rulesetCoverage: Object.freeze([]),
        accessClassification: Object.freeze([]),
        effectsWithoutAutomation: 0,
        effectsWithoutProvenance: 0,
        unmappedNarrativeCount: 0,
        diagnostics: Object.freeze([]),
      }),
    };

    publishCatalog(input);

    const finalDir = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001",
    );
    expect(fs.existsSync(finalDir)).toBe(false);
  });

  it("reports unresolved references in error message", () => {
    const base = createValidInput(tempRoot);
    const input: CatalogPublisherInput = {
      ...base,
      validationReport: Object.freeze({
        valid: false,
        duplicateIds: Object.freeze([]),
        unresolvedReferences: Object.freeze([
          Object.freeze({ fromId: "a", toId: "b", referenceKind: "prerequisite" }),
        ]),
        rulesetCoverage: Object.freeze([]),
        accessClassification: Object.freeze([]),
        effectsWithoutAutomation: 0,
        effectsWithoutProvenance: 0,
        unmappedNarrativeCount: 0,
        diagnostics: Object.freeze([]),
      }),
    };

    const result = publishCatalog(input);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Unresolved references: 1");
  });
});

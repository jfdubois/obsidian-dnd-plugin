/**
 * Tests for the entity detail response validation.
 *
 * Validates that isEntityDetailResponse:
 * - Accepts all known entity rule types
 * - Rejects invalid data (null, non-object, missing fields)
 * - Correctly dispatches to kind-specific validators
 */

import { describe, it, expect } from "vitest";
import { isEntityDetailResponse } from "./entity-detail";
import { createSpeciesRule } from "./entity-species";
import { createRenderParagraph } from "./render-node";
import {
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";

/* ── Helpers ───────────────────────────────────────────────────── */

function createMockSpecies() {
  return createSpeciesRule(
    createEntityId("species:2024:xphb:human"),
    "Human",
    createSourceId("xphb"),
    "2024",
    "core",
    "Medium",
    30,
    false,
    [],
    [],
    [createRenderParagraph("A classic humanoid species.")],
    [],
    [],
    [],
    [],
    false,
  );
}

/* ── Positive tests ────────────────────────────────────────────── */

describe("isEntityDetailResponse positive", () => {
  it("accepts valid species rule", () => {
    const species = createMockSpecies();
    expect(isEntityDetailResponse(species)).toBe(true);
  });

  it("narrows type on success", () => {
    const species = createMockSpecies();
    if (isEntityDetailResponse(species)) {
      expect(species.kind).toBe("species");
      expect(species.name).toBe("Human");
    }
  });
});

/* ── Negative tests ────────────────────────────────────────────── */

describe("isEntityDetailResponse negative", () => {
  it("rejects null", () => {
    expect(isEntityDetailResponse(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isEntityDetailResponse(undefined)).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isEntityDetailResponse(42)).toBe(false);
    expect(isEntityDetailResponse("not an object")).toBe(false);
    expect(isEntityDetailResponse(true)).toBe(false);
  });

  it("rejects empty object", () => {
    expect(isEntityDetailResponse({})).toBe(false);
  });

  it("rejects object missing required fields", () => {
    expect(
      isEntityDetailResponse({
        name: "Test",
        kind: "species",
      }),
    ).toBe(false);
  });

  it("rejects object with invalid kind", () => {
    expect(
      isEntityDetailResponse({
        id: createEntityId("species:2024:xphb:human"),
        kind: "monster",
        name: "Test",
        sourceId: createSourceId("xphb"),
        ruleset: "2024",
        access: "core",
        legacy: false,
      }),
    ).toBe(false);
  });

  it("rejects object with missing id", () => {
    expect(
      isEntityDetailResponse({
        kind: "species",
        name: "Test",
        sourceId: createSourceId("xphb"),
        ruleset: "2024",
        access: "core",
        legacy: false,
      }),
    ).toBe(false);
  });

  it("rejects object with empty name", () => {
    expect(
      isEntityDetailResponse({
        id: createEntityId("species:2024:xphb:human"),
        kind: "species",
        name: "",
        sourceId: createSourceId("xphb"),
        ruleset: "2024",
        access: "core",
        legacy: false,
      }),
    ).toBe(false);
  });

  it("rejects object with invalid ruleset", () => {
    expect(
      isEntityDetailResponse({
        id: createEntityId("species:2024:xphb:human"),
        kind: "species",
        name: "Test",
        sourceId: createSourceId("xphb"),
        ruleset: "invalid",
        access: "core",
        legacy: false,
      }),
    ).toBe(false);
  });

  it("rejects object with non-boolean legacy", () => {
    expect(
      isEntityDetailResponse({
        id: createEntityId("species:2024:xphb:human"),
        kind: "species",
        name: "Test",
        sourceId: createSourceId("xphb"),
        ruleset: "2024",
        access: "core",
        legacy: "yes",
      }),
    ).toBe(false);
  });

  it("rejects species rule missing species-specific fields", () => {
    expect(
      isEntityDetailResponse({
        id: createEntityId("species:2024:xphb:human"),
        kind: "species",
        name: "Human",
        sourceId: createSourceId("xphb"),
        ruleset: "2024",
        access: "core",
        legacy: false,
        // Missing: content, prerequisites, effects, choices,
        // dependencies, size, speed, darkvision, languageIds, traitDefs
      }),
    ).toBe(false);
  });
});

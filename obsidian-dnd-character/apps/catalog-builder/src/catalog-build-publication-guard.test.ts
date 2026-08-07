import { describe, it, expect } from "vitest";
import type { CatalogableEntity } from "./compact-index-tag-generator.js";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import { validateRequiredEntityKinds, REQUIRED_ENTITY_KINDS } from "./catalog-build-publication-guard.js";

/* ── Minimal entity factory ──────────────────────────────────────── */

function makeEntity(kind: string): CatalogableEntity {
  return {
    id: createEntityId(`test-${kind}-001`),
    kind: kind as CatalogableEntity["kind"],
    name: `Test ${kind}`,
    sourceId: createSourceId("PHB"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    content: [],
    prerequisites: [],
    effects: [],
    choices: [],
    dependencies: [],
  } as unknown as CatalogableEntity;
}

/* ── Required kinds constant ─────────────────────────────────────── */

describe("REQUIRED_ENTITY_KINDS", () => {
  it("contains exactly six required kinds", () => {
    expect(REQUIRED_ENTITY_KINDS.size).toBe(6);
  });

  it("includes species, background, class, feat, spell, item", () => {
    expect(REQUIRED_ENTITY_KINDS.has("species")).toBe(true);
    expect(REQUIRED_ENTITY_KINDS.has("background")).toBe(true);
    expect(REQUIRED_ENTITY_KINDS.has("class")).toBe(true);
    expect(REQUIRED_ENTITY_KINDS.has("feat")).toBe(true);
    expect(REQUIRED_ENTITY_KINDS.has("spell")).toBe(true);
    expect(REQUIRED_ENTITY_KINDS.has("item")).toBe(true);
  });

  it("is frozen and immutable", () => {
    expect(Object.isFrozen(REQUIRED_ENTITY_KINDS)).toBe(true);
  });
});

/* ── validateRequiredEntityKinds — positive cases ────────────────── */

describe("validateRequiredEntityKinds — positive", () => {
  it("passes when all six required kinds are present", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
      makeEntity("background"),
      makeEntity("class"),
      makeEntity("feat"),
      makeEntity("spell"),
      makeEntity("item"),
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors).toEqual([]);
  });

  it("passes when all required kinds present plus extra kinds", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
      makeEntity("background"),
      makeEntity("class"),
      makeEntity("feat"),
      makeEntity("spell"),
      makeEntity("item"),
      makeEntity("subclass"),
      makeEntity("class-feature"),
      makeEntity("skill"),
      makeEntity("language"),
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors).toEqual([]);
  });

  it("passes with multiple entities per required kind", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
      makeEntity("species"),
      makeEntity("background"),
      makeEntity("background"),
      makeEntity("class"),
      makeEntity("feat"),
      makeEntity("spell"),
      makeEntity("item"),
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors).toEqual([]);
  });

  it("returns frozen array", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
      makeEntity("background"),
      makeEntity("class"),
      makeEntity("feat"),
      makeEntity("spell"),
      makeEntity("item"),
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(Object.isFrozen(errors)).toBe(true);
  });
});

/* ── validateRequiredEntityKinds — negative cases ────────────────── */

describe("validateRequiredEntityKinds — negative", () => {
  it("fails when a single required kind is missing", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
      makeEntity("background"),
      makeEntity("class"),
      makeEntity("feat"),
      makeEntity("spell"),
      // missing "item"
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("item");
  });

  it("fails when feat is missing (known gap)", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
      makeEntity("background"),
      makeEntity("class"),
      // missing "feat"
      makeEntity("spell"),
      makeEntity("item"),
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("feat");
  });

  it("fails when all required kinds are missing", () => {
    const entities: CatalogableEntity[] = [];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors.length).toBeGreaterThan(0);
    // Header + 6 missing kind lines
    expect(errors.length).toBe(7);
    expect(errors[0]).toContain("species");
    expect(errors[0]).toContain("background");
    expect(errors[0]).toContain("class");
    expect(errors[0]).toContain("feat");
    expect(errors[0]).toContain("spell");
    expect(errors[0]).toContain("item");
  });

  it("lists each missing kind with actionable detail", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
      // missing background, class, feat, spell, item
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors.length).toBe(6); // 1 header + 5 detail lines
    expect(errors[0]).toContain("Publication guard");
    expect(errors[0]).toContain("missing required entity kind(s)");
    // Each missing kind gets its own line
    expect(errors.some((e) => e.includes('"background"'))).toBe(true);
    expect(errors.some((e) => e.includes('"class"'))).toBe(true);
    expect(errors.some((e) => e.includes('"feat"'))).toBe(true);
    expect(errors.some((e) => e.includes('"spell"'))).toBe(true);
    expect(errors.some((e) => e.includes('"item"'))).toBe(true);
  });

  it("fails when only non-required kinds are present", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("subclass"),
      makeEntity("class-feature"),
      makeEntity("skill"),
      makeEntity("language"),
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(errors.length).toBe(7); // 1 header + 6 missing kinds
    expect(errors[0]).toContain("Publication guard");
  });

  it("returns frozen error array on failure", () => {
    const entities: CatalogableEntity[] = [
      makeEntity("species"),
    ];

    const errors = validateRequiredEntityKinds(entities);
    expect(Object.isFrozen(errors)).toBe(true);
  });
});

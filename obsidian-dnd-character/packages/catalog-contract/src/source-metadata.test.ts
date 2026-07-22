import { describe, it, expect } from "vitest";
import {
  createCatalogSource,
  isCatalogSource,
  type CatalogSource,
} from "./source-metadata";
import { createSourceId } from "@obsidian-dnd/domain";

describe("CatalogSource", () => {
  const validSource: CatalogSource = createCatalogSource({
    id: createSourceId("phb"),
    name: "Player's Handbook",
    abbreviation: "PHB",
    ruleset: "2024",
    category: "core",
  });

  it("factory produces valid source", () => {
    expect(isCatalogSource(validSource)).toBe(true);
  });

  it("validator accepts minimal valid source", () => {
    const minimal: unknown = {
      id: "xphb",
      name: "Expanded Player's Handbook",
      abbreviation: "XPHB",
      ruleset: "2024",
      category: "core",
    };
    expect(isCatalogSource(minimal)).toBe(true);
  });

  it("validator accepts source with published year", () => {
    const withPublished: unknown = {
      id: "phb-2014",
      name: "Player's Handbook",
      abbreviation: "PHB",
      ruleset: "2014",
      published: "2014-11-01",
      category: "core",
    };
    expect(isCatalogSource(withPublished)).toBe(true);
  });

  it("validator accepts all source categories", () => {
    const categories: ("core" | "supplement" | "setting" | "adventure" | "other")[] = [
      "core",
      "supplement",
      "setting",
      "adventure",
      "other",
    ];
    for (const cat of categories) {
      const source: unknown = {
        id: "test",
        name: "Test",
        abbreviation: "T",
        ruleset: "2024",
        category: cat,
      };
      expect(isCatalogSource(source)).toBe(true);
    }
  });

  it("validator accepts both rulesets", () => {
    const rulesets: ("2014" | "2024")[] = ["2014", "2024"];
    for (const rs of rulesets) {
      const source: unknown = {
        id: "test",
        name: "Test",
        abbreviation: "T",
        ruleset: rs,
        category: "core",
      };
      expect(isCatalogSource(source)).toBe(true);
    }
  });

  /* ── Negative: id ──────────────────────────────────────────── */

  it("validator rejects empty id", () => {
    const invalid: unknown = { ...validSource, id: "" };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  it("validator rejects missing id", () => {
    const { id: _id, ...rest } = validSource;
    expect(isCatalogSource(rest)).toBe(false);
  });

  it("validator rejects non-string id", () => {
    const invalid: unknown = { ...validSource, id: 123 };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  /* ── Negative: name ────────────────────────────────────────── */

  it("validator rejects empty name", () => {
    const invalid: unknown = { ...validSource, name: "" };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  it("validator rejects missing name", () => {
    const { name: _name, ...rest } = validSource;
    expect(isCatalogSource(rest)).toBe(false);
  });

  it("validator rejects non-string name", () => {
    const invalid: unknown = { ...validSource, name: 42 };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  /* ── Negative: abbreviation ────────────────────────────────── */

  it("validator rejects empty abbreviation", () => {
    const invalid: unknown = { ...validSource, abbreviation: "" };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  it("validator rejects missing abbreviation", () => {
    const { abbreviation: _abbreviation, ...rest } = validSource;
    expect(isCatalogSource(rest)).toBe(false);
  });

  it("validator rejects non-string abbreviation", () => {
    const invalid: unknown = { ...validSource, abbreviation: null };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  /* ── Negative: ruleset ─────────────────────────────────────── */

  it("validator rejects unknown ruleset", () => {
    const invalid: unknown = { ...validSource, ruleset: "2025" };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  it("validator rejects missing ruleset", () => {
    const { ruleset: _ruleset, ...rest } = validSource;
    expect(isCatalogSource(rest)).toBe(false);
  });

  it("validator rejects non-string ruleset", () => {
    const invalid: unknown = { ...validSource, ruleset: 2024 };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  /* ── Negative: published ───────────────────────────────────── */

  it("validator rejects empty published", () => {
    const invalid: unknown = { ...validSource, published: "" };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  it("validator rejects non-string published", () => {
    const invalid: unknown = { ...validSource, published: 2024 };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  it("validator accepts undefined published", () => {
    const source: unknown = {
      id: "test",
      name: "Test",
      abbreviation: "T",
      ruleset: "2024",
      published: undefined,
      category: "core",
    };
    expect(isCatalogSource(source)).toBe(true);
  });

  /* ── Negative: category ────────────────────────────────────── */

  it("validator rejects unknown category", () => {
    const invalid: unknown = { ...validSource, category: "vtt" };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  it("validator rejects missing category", () => {
    const { category: _category, ...rest } = validSource;
    expect(isCatalogSource(rest)).toBe(false);
  });

  it("validator rejects non-string category", () => {
    const invalid: unknown = { ...validSource, category: 1 };
    expect(isCatalogSource(invalid)).toBe(false);
  });

  /* ── Negative: type boundaries ─────────────────────────────── */

  it("validator rejects null", () => {
    expect(isCatalogSource(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isCatalogSource(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isCatalogSource("phb")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isCatalogSource(42)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isCatalogSource([])).toBe(false);
  });

  it("validator rejects empty object", () => {
    expect(isCatalogSource({})).toBe(false);
  });
});

describe("round-trip", () => {
  it("factory + validator round-trips minimal", () => {
    const source = createCatalogSource({
      id: createSourceId("phb"),
      name: "Player's Handbook",
      abbreviation: "PHB",
      ruleset: "2024",
      category: "core",
    });
    expect(isCatalogSource(source)).toBe(true);
    expect(source.id).toBe(source.id);
    expect(source.name).toBe("Player's Handbook");
    expect(source.abbreviation).toBe("PHB");
    expect(source.ruleset).toBe("2024");
    expect(source.category).toBe("core");
    expect(source.published).toBeUndefined();
  });

  it("factory + validator round-trips with published", () => {
    const source = createCatalogSource({
      id: createSourceId("dmg"),
      name: "Dungeon Master's Guide",
      abbreviation: "DMG",
      ruleset: "2014",
      published: "2014-11-13",
      category: "core",
    });
    expect(isCatalogSource(source)).toBe(true);
    expect(source.published).toBe("2014-11-13");
  });

  it("factory preserves all categories", () => {
    const categories: ("core" | "supplement" | "setting" | "adventure" | "other")[] = [
      "core",
      "supplement",
      "setting",
      "adventure",
      "other",
    ];
    for (const cat of categories) {
      const source = createCatalogSource({
        id: createSourceId("test"),
        name: "Test",
        abbreviation: "T",
        ruleset: "2024",
        category: cat,
      });
      expect(isCatalogSource(source)).toBe(true);
      expect(source.category).toBe(cat);
    }
  });
});

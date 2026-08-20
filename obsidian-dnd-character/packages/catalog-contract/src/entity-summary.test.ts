import { describe, it, expect } from "vitest";
import {
  createCatalogEntitySummary,
  createCatalogItemSummary,
  isCatalogItemSummary,
  isCatalogEntitySummary,
  type CatalogEntitySummary,
} from "./entity-summary";
import type { RuleEntityKind } from "@obsidian-dnd/domain";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";

describe("CatalogEntitySummary", () => {
  const validSummary: CatalogEntitySummary = createCatalogEntitySummary({
    id: createEntityId("class:2024:xphb:fighter"),
    kind: "class",
    name: "Fighter",
    sourceId: createSourceId("xphb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    tags: ["martial", "core"],
    detailPath: "entities/classes/class:2024:xphb:fighter.json",
  });

  it("factory produces valid summary", () => {
    expect(isCatalogEntitySummary(validSummary)).toBe(true);
  });

  it("validator accepts minimal valid summary", () => {
    const minimal: unknown = {
      id: "spell:2024:xphb:firebolt",
      kind: "spell",
      name: "Firebolt",
      sourceId: "xphb",
      ruleset: "2024",
      access: "core",
      legacy: false,
      tags: [],
      detailPath: "entities/spells/spell:2024:xphb:firebolt.json",
    };
    expect(isCatalogEntitySummary(minimal)).toBe(true);
  });

  it("validator accepts summary with legacy true", () => {
    const legacy: unknown = {
      id: "feat:2014:phb:tough",
      kind: "feat",
      name: "Tough",
      sourceId: "phb",
      ruleset: "2014",
      access: "core",
      legacy: true,
      tags: ["feat"],
      detailPath: "entities/feats/feat:2014:phb:tough.json",
    };
    expect(isCatalogEntitySummary(legacy)).toBe(true);
  });

  it("validator accepts summary with multiple tags", () => {
    const tagged: unknown = {
      id: "species:2024:xphb:elf",
      kind: "species",
      name: "Elf",
      sourceId: "xphb",
      ruleset: "2024",
      access: "core",
      legacy: false,
      tags: ["core", "dexterious", "long-lived"],
      detailPath: "entities/species/species:2024:xphb:elf.json",
    };
    expect(isCatalogEntitySummary(tagged)).toBe(true);
  });

  it("validator accepts source access", () => {
    const sourceAccess: unknown = {
      id: "item:2024:xdmtn:amulet-health",
      kind: "item",
      name: "Amulet of Health",
      sourceId: "xdmtn",
      ruleset: "2024",
      access: "source",
      legacy: false,
      tags: ["magic-item"],
      detailPath: "entities/items/item:2024:xdmtn:amulet-health.json",
    };
    expect(isCatalogEntitySummary(sourceAccess)).toBe(true);
  });

  it("requires normalized equipment groups for the item-index refinement", () => {
    const item: unknown = {
      id: "item:2014:phb:club",
      kind: "item",
      name: "Club",
      sourceId: "phb",
      ruleset: "2014",
      access: "core",
      legacy: true,
      tags: ["weapon"],
      detailPath: "entities/item/item:2014:phb:club.json",
      equipmentGroups: ["simple-weapon", "simple-melee-weapon"],
    };
    expect(isCatalogItemSummary(item)).toBe(true);
    expect(isCatalogItemSummary({ ...(item as Record<string, unknown>), equipmentGroups: ["weapon"] })).toBe(false);
    const { equipmentGroups: _equipmentGroups, ...legacyItem } = item as Record<string, unknown>;
    expect(isCatalogItemSummary(legacyItem)).toBe(false);
  });

  it("keeps equipment metadata item-only and permits valid empty item groups", () => {
    const item = createCatalogItemSummary({
      id: createEntityId("item:2024:xphb:rope"), kind: "item", name: "Rope",
      sourceId: createSourceId("xphb"), ruleset: "2024", access: "core", legacy: false,
      tags: ["adventuring-gear"], detailPath: "entities/item/item:2024:xphb:rope.json", equipmentGroups: [],
    });
    expect(isCatalogItemSummary(item)).toBe(true);
    expect(isCatalogEntitySummary({ ...validSummary, equipmentGroups: ["simple-weapon"] })).toBe(false);
  });

  it("validator accepts all entity kinds", () => {
    const kinds: RuleEntityKind[] = [
      "species", "background", "class", "subclass", "class-feature",
      "subclass-feature", "feat", "spell", "item", "optional-feature",
      "skill", "language",
    ];
    for (const kind of kinds) {
      const summary: unknown = {
        id: `test:${kind}`,
        kind,
        name: "Test",
        sourceId: "test",
        ruleset: "2024",
        access: "core",
        legacy: false,
        tags: [],
        detailPath: "test.json",
      };
      expect(isCatalogEntitySummary(summary)).toBe(true);
    }
  });

  it("factory creates immutable copy of tags", () => {
    const tags = ["martial"];
    const summary = createCatalogEntitySummary({
      id: createEntityId("class:2024:xphb:fighter"),
      kind: "class",
      name: "Fighter",
      sourceId: createSourceId("xphb"),
      ruleset: "2024",
      access: "core",
      legacy: false,
      tags,
      detailPath: "entities/classes/fighter.json",
    });
    tags.push("melee");
    expect(summary.tags).toHaveLength(1);
  });

  /* ── Negative: id ──────────────────────────────────────────── */

  it("validator rejects empty id", () => {
    const invalid: unknown = { ...validSummary, id: "" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing id", () => {
    const { id: _id, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: kind ────────────────────────────────────────── */

  it("validator rejects unknown kind", () => {
    const invalid: unknown = { ...validSummary, kind: "monster" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing kind", () => {
    const { kind: _kind, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: name ────────────────────────────────────────── */

  it("validator rejects empty name", () => {
    const invalid: unknown = { ...validSummary, name: "" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing name", () => {
    const { name: _name, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: sourceId ────────────────────────────────────── */

  it("validator rejects empty sourceId", () => {
    const invalid: unknown = { ...validSummary, sourceId: "" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing sourceId", () => {
    const { sourceId: _sourceId, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: ruleset ─────────────────────────────────────── */

  it("validator rejects unknown ruleset", () => {
    const invalid: unknown = { ...validSummary, ruleset: "2025" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing ruleset", () => {
    const { ruleset: _ruleset, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: access ──────────────────────────────────────── */

  it("validator rejects unknown access", () => {
    const invalid: unknown = { ...validSummary, access: "free" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing access", () => {
    const { access: _access, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: legacy ──────────────────────────────────────── */

  it("validator rejects non-boolean legacy", () => {
    const invalid: unknown = { ...validSummary, legacy: "true" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing legacy", () => {
    const { legacy: _legacy, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: tags ────────────────────────────────────────── */

  it("validator rejects non-array tags", () => {
    const invalid: unknown = { ...validSummary, tags: "martial" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects tags with empty string", () => {
    const invalid: unknown = { ...validSummary, tags: ["martial", ""] };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects tags with non-string", () => {
    const invalid: unknown = { ...validSummary, tags: [123] };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing tags", () => {
    const { tags: _tags, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  /* ── Negative: detailPath ──────────────────────────────────── */

  it("validator rejects empty detailPath", () => {
    const invalid: unknown = { ...validSummary, detailPath: "" };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  it("validator rejects missing detailPath", () => {
    const { detailPath: _detailPath, ...rest } = validSummary;
    expect(isCatalogEntitySummary(rest)).toBe(false);
  });

  it("validator rejects non-string detailPath", () => {
    const invalid: unknown = { ...validSummary, detailPath: 42 };
    expect(isCatalogEntitySummary(invalid)).toBe(false);
  });

  /* ── Negative: type boundaries ─────────────────────────────── */

  it("validator rejects null", () => {
    expect(isCatalogEntitySummary(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isCatalogEntitySummary(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isCatalogEntitySummary("fighter")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isCatalogEntitySummary(42)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isCatalogEntitySummary([])).toBe(false);
  });

  it("validator rejects empty object", () => {
    expect(isCatalogEntitySummary({})).toBe(false);
  });
});

describe("round-trip", () => {
  it("factory + validator round-trips", () => {
    const summary = createCatalogEntitySummary({
      id: createEntityId("background:2024:xphb:soldier"),
      kind: "background",
      name: "Soldier",
      sourceId: createSourceId("xphb"),
      ruleset: "2024",
      access: "core",
      legacy: false,
      tags: ["martial", "core"],
      detailPath: "entities/backgrounds/background:2024:xphb:soldier.json",
    });
    expect(isCatalogEntitySummary(summary)).toBe(true);
    expect(summary.kind).toBe("background");
    expect(summary.access).toBe("core");
    expect(summary.legacy).toBe(false);
    expect(summary.tags).toEqual(["martial", "core"]);
  });

  it("factory + validator round-trips legacy 2014", () => {
    const summary = createCatalogEntitySummary({
      id: createEntityId("class:2014:phb:barbarian"),
      kind: "class",
      name: "Barbarian",
      sourceId: createSourceId("phb"),
      ruleset: "2014",
      access: "core",
      legacy: true,
      tags: ["martial", "strength", "core"],
      detailPath: "entities/classes/class:2014:phb:barbarian.json",
    });
    expect(isCatalogEntitySummary(summary)).toBe(true);
    expect(summary.ruleset).toBe("2014");
    expect(summary.legacy).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import {
  isCatalogQuery,
  isSpellAcquisitionMode,
  isProficiencyQueryKind,
  isEquipmentCategory,
  isEquipmentRarity,
  isEquipmentBodySlot,
  isEquipmentGroup,
  createEntityQuery,
  createSpellQuery,
  createProficiencyQuery,
  createEquipmentQuery,
  type CatalogQuery,
} from "./query";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";

describe("SpellAcquisitionMode", () => {
  it("guard accepts all known modes", () => {
    for (const mode of ["known", "prepared", "always-prepared", "ritual"]) {
      expect(isSpellAcquisitionMode(mode)).toBe(true);
    }
  });

  it("guard rejects unknown mode", () => {
    expect(isSpellAcquisitionMode("inspired")).toBe(false);
  });

  it("guard rejects non-string", () => {
    expect(isSpellAcquisitionMode(42)).toBe(false);
  });
});

describe("ProficiencyQueryKind", () => {
  it("guard accepts all known kinds", () => {
    for (const kind of ["tool", "skill", "saving-throw", "armor"]) {
      expect(isProficiencyQueryKind(kind)).toBe(true);
    }
  });

  it("guard rejects unknown kind", () => {
    expect(isProficiencyQueryKind("language")).toBe(false);
  });
});

describe("EquipmentCategory", () => {
  it("guard accepts all known categories", () => {
    for (const cat of ["weapon", "armor", "adventuring-gear", "consumable", "service", "other"]) {
      expect(isEquipmentCategory(cat)).toBe(true);
    }
  });

  it("guard rejects unknown category", () => {
    expect(isEquipmentCategory("potion")).toBe(false);
  });
});

describe("EquipmentRarity", () => {
  it("guard accepts all known rarities", () => {
    for (const rarity of ["common", "uncommon", "rare", "very-rare", "legendary", "artifact"]) {
      expect(isEquipmentRarity(rarity)).toBe(true);
    }
  });

  it("guard rejects unknown rarity", () => {
    expect(isEquipmentRarity("epic")).toBe(false);
  });
});

describe("EquipmentBodySlot", () => {
  it("guard accepts all known slots", () => {
    for (const slot of [
      "amulet",
      "armor",
      "belt",
      "boots",
      "cloak",
      "eyes",
      "head",
      "hands",
      "ring",
      "shield",
      "weapon",
      "wings",
      "wrist",
    ]) {
      expect(isEquipmentBodySlot(slot)).toBe(true);
    }
  });

  it("guard rejects unknown slot", () => {
    expect(isEquipmentBodySlot("neck")).toBe(false);
  });
});

describe("EquipmentGroup", () => {
  it("accepts the finite normalized values and rejects raw source tokens", () => {
    expect(isEquipmentGroup("artisan-tool")).toBe(true);
    expect(isEquipmentGroup("druidic-spellcasting-focus")).toBe(true);
    expect(isEquipmentGroup("toolArtisan")).toBe(false);
  });
});

describe("CatalogQuery", () => {
  it("accepts typed starting-equipment eligibility constraints and rejects duplicates", () => {
    expect(isCatalogQuery({ type: "equipment", equipmentGroups: ["simple-melee-weapon"], sourceId: "phb", eligibility: ["basic"] })).toBe(true);
    expect(isCatalogQuery({ type: "equipment", equipmentGroups: ["simple-melee-weapon"], eligibility: ["basic", "basic"] })).toBe(false);
    expect(isCatalogQuery({ type: "equipment", equipmentGroups: ["simple-melee-weapon"], eligibility: ["magic"] })).toBe(false);
  });
  /* ── Positive: entity ────────────────────────────────────────── */

  it("validator accepts entity query with kind only", () => {
    const query: unknown = { type: "entity", kind: "feat" };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts entity query with all optional fields", () => {
    const query: unknown = {
      type: "entity",
      kind: "spell",
      sourceId: "xphb",
      access: "core",
      tags: ["damage", "fire"],
      excludeLegacy: true,
    };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts entity query for each entity kind", () => {
    for (const kind of [
      "species",
      "background",
      "class",
      "subclass",
      "feat",
      "spell",
      "item",
      "optional-feature",
    ]) {
      const query: unknown = { type: "entity", kind };
      expect(isCatalogQuery(query)).toBe(true);
    }
  });

  /* ── Positive: spell ─────────────────────────────────────────── */

  it("validator accepts spell query with no options", () => {
    const query: unknown = { type: "spell" };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts spell query with classId", () => {
    const query: unknown = { type: "spell", classId: "class:2024:xphb:wizard" };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts spell query with all options", () => {
    const query: unknown = {
      type: "spell",
      classId: "class:2024:xphb:wizard",
      subclassId: "subclass:2024:xphb:wizard:evocation",
      maxSpellLevel: 3,
      acquisitionMode: "prepared",
      excludeKnown: ["spell:2024:xphb:firebolt"],
    };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts spell query with maxSpellLevel 0", () => {
    const query: unknown = { type: "spell", maxSpellLevel: 0 };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts spell query with each acquisition mode", () => {
    for (const mode of ["known", "prepared", "always-prepared", "ritual"]) {
      const query: unknown = { type: "spell", acquisitionMode: mode };
      expect(isCatalogQuery(query)).toBe(true);
    }
  });

  /* ── Positive: proficiency ──────────────────────────────────── */

  it("validator accepts proficiency query for each kind", () => {
    for (const kind of ["tool", "skill", "saving-throw", "armor"]) {
      const query: unknown = { type: "proficiency", kind };
      expect(isCatalogQuery(query)).toBe(true);
    }
  });

  /* ── Positive: equipment ─────────────────────────────────────── */

  it("validator accepts equipment query with no options", () => {
    const query: unknown = { type: "equipment" };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts equipment query with category", () => {
    const query: unknown = { type: "equipment", category: "weapon" };
    expect(isCatalogQuery(query)).toBe(true);
  });

  it("validator accepts equipment query with all options", () => {
    const query: unknown = {
      type: "equipment",
      category: "armor",
      rarity: "uncommon",
      bodySlot: "armor",
      sourceId: "xphb",
      access: "core",
    };
    expect(isCatalogQuery(query)).toBe(true);
  });

  /* ── Negative: entity ────────────────────────────────────────── */

  it("validator rejects entity query with missing kind", () => {
    const query: unknown = { type: "entity" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects entity query with invalid kind", () => {
    const query: unknown = { type: "entity", kind: "monster" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects entity query with non-string kind", () => {
    const query: unknown = { type: "entity", kind: 42 };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects entity query with invalid sourceId", () => {
    const query: unknown = { type: "entity", kind: "feat", sourceId: "" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects entity query with invalid access", () => {
    const query: unknown = { type: "entity", kind: "feat", access: "free" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects entity query with non-array tags", () => {
    const query: unknown = { type: "entity", kind: "feat", tags: "damage" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects entity query with non-string tag", () => {
    const query: unknown = { type: "entity", kind: "feat", tags: [42] };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects entity query with non-boolean excludeLegacy", () => {
    const query: unknown = { type: "entity", kind: "feat", excludeLegacy: "true" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  /* ── Negative: spell ─────────────────────────────────────────── */

  it("validator rejects spell query with invalid classId", () => {
    const query: unknown = { type: "spell", classId: "" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with invalid subclassId", () => {
    const query: unknown = { type: "spell", subclassId: "" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with non-number maxSpellLevel", () => {
    const query: unknown = { type: "spell", maxSpellLevel: "3" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with negative maxSpellLevel", () => {
    const query: unknown = { type: "spell", maxSpellLevel: -1 };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with NaN maxSpellLevel", () => {
    const query: unknown = { type: "spell", maxSpellLevel: NaN };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with Infinity maxSpellLevel", () => {
    const query: unknown = { type: "spell", maxSpellLevel: Infinity };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with invalid acquisitionMode", () => {
    const query: unknown = { type: "spell", acquisitionMode: "inspired" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with non-array excludeKnown", () => {
    const query: unknown = { type: "spell", excludeKnown: "spell:2024:xphb:firebolt" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects spell query with invalid excludeKnown element", () => {
    const query: unknown = { type: "spell", excludeKnown: [""] };
    expect(isCatalogQuery(query)).toBe(false);
  });

  /* ── Negative: proficiency ──────────────────────────────────── */

  it("validator rejects proficiency query with missing kind", () => {
    const query: unknown = { type: "proficiency" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects proficiency query with invalid kind", () => {
    const query: unknown = { type: "proficiency", kind: "language" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  /* ── Negative: equipment ─────────────────────────────────────── */

  it("validator rejects equipment query with invalid category", () => {
    const query: unknown = { type: "equipment", category: "potion" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects equipment query with invalid rarity", () => {
    const query: unknown = { type: "equipment", rarity: "epic" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects equipment query with invalid bodySlot", () => {
    const query: unknown = { type: "equipment", bodySlot: "neck" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects equipment query with invalid sourceId", () => {
    const query: unknown = { type: "equipment", sourceId: "" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects equipment query with invalid access", () => {
    const query: unknown = { type: "equipment", access: "free" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  /* ── Negative: unknown type ──────────────────────────────────── */

  it("validator rejects unknown type string", () => {
    const query: unknown = { type: "language" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects missing type", () => {
    const query: unknown = { kind: "feat" };
    expect(isCatalogQuery(query)).toBe(false);
  });

  it("validator rejects non-string type", () => {
    const query: unknown = { type: 123 };
    expect(isCatalogQuery(query)).toBe(false);
  });

  /* ── Negative: type boundaries ───────────────────────────────── */

  it("validator rejects null", () => {
    expect(isCatalogQuery(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isCatalogQuery(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isCatalogQuery("entity")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isCatalogQuery(42)).toBe(false);
  });

  it("validator rejects boolean", () => {
    expect(isCatalogQuery(true)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isCatalogQuery([])).toBe(false);
  });

  it("validator rejects empty object", () => {
    expect(isCatalogQuery({})).toBe(false);
  });
});

describe("factories", () => {
  it("createEntityQuery produces valid query with kind only", () => {
    const query = createEntityQuery("feat");
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.type).toBe("entity");
    expect(query.kind).toBe("feat");
  });

  it("createEntityQuery produces valid query with options", () => {
    const query = createEntityQuery("spell", {
      sourceId: createSourceId("xphb"),
      access: "core",
      tags: ["damage"],
      excludeLegacy: true,
    });
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.access).toBe("core");
    expect(query.excludeLegacy).toBe(true);
  });

  it("createEntityQuery creates immutable copy of tags", () => {
    const tags = ["damage"];
    const query = createEntityQuery("spell", { tags });
    tags.push("fire");
    expect(query.tags).toHaveLength(1);
  });

  it("createSpellQuery produces valid query with no options", () => {
    const query = createSpellQuery();
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.type).toBe("spell");
  });

  it("createSpellQuery produces valid query with options", () => {
    const query = createSpellQuery({
      classId: createEntityId("class:2024:xphb:wizard"),
      maxSpellLevel: 3,
      acquisitionMode: "prepared",
    });
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.maxSpellLevel).toBe(3);
    expect(query.acquisitionMode).toBe("prepared");
  });

  it("createSpellQuery creates immutable copy of excludeKnown", () => {
    const excludeKnown = [createEntityId("spell:2024:xphb:firebolt")];
    const query = createSpellQuery({ excludeKnown });
    excludeKnown.push(createEntityId("spell:2024:xphb:burning-hands"));
    expect(query.excludeKnown).toHaveLength(1);
  });

  it("createProficiencyQuery produces valid query", () => {
    const query = createProficiencyQuery("tool");
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.type).toBe("proficiency");
    expect(query.kind).toBe("tool");
  });

  it("createEquipmentQuery produces valid query with no options", () => {
    const query = createEquipmentQuery();
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.type).toBe("equipment");
  });

  it("createEquipmentQuery produces valid query with options", () => {
    const query = createEquipmentQuery({
      category: "weapon",
      rarity: "rare",
      bodySlot: "weapon",
    });
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.category).toBe("weapon");
    expect(query.rarity).toBe("rare");
  });

  it("validates and clones equipment group filters", () => {
    const groups = ["musical-instrument", "artisan-tool"] as const;
    const query = createEquipmentQuery({ equipmentGroups: [...groups] });
    expect(isCatalogQuery(query)).toBe(true);
    expect(query.equipmentGroups).toEqual(groups);
    expect(isCatalogQuery({ type: "equipment", equipmentGroups: ["toolArtisan"] })).toBe(false);
    expect(isCatalogQuery({ type: "equipment", equipmentGroups: [] })).toBe(false);
  });

  it("defines deterministic conjunctive equipment eligibility semantics", () => {
    expect(createEquipmentQuery({ eligibility: ["basic"] }).eligibility).toEqual(["basic"]);
    expect(createEquipmentQuery({ eligibility: ["mundane"] }).eligibility).toEqual(["mundane"]);
    expect(createEquipmentQuery({ eligibility: ["mundane", "basic"] }).eligibility).toEqual(["basic", "mundane"]);
    expect(isCatalogQuery({ type: "equipment", eligibility: ["basic", "mundane"] })).toBe(true);
    expect(isCatalogQuery({ type: "equipment", eligibility: ["mundane", "basic"] })).toBe(false);
    expect(isCatalogQuery({ type: "equipment", eligibility: ["basic", "basic"] })).toBe(false);
    expect(isCatalogQuery({ type: "equipment", eligibility: [] })).toBe(false);
    expect(isCatalogQuery({ type: "equipment", eligibility: ["magic"] })).toBe(false);
    expect(isCatalogQuery(createEquipmentQuery({ eligibility: [] }))).toBe(true);
    expect(createEquipmentQuery({ eligibility: [] }).eligibility).toBeUndefined();
  });
});

describe("round-trip", () => {
  it("all variants round-trip through validator", () => {
    const queries: CatalogQuery[] = [
      createEntityQuery("feat"),
      createEntityQuery("species", { access: "core", excludeLegacy: false }),
      createSpellQuery(),
      createSpellQuery({
        classId: createEntityId("class:2024:xphb:wizard"),
        maxSpellLevel: 9,
        acquisitionMode: "known",
      }),
      createProficiencyQuery("tool"),
      createProficiencyQuery("skill"),
      createProficiencyQuery("saving-throw"),
      createProficiencyQuery("armor"),
      createEquipmentQuery(),
      createEquipmentQuery({
        category: "armor",
        rarity: "common",
        bodySlot: "armor",
        access: "core",
      }),
    ];

    for (const query of queries) {
      expect(isCatalogQuery(query)).toBe(true);
    }
  });
});

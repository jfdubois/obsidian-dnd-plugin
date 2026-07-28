import { describe, it, expect } from "vitest";
import {
  canonicalSourceId,
  canonicalEntityNameSegment,
  createCanonicalEntityId,
  createCanonicalEntityIds,
} from "./canonical-entity-id";
import { entityIdStr, sourceIdStr } from "./ids";

describe("canonicalSourceId", () => {
  it("normalizes PHB to phb", () => {
    expect(sourceIdStr(canonicalSourceId("PHB"))).toBe("phb");
  });

  it("normalizes XPHB to xphb", () => {
    expect(sourceIdStr(canonicalSourceId("XPHB"))).toBe("xphb");
  });

  it("rejects empty string", () => {
    expect(() => canonicalSourceId("")).toThrow();
  });

  it("rejects whitespace-only string", () => {
    expect(() => canonicalSourceId("   ")).toThrow();
  });

  it("rejects padded source", () => {
    expect(() => canonicalSourceId("  PHB  ")).toThrow();
  });

  it("encodes punctuation in source", () => {
    const result = canonicalSourceId("5e");
    expect(sourceIdStr(result)).toBe("5e");
  });

  it("normalizes Unicode deterministically", () => {
    const composed = "\u00e9";
    const decomposed = "e\u0301";
    const composedNorm = composed.normalize("NFKC");
    const decomposedNorm = decomposed.normalize("NFKC");
    expect(composedNorm).toBe(decomposedNorm);
    const id1 = canonicalSourceId(composedNorm);
    const id2 = canonicalSourceId(decomposedNorm);
    expect(sourceIdStr(id1)).toBe(sourceIdStr(id2));
  });
});

describe("canonicalEntityNameSegment", () => {
  it("normalizes 'Human' to 'human'", () => {
    expect(canonicalEntityNameSegment("Human")).toBe("human");
  });

  it("normalizes 'Fireball' to 'fireball'", () => {
    expect(canonicalEntityNameSegment("Fireball")).toBe("fireball");
  });

  it("handles multiple spaces as single separator", () => {
    expect(canonicalEntityNameSegment("High   Elf")).toBe("high-elf");
  });

  it("handles tabs as separator", () => {
    expect(canonicalEntityNameSegment("High\tElf")).toBe("high-elf");
  });

  it("literal hyphen is encoded, not treated as separator", () => {
    expect(canonicalEntityNameSegment("High-Elf")).toBe("high%2Delf");
  });

  it("space separator produces hyphen join", () => {
    expect(canonicalEntityNameSegment("High Elf")).toBe("high-elf");
  });

  it("encodes apostrophe", () => {
    expect(canonicalEntityNameSegment("Ogre's Axe")).toBe("ogre%27s-axe");
  });

  it("encodes slash", () => {
    expect(canonicalEntityNameSegment("War/Peace")).toBe("war%2Fpeace");
  });

  it("encodes colon", () => {
    expect(canonicalEntityNameSegment("Level:1")).toBe("level%3A1");
  });

  it("encodes percent", () => {
    expect(canonicalEntityNameSegment("100%")).toBe("100%25");
  });

  it("encodes accented characters", () => {
    const result = canonicalEntityNameSegment("Cr\u00e9ature");
    expect(result).toBe("cr%C3%A9ature");
  });

  it("Unicode composed and decomposed produce identical output", () => {
    const composed = "Cr\u00e9ature";
    const decomposed = "Cre\u0301ature";
    expect(canonicalEntityNameSegment(composed)).toBe(canonicalEntityNameSegment(decomposed));
  });

  it("is deterministic (same input produces same output)", () => {
    const first = canonicalEntityNameSegment("High Elf");
    const second = canonicalEntityNameSegment("High Elf");
    expect(first).toBe(second);
  });

  it("rejects empty string", () => {
    expect(() => canonicalEntityNameSegment("")).toThrow();
  });

  it("rejects whitespace-only string", () => {
    expect(() => canonicalEntityNameSegment("   ")).toThrow();
  });
});

describe("createCanonicalEntityId - basic IDs", () => {
  it("Human PHB produces species:2014:phb:human", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("species:2014:phb:human");
    }
  });

  it("Human XPHB produces species:2024:xphb:human", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2024",
      source: "XPHB",
      name: "Human",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("species:2024:xphb:human");
    }
  });

  it("Fireball XPHB produces spell:2024:xphb:fireball", () => {
    const result = createCanonicalEntityId({
      kind: "spell",
      ruleset: "2024",
      source: "XPHB",
      name: "Fireball",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("spell:2024:xphb:fireball");
    }
  });
});

describe("createCanonicalEntityId - collisions", () => {
  it("case variants produce collision", () => {
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: "Human" },
      { kind: "species", ruleset: "2014", source: "PHB", name: "human" },
    ]);
    expect(result.successes.length).toBe(1);
    const collision = result.diagnostics.find((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collision).toBeDefined();
    expect(collision?.keyIndex).toBe(1);
    expect(collision?.conflictingIndex).toBe(0);
  });

  it("Unicode equivalents produce collision", () => {
    const composed = "\u00e9";
    const decomposed = "e\u0301";
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: `Cr${composed}ature` },
      { kind: "species", ruleset: "2014", source: "PHB", name: `Cr${decomposed}ature` },
    ]);
    expect(result.successes.length).toBe(1);
    const collision = result.diagnostics.find((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collision).toBeDefined();
  });

  it("whitespace equivalents produce collision", () => {
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: "High Elf" },
      { kind: "species", ruleset: "2014", source: "PHB", name: "High   Elf" },
    ]);
    expect(result.successes.length).toBe(1);
    const collision = result.diagnostics.find((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collision).toBeDefined();
  });

  it("exact duplicates produce collision", () => {
    const key = { kind: "species", ruleset: "2014", source: "PHB", name: "Human" };
    const result = createCanonicalEntityIds([key, key]);
    expect(result.successes.length).toBe(1);
    const collision = result.diagnostics.find((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collision).toBeDefined();
  });

  it("High Elf vs High-Elf do NOT collide", () => {
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: "High Elf" },
      { kind: "species", ruleset: "2014", source: "PHB", name: "High-Elf" },
    ]);
    expect(result.successes.length).toBe(2);
    const collisions = result.diagnostics.filter((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collisions.length).toBe(0);
  });
});

describe("createCanonicalEntityId - distinct IDs", () => {
  it("different rulesets produce different IDs", () => {
    const r2014 = createCanonicalEntityId({ kind: "species", ruleset: "2014", source: "PHB", name: "Human" });
    const r2024 = createCanonicalEntityId({ kind: "species", ruleset: "2024", source: "XPHB", name: "Human" });
    expect(r2014.ok && r2024.ok).toBe(true);
    if (r2014.ok && r2024.ok) {
      expect(entityIdStr(r2014.id)).not.toBe(entityIdStr(r2024.id));
    }
  });

  it("different sources produce different IDs", () => {
    const phb = createCanonicalEntityId({ kind: "species", ruleset: "2014", source: "PHB", name: "Human" });
    const xphb = createCanonicalEntityId({ kind: "species", ruleset: "2014", source: "XPHB", name: "Human" });
    expect(phb.ok && xphb.ok).toBe(true);
    if (phb.ok && xphb.ok) {
      expect(entityIdStr(phb.id)).not.toBe(entityIdStr(xphb.id));
    }
  });

  it("different kinds produce different IDs", () => {
    const species = createCanonicalEntityId({ kind: "species", ruleset: "2014", source: "PHB", name: "Human" });
    const feat = createCanonicalEntityId({ kind: "feat", ruleset: "2014", source: "PHB", name: "Human" });
    expect(species.ok && feat.ok).toBe(true);
    if (species.ok && feat.ok) {
      expect(entityIdStr(species.id)).not.toBe(entityIdStr(feat.id));
    }
  });
});

describe("createCanonicalEntityId - invalid inputs", () => {
  it("rejects null", () => {
    const result = createCanonicalEntityId(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
  });

  it("rejects undefined", () => {
    const result = createCanonicalEntityId(undefined);
    expect(result.ok).toBe(false);
  });

  it("rejects primitives", () => {
    expect(createCanonicalEntityId(42).ok).toBe(false);
    expect(createCanonicalEntityId("string").ok).toBe(false);
    expect(createCanonicalEntityId(true).ok).toBe(false);
  });

  it("rejects arrays", () => {
    const result = createCanonicalEntityId([]);
    expect(result.ok).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = createCanonicalEntityId({ kind: "species", ruleset: "2014" });
    expect(result.ok).toBe(false);
  });

  it("rejects extra fields", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
      extra: "field",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects accessors", () => {
    const obj = {};
    Object.defineProperty(obj, "kind", { get: () => "species", enumerable: true });
    Object.defineProperty(obj, "ruleset", { value: "2014", enumerable: true });
    Object.defineProperty(obj, "source", { value: "PHB", enumerable: true });
    Object.defineProperty(obj, "name", { value: "Human", enumerable: true });
    const result = createCanonicalEntityId(obj);
    expect(result.ok).toBe(false);
  });

  it("rejects functions", () => {
    const result = createCanonicalEntityId(() => {});
    expect(result.ok).toBe(false);
  });

  it("rejects symbols", () => {
    const result = createCanonicalEntityId(Symbol("test"));
    expect(result.ok).toBe(false);
  });

  it("rejects class instances", () => {
    class Key {
      kind = "species";
      ruleset = "2014";
      source = "PHB";
      name = "Human";
    }
    const result = createCanonicalEntityId(new Key());
    expect(result.ok).toBe(false);
  });

  it("rejects invalid kind", () => {
    const result = createCanonicalEntityId({
      kind: "invalid-kind",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid ruleset", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "1989",
      source: "PHB",
      name: "Human",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty source", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "",
      name: "Human",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only source", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "   ",
      name: "Human",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "   ",
    });
    expect(result.ok).toBe(false);
  });
});

describe("createCanonicalEntityId - immutability", () => {
  it("does not mutate input key", () => {
    const key = { kind: "species" as const, ruleset: "2014" as const, source: "PHB", name: "Human" };
    const original = { ...key };
    createCanonicalEntityId(key);
    expect(key).toEqual(original);
  });

  it("result is frozen", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("success canonicalKey is frozen", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
    });
    if (result.ok) {
      expect(Object.isFrozen(result.canonicalKey)).toBe(true);
    }
  });

  it("failure diagnostic is frozen", () => {
    const result = createCanonicalEntityId(null);
    if (!result.ok) {
      expect(Object.isFrozen(result.diagnostic)).toBe(true);
    }
  });

  it("batch result is frozen", () => {
    const result = createCanonicalEntityIds([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.successes)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });

  it("batch success entries are frozen", () => {
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: "Human" },
    ]);
    if (result.successes.length > 0) {
      expect(Object.isFrozen(result.successes[0])).toBe(true);
    }
  });

  it("batch diagnostics are frozen", () => {
    const result = createCanonicalEntityIds([null]);
    if (result.diagnostics.length > 0) {
      expect(Object.isFrozen(result.diagnostics[0])).toBe(true);
    }
  });
});

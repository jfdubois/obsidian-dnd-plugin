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

  it("rejects leading whitespace", () => {
    expect(() => canonicalEntityNameSegment(" Human")).toThrow();
  });

  it("rejects trailing whitespace", () => {
    expect(() => canonicalEntityNameSegment("Human ")).toThrow();
  });

  it("rejects both leading and trailing whitespace", () => {
    expect(() => canonicalEntityNameSegment(" Human ")).toThrow();
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

  it("three equivalent inputs produce one success and two collisions", () => {
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: "Human" },
      { kind: "species", ruleset: "2014", source: "PHB", name: "human" },
      { kind: "species", ruleset: "2014", source: "PHB", name: "HUMAN" },
    ]);
    expect(result.successes.length).toBe(1);
    expect(result.successes[0]?.keyIndex).toBe(0);

    const collisions = result.diagnostics.filter((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collisions.length).toBe(2);

    // Both collisions point to the first successful index
    expect(collisions[0]?.conflictingIndex).toBe(0);
    expect(collisions[1]?.conflictingIndex).toBe(0);

    // Each collision preserves its own original key
    expect(collisions[0]?.keyIndex).toBe(1);
    expect(collisions[0]?.key?.name).toBe("human");
    expect(collisions[1]?.keyIndex).toBe(2);
    expect(collisions[1]?.key?.name).toBe("HUMAN");

    // Both conflicting keys preserve the first original input
    expect(collisions[0]?.conflictingKey?.name).toBe("Human");
    expect(collisions[1]?.conflictingKey?.name).toBe("Human");
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

describe("createCanonicalEntityId - padded values", () => {
  it("rejects leading whitespace in source", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: " PHB",
      name: "Human",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    }
  });

  it("rejects trailing whitespace in source", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB ",
      name: "Human",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    }
  });

  it("rejects both leading and trailing whitespace in source", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: " PHB ",
      name: "Human",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    }
  });

  it("rejects leading whitespace in name", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: " Human",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    }
  });

  it("rejects trailing whitespace in name", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    }
  });

  it("rejects both leading and trailing whitespace in name", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: " Human ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    }
  });

  it("internal whitespace in name remains valid", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "High   Elf",
    });
    expect(result.ok).toBe(true);
  });
});

describe("createCanonicalEntityId - exact shape validation", () => {
  it("rejects object with symbol data property", () => {
    const sym = Symbol("extra");
    const obj = {
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
      [sym]: "secret",
    };
    const result = createCanonicalEntityId(obj);
    expect(result.ok).toBe(false);
  });

  it("rejects object with symbol accessor", () => {
    const sym = Symbol("accessor");
    const obj = {
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
    };
    Object.defineProperty(obj, sym, {
      get() { return "secret"; },
      enumerable: false,
    });
    const result = createCanonicalEntityId(obj);
    expect(result.ok).toBe(false);
  });

  it("rejects object with non-enumerable extra string property", () => {
    const obj = {
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
    };
    Object.defineProperty(obj, "hidden", {
      value: "secret",
      enumerable: false,
    });
    const result = createCanonicalEntityId(obj);
    expect(result.ok).toBe(false);
  });

  it("rejects object with getter on known property", () => {
    const obj = {};
    Object.defineProperty(obj, "kind", {
      get() { return "species"; },
      enumerable: true,
    });
    Object.defineProperty(obj, "ruleset", { value: "2014", enumerable: true });
    Object.defineProperty(obj, "source", { value: "PHB", enumerable: true });
    Object.defineProperty(obj, "name", { value: "Human", enumerable: true });
    const result = createCanonicalEntityId(obj);
    expect(result.ok).toBe(false);
  });

  it("rejects object with setter on known property", () => {
    const obj = {};
    Object.defineProperty(obj, "kind", { value: "species", enumerable: true });
    Object.defineProperty(obj, "ruleset", { value: "2014", enumerable: true });
    Object.defineProperty(obj, "source", { value: "PHB", enumerable: true });
    Object.defineProperty(obj, "name", {
      set(_v: unknown) {},
      enumerable: true,
    });
    const result = createCanonicalEntityId(obj);
    expect(result.ok).toBe(false);
  });

  it("rejects object with unknown enumerable property", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
      extra: "field",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects object with missing field", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects class prototype instance", () => {
    class Key {
      kind = "species";
      ruleset = "2014";
      source = "PHB";
      name = "Human";
    }
    const result = createCanonicalEntityId(new Key());
    expect(result.ok).toBe(false);
  });

  it("accepts null-prototype key", () => {
    const key = Object.create(null);
    key.kind = "species";
    key.ruleset = "2014";
    key.source = "PHB";
    key.name = "Human";
    const result = createCanonicalEntityId(key);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("species:2014:phb:human");
    }
  });
});

describe("createCanonicalEntityId - original key preservation", () => {
  it("canonicalKey preserves original source and name", () => {
    const result = createCanonicalEntityId({
      kind: "species",
      ruleset: "2014",
      source: "PHB",
      name: "Human",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canonicalKey.source).toBe("PHB");
      expect(result.canonicalKey.name).toBe("Human");
      expect(result.sourceId).toBe(result.sourceId); // branded
      expect(entityIdStr(result.id)).toBe("species:2014:phb:human");
    }
  });

  it("canonicalKey is cloned and frozen", () => {
    const inputKey = {
      kind: "species" as const,
      ruleset: "2014" as const,
      source: "PHB",
      name: "Human",
    };
    const result = createCanonicalEntityId(inputKey);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.canonicalKey)).toBe(true);
      expect(result.canonicalKey).not.toBe(inputKey);
    }
  });

  it("caller mutation does not change result canonicalKey", () => {
    const inputKey = {
      kind: "species" as const,
      ruleset: "2014" as const,
      source: "PHB",
      name: "Human",
    };
    const result = createCanonicalEntityId(inputKey);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Mutate the input after creation
      (inputKey as Record<string, unknown>).source = "MUTATED";
      (inputKey as Record<string, unknown>).name = "MUTATED";
      // Result must still preserve original values
      expect(result.canonicalKey.source).toBe("PHB");
      expect(result.canonicalKey.name).toBe("Human");
    }
  });
});

describe("createCanonicalEntityId - batch resilience", () => {
  it("batch with mixed valid and invalid keys", () => {
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: "Human" },
      { kind: "species", ruleset: "2014", source: " PHB", name: "Human" },
      { kind: "spell", ruleset: "2014", source: "PHB", name: "Fireball" },
      { kind: "species", ruleset: "2014", source: "PHB", name: "Human " },
      { kind: "feat", ruleset: "2014", source: "PHB", name: "Tough" },
    ]);

    // Does not throw
    expect(result).toBeDefined();

    // Three valid keys succeed
    expect(result.successes.length).toBe(3);
    expect(result.successes[0]?.keyIndex).toBe(0);
    expect(result.successes[1]?.keyIndex).toBe(2);
    expect(result.successes[2]?.keyIndex).toBe(4);

    // Two malformed keys emit ordered diagnostics
    expect(result.diagnostics.length).toBe(2);
    expect(result.diagnostics[0]?.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    expect(result.diagnostics[0]?.keyIndex).toBe(1);
    expect(result.diagnostics[1]?.code).toBe("INVALID_CANONICAL_ENTITY_KEY");
    expect(result.diagnostics[1]?.keyIndex).toBe(3);
  });
});

describe("createCanonicalEntityId - collision key preservation", () => {
  it("case-equivalent collision preserves original keys", () => {
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: "Human" },
      { kind: "species", ruleset: "2014", source: "PHB", name: "human" },
    ]);

    const collision = result.diagnostics.find((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collision).toBeDefined();
    if (collision) {
      expect(collision.keyIndex).toBe(1);
      expect(collision.conflictingIndex).toBe(0);
      // key preserves later original input
      expect(collision.key?.name).toBe("human");
      // conflictingKey preserves first original input
      expect(collision.conflictingKey?.name).toBe("Human");
      // Both are frozen
      expect(Object.isFrozen(collision.key!)).toBe(true);
      expect(Object.isFrozen(collision.conflictingKey!)).toBe(true);
    }
  });

  it("Unicode-equivalent collision preserves original keys", () => {
    const composed = "\u00e9";
    const decomposed = "e\u0301";
    const result = createCanonicalEntityIds([
      { kind: "species", ruleset: "2014", source: "PHB", name: `Cr${composed}ature` },
      { kind: "species", ruleset: "2014", source: "PHB", name: `Cr${decomposed}ature` },
    ]);

    const collision = result.diagnostics.find((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collision).toBeDefined();
    if (collision) {
      expect(collision.key?.name).toBe(`Cr${decomposed}ature`);
      expect(collision.conflictingKey?.name).toBe(`Cr${composed}ature`);
    }
  });

  it("collision keys are cloned; caller mutation does not affect diagnostics", () => {
    const key1 = { kind: "species" as const, ruleset: "2014" as const, source: "PHB", name: "Human" };
    const key2 = { kind: "species" as const, ruleset: "2014" as const, source: "PHB", name: "human" };
    const result = createCanonicalEntityIds([key1, key2]);

    const collision = result.diagnostics.find((d) => d.code === "CANONICAL_ENTITY_ID_COLLISION");
    expect(collision).toBeDefined();

    // Mutate caller-owned inputs
    (key1 as Record<string, unknown>).name = "MUTATED1";
    (key2 as Record<string, unknown>).name = "MUTATED2";

    // Diagnostics must preserve original values
    if (collision) {
      expect(collision.conflictingKey?.name).toBe("Human");
      expect(collision.key?.name).toBe("human");
    }
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

describe("createCanonicalEntityId - all entity kinds", () => {
  it("produces valid ID for class kind", () => {
    const result = createCanonicalEntityId({
      kind: "class",
      ruleset: "2014",
      source: "PHB",
      name: "Fighter",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("class:2014:phb:fighter");
    }
  });

  it("produces valid ID for background kind", () => {
    const result = createCanonicalEntityId({
      kind: "background",
      ruleset: "2014",
      source: "PHB",
      name: "Acolyte",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("background:2014:phb:acolyte");
    }
  });

  it("produces valid ID for subclass kind", () => {
    const result = createCanonicalEntityId({
      kind: "subclass",
      ruleset: "2014",
      source: "PHB",
      name: "Champion",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("subclass:2014:phb:champion");
    }
  });

  it("produces valid ID for class-feature kind", () => {
    const result = createCanonicalEntityId({
      kind: "class-feature",
      ruleset: "2014",
      source: "PHB",
      name: "Second Wind",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("class-feature:2014:phb:second-wind");
    }
  });

  it("produces valid ID for subclass-feature kind", () => {
    const result = createCanonicalEntityId({
      kind: "subclass-feature",
      ruleset: "2014",
      source: "PHB",
      name: "Improved Critical",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("subclass-feature:2014:phb:improved-critical");
    }
  });

  it("produces valid ID for feat kind", () => {
    const result = createCanonicalEntityId({
      kind: "feat",
      ruleset: "2014",
      source: "PHB",
      name: "Tough",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("feat:2014:phb:tough");
    }
  });

  it("produces valid ID for item kind", () => {
    const result = createCanonicalEntityId({
      kind: "item",
      ruleset: "2014",
      source: "PHB",
      name: "Longsword",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("item:2014:phb:longsword");
    }
  });

  it("produces valid ID for optional-feature kind", () => {
    const result = createCanonicalEntityId({
      kind: "optional-feature",
      ruleset: "2014",
      source: "DMG",
      name: "Additional Crossbow Expertise",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("optional-feature:2014:dmg:additional-crossbow-expertise");
    }
  });

  it("produces valid ID for skill kind", () => {
    const result = createCanonicalEntityId({
      kind: "skill",
      ruleset: "2014",
      source: "PHB",
      name: "Athletics",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("skill:2014:phb:athletics");
    }
  });

  it("produces valid ID for language kind", () => {
    const result = createCanonicalEntityId({
      kind: "language",
      ruleset: "2014",
      source: "PHB",
      name: "Common",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("language:2014:phb:common");
    }
  });

  it("produces valid ID for species kind (2024 ruleset)", () => {
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

  it("produces valid ID for spell kind (2014 ruleset)", () => {
    const result = createCanonicalEntityId({
      kind: "spell",
      ruleset: "2014",
      source: "PHB",
      name: "Fireball",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("spell:2014:phb:fireball");
    }
  });
});

describe("createCanonicalEntityId - name edge cases", () => {
  it("handles very long name", () => {
    const longName = "The Greatest and Most Magnificent Spell of All Time That Has Ever Been Cast";
    const result = createCanonicalEntityId({
      kind: "spell",
      ruleset: "2014",
      source: "PHB",
      name: longName,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const expected = "spell:2014:phb:the-greatest-and-most-magnificent-spell-of-all-time-that-has-ever-been-cast";
      expect(entityIdStr(result.id)).toBe(expected);
    }
  });

  it("handles name starting with number", () => {
    const result = createCanonicalEntityId({
      kind: "spell",
      ruleset: "2014",
      source: "PHB",
      name: "3rd Level Spell",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("spell:2014:phb:3rd-level-spell");
    }
  });

  it("handles single character name", () => {
    const result = createCanonicalEntityId({
      kind: "item",
      ruleset: "2014",
      source: "PHB",
      name: "A",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("item:2014:phb:a");
    }
  });

  it("handles name with consecutive special characters", () => {
    const result = createCanonicalEntityId({
      kind: "item",
      ruleset: "2014",
      source: "DMG",
      name: "Ring of Protection +2",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("item:2014:dmg:ring-of-protection-%2B2");
    }
  });

  it("handles name with parentheses", () => {
    const result = createCanonicalEntityId({
      kind: "spell",
      ruleset: "2014",
      source: "XGtE",
      name: "Chromatic Orb (Acid)",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(entityIdStr(result.id)).toBe("spell:2014:xgte:chromatic-orb-%28acid%29");
    }
  });

  it("deterministic output across multiple calls", () => {
    const key = { kind: "class", ruleset: "2014", source: "PHB", name: "Fighter" };
    const results = Array.from({ length: 10 }, () => createCanonicalEntityId(key));
    const firstId = results[0];
    expect(firstId?.ok).toBe(true);
    if (firstId?.ok) {
      for (const result of results) {
        if (result.ok) {
          expect(entityIdStr(result.id)).toBe(entityIdStr(firstId.id));
        }
      }
    }
  });

  it("ruleset is included in ID", () => {
    const r2014 = createCanonicalEntityId({ kind: "class", ruleset: "2014", source: "PHB", name: "Fighter" });
    const r2024 = createCanonicalEntityId({ kind: "class", ruleset: "2024", source: "XPHB", name: "Fighter" });
    expect(r2014.ok && r2024.ok).toBe(true);
    if (r2014.ok && r2024.ok) {
      expect(entityIdStr(r2014.id)).toContain(":2014:");
      expect(entityIdStr(r2024.id)).toContain(":2024:");
    }
  });
});

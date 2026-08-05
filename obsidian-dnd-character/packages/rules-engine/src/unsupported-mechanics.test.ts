import { describe, it, expect } from "vitest";
import { detectUnsupportedMechanics } from "./unsupported-mechanics";
import { makeEffect, eid } from "./effect-collection-helpers";
import type { CollectedEffect, EffectProvenance } from "./effect-provenance";

/* ── Test helpers ──────────────────────────────────────────────── */

function makeProvenance(
  sourceKind: EffectProvenance["sourceKind"],
  entityId: string = "entity-1",
  level?: number,
): EffectProvenance {
  return {
    sourceKind,
    entityId: eid(entityId),
    ...(level !== undefined ? { level } : {}),
  };
}

function makeCollected(
  type: string,
  extra: Record<string, unknown> = {},
  provenance?: EffectProvenance,
): CollectedEffect {
  return {
    effect: makeEffect(type, extra),
    provenance: provenance ?? makeProvenance("species", "species-elf"),
  };
}

/* ── Empty effects ─────────────────────────────────────────────── */

describe("detectUnsupportedMechanics - empty", () => {
  it("returns empty diagnostics for no effects", () => {
    const result = detectUnsupportedMechanics([]);
    expect(result.diagnostics).toEqual([]);
    expect(result.unsupportedCount).toBe(0);
  });

  it("returns frozen array", () => {
    const result = detectUnsupportedMechanics([]);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });
});

/* ── Single unsupported effects ────────────────────────────────── */

describe("detectUnsupportedMechanics - add-language", () => {
  it("produces diagnostic for add-language effect", () => {
    const effect = makeCollected("add-language", { language: "Elvish" });
    const result = detectUnsupportedMechanics([effect]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("effect-not-calculated");
    expect(result.diagnostics[0]!.effectType).toBe("add-language");
    expect(result.diagnostics[0]!.message).toBe(
      "Language effects are tracked but not calculated into a mechanical total",
    );
  });
});

describe("detectUnsupportedMechanics - grant-feature", () => {
  it("produces diagnostic for grant-feature effect", () => {
    const effect = makeCollected("grant-feature", {
      featureId: eid("feature-dark-vision"),
    });
    const result = detectUnsupportedMechanics([effect]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("effect-not-calculated");
    expect(result.diagnostics[0]!.effectType).toBe("grant-feature");
    expect(result.diagnostics[0]!.message).toBe(
      "Feature grants are tracked but not calculated into a mechanical total",
    );
  });
});

describe("detectUnsupportedMechanics - conditional-roll-mode", () => {
  it("produces diagnostic for conditional-roll-mode effect", () => {
    const effect = makeCollected("conditional-roll-mode", {
      predicate: { type: "ability", ability: "STR" },
      mode: "advantage",
    });
    const result = detectUnsupportedMechanics([effect]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("conditional-effect");
    expect(result.diagnostics[0]!.effectType).toBe("conditional-roll-mode");
    expect(result.diagnostics[0]!.message).toBe(
      "Conditional roll mode effects require runtime predicate evaluation",
    );
  });
});

describe("detectUnsupportedMechanics - unknown effect type", () => {
  it("produces diagnostic for unknown effect type", () => {
    const effect = makeCollected("totally-fake-effect", {});
    const result = detectUnsupportedMechanics([effect]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("unknown-effect-type");
    expect(result.diagnostics[0]!.effectType).toBe("totally-fake-effect");
    expect(result.diagnostics[0]!.message).toBe(
      "Effect type 'totally-fake-effect' is not recognized by the rules engine",
    );
  });
});

/* ── Supported effects produce no diagnostics ──────────────────── */

describe("detectUnsupportedMechanics - supported effects", () => {
  it("add-ability produces no diagnostic", () => {
    const effect = makeCollected("add-ability", { ability: "STR", value: 2 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.unsupportedCount).toBe(0);
  });

  it("set-ability produces no diagnostic", () => {
    const effect = makeCollected("set-ability", { ability: "CON", value: 18 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-proficiency produces no diagnostic", () => {
    const effect = makeCollected("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill-stealth") },
    });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-expertise produces no diagnostic", () => {
    const effect = makeCollected("add-expertise", {
      proficiency: { kind: "skill", entityId: eid("skill-stealth") },
    });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-resistance produces no diagnostic", () => {
    const effect = makeCollected("add-resistance", { damageType: "fire" });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-immunity produces no diagnostic", () => {
    const effect = makeCollected("add-immunity", {
      immunity: { type: "damage", damageType: "poison" },
    });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-capability produces no diagnostic", () => {
    const effect = makeCollected("add-capability", {
      capability: { type: "no-breathing-required" },
    });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("set-ac-formula produces no diagnostic", () => {
    const effect = makeCollected("set-ac-formula", { formula: "natural" });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-ac produces no diagnostic", () => {
    const effect = makeCollected("add-ac", { value: 1 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("grant-spell produces no diagnostic", () => {
    const effect = makeCollected("grant-spell", {
      spellId: eid("spell-firebolt"),
      grant: { type: "known", level: 1 },
    });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("grant-resource produces no diagnostic", () => {
    const effect = makeCollected("grant-resource", {
      resource: {
        name: "Rage",
        maximum: { type: "fixed", value: 3 },
        recovery: { type: "long-rest" },
      },
    });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("grant-attack produces no diagnostic", () => {
    const effect = makeCollected("grant-attack", {
      attack: {
        name: "Bite",
        damage: { type: "simple", dice: { count: 1, sides: 6, modifier: 0 }, damageType: "piercing" },
        range: { type: "melee", reach: 5 },
        properties: [],
      },
    });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-hit-point-increase produces no diagnostic", () => {
    const effect = makeCollected("add-hit-point-increase", { value: 2 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-initiative produces no diagnostic", () => {
    const effect = makeCollected("add-initiative", { value: 5 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("set-movement produces no diagnostic", () => {
    const effect = makeCollected("set-movement", { kind: "walk", value: 30 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-movement produces no diagnostic", () => {
    const effect = makeCollected("add-movement", { kind: "fly", value: 30 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("add-sense produces no diagnostic", () => {
    const effect = makeCollected("add-sense", { kind: "darkvision", range: 60 });
    const result = detectUnsupportedMechanics([effect]);
    expect(result.diagnostics).toHaveLength(0);
  });
});

/* ── Mixed supported and unsupported ───────────────────────────── */

describe("detectUnsupportedMechanics - mixed effects", () => {
  it("only produces diagnostics for unsupported effects", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-ability", { ability: "STR", value: 2 }),
      makeCollected("add-language", { language: "Elvish" }),
      makeCollected("add-resistance", { damageType: "cold" }),
      makeCollected("grant-feature", { featureId: eid("feature-elf-trait") }),
      makeCollected("conditional-roll-mode", {
        predicate: { type: "condition", conditionId: eid("condition-grappled"), purpose: "end" },
        mode: "disadvantage",
      }),
    ];
    const result = detectUnsupportedMechanics(effects);

    expect(result.diagnostics).toHaveLength(3);
    expect(result.unsupportedCount).toBe(3);

    // Sorted by effect type: add-language < conditional-roll-mode < grant-feature
    expect(result.diagnostics[0]!.effectType).toBe("add-language");
    expect(result.diagnostics[0]!.code).toBe("effect-not-calculated");
    expect(result.diagnostics[1]!.effectType).toBe("conditional-roll-mode");
    expect(result.diagnostics[1]!.code).toBe("conditional-effect");
    expect(result.diagnostics[2]!.effectType).toBe("grant-feature");
    expect(result.diagnostics[2]!.code).toBe("effect-not-calculated");
  });
});

/* ── Provenance preservation ───────────────────────────────────── */

describe("detectUnsupportedMechanics - provenance", () => {
  it("preserves provenance from original effect", () => {
    const prov = makeProvenance("class", "class-rogue", 3);
    const effect = makeCollected("add-language", { language: "Thieves' Cant" }, prov);
    const result = detectUnsupportedMechanics([effect]);

    expect(result.diagnostics[0]!.provenance).toEqual(prov);
    expect(result.diagnostics[0]!.provenance.sourceKind).toBe("class");
    expect(result.diagnostics[0]!.provenance.level).toBe(3);
  });

  it("preserves classInstanceId in provenance", () => {
    const prov = makeProvenance("subclass-feature", "subclass-feature-1", 3);
    prov.classInstanceId = "rogue-assassin-1";
    const effect = makeCollected("grant-feature", {
      featureId: eid("feature-assassinate"),
    }, prov);
    const result = detectUnsupportedMechanics([effect]);

    expect(result.diagnostics[0]!.provenance.classInstanceId).toBe("rogue-assassin-1");
  });
});

/* ── Determinism ───────────────────────────────────────────────── */

describe("detectUnsupportedMechanics - determinism", () => {
  it("produces same output for same input", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-language", { language: "Elvish" }),
      makeCollected("grant-feature", { featureId: eid("feature-1") }),
    ];

    const result1 = detectUnsupportedMechanics(effects);
    const result2 = detectUnsupportedMechanics(effects);

    expect(result1.diagnostics).toEqual(result2.diagnostics);
  });

  it("sorts output deterministically regardless of input order", () => {
    const baseEffects: CollectedEffect[] = [
      makeCollected("grant-feature", { featureId: eid("feature-1") }),
      makeCollected("add-language", { language: "Elvish" }),
      makeCollected("conditional-roll-mode", {
        predicate: { type: "ability", ability: "STR" },
        mode: "advantage",
      }),
    ];

    const shuffled: CollectedEffect[] = [
      baseEffects[2]!,
      baseEffects[0]!,
      baseEffects[1]!,
    ];

    const result1 = detectUnsupportedMechanics(baseEffects);
    const result2 = detectUnsupportedMechanics(shuffled);

    expect(result1.diagnostics).toEqual(result2.diagnostics);
  });
});

/* ── unsupportedCount consistency ──────────────────────────────── */

describe("detectUnsupportedMechanics - unsupportedCount", () => {
  it("unsupportedCount matches diagnostics.length", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-language", { language: "Elvish" }),
      makeCollected("grant-feature", { featureId: eid("feature-1") }),
      makeCollected("conditional-roll-mode", {
        predicate: { type: "ability", ability: "STR" },
        mode: "advantage",
      }),
    ];
    const result = detectUnsupportedMechanics(effects);

    expect(result.unsupportedCount).toBe(result.diagnostics.length);
  });

  it("unsupportedCount is zero when all effects are supported", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-ability", { ability: "STR", value: 2 }),
      makeCollected("add-resistance", { damageType: "fire" }),
    ];
    const result = detectUnsupportedMechanics(effects);

    expect(result.unsupportedCount).toBe(0);
    expect(result.diagnostics.length).toBe(0);
  });
});

/* ── Effect reference preservation ─────────────────────────────── */

describe("detectUnsupportedMechanics - effect reference", () => {
  it("preserves original effect reference in diagnostic", () => {
    const effect = makeCollected("add-language", { language: "Elvish" });
    const result = detectUnsupportedMechanics([effect]);

    expect(result.diagnostics[0]!.effect).toBe(effect.effect);
  });
});

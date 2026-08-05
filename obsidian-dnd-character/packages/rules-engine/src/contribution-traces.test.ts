import { describe, it, expect } from "vitest";
import {
  buildContributionTraces,
  detailForAbilityEffect,
  detailForProficiencyEffect,
  detailForImmunityEffect,
  detailForResourceEffect,
} from "./contribution-traces";
import { makeEffect, eid } from "./effect-collection-helpers";
import type { CollectedEffect, EffectProvenance } from "./effect-provenance";
import type {
  AddAbilityEffect,
  AddProficiencyEffect,
  AddImmunityEffect,
  GrantResourceEffect,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";

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

describe("buildContributionTraces - empty", () => {
  it("returns empty traces for no effects", () => {
    const result = buildContributionTraces([]);
    expect(result.traces).toEqual([]);
  });

  it("returns frozen array", () => {
    const result = buildContributionTraces([]);
    expect(Object.isFrozen(result.traces)).toBe(true);
  });
});

/* ── Single effect types ───────────────────────────────────────── */

describe("buildContributionTraces - ability effect", () => {
  it("produces trace for add-ability effect", () => {
    const effect = makeCollected("add-ability", { ability: "STR", value: 2 }, makeProvenance("species", "species-elf"));
    const result = buildContributionTraces([effect]);

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]!.category).toBe("ability-scores");
    expect(result.traces[0]!.detail).toBe("+2 to STR from species-species-elf");
    expect(result.traces[0]!.provenance).toEqual(effect.provenance);
  });
});

describe("buildContributionTraces - proficiency effect", () => {
  it("produces trace for skill proficiency", () => {
    const effect = makeCollected("add-proficiency", {
      proficiency: { kind: "skill", entityId: eid("skill-stealth") },
    }, makeProvenance("class", "class-rogue"));
    const result = buildContributionTraces([effect]);

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]!.category).toBe("proficiencies");
    expect(result.traces[0]!.detail).toBe("skill proficiency: skill-stealth from class-class-rogue");
  });

  it("produces trace for saving throw proficiency", () => {
    const effect = makeCollected("add-proficiency", {
      proficiency: { kind: "saving-throw", ability: "DEX" },
    }, makeProvenance("class", "class-rogue"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.detail).toBe("saving throw proficiency: DEX from class-class-rogue");
  });
});

describe("buildContributionTraces - AC effect", () => {
  it("produces trace for add-ac effect", () => {
    const effect = makeCollected("add-ac", { value: 1 }, makeProvenance("feat", "feat-mobile"));
    const result = buildContributionTraces([effect]);

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]!.category).toBe("armor-class");
    expect(result.traces[0]!.detail).toBe("+1 to AC from feat-feat-mobile");
  });

  it("includes condition info in detail", () => {
    const effect = makeCollected("add-ac", { value: 2, condition: { type: "equipment", itemIds: [eid("item-shield")] } }, makeProvenance("item-equipped", "item-shield"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.detail).toBe("+2 to AC (condition: equipment) from item-equipped-item-shield");
  });
});

describe("buildContributionTraces - resistance effect", () => {
  it("produces trace for resistance", () => {
    const effect = makeCollected("add-resistance", { damageType: "fire" }, makeProvenance("species", "species-dragonborn"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("defenses");
    expect(result.traces[0]!.detail).toBe("fire resistance from species-species-dragonborn");
  });
});

describe("buildContributionTraces - immunity effect", () => {
  it("produces trace for damage immunity", () => {
    const effect = makeCollected("add-immunity", { immunity: { type: "damage", damageType: "poison" } }, makeProvenance("species", "species-undead"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.detail).toBe("poison immunity from species-species-undead");
  });

  it("produces trace for disease immunity", () => {
    const effect = makeCollected("add-immunity", { immunity: { type: "disease" } }, makeProvenance("species", "species-undead"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.detail).toBe("disease immunity from species-species-undead");
  });
});

describe("buildContributionTraces - initiative effect", () => {
  it("produces trace for initiative bonus", () => {
    const effect = makeCollected("add-initiative", { value: 5 }, makeProvenance("feat", "feat-alert"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("initiative");
    expect(result.traces[0]!.detail).toBe("+5 to initiative from feat-feat-alert");
  });
});

describe("buildContributionTraces - attack effect", () => {
  it("produces trace for granted attack", () => {
    const effect = makeCollected("grant-attack", {
      attack: {
        name: "Bite",
        damage: { type: "simple", dice: { count: 1, sides: 6, modifier: 0 }, damageType: "piercing" },
        range: { type: "melee", reach: 5 },
        properties: [],
      },
    }, makeProvenance("species", "species-dragonborn"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("attacks");
    expect(result.traces[0]!.detail).toBe("attack: Bite (1d6) from species-species-dragonborn");
  });
});

describe("buildContributionTraces - spell effect", () => {
  it("produces trace for known spell", () => {
    const effect = makeCollected("grant-spell", {
      spellId: eid("spell-firebolt"),
      grant: { type: "known", level: 1 },
    }, makeProvenance("class", "class-wizard"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("spellcasting");
    expect(result.traces[0]!.detail).toBe("known spell: spell-firebolt (level 1) from class-class-wizard");
  });

  it("produces trace for cantrip", () => {
    const effect = makeCollected("grant-spell", {
      spellId: eid("spell-guidance"),
      grant: { type: "cantrip" },
    }, makeProvenance("class", "class-wizard"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.detail).toBe("cantrip: spell-guidance from class-class-wizard");
  });
});

describe("buildContributionTraces - resource effect", () => {
  it("produces trace for resource", () => {
    const effect = makeCollected("grant-resource", {
      resource: {
        name: "Rage",
        maximum: { type: "fixed", value: 3 },
        recovery: { type: "long-rest" },
      },
    }, makeProvenance("class", "class-barbarian"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("resources");
    expect(result.traces[0]!.detail).toBe("resource: Rage (uses/long rest) from class-class-barbarian");
  });
});

describe("buildContributionTraces - feature effect", () => {
  it("produces trace for granted feature", () => {
    const effect = makeCollected("grant-feature", {
      featureId: eid("feature-uncanny-abilities"),
    }, makeProvenance("class", "class-rogue"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("features");
    expect(result.traces[0]!.detail).toBe("feature: feature-uncanny-abilities from class-class-rogue");
  });
});

describe("buildContributionTraces - hit point effect", () => {
  it("produces trace for HP increase", () => {
    const effect = makeCollected("add-hit-point-increase", { value: 2 }, makeProvenance("feat", "feat-tough"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("hit-points");
    expect(result.traces[0]!.detail).toBe("+2 HP per level from feat-feat-tough");
  });
});

describe("buildContributionTraces - capability effect", () => {
  it("produces trace for capability", () => {
    const effect = makeCollected("add-capability", {
      capability: { type: "no-breathing-required" },
    }, makeProvenance("species", "species-merfolk"));
    const result = buildContributionTraces([effect]);

    expect(result.traces[0]!.category).toBe("capabilities");
    expect(result.traces[0]!.detail).toBe("no-breathing-required from species-species-merfolk");
  });
});

/* ── Multiple effects ──────────────────────────────────────────── */

describe("buildContributionTraces - multiple effects", () => {
  it("handles multiple effects with different provenance", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-ability", { ability: "STR", value: 2 }, makeProvenance("species", "species-elf")),
      makeCollected("add-ability", { ability: "DEX", value: 2 }, makeProvenance("species", "species-elf")),
      makeCollected("add-resistance", { damageType: "fire" }, makeProvenance("feat", "feat-fire-lore")),
    ];
    const result = buildContributionTraces(effects);

    expect(result.traces).toHaveLength(3);
    // Sorted: ability-scores comes before defenses
    expect(result.traces[0]!.category).toBe("ability-scores");
    expect(result.traces[1]!.category).toBe("ability-scores");
    expect(result.traces[2]!.category).toBe("defenses");
  });

  it("preserves provenance for each effect", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-ability", { ability: "STR", value: 2 }, makeProvenance("species", "species-elf", 1)),
      makeCollected("add-ability", { ability: "DEX", value: 2 }, makeProvenance("feat", "feat-athlete")),
    ];
    const result = buildContributionTraces(effects);

    // Sorted by detail: DEX comes before STR alphabetically
    expect(result.traces[0]!.provenance.sourceKind).toBe("feat");
    expect(result.traces[0]!.provenance.level).toBeUndefined();
    expect(result.traces[1]!.provenance.sourceKind).toBe("species");
    expect(result.traces[1]!.provenance.level).toBe(1);
  });
});

/* ── Category filtering ────────────────────────────────────────── */

describe("buildContributionTraces - category filter", () => {
  it("filters by category", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-ability", { ability: "STR", value: 2 }, makeProvenance("species", "species-elf")),
      makeCollected("add-resistance", { damageType: "fire" }, makeProvenance("species", "species-elf")),
      makeCollected("add-initiative", { value: 5 }, makeProvenance("feat", "feat-alert")),
    ];
    const result = buildContributionTraces(effects, "defenses");

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]!.category).toBe("defenses");
  });

  it("returns empty when no effects match filter", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-ability", { ability: "STR", value: 2 }, makeProvenance("species", "species-elf")),
    ];
    const result = buildContributionTraces(effects, "defenses");

    expect(result.traces).toEqual([]);
  });
});

/* ── Determinism ───────────────────────────────────────────────── */

describe("buildContributionTraces - determinism", () => {
  it("produces same output for same input", () => {
    const effects: CollectedEffect[] = [
      makeCollected("add-resistance", { damageType: "fire" }, makeProvenance("species", "species-elf")),
      makeCollected("add-ability", { ability: "STR", value: 2 }, makeProvenance("species", "species-elf")),
      makeCollected("add-initiative", { value: 5 }, makeProvenance("feat", "feat-alert")),
    ];

    const result1 = buildContributionTraces(effects);
    const result2 = buildContributionTraces(effects);

    expect(result1.traces).toEqual(result2.traces);
  });

  it("sorts output deterministically regardless of input order", () => {
    const baseEffects: CollectedEffect[] = [
      makeCollected("add-resistance", { damageType: "fire" }, makeProvenance("species", "species-elf")),
      makeCollected("add-ability", { ability: "STR", value: 2 }, makeProvenance("species", "species-elf")),
      makeCollected("add-initiative", { value: 5 }, makeProvenance("feat", "feat-alert")),
    ];

    const shuffled: CollectedEffect[] = [
      baseEffects[2]!,
      baseEffects[0]!,
      baseEffects[1]!,
    ];

    const result1 = buildContributionTraces(baseEffects);
    const result2 = buildContributionTraces(shuffled);

    expect(result1.traces).toEqual(result2.traces);
  });
});

/* ── Unknown effect type ───────────────────────────────────────── */

describe("buildContributionTraces - unknown effect type", () => {
  it("handles unknown effect type gracefully", () => {
    const effect = makeCollected("unknown-type", {}, makeProvenance("override", "override-1"));
    const result = buildContributionTraces([effect]);

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]!.category).toBe("unknown");
    expect(result.traces[0]!.detail).toContain("unknown effect type");
  });
});

/* ── Detail helper direct tests ────────────────────────────────── */

describe("detail helpers", () => {
  it("detailForAbilityEffect formats correctly", () => {
    const effect = makeEffect("add-ability", { ability: "CHA", value: 1 }) as RuleEffect & AddAbilityEffect;
    const prov = makeProvenance("background", "bg-charmed");
    const detail = detailForAbilityEffect(effect, prov);
    expect(detail).toBe("+1 to CHA from background-bg-charmed");
  });

  it("detailForProficiencyEffect handles armor proficiency", () => {
    const effect = makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "heavy" } }) as RuleEffect & AddProficiencyEffect;
    const prov = makeProvenance("class", "class-paladin");
    const detail = detailForProficiencyEffect(effect, prov);
    expect(detail).toBe("armor proficiency: heavy from class-class-paladin");
  });

  it("detailForImmunityEffect handles condition immunity", () => {
    const effect = makeEffect("add-immunity", { immunity: { type: "condition", conditionId: eid("condition-poisoned") } }) as RuleEffect & AddImmunityEffect;
    const prov = makeProvenance("species", "species-undead");
    const detail = detailForImmunityEffect(effect, prov);
    expect(detail).toBe("condition immunity: condition-poisoned from species-species-undead");
  });

  it("detailForResourceEffect handles short-rest recovery", () => {
    const effect = makeEffect("grant-resource", {
      resource: { name: "Ki Points", maximum: { type: "level-based", multiplier: 1 }, recovery: { type: "short-rest", amountRecovered: 4 } },
    }) as RuleEffect & GrantResourceEffect;
    const prov = makeProvenance("subclass", "subclass-monk-way-of-open-hand");
    const detail = detailForResourceEffect(effect, prov);
    expect(detail).toBe("resource: Ki Points (4 uses/short rest) from subclass-subclass-monk-way-of-open-hand");
  });
});

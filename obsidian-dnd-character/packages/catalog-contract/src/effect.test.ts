import { describe, it, expect } from "vitest";
import {
  isRuleEffect,
  isRuleEffectType,
  isProficiencyRef,
  isSenseDefinition,
  isArmorClassFormula,
  isEffectCondition,
  isSpellGrant,
  isResourceDefinition,
  isValueFormula,
  isResourceRecovery,
  isAttackDefinition,
  isDamageDefinition,
  isDiceExpression,
  isAttackRange,
  isAttackProperty,
  isMovementMode,
  isAutomationStatus,
  isSheetProjection,
  isRollType,
  isRollMode,
  isRollPredicate,
  isImmunityDefinition,
  isCapabilityDefinition,
  isEffectPresentation,
  isEffectOrigin,
  isRuleEffectMetadata,
  createAddAbilityEffect,
  createSetAbilityEffect,
  createAddProficiencyEffect,
  createAddExpertiseEffect,
  createAddLanguageEffect,
  createSetMovementEffect,
  createAddMovementEffect,
  createAddSenseEffect,
  createAddResistanceEffect,
  createAddImmunityEffect,
  createConditionalRollModeEffect,
  createAddCapabilityEffect,
  createSetAcFormulaEffect,
  createAddAcEffect,
  createGrantSpellEffect,
  createGrantResourceEffect,
  createGrantAttackEffect,
  createGrantFeatureEffect,
  createRuleEffectMetadata,
  createProficiencySkillRef,
  createProficiencyToolRef,
  createProficiencyArmorRef,
  createProficiencySavingThrowRef,
  createProficiencyWeaponRef,
  createDarkvisionSense,
  createBlindsenseSense,
  createTremorsenseSense,
  createTruesightSense,
  createGenericSense,
  createBaseAcFormula,
  createDexAcFormula,
  createDexPlusAcFormula,
  createDexMinusAcFormula,
  createNaturalAcFormula,
  createArmorAcFormula,
  createEquipmentCondition,
  createClassLevelCondition,
  createAlwaysCondition,
  createSpellKnownGrant,
  createSpellPreparedGrant,
  createSpellAlwaysPreparedGrant,
  createSpellCantripGrant,
  createResourceDefinition,
  createFixedValueFormula,
  createLevelBasedValueFormula,
  createAbilityBasedValueFormula,
  createSumValueFormula,
  createShortRestRecovery,
  createLongRestRecovery,
  createNoRecovery,
  createCustomRecovery,
  createAttackDefinition,
  createSimpleDamageDefinition,
  createMultiDamageDefinition,
  createDiceExpression,
  createMeleeRange,
  createRangedRange,
  createTouchRange,
  createDamageImmunity,
  createConditionImmunity,
  createDiseaseImmunity,
  createMagicalSleepImmunity,
  createNoBreathingRequiredCapability,
  createNoFoodRequiredCapability,
  createNoWaterRequiredCapability,
  createNoSleepRequiredCapability,
  createWaterBreathingCapability,
  createAbilityRollPredicate,
  createSkillRollPredicate,
  createConditionRollPredicate,
  createDamageTypeRollPredicate,
  createConcentrationRollPredicate,
  createEffectPresentation,
  createEffectOrigin,
  type RuleEffectType,
} from "./effect";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";

const testMetadata = createRuleEffectMetadata(
  "full",
  createEffectPresentation("abilities", []),
  createEffectOrigin(createEntityId("entity:test"), createSourceId("source:test"), "structured"),
);

describe("RuleEffectType", () => {
  it("guard accepts all known types", () => {
    const types: RuleEffectType[] = [
      "add-ability", "set-ability", "add-proficiency", "add-expertise",
      "add-language", "set-movement", "add-movement", "add-sense",
      "add-resistance", "add-immunity", "conditional-roll-mode", "add-capability",
      "set-ac-formula", "add-ac",
      "grant-spell", "grant-resource", "grant-attack", "grant-feature",
    ];
    for (const t of types) {
      expect(isRuleEffectType(t)).toBe(true);
    }
  });

  it("guard rejects unknown type", () => {
    expect(isRuleEffectType("unknown-effect")).toBe(false);
    expect(isRuleEffectType(null)).toBe(false);
    expect(isRuleEffectType(42)).toBe(false);
  });
});

describe("MovementMode", () => {
  it("guard accepts all modes", () => {
    expect(isMovementMode("walk")).toBe(true);
    expect(isMovementMode("fly")).toBe(true);
    expect(isMovementMode("swim")).toBe(true);
    expect(isMovementMode("climb")).toBe(true);
    expect(isMovementMode("burrow")).toBe(true);
  });

  it("guard rejects unknown mode", () => {
    expect(isMovementMode("hover")).toBe(false);
  });
});

describe("RuleEffect: positive", () => {
  it("accepts add-ability", () => {
    expect(isRuleEffect(createAddAbilityEffect(testMetadata, "STR", 2))).toBe(true);
  });

  it("accepts set-ability", () => {
    expect(isRuleEffect(createSetAbilityEffect(testMetadata, "DEX", 15))).toBe(true);
  });

  it("accepts add-proficiency with skill ref", () => {
    expect(isRuleEffect(createAddProficiencyEffect(testMetadata, createProficiencySkillRef(createEntityId("skill:2024:core:athletics"))))).toBe(true);
  });

  it("accepts add-proficiency with armor ref", () => {
    expect(isRuleEffect(createAddProficiencyEffect(testMetadata, createProficiencyArmorRef("light")))).toBe(true);
  });

  it("accepts add-proficiency with saving-throw ref", () => {
    expect(isRuleEffect(createAddProficiencyEffect(testMetadata, createProficiencySavingThrowRef("CON")))).toBe(true);
  });

  it("accepts add-expertise", () => {
    expect(isRuleEffect(createAddExpertiseEffect(testMetadata, createEntityId("skill:2024:core:stealth")))).toBe(true);
  });

  it("accepts add-language", () => {
    expect(isRuleEffect(createAddLanguageEffect(testMetadata, createEntityId("language:2024:core:celestial")))).toBe(true);
  });

  it("accepts set-movement", () => {
    expect(isRuleEffect(createSetMovementEffect(testMetadata, "walk", 30))).toBe(true);
  });

  it("accepts add-movement", () => {
    expect(isRuleEffect(createAddMovementEffect(testMetadata, "fly", 30))).toBe(true);
  });

  it("accepts add-sense with darkvision", () => {
    expect(isRuleEffect(createAddSenseEffect(testMetadata, createDarkvisionSense(60)))).toBe(true);
  });

  it("accepts add-sense with truesight", () => {
    expect(isRuleEffect(createAddSenseEffect(testMetadata, createTruesightSense(30)))).toBe(true);
  });

  it("accepts add-sense with generic", () => {
    expect(isRuleEffect(createAddSenseEffect(testMetadata, createGenericSense("Eaveshear", 120)))).toBe(true);
  });

  it("accepts add-resistance", () => {
    expect(isRuleEffect(createAddResistanceEffect(testMetadata, "fire"))).toBe(true);
  });

  it("accepts add-immunity with damage type", () => {
    expect(isRuleEffect(createAddImmunityEffect(testMetadata, createDamageImmunity("poison")))).toBe(true);
  });

  it("accepts add-immunity with condition", () => {
    expect(isRuleEffect(createAddImmunityEffect(testMetadata, createConditionImmunity(createEntityId("condition:2024:core:poisoned"))))).toBe(true);
  });

  it("accepts add-immunity with disease", () => {
    expect(isRuleEffect(createAddImmunityEffect(testMetadata, createDiseaseImmunity()))).toBe(true);
  });

  it("accepts add-immunity with magical-sleep", () => {
    expect(isRuleEffect(createAddImmunityEffect(testMetadata, createMagicalSleepImmunity()))).toBe(true);
  });

  it("accepts conditional-roll-mode with ability predicate", () => {
    expect(isRuleEffect(createConditionalRollModeEffect(testMetadata, "saving-throw", "advantage", createAbilityRollPredicate("STR")))).toBe(true);
  });

  it("accepts conditional-roll-mode with skill predicate", () => {
    expect(isRuleEffect(createConditionalRollModeEffect(testMetadata, "ability-check", "disadvantage", createSkillRollPredicate(createEntityId("skill:2024:core:stealth"))))).toBe(true);
  });

  it("accepts conditional-roll-mode with condition predicate", () => {
    expect(isRuleEffect(createConditionalRollModeEffect(testMetadata, "saving-throw", "advantage", createConditionRollPredicate(createEntityId("condition:2024:core:poisoned"), "avoid")))).toBe(true);
  });

  it("accepts conditional-roll-mode with damage-type predicate", () => {
    expect(isRuleEffect(createConditionalRollModeEffect(testMetadata, "saving-throw", "advantage", createDamageTypeRollPredicate("fire")))).toBe(true);
  });

  it("accepts conditional-roll-mode with concentration predicate", () => {
    expect(isRuleEffect(createConditionalRollModeEffect(testMetadata, "saving-throw", "disadvantage", createConcentrationRollPredicate()))).toBe(true);
  });

  it("accepts add-capability", () => {
    expect(isRuleEffect(createAddCapabilityEffect(testMetadata, createNoBreathingRequiredCapability()))).toBe(true);
  });

  it("accepts set-ac-formula with dex", () => {
    expect(isRuleEffect(createSetAcFormulaEffect(testMetadata, createDexAcFormula()))).toBe(true);
  });

  it("accepts set-ac-formula with dex-plus", () => {
    expect(isRuleEffect(createSetAcFormulaEffect(testMetadata, createDexPlusAcFormula(14, 2)))).toBe(true);
  });

  it("accepts set-ac-formula with natural", () => {
    expect(isRuleEffect(createSetAcFormulaEffect(testMetadata, createNaturalAcFormula(19)))).toBe(true);
  });

  it("accepts add-ac without condition", () => {
    expect(isRuleEffect(createAddAcEffect(testMetadata, 1))).toBe(true);
  });

  it("accepts add-ac with equipment condition", () => {
    expect(isRuleEffect(createAddAcEffect(testMetadata, 1, createEquipmentCondition([createEntityId("item:2024:xphb:shield")])))).toBe(true);
  });

  it("accepts add-ac with class-level condition", () => {
    expect(isRuleEffect(createAddAcEffect(testMetadata, 1, createClassLevelCondition(5)))).toBe(true);
  });

  it("accepts grant-spell with known grant", () => {
    expect(isRuleEffect(createGrantSpellEffect(testMetadata, createEntityId("spell:2024:xphb:firebolt"), createSpellKnownGrant(0)))).toBe(true);
  });

  it("accepts grant-spell with cantrip grant", () => {
    expect(isRuleEffect(createGrantSpellEffect(testMetadata, createEntityId("spell:2024:xphb:firebolt"), createSpellCantripGrant()))).toBe(true);
  });

  it("accepts grant-resource", () => {
    expect(isRuleEffect(createGrantResourceEffect(
      testMetadata,
      createResourceDefinition("Second Wind", createFixedValueFormula(1), createLongRestRecovery()),
    ))).toBe(true);
  });

  it("accepts grant-attack", () => {
    expect(isRuleEffect(createGrantAttackEffect(
      testMetadata,
      createAttackDefinition(
        "Jaw",
        createSimpleDamageDefinition(createDiceExpression(1, 8, 3), "piercing"),
        createMeleeRange(5),
        [],
      ),
    ))).toBe(true);
  });

  it("accepts grant-feature", () => {
    expect(isRuleEffect(createGrantFeatureEffect(testMetadata, createEntityId("class-feature:2024:xphb:fighter:1:second-wind")))).toBe(true);
  });
});

describe("RuleEffect: negative", () => {
  it("rejects null", () => {
    expect(isRuleEffect(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isRuleEffect(undefined)).toBe(false);
  });

  it("rejects plain object", () => {
    expect(isRuleEffect({})).toBe(false);
  });

  it("rejects unknown type string", () => {
    expect(isRuleEffect({ type: "unknown", ...testMetadata })).toBe(false);
  });

  it("rejects effect without metadata", () => {
    expect(isRuleEffect({ type: "add-ability", ability: "STR", value: 2 })).toBe(false);
  });

  it("rejects add-ability with invalid ability", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-ability", ability: "LCK", value: 2 })).toBe(false);
  });

  it("rejects add-ability with non-number value", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-ability", ability: "STR", value: "2" })).toBe(false);
  });

  it("rejects add-ability with Infinity value", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-ability", ability: "STR", value: Infinity })).toBe(false);
  });

  it("rejects set-ability with invalid ability", () => {
    expect(isRuleEffect({ ...testMetadata, type: "set-ability", ability: "INT", value: "15" })).toBe(false);
  });

  it("rejects add-proficiency with invalid proficiency", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-proficiency", proficiency: "light armor" })).toBe(false);
  });

  it("rejects add-expertise with empty skillId", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-expertise", skillId: "" })).toBe(false);
  });

  it("rejects add-language with missing languageId", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-language" })).toBe(false);
  });

  it("rejects set-movement with invalid mode", () => {
    expect(isRuleEffect({ ...testMetadata, type: "set-movement", mode: "hover", value: 30 })).toBe(false);
  });

  it("rejects add-movement with non-finite value", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-movement", mode: "fly", value: NaN })).toBe(false);
  });

  it("rejects add-sense with invalid sense", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-sense", sense: { type: "unknown", range: 60 } })).toBe(false);
  });

  it("rejects add-resistance with empty damageType", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-resistance", damageType: "" })).toBe(false);
  });

  it("rejects add-immunity with missing immunity", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-immunity" })).toBe(false);
  });

  it("rejects add-immunity with invalid immunity", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-immunity", immunity: { type: "unknown" } })).toBe(false);
  });

  it("rejects conditional-roll-mode with invalid rollType", () => {
    expect(isRuleEffect({ ...testMetadata, type: "conditional-roll-mode", rollType: "unknown", mode: "advantage", predicate: { type: "concentration" } })).toBe(false);
  });

  it("rejects conditional-roll-mode with invalid mode", () => {
    expect(isRuleEffect({ ...testMetadata, type: "conditional-roll-mode", rollType: "saving-throw", mode: "normal", predicate: { type: "concentration" } })).toBe(false);
  });

  it("rejects conditional-roll-mode with invalid predicate", () => {
    expect(isRuleEffect({ ...testMetadata, type: "conditional-roll-mode", rollType: "saving-throw", mode: "advantage", predicate: { type: "unknown" } })).toBe(false);
  });

  it("rejects add-capability with invalid capability", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-capability", capability: { type: "unknown" } })).toBe(false);
  });

  it("rejects set-ac-formula with invalid formula", () => {
    expect(isRuleEffect({ ...testMetadata, type: "set-ac-formula", formula: { type: "unknown" } })).toBe(false);
  });

  it("rejects add-ac with non-number value", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-ac", value: "1" })).toBe(false);
  });

  it("rejects add-ac with invalid condition", () => {
    expect(isRuleEffect({ ...testMetadata, type: "add-ac", value: 1, condition: { type: "unknown" } })).toBe(false);
  });

  it("rejects grant-spell with missing spellId", () => {
    expect(isRuleEffect({ ...testMetadata, type: "grant-spell", grant: { type: "cantrip" } })).toBe(false);
  });

  it("rejects grant-spell with invalid grant", () => {
    expect(isRuleEffect({ ...testMetadata, type: "grant-spell", spellId: createEntityId("x"), grant: { type: "unknown" } })).toBe(false);
  });

  it("rejects grant-resource with invalid resource", () => {
    expect(isRuleEffect({ ...testMetadata, type: "grant-resource", resource: { name: "" } })).toBe(false);
  });

  it("rejects grant-attack with invalid attack", () => {
    expect(isRuleEffect({ ...testMetadata, type: "grant-attack", attack: { name: "" } })).toBe(false);
  });

  it("rejects grant-feature with empty featureId", () => {
    expect(isRuleEffect({ ...testMetadata, type: "grant-feature", featureId: "" })).toBe(false);
  });
});

describe("ProficiencyRef", () => {
  it("accepts all kinds", () => {
    expect(isProficiencyRef(createProficiencySkillRef(createEntityId("s")))).toBe(true);
    expect(isProficiencyRef(createProficiencyToolRef(createEntityId("t")))).toBe(true);
    expect(isProficiencyRef(createProficiencyArmorRef("light"))).toBe(true);
    expect(isProficiencyRef(createProficiencyArmorRef("shield"))).toBe(true);
    expect(isProficiencyRef(createProficiencySavingThrowRef("STR"))).toBe(true);
    expect(isProficiencyRef(createProficiencyWeaponRef(createEntityId("w")))).toBe(true);
  });

  it("rejects unknown kind", () => {
    expect(isProficiencyRef({ kind: "language" })).toBe(false);
  });

  it("rejects armor with invalid category", () => {
    expect(isProficiencyRef({ kind: "armor", category: "unarmored" })).toBe(false);
  });

  it("rejects saving-throw with invalid ability", () => {
    expect(isProficiencyRef({ kind: "saving-throw", ability: "LCK" })).toBe(false);
  });

  it("rejects skill with empty entityId", () => {
    expect(isProficiencyRef({ kind: "skill", entityId: "" })).toBe(false);
  });
});

describe("SenseDefinition", () => {
  it("accepts all standard senses", () => {
    expect(isSenseDefinition(createDarkvisionSense(60))).toBe(true);
    expect(isSenseDefinition(createBlindsenseSense(10))).toBe(true);
    expect(isSenseDefinition(createTremorsenseSense(30))).toBe(true);
    expect(isSenseDefinition(createTruesightSense(120))).toBe(true);
  });

  it("accepts generic sense", () => {
    expect(isSenseDefinition(createGenericSense("Eaveshear", 120))).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(isSenseDefinition({ type: "ultravision", range: 60 })).toBe(false);
  });

  it("rejects negative range", () => {
    expect(isSenseDefinition({ type: "darkvision", range: -10 })).toBe(false);
  });

  it("rejects generic with empty name", () => {
    expect(isSenseDefinition({ type: "generic", name: "", range: 60 })).toBe(false);
  });

  it("accepts zero range", () => {
    expect(isSenseDefinition({ type: "darkvision", range: 0 })).toBe(true);
  });
});

describe("ArmorClassFormula", () => {
  it("accepts all variants", () => {
    expect(isArmorClassFormula(createBaseAcFormula(10))).toBe(true);
    expect(isArmorClassFormula(createDexAcFormula())).toBe(true);
    expect(isArmorClassFormula(createDexPlusAcFormula(12, 2))).toBe(true);
    expect(isArmorClassFormula(createDexMinusAcFormula(16, 1))).toBe(true);
    expect(isArmorClassFormula(createNaturalAcFormula(19))).toBe(true);
    expect(isArmorClassFormula(createArmorAcFormula())).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(isArmorClassFormula({ type: "unarmored" })).toBe(false);
  });

  it("rejects base with non-number", () => {
    expect(isArmorClassFormula({ type: "base", base: "10" })).toBe(false);
  });
});

describe("EffectCondition", () => {
  it("accepts all variants", () => {
    expect(isEffectCondition(createEquipmentCondition([createEntityId("i")]))).toBe(true);
    expect(isEffectCondition(createEquipmentCondition([]))).toBe(true);
    expect(isEffectCondition(createClassLevelCondition(5))).toBe(true);
    expect(isEffectCondition(createAlwaysCondition())).toBe(true);
  });

  it("rejects class-level < 1", () => {
    expect(isEffectCondition({ type: "class-level", minimumLevel: 0 })).toBe(false);
  });

  it("rejects equipment with non-array", () => {
    expect(isEffectCondition({ type: "equipment", itemIds: "bad" })).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(isEffectCondition({ type: "unknown" })).toBe(false);
  });
});

describe("SpellGrant", () => {
  it("accepts all variants", () => {
    expect(isSpellGrant(createSpellKnownGrant(1))).toBe(true);
    expect(isSpellGrant(createSpellPreparedGrant(2))).toBe(true);
    expect(isSpellGrant(createSpellAlwaysPreparedGrant(0))).toBe(true);
    expect(isSpellGrant(createSpellCantripGrant())).toBe(true);
  });

  it("rejects known with negative level", () => {
    expect(isSpellGrant({ type: "known", level: -1 })).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(isSpellGrant({ type: "unknown" })).toBe(false);
  });
});

describe("ResourceDefinition", () => {
  it("accepts valid resource", () => {
    expect(isResourceDefinition(createResourceDefinition(
      "Second Wind", createFixedValueFormula(1), createLongRestRecovery(),
    ))).toBe(true);
  });

  it("rejects empty name", () => {
    expect(isResourceDefinition({ name: "", maximum: { type: "fixed", value: 1 }, recovery: { type: "long-rest" } })).toBe(false);
  });

  it("rejects invalid maximum", () => {
    expect(isResourceDefinition({ name: "T", maximum: { type: "unknown" }, recovery: { type: "long-rest" } })).toBe(false);
  });

  it("rejects invalid recovery", () => {
    expect(isResourceDefinition({ name: "T", maximum: { type: "fixed", value: 1 }, recovery: { type: "unknown" } })).toBe(false);
  });
});

describe("ValueFormula", () => {
  it("accepts all variants", () => {
    expect(isValueFormula(createFixedValueFormula(5))).toBe(true);
    expect(isValueFormula(createLevelBasedValueFormula(1))).toBe(true);
    expect(isValueFormula(createAbilityBasedValueFormula("CON"))).toBe(true);
    expect(isValueFormula(createSumValueFormula([createFixedValueFormula(1), createLevelBasedValueFormula(1)]))).toBe(true);
    expect(isValueFormula(createSumValueFormula([]))).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(isValueFormula({ type: "unknown" })).toBe(false);
  });

  it("rejects ability-based with invalid ability", () => {
    expect(isValueFormula({ type: "ability-based", ability: "LCK" })).toBe(false);
  });

  it("rejects sum with invalid operand", () => {
    expect(isValueFormula({ type: "sum", operands: [{ type: "unknown" }] })).toBe(false);
  });
});

describe("ResourceRecovery", () => {
  it("accepts all variants", () => {
    expect(isResourceRecovery(createShortRestRecovery(1))).toBe(true);
    expect(isResourceRecovery(createLongRestRecovery())).toBe(true);
    expect(isResourceRecovery(createNoRecovery())).toBe(true);
    expect(isResourceRecovery(createCustomRecovery("When you roll initiative"))).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(isResourceRecovery({ type: "unknown" })).toBe(false);
  });

  it("rejects short-rest with non-number", () => {
    expect(isResourceRecovery({ type: "short-rest", amountRecovered: "1" })).toBe(false);
  });
});

describe("AttackDefinition", () => {
  it("accepts valid attack", () => {
    expect(isAttackDefinition(createAttackDefinition(
      "Jaw",
      createSimpleDamageDefinition(createDiceExpression(1, 8, 3), "piercing"),
      createMeleeRange(5),
      [],
    ))).toBe(true);
  });

  it("accepts attack with properties", () => {
    expect(isAttackDefinition(createAttackDefinition(
      "Longsword",
      createSimpleDamageDefinition(createDiceExpression(1, 8, 3), "slashing"),
      createMeleeRange(5),
      ["finesse", "versatile"],
    ))).toBe(true);
  });

  it("rejects empty name", () => {
    expect(isAttackDefinition({ name: "", damage: { type: "simple", dice: { count: 1, sides: 8, modifier: 0 }, damageType: "s" }, range: { type: "melee", reach: 5 }, properties: [] })).toBe(false);
  });

  it("rejects invalid damage", () => {
    expect(isAttackDefinition({ name: "T", damage: { type: "unknown" }, range: { type: "melee", reach: 5 }, properties: [] })).toBe(false);
  });

  it("rejects non-array properties", () => {
    expect(isAttackDefinition({ name: "T", damage: { type: "simple", dice: { count: 1, sides: 8, modifier: 0 }, damageType: "s" }, range: { type: "melee", reach: 5 }, properties: "f" })).toBe(false);
  });
});

describe("DamageDefinition", () => {
  it("accepts simple damage", () => {
    expect(isDamageDefinition(createSimpleDamageDefinition(createDiceExpression(1, 8, 3), "slashing"))).toBe(true);
  });

  it("accepts multi damage", () => {
    expect(isDamageDefinition(createMultiDamageDefinition([
      { dice: createDiceExpression(1, 6, 0), damageType: "bludgeoning" },
      { dice: createDiceExpression(1, 6, 0), damageType: "piercing" },
    ]))).toBe(true);
  });

  it("rejects empty damageType", () => {
    expect(isDamageDefinition({ type: "simple", dice: { count: 1, sides: 8, modifier: 0 }, damageType: "" })).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(isDamageDefinition({ type: "unknown" })).toBe(false);
  });
});

describe("DiceExpression", () => {
  it("accepts valid expression", () => {
    expect(isDiceExpression(createDiceExpression(2, 6, 3))).toBe(true);
  });

  it("accepts zero count", () => {
    expect(isDiceExpression({ count: 0, sides: 1, modifier: 5 })).toBe(true);
  });

  it("rejects negative count", () => {
    expect(isDiceExpression({ count: -1, sides: 6, modifier: 0 })).toBe(false);
  });

  it("rejects zero sides", () => {
    expect(isDiceExpression({ count: 1, sides: 0, modifier: 0 })).toBe(false);
  });

  it("rejects non-integer count", () => {
    expect(isDiceExpression({ count: 1.5, sides: 6, modifier: 0 })).toBe(false);
  });
});

describe("AttackRange", () => {
  it("accepts melee", () => {
    expect(isAttackRange(createMeleeRange(5))).toBe(true);
  });

  it("accepts melee zero reach", () => {
    expect(isAttackRange({ type: "melee", reach: 0 })).toBe(true);
  });

  it("accepts ranged", () => {
    expect(isAttackRange(createRangedRange(30, 120))).toBe(true);
  });

  it("accepts touch", () => {
    expect(isAttackRange(createTouchRange())).toBe(true);
  });

  it("rejects melee negative reach", () => {
    expect(isAttackRange({ type: "melee", reach: -5 })).toBe(false);
  });

  it("rejects ranged max < normal", () => {
    expect(isAttackRange({ type: "ranged", normal: 120, maximum: 30 })).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(isAttackRange({ type: "unknown" })).toBe(false);
  });
});

describe("AttackProperty", () => {
  it("accepts all string properties", () => {
    for (const p of ["finesse", "thrown", "versatile", "light", "heavy", "two-handed", "loading", "ammunition", "reach", "launcher"]) {
      expect(isAttackProperty(p)).toBe(true);
    }
  });

  it("accepts custom property", () => {
    expect(isAttackProperty({ type: "custom", name: "special" })).toBe(true);
  });

  it("rejects unknown string", () => {
    expect(isAttackProperty("magic")).toBe(false);
  });

  it("rejects custom with empty name", () => {
    expect(isAttackProperty({ type: "custom", name: "" })).toBe(false);
  });
});

describe("Factories produce valid effects", () => {
  it("createAddAbilityEffect", () => {
    const e = createAddAbilityEffect(testMetadata, "STR", 2);
    expect(isRuleEffect(e)).toBe(true);
    expect(e.type).toBe("add-ability");
  });

  it("createSetAbilityEffect", () => {
    const e = createSetAbilityEffect(testMetadata, "DEX", 15);
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddProficiencyEffect", () => {
    const e = createAddProficiencyEffect(testMetadata, createProficiencyArmorRef("light"));
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddExpertiseEffect", () => {
    const e = createAddExpertiseEffect(testMetadata, createEntityId("skill:2024:core:stealth"));
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddLanguageEffect", () => {
    const e = createAddLanguageEffect(testMetadata, createEntityId("language:2024:common"));
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createSetMovementEffect", () => {
    const e = createSetMovementEffect(testMetadata, "walk", 30);
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddMovementEffect", () => {
    const e = createAddMovementEffect(testMetadata, "fly", 30);
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddSenseEffect", () => {
    const e = createAddSenseEffect(testMetadata, createDarkvisionSense(60));
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddResistanceEffect", () => {
    const e = createAddResistanceEffect(testMetadata, "fire");
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddImmunityEffect", () => {
    const e = createAddImmunityEffect(testMetadata, createDamageImmunity("poison"));
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createConditionalRollModeEffect", () => {
    const e = createConditionalRollModeEffect(testMetadata, "saving-throw", "advantage", createAbilityRollPredicate("STR"));
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddCapabilityEffect", () => {
    const e = createAddCapabilityEffect(testMetadata, createNoBreathingRequiredCapability());
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createSetAcFormulaEffect", () => {
    const e = createSetAcFormulaEffect(testMetadata, createDexAcFormula());
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddAcEffect", () => {
    const e = createAddAcEffect(testMetadata, 1);
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createAddAcEffect with condition", () => {
    const e = createAddAcEffect(testMetadata, 1, createAlwaysCondition());
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createGrantSpellEffect", () => {
    const e = createGrantSpellEffect(testMetadata, createEntityId("spell:2024:xphb:firebolt"), createSpellCantripGrant());
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createGrantResourceEffect", () => {
    const e = createGrantResourceEffect(
      testMetadata,
      createResourceDefinition("Test", createFixedValueFormula(3), createShortRestRecovery(1)),
    );
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createGrantAttackEffect", () => {
    const e = createGrantAttackEffect(testMetadata, createAttackDefinition(
      "Bite",
      createSimpleDamageDefinition(createDiceExpression(1, 6, 0), "piercing"),
      createMeleeRange(5),
      [],
    ));
    expect(isRuleEffect(e)).toBe(true);
  });

  it("createGrantFeatureEffect", () => {
    const e = createGrantFeatureEffect(testMetadata, createEntityId("feature:2024:xphb:darkvision"));
    expect(isRuleEffect(e)).toBe(true);
  });
});

describe("AutomationStatus", () => {
  it("guard accepts all statuses", () => {
    expect(isAutomationStatus("full")).toBe(true);
    expect(isAutomationStatus("partial")).toBe(true);
    expect(isAutomationStatus("display-only")).toBe(true);
    expect(isAutomationStatus("manual-adjudication")).toBe(true);
  });

  it("guard rejects unknown status", () => {
    expect(isAutomationStatus("unknown")).toBe(false);
    expect(isAutomationStatus(null)).toBe(false);
  });
});

describe("SheetProjection", () => {
  it("guard accepts all projections", () => {
    expect(isSheetProjection("armor-class")).toBe(true);
    expect(isSheetProjection("initiative")).toBe(true);
    expect(isSheetProjection("movement")).toBe(true);
    expect(isSheetProjection("senses")).toBe(true);
    expect(isSheetProjection("abilities")).toBe(true);
    expect(isSheetProjection("saving-throws")).toBe(true);
    expect(isSheetProjection("skills")).toBe(true);
    expect(isSheetProjection("defenses")).toBe(true);
    expect(isSheetProjection("proficiencies")).toBe(true);
    expect(isSheetProjection("actions")).toBe(true);
    expect(isSheetProjection("attacks")).toBe(true);
    expect(isSheetProjection("spellcasting")).toBe(true);
    expect(isSheetProjection("resources")).toBe(true);
    expect(isSheetProjection("inventory")).toBe(true);
    expect(isSheetProjection("conditions")).toBe(true);
    expect(isSheetProjection("species-traits")).toBe(true);
    expect(isSheetProjection("class-features")).toBe(true);
    expect(isSheetProjection("feats")).toBe(true);
    expect(isSheetProjection("features-and-traits")).toBe(true);
  });

  it("guard rejects unknown projection", () => {
    expect(isSheetProjection("unknown")).toBe(false);
  });
});

describe("RollType", () => {
  it("guard accepts all types", () => {
    expect(isRollType("saving-throw")).toBe(true);
    expect(isRollType("ability-check")).toBe(true);
    expect(isRollType("skill-check")).toBe(true);
    expect(isRollType("attack-roll")).toBe(true);
  });

  it("guard rejects unknown type", () => {
    expect(isRollType("death-save")).toBe(false);
  });
});

describe("RollMode", () => {
  it("guard accepts all modes", () => {
    expect(isRollMode("advantage")).toBe(true);
    expect(isRollMode("disadvantage")).toBe(true);
  });

  it("guard rejects unknown mode", () => {
    expect(isRollMode("normal")).toBe(false);
  });
});

describe("RollPredicate", () => {
  it("accepts ability predicate", () => {
    expect(isRollPredicate(createAbilityRollPredicate("STR"))).toBe(true);
  });

  it("accepts skill predicate", () => {
    expect(isRollPredicate(createSkillRollPredicate(createEntityId("skill:2024:core:stealth")))).toBe(true);
  });

  it("accepts condition predicate", () => {
    expect(isRollPredicate(createConditionRollPredicate(createEntityId("condition:2024:core:poisoned"), "avoid"))).toBe(true);
    expect(isRollPredicate(createConditionRollPredicate(createEntityId("condition:2024:core:poisoned"), "end"))).toBe(true);
    expect(isRollPredicate(createConditionRollPredicate(createEntityId("condition:2024:core:poisoned"), "avoid-or-end"))).toBe(true);
  });

  it("accepts damage-type predicate", () => {
    expect(isRollPredicate(createDamageTypeRollPredicate("fire"))).toBe(true);
  });

  it("accepts concentration predicate", () => {
    expect(isRollPredicate(createConcentrationRollPredicate())).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(isRollPredicate({ type: "unknown" })).toBe(false);
  });

  it("rejects ability predicate with invalid ability", () => {
    expect(isRollPredicate({ type: "ability", ability: "LCK" })).toBe(false);
  });

  it("rejects condition predicate with invalid purpose", () => {
    expect(isRollPredicate({ type: "condition", conditionId: createEntityId("c"), purpose: "unknown" })).toBe(false);
  });

  it("rejects damage-type predicate with empty string", () => {
    expect(isRollPredicate({ type: "damage-type", damageType: "" })).toBe(false);
  });
});

describe("ImmunityDefinition", () => {
  it("accepts damage immunity", () => {
    expect(isImmunityDefinition(createDamageImmunity("poison"))).toBe(true);
  });

  it("accepts condition immunity", () => {
    expect(isImmunityDefinition(createConditionImmunity(createEntityId("condition:2024:core:poisoned")))).toBe(true);
  });

  it("accepts disease immunity", () => {
    expect(isImmunityDefinition(createDiseaseImmunity())).toBe(true);
  });

  it("accepts magical-sleep immunity", () => {
    expect(isImmunityDefinition(createMagicalSleepImmunity())).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(isImmunityDefinition({ type: "unknown" })).toBe(false);
  });

  it("rejects damage immunity with empty string", () => {
    expect(isImmunityDefinition({ type: "damage", damageType: "" })).toBe(false);
  });
});

describe("CapabilityDefinition", () => {
  it("accepts all capabilities", () => {
    expect(isCapabilityDefinition(createNoBreathingRequiredCapability())).toBe(true);
    expect(isCapabilityDefinition(createNoFoodRequiredCapability())).toBe(true);
    expect(isCapabilityDefinition(createNoWaterRequiredCapability())).toBe(true);
    expect(isCapabilityDefinition(createNoSleepRequiredCapability())).toBe(true);
    expect(isCapabilityDefinition(createWaterBreathingCapability())).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(isCapabilityDefinition({ type: "unknown" })).toBe(false);
  });
});

describe("EffectPresentation", () => {
  it("accepts valid presentation", () => {
    expect(isEffectPresentation(createEffectPresentation("abilities", []))).toBe(true);
    expect(isEffectPresentation(createEffectPresentation("abilities", ["skills"]))).toBe(true);
  });

  it("rejects invalid primary", () => {
    expect(isEffectPresentation({ primary: "unknown", secondary: [] })).toBe(false);
  });

  it("rejects non-array secondary", () => {
    expect(isEffectPresentation({ primary: "abilities", secondary: "skills" })).toBe(false);
  });

  it("rejects invalid secondary element", () => {
    expect(isEffectPresentation({ primary: "abilities", secondary: ["unknown"] })).toBe(false);
  });
});

describe("EffectOrigin", () => {
  it("accepts valid origin", () => {
    expect(isEffectOrigin(createEffectOrigin(createEntityId("e"), createSourceId("s"), "structured"))).toBe(true);
    expect(isEffectOrigin(createEffectOrigin(createEntityId("e"), createSourceId("s"), "reviewed-mapping"))).toBe(true);
  });

  it("rejects invalid method", () => {
    expect(isEffectOrigin({ entityId: createEntityId("e"), sourceId: createSourceId("s"), method: "unknown" })).toBe(false);
  });

  it("rejects missing entityId", () => {
    expect(isEffectOrigin({ sourceId: createSourceId("s"), method: "structured" })).toBe(false);
  });

  it("rejects missing sourceId", () => {
    expect(isEffectOrigin({ entityId: createEntityId("e"), method: "structured" })).toBe(false);
  });
});

describe("RuleEffectMetadata", () => {
  it("accepts valid metadata", () => {
    expect(isRuleEffectMetadata(testMetadata)).toBe(true);
  });

  it("rejects missing automationStatus", () => {
    expect(isRuleEffectMetadata({
      presentation: createEffectPresentation("abilities", []),
      origin: createEffectOrigin(createEntityId("e"), createSourceId("s"), "structured"),
    })).toBe(false);
  });

  it("rejects missing presentation", () => {
    expect(isRuleEffectMetadata({
      automationStatus: "full",
      origin: createEffectOrigin(createEntityId("e"), createSourceId("s"), "structured"),
    })).toBe(false);
  });

  it("rejects missing origin", () => {
    expect(isRuleEffectMetadata({
      automationStatus: "full",
      presentation: createEffectPresentation("abilities", []),
    })).toBe(false);
  });
});

describe("Factory immutability", () => {
  it("createEquipmentCondition creates immutable copy of itemIds", () => {
    const ids = [createEntityId("item:2024:xphb:shield")];
    const cond = createEquipmentCondition(ids);
    ids.push(createEntityId("item:2024:xphb:armor"));
    expect(cond.itemIds).toHaveLength(1);
  });

  it("createSumValueFormula creates immutable copy of operands", () => {
    const operands = [createFixedValueFormula(1)];
    const formula = createSumValueFormula(operands);
    operands.push(createFixedValueFormula(2));
    expect(formula.operands).toHaveLength(1);
  });

  it("createMultiDamageDefinition creates immutable copy of damages", () => {
    const damages = [{ dice: createDiceExpression(1, 6, 0), damageType: "slashing" }];
    const def = createMultiDamageDefinition(damages);
    damages.push({ dice: createDiceExpression(1, 6, 0), damageType: "piercing" });
    expect(def.damages).toHaveLength(1);
  });

  it("createAttackDefinition creates immutable copy of properties", () => {
    const props: ("finesse" | "versatile")[] = ["finesse"];
    const attack = createAttackDefinition("Sword", createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"), createMeleeRange(5), props);
    props.push("versatile");
    expect(attack.properties).toHaveLength(1);
  });
});

describe("Round-trip", () => {
  it("all 18 effect variants round-trip through validator", () => {
    const effects = [
      createAddAbilityEffect(testMetadata, "STR", 2),
      createSetAbilityEffect(testMetadata, "DEX", 15),
      createAddProficiencyEffect(testMetadata, createProficiencySkillRef(createEntityId("skill:2024:core:athletics"))),
      createAddExpertiseEffect(testMetadata, createEntityId("skill:2024:core:stealth")),
      createAddLanguageEffect(testMetadata, createEntityId("language:2024:common")),
      createSetMovementEffect(testMetadata, "walk", 30),
      createAddMovementEffect(testMetadata, "fly", 30),
      createAddSenseEffect(testMetadata, createDarkvisionSense(60)),
      createAddResistanceEffect(testMetadata, "fire"),
      createAddImmunityEffect(testMetadata, createDamageImmunity("poison")),
      createConditionalRollModeEffect(testMetadata, "saving-throw", "advantage", createAbilityRollPredicate("STR")),
      createAddCapabilityEffect(testMetadata, createNoBreathingRequiredCapability()),
      createSetAcFormulaEffect(testMetadata, createDexAcFormula()),
      createAddAcEffect(testMetadata, 1),
      createGrantSpellEffect(testMetadata, createEntityId("spell:2024:xphb:firebolt"), createSpellCantripGrant()),
      createGrantResourceEffect(testMetadata, createResourceDefinition("Test", createFixedValueFormula(1), createLongRestRecovery())),
      createGrantAttackEffect(testMetadata, createAttackDefinition("Bite", createSimpleDamageDefinition(createDiceExpression(1, 6, 0), "piercing"), createMeleeRange(5), [])),
      createGrantFeatureEffect(testMetadata, createEntityId("feature:2024:xphb:darkvision")),
    ];

    for (const effect of effects) {
      expect(isRuleEffect(effect)).toBe(true);
    }
  });
});

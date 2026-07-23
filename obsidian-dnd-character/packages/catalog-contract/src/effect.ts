import type { Ability, EntityId } from "@obsidian-dnd/domain";
import { isAbility, isEntityId } from "@obsidian-dnd/domain";

/* ── Effect discriminated union ──────────────────────────────────
   Structured mechanical effects produced by normalized entities.
   The catalog builder converts raw 5eTools structured mechanics
   into these effect types. Narrative text remains in RenderNode.  */

export type RuleEffect =
  | AddAbilityEffect
  | SetAbilityEffect
  | AddProficiencyEffect
  | AddExpertiseEffect
  | AddLanguageEffect
  | SetMovementEffect
  | AddMovementEffect
  | AddSenseEffect
  | AddResistanceEffect
  | AddImmunityEffect
  | SetAcFormulaEffect
  | AddAcEffect
  | GrantSpellEffect
  | GrantResourceEffect
  | GrantAttackEffect
  | GrantFeatureEffect;

/* ── Effect type constants and guard ───────────────────────────── */

export type RuleEffectType =
  | "add-ability"
  | "set-ability"
  | "add-proficiency"
  | "add-expertise"
  | "add-language"
  | "set-movement"
  | "add-movement"
  | "add-sense"
  | "add-resistance"
  | "add-immunity"
  | "set-ac-formula"
  | "add-ac"
  | "grant-spell"
  | "grant-resource"
  | "grant-attack"
  | "grant-feature";

export const RULE_EFFECT_TYPES: ReadonlyArray<RuleEffectType> = [
  "add-ability",
  "set-ability",
  "add-proficiency",
  "add-expertise",
  "add-language",
  "set-movement",
  "add-movement",
  "add-sense",
  "add-resistance",
  "add-immunity",
  "set-ac-formula",
  "add-ac",
  "grant-spell",
  "grant-resource",
  "grant-attack",
  "grant-feature",
];

export function isRuleEffectType(value: unknown): value is RuleEffectType {
  return RULE_EFFECT_TYPES.includes(value as RuleEffectType);
}

/* ── Individual effect interfaces ──────────────────────────────── */

export interface AddAbilityEffect {
  type: "add-ability";
  ability: Ability;
  value: number;
}

export interface SetAbilityEffect {
  type: "set-ability";
  ability: Ability;
  value: number;
}

export interface AddProficiencyEffect {
  type: "add-proficiency";
  proficiency: ProficiencyRef;
}

export interface AddExpertiseEffect {
  type: "add-expertise";
  skillId: EntityId;
}

export interface AddLanguageEffect {
  type: "add-language";
  languageId: EntityId;
}

export interface SetMovementEffect {
  type: "set-movement";
  mode: MovementMode;
  value: number;
}

export interface AddMovementEffect {
  type: "add-movement";
  mode: MovementMode;
  value: number;
}

export interface AddSenseEffect {
  type: "add-sense";
  sense: SenseDefinition;
}

export interface AddResistanceEffect {
  type: "add-resistance";
  damageType: string;
}

export interface AddImmunityEffect {
  type: "add-immunity";
  damageType: string;
}

export interface SetAcFormulaEffect {
  type: "set-ac-formula";
  formula: ArmorClassFormula;
}

export interface AddAcEffect {
  type: "add-ac";
  value: number;
  condition?: EffectCondition;
}

export interface GrantSpellEffect {
  type: "grant-spell";
  spellId: EntityId;
  grant: SpellGrant;
}

export interface GrantResourceEffect {
  type: "grant-resource";
  resource: ResourceDefinition;
}

export interface GrantAttackEffect {
  type: "grant-attack";
  attack: AttackDefinition;
}

export interface GrantFeatureEffect {
  type: "grant-feature";
  featureId: EntityId;
}

/* ── Supporting types ──────────────────────────────────────────── */

export type ProficiencyRef =
  | ProficiencySkillRef
  | ProficiencyToolRef
  | ProficiencyArmorRef
  | ProficiencySavingThrowRef
  | ProficiencyWeaponRef;

export interface ProficiencySkillRef {
  kind: "skill";
  entityId: EntityId;
}

export interface ProficiencyToolRef {
  kind: "tool";
  toolId: EntityId;
}

export interface ProficiencyArmorRef {
  kind: "armor";
  category: "light" | "medium" | "heavy" | "shield";
}

export interface ProficiencySavingThrowRef {
  kind: "saving-throw";
  ability: Ability;
}

export interface ProficiencyWeaponRef {
  kind: "weapon";
  weaponId: EntityId;
}

export type MovementMode = "walk" | "fly" | "swim" | "climb" | "burrow";

export const MOVEMENT_MODES: ReadonlyArray<MovementMode> = [
  "walk",
  "fly",
  "swim",
  "climb",
  "burrow",
];

export function isMovementMode(value: unknown): value is MovementMode {
  return MOVEMENT_MODES.includes(value as MovementMode);
}

export type SenseDefinition =
  | DarkvisionSense
  | BlindsenseSense
  | TremorsenseSense
  | TruesightSense
  | GenericSense;

export interface DarkvisionSense {
  type: "darkvision";
  range: number;
}

export interface BlindsenseSense {
  type: "blindsense";
  range: number;
}

export interface TremorsenseSense {
  type: "tremorsense";
  range: number;
}

export interface TruesightSense {
  type: "truesight";
  range: number;
}

export interface GenericSense {
  type: "generic";
  name: string;
  range: number;
}

export type ArmorClassFormula =
  | BaseAcFormula
  | DexAcFormula
  | DexPlusAcFormula
  | DexMinusAcFormula
  | NaturalAcFormula
  | ArmorAcFormula;

export interface BaseAcFormula {
  type: "base";
  base: number;
}

export interface DexAcFormula {
  type: "dex";
}

export interface DexPlusAcFormula {
  type: "dex-plus";
  base: number;
  maxDexBonus: number;
}

export interface DexMinusAcFormula {
  type: "dex-minus";
  base: number;
  dexPenalty: number;
}

export interface NaturalAcFormula {
  type: "natural";
  base: number;
}

export interface ArmorAcFormula {
  type: "armor";
}

export type EffectCondition =
  | EquipmentCondition
  | ClassLevelCondition
  | AlwaysCondition;

export interface EquipmentCondition {
  type: "equipment";
  itemIds: EntityId[];
}

export interface ClassLevelCondition {
  type: "class-level";
  minimumLevel: number;
}

export interface AlwaysCondition {
  type: "always";
}

export type SpellGrant =
  | SpellKnownGrant
  | SpellPreparedGrant
  | SpellAlwaysPreparedGrant
  | SpellCantripGrant;

export interface SpellKnownGrant {
  type: "known";
  level: number;
}

export interface SpellPreparedGrant {
  type: "prepared";
  level: number;
}

export interface SpellAlwaysPreparedGrant {
  type: "always-prepared";
  level: number;
}

export interface SpellCantripGrant {
  type: "cantrip";
}

export interface ResourceDefinition {
  name: string;
  maximum: ValueFormula;
  recovery: ResourceRecovery;
}

export type ValueFormula =
  | FixedValueFormula
  | LevelBasedValueFormula
  | AbilityBasedValueFormula
  | SumValueFormula;

export interface FixedValueFormula {
  type: "fixed";
  value: number;
}

export interface LevelBasedValueFormula {
  type: "level-based";
  multiplier: number;
}

export interface AbilityBasedValueFormula {
  type: "ability-based";
  ability: Ability;
}

export interface SumValueFormula {
  type: "sum";
  operands: ValueFormula[];
}

export type ResourceRecovery =
  | ShortRestRecovery
  | LongRestRecovery
  | NoRecovery
  | CustomRecovery;

export interface ShortRestRecovery {
  type: "short-rest";
  amountRecovered: number;
}

export interface LongRestRecovery {
  type: "long-rest";
}

export interface NoRecovery {
  type: "none";
}

export interface CustomRecovery {
  type: "custom";
  description: string;
}

export interface AttackDefinition {
  name: string;
  damage: DamageDefinition;
  range: AttackRange;
  properties: AttackProperty[];
}

export type DamageDefinition =
  | SimpleDamageDefinition
  | MultiDamageDefinition;

export interface SimpleDamageDefinition {
  type: "simple";
  dice: DiceExpression;
  damageType: string;
}

export interface MultiDamageDefinition {
  type: "multi";
  damages: DamageEntry[];
}

export interface DamageEntry {
  dice: DiceExpression;
  damageType: string;
}

export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
}

export type AttackRange =
  | MeleeRange
  | RangedRange
  | TouchRange;

export interface MeleeRange {
  type: "melee";
  reach: number;
}

export interface RangedRange {
  type: "ranged";
  normal: number;
  maximum: number;
}

export interface TouchRange {
  type: "touch";
}

export type AttackProperty =
  | "finesse"
  | "thrown"
  | "versatile"
  | "light"
  | "heavy"
  | "two-handed"
  | "loading"
  | "ammunition"
  | "reach"
  | "launcher"
  | AttackPropertyCustom;

export interface AttackPropertyCustom {
  type: "custom";
  name: string;
}

export const ATTACK_PROPERTIES: ReadonlyArray<Exclude<AttackProperty, AttackPropertyCustom>> = [
  "finesse",
  "thrown",
  "versatile",
  "light",
  "heavy",
  "two-handed",
  "loading",
  "ammunition",
  "reach",
  "launcher",
];

/* ── Validator ─────────────────────────────────────────────────── */

export function isRuleEffect(value: unknown): value is RuleEffect {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "add-ability": {
      if (!isAbility(obj.ability)) return false;
      if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) return false;
      return true;
    }
    case "set-ability": {
      if (!isAbility(obj.ability)) return false;
      if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) return false;
      return true;
    }
    case "add-proficiency": {
      if (!isProficiencyRef(obj.proficiency)) return false;
      return true;
    }
    case "add-expertise": {
      if (!isEntityId(obj.skillId)) return false;
      return true;
    }
    case "add-language": {
      if (!isEntityId(obj.languageId)) return false;
      return true;
    }
    case "set-movement": {
      if (!isMovementMode(obj.mode)) return false;
      if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) return false;
      return true;
    }
    case "add-movement": {
      if (!isMovementMode(obj.mode)) return false;
      if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) return false;
      return true;
    }
    case "add-sense": {
      if (!isSenseDefinition(obj.sense)) return false;
      return true;
    }
    case "add-resistance": {
      if (typeof obj.damageType !== "string" || obj.damageType.length === 0) return false;
      return true;
    }
    case "add-immunity": {
      if (typeof obj.damageType !== "string" || obj.damageType.length === 0) return false;
      return true;
    }
    case "set-ac-formula": {
      if (!isArmorClassFormula(obj.formula)) return false;
      return true;
    }
    case "add-ac": {
      if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) return false;
      if (obj.condition !== undefined && !isEffectCondition(obj.condition)) return false;
      return true;
    }
    case "grant-spell": {
      if (!isEntityId(obj.spellId)) return false;
      if (!isSpellGrant(obj.grant)) return false;
      return true;
    }
    case "grant-resource": {
      if (!isResourceDefinition(obj.resource)) return false;
      return true;
    }
    case "grant-attack": {
      if (!isAttackDefinition(obj.attack)) return false;
      return true;
    }
    case "grant-feature": {
      if (!isEntityId(obj.featureId)) return false;
      return true;
    }
    default: {
      return false;
    }
  }
}

/* ── Supporting validators ─────────────────────────────────────── */

export function isProficiencyRef(value: unknown): value is ProficiencyRef {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const kind = obj.kind;

  if (typeof kind !== "string") return false;

  switch (kind) {
    case "skill": {
      return isEntityId(obj.entityId);
    }
    case "tool": {
      return isEntityId(obj.toolId);
    }
    case "armor": {
      return obj.category === "light" || obj.category === "medium" || obj.category === "heavy" || obj.category === "shield";
    }
    case "saving-throw": {
      return isAbility(obj.ability);
    }
    case "weapon": {
      return isEntityId(obj.weaponId);
    }
    default: {
      return false;
    }
  }
}

export function isSenseDefinition(value: unknown): value is SenseDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  const senseTypes: ReadonlyArray<string> = ["darkvision", "blindsense", "tremorsense", "truesight", "generic"];
  if (!senseTypes.includes(type)) return false;

  if (typeof obj.range !== "number" || !Number.isFinite(obj.range) || obj.range < 0) return false;

  if (type === "generic") {
    return typeof obj.name === "string" && obj.name.length > 0;
  }

  return true;
}

export function isArmorClassFormula(value: unknown): value is ArmorClassFormula {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "base": {
      return typeof obj.base === "number" && Number.isFinite(obj.base);
    }
    case "dex": {
      return true;
    }
    case "dex-plus": {
      if (typeof obj.base !== "number" || !Number.isFinite(obj.base)) return false;
      return typeof obj.maxDexBonus === "number" && Number.isFinite(obj.maxDexBonus);
    }
    case "dex-minus": {
      if (typeof obj.base !== "number" || !Number.isFinite(obj.base)) return false;
      return typeof obj.dexPenalty === "number" && Number.isFinite(obj.dexPenalty);
    }
    case "natural": {
      return typeof obj.base === "number" && Number.isFinite(obj.base);
    }
    case "armor": {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function isEffectCondition(value: unknown): value is EffectCondition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "equipment": {
      if (!Array.isArray(obj.itemIds)) return false;
      return obj.itemIds.every((id: unknown) => isEntityId(id));
    }
    case "class-level": {
      if (typeof obj.minimumLevel !== "number" || !Number.isFinite(obj.minimumLevel)) return false;
      if (obj.minimumLevel < 1) return false;
      return true;
    }
    case "always": {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function isSpellGrant(value: unknown): value is SpellGrant {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "known":
    case "prepared":
    case "always-prepared": {
      return typeof obj.level === "number" && Number.isFinite(obj.level) && obj.level >= 0;
    }
    case "cantrip": {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function isResourceDefinition(value: unknown): value is ResourceDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (!isValueFormula(obj.maximum)) return false;
  if (!isResourceRecovery(obj.recovery)) return false;

  return true;
}

export function isValueFormula(value: unknown): value is ValueFormula {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "fixed": {
      return typeof obj.value === "number" && Number.isFinite(obj.value);
    }
    case "level-based": {
      return typeof obj.multiplier === "number" && Number.isFinite(obj.multiplier);
    }
    case "ability-based": {
      return isAbility(obj.ability);
    }
    case "sum": {
      if (!Array.isArray(obj.operands)) return false;
      return obj.operands.every((op: unknown) => isValueFormula(op));
    }
    default: {
      return false;
    }
  }
}

export function isResourceRecovery(value: unknown): value is ResourceRecovery {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "short-rest": {
      return typeof obj.amountRecovered === "number" && Number.isFinite(obj.amountRecovered);
    }
    case "long-rest": {
      return true;
    }
    case "none": {
      return true;
    }
    case "custom": {
      return typeof obj.description === "string";
    }
    default: {
      return false;
    }
  }
}

export function isAttackDefinition(value: unknown): value is AttackDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (!isDamageDefinition(obj.damage)) return false;
  if (!isAttackRange(obj.range)) return false;

  if (!Array.isArray(obj.properties)) return false;
  if (!obj.properties.every((p: unknown) => isAttackProperty(p))) return false;

  return true;
}

export function isDamageDefinition(value: unknown): value is DamageDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "simple": {
      if (!isDiceExpression(obj.dice)) return false;
      return typeof obj.damageType === "string" && obj.damageType.length > 0;
    }
    case "multi": {
      if (!Array.isArray(obj.damages)) return false;
      return obj.damages.every((d: unknown) => isDamageEntry(d));
    }
    default: {
      return false;
    }
  }
}

export function isDamageEntry(value: unknown): value is DamageEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isDiceExpression(obj.dice)) return false;
  return typeof obj.damageType === "string" && obj.damageType.length > 0;
}

export function isDiceExpression(value: unknown): value is DiceExpression {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.count !== "number" || !Number.isInteger(obj.count) || obj.count < 0) return false;
  if (typeof obj.sides !== "number" || !Number.isInteger(obj.sides) || obj.sides < 1) return false;
  if (typeof obj.modifier !== "number" || !Number.isFinite(obj.modifier)) return false;

  return true;
}

export function isAttackRange(value: unknown): value is AttackRange {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "melee": {
      return typeof obj.reach === "number" && Number.isFinite(obj.reach) && obj.reach >= 0;
    }
    case "ranged": {
      if (typeof obj.normal !== "number" || !Number.isFinite(obj.normal) || obj.normal < 0) return false;
      return typeof obj.maximum === "number" && Number.isFinite(obj.maximum) && obj.maximum >= obj.normal;
    }
    case "touch": {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function isAttackProperty(value: unknown): value is AttackProperty {
  if (typeof value === "string") {
    return ATTACK_PROPERTIES.includes(value as Exclude<AttackProperty, AttackPropertyCustom>);
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.type === "custom") {
      return typeof obj.name === "string" && obj.name.length > 0;
    }
  }
  return false;
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createAddAbilityEffect(ability: Ability, value: number): AddAbilityEffect {
  return { type: "add-ability", ability, value };
}

export function createSetAbilityEffect(ability: Ability, value: number): SetAbilityEffect {
  return { type: "set-ability", ability, value };
}

export function createAddProficiencyEffect(proficiency: ProficiencyRef): AddProficiencyEffect {
  return { type: "add-proficiency", proficiency };
}

export function createAddExpertiseEffect(skillId: EntityId): AddExpertiseEffect {
  return { type: "add-expertise", skillId };
}

export function createAddLanguageEffect(languageId: EntityId): AddLanguageEffect {
  return { type: "add-language", languageId };
}

export function createSetMovementEffect(mode: MovementMode, value: number): SetMovementEffect {
  return { type: "set-movement", mode, value };
}

export function createAddMovementEffect(mode: MovementMode, value: number): AddMovementEffect {
  return { type: "add-movement", mode, value };
}

export function createAddSenseEffect(sense: SenseDefinition): AddSenseEffect {
  return { type: "add-sense", sense };
}

export function createAddResistanceEffect(damageType: string): AddResistanceEffect {
  return { type: "add-resistance", damageType };
}

export function createAddImmunityEffect(damageType: string): AddImmunityEffect {
  return { type: "add-immunity", damageType };
}

export function createSetAcFormulaEffect(formula: ArmorClassFormula): SetAcFormulaEffect {
  return { type: "set-ac-formula", formula };
}

export function createAddAcEffect(value: number, condition?: EffectCondition): AddAcEffect {
  return { type: "add-ac", value, condition };
}

export function createGrantSpellEffect(spellId: EntityId, grant: SpellGrant): GrantSpellEffect {
  return { type: "grant-spell", spellId, grant };
}

export function createGrantResourceEffect(resource: ResourceDefinition): GrantResourceEffect {
  return { type: "grant-resource", resource };
}

export function createGrantAttackEffect(attack: AttackDefinition): GrantAttackEffect {
  return { type: "grant-attack", attack };
}

export function createGrantFeatureEffect(featureId: EntityId): GrantFeatureEffect {
  return { type: "grant-feature", featureId };
}

/* ── Supporting type factories ─────────────────────────────────── */

export function createProficiencySkillRef(entityId: EntityId): ProficiencySkillRef {
  return { kind: "skill", entityId };
}

export function createProficiencyToolRef(toolId: EntityId): ProficiencyToolRef {
  return { kind: "tool", toolId };
}

export function createProficiencyArmorRef(category: "light" | "medium" | "heavy" | "shield"): ProficiencyArmorRef {
  return { kind: "armor", category };
}

export function createProficiencySavingThrowRef(ability: Ability): ProficiencySavingThrowRef {
  return { kind: "saving-throw", ability };
}

export function createProficiencyWeaponRef(weaponId: EntityId): ProficiencyWeaponRef {
  return { kind: "weapon", weaponId };
}

export function createDarkvisionSense(range: number): DarkvisionSense {
  return { type: "darkvision", range };
}

export function createBlindsenseSense(range: number): BlindsenseSense {
  return { type: "blindsense", range };
}

export function createTremorsenseSense(range: number): TremorsenseSense {
  return { type: "tremorsense", range };
}

export function createTruesightSense(range: number): TruesightSense {
  return { type: "truesight", range };
}

export function createGenericSense(name: string, range: number): GenericSense {
  return { type: "generic", name, range };
}

export function createBaseAcFormula(base: number): BaseAcFormula {
  return { type: "base", base };
}

export function createDexAcFormula(): DexAcFormula {
  return { type: "dex" };
}

export function createDexPlusAcFormula(base: number, maxDexBonus: number): DexPlusAcFormula {
  return { type: "dex-plus", base, maxDexBonus };
}

export function createDexMinusAcFormula(base: number, dexPenalty: number): DexMinusAcFormula {
  return { type: "dex-minus", base, dexPenalty };
}

export function createNaturalAcFormula(base: number): NaturalAcFormula {
  return { type: "natural", base };
}

export function createArmorAcFormula(): ArmorAcFormula {
  return { type: "armor" };
}

export function createEquipmentCondition(itemIds: EntityId[]): EquipmentCondition {
  return { type: "equipment", itemIds: [...itemIds] };
}

export function createClassLevelCondition(minimumLevel: number): ClassLevelCondition {
  return { type: "class-level", minimumLevel };
}

export function createAlwaysCondition(): AlwaysCondition {
  return { type: "always" };
}

export function createSpellKnownGrant(level: number): SpellKnownGrant {
  return { type: "known", level };
}

export function createSpellPreparedGrant(level: number): SpellPreparedGrant {
  return { type: "prepared", level };
}

export function createSpellAlwaysPreparedGrant(level: number): SpellAlwaysPreparedGrant {
  return { type: "always-prepared", level };
}

export function createSpellCantripGrant(): SpellCantripGrant {
  return { type: "cantrip" };
}

export function createResourceDefinition(
  name: string,
  maximum: ValueFormula,
  recovery: ResourceRecovery,
): ResourceDefinition {
  return { name, maximum, recovery };
}

export function createFixedValueFormula(value: number): FixedValueFormula {
  return { type: "fixed", value };
}

export function createLevelBasedValueFormula(multiplier: number): LevelBasedValueFormula {
  return { type: "level-based", multiplier };
}

export function createAbilityBasedValueFormula(ability: Ability): AbilityBasedValueFormula {
  return { type: "ability-based", ability };
}

export function createSumValueFormula(operands: ValueFormula[]): SumValueFormula {
  return { type: "sum", operands: [...operands] };
}

export function createShortRestRecovery(amountRecovered: number): ShortRestRecovery {
  return { type: "short-rest", amountRecovered };
}

export function createLongRestRecovery(): LongRestRecovery {
  return { type: "long-rest" };
}

export function createNoRecovery(): NoRecovery {
  return { type: "none" };
}

export function createCustomRecovery(description: string): CustomRecovery {
  return { type: "custom", description };
}

export function createAttackDefinition(
  name: string,
  damage: DamageDefinition,
  range: AttackRange,
  properties: AttackProperty[],
): AttackDefinition {
  return { name, damage, range, properties: [...properties] };
}

export function createSimpleDamageDefinition(dice: DiceExpression, damageType: string): SimpleDamageDefinition {
  return { type: "simple", dice, damageType };
}

export function createMultiDamageDefinition(damages: DamageEntry[]): MultiDamageDefinition {
  return { type: "multi", damages: [...damages] };
}

export function createDiceExpression(count: number, sides: number, modifier: number): DiceExpression {
  return { count, sides, modifier };
}

export function createMeleeRange(reach: number): MeleeRange {
  return { type: "melee", reach };
}

export function createRangedRange(normal: number, maximum: number): RangedRange {
  return { type: "ranged", normal, maximum };
}

export function createTouchRange(): TouchRange {
  return { type: "touch" };
}

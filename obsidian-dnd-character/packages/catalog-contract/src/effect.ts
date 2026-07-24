import type { Ability, EntityId, SourceId } from "@obsidian-dnd/domain";
import { isAbility, isEntityId, isSourceId } from "@obsidian-dnd/domain";

/* ── Automation status ─────────────────────────────────────────── */

export type AutomationStatus = "full" | "partial" | "display-only" | "manual-adjudication";

export const AUTOMATION_STATUSES: ReadonlyArray<AutomationStatus> = [
  "full",
  "partial",
  "display-only",
  "manual-adjudication",
];

export function isAutomationStatus(value: unknown): value is AutomationStatus {
  return AUTOMATION_STATUSES.includes(value as AutomationStatus);
}

/* ── Sheet projection types ────────────────────────────────────── */

export type SheetProjection =
  | "armor-class" | "initiative" | "movement" | "senses" | "abilities"
  | "saving-throws" | "skills" | "defenses" | "proficiencies"
  | "actions" | "attacks" | "spellcasting" | "resources" | "inventory"
  | "conditions" | "species-traits" | "class-features" | "feats" | "features-and-traits";

export const SHEET_PROJECTIONS: ReadonlyArray<SheetProjection> = [
  "armor-class", "initiative", "movement", "senses", "abilities",
  "saving-throws", "skills", "defenses", "proficiencies",
  "actions", "attacks", "spellcasting", "resources", "inventory",
  "conditions", "species-traits", "class-features", "feats", "features-and-traits",
];

export function isSheetProjection(value: unknown): value is SheetProjection {
  return SHEET_PROJECTIONS.includes(value as SheetProjection);
}

/* ── Effect presentation ───────────────────────────────────────── */

export interface EffectPresentation {
  primary: SheetProjection;
  secondary: SheetProjection[];
}

export function isEffectPresentation(value: unknown): value is EffectPresentation {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isSheetProjection(obj.primary)) return false;
  if (!Array.isArray(obj.secondary)) return false;
  return obj.secondary.every((s: unknown) => isSheetProjection(s));
}

/* ── Effect origin ─────────────────────────────────────────────── */

export interface EffectOrigin {
  entityId: EntityId;
  sourceId: SourceId;
  method: "structured" | "reviewed-mapping";
}

export function isEffectOrigin(value: unknown): value is EffectOrigin {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isEntityId(obj.entityId)) return false;
  if (!isSourceId(obj.sourceId)) return false;
  if (obj.method !== "structured" && obj.method !== "reviewed-mapping") return false;
  return true;
}

/* ── Rule effect metadata ──────────────────────────────────────── */

export interface RuleEffectMetadata {
  automationStatus: AutomationStatus;
  presentation: EffectPresentation;
  origin: EffectOrigin;
}

export function isRuleEffectMetadata(value: unknown): value is RuleEffectMetadata {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isAutomationStatus(obj.automationStatus)) return false;
  if (!isEffectPresentation(obj.presentation)) return false;
  if (!isEffectOrigin(obj.origin)) return false;
  return true;
}

/* ── Roll types ────────────────────────────────────────────────── */

export type RollType = "saving-throw" | "ability-check" | "skill-check" | "attack-roll";

export const ROLL_TYPES: ReadonlyArray<RollType> = [
  "saving-throw",
  "ability-check",
  "skill-check",
  "attack-roll",
];

export function isRollType(value: unknown): value is RollType {
  return ROLL_TYPES.includes(value as RollType);
}

export type RollMode = "advantage" | "disadvantage";

export const ROLL_MODES: ReadonlyArray<RollMode> = [
  "advantage",
  "disadvantage",
];

export function isRollMode(value: unknown): value is RollMode {
  return ROLL_MODES.includes(value as RollMode);
}

/* ── Roll predicate ────────────────────────────────────────────── */

export type RollPredicate =
  | { type: "ability"; ability: Ability; }
  | { type: "skill"; skillId: EntityId; }
  | { type: "condition"; conditionId: EntityId; purpose: "avoid" | "end" | "avoid-or-end"; }
  | { type: "damage-type"; damageType: string; }
  | { type: "concentration"; };

export function isRollPredicate(value: unknown): value is RollPredicate {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== "string") return false;

  switch (type) {
    case "ability": {
      return isAbility(obj.ability);
    }
    case "skill": {
      return isEntityId(obj.skillId);
    }
    case "condition": {
      if (!isEntityId(obj.conditionId)) return false;
      return obj.purpose === "avoid" || obj.purpose === "end" || obj.purpose === "avoid-or-end";
    }
    case "damage-type": {
      return typeof obj.damageType === "string" && obj.damageType.length > 0;
    }
    case "concentration": {
      return true;
    }
    default: {
      return false;
    }
  }
}

/* ── Immunity definition ───────────────────────────────────────── */

export type ImmunityDefinition =
  | { type: "damage"; damageType: string; }
  | { type: "condition"; conditionId: EntityId; }
  | { type: "disease"; }
  | { type: "magical-sleep"; };

export function isImmunityDefinition(value: unknown): value is ImmunityDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== "string") return false;

  switch (type) {
    case "damage": {
      return typeof obj.damageType === "string" && obj.damageType.length > 0;
    }
    case "condition": {
      return isEntityId(obj.conditionId);
    }
    case "disease": {
      return true;
    }
    case "magical-sleep": {
      return true;
    }
    default: {
      return false;
    }
  }
}

/* ── Capability definition ─────────────────────────────────────── */

export type CapabilityDefinition =
  | { type: "no-breathing-required"; }
  | { type: "no-food-required"; }
  | { type: "no-water-required"; }
  | { type: "no-sleep-required"; }
  | { type: "water-breathing"; };

export const CAPABILITY_TYPES: ReadonlyArray<CapabilityDefinition["type"]> = [
  "no-breathing-required",
  "no-food-required",
  "no-water-required",
  "no-sleep-required",
  "water-breathing",
];

export function isCapabilityDefinition(value: unknown): value is CapabilityDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== "string") return false;
  return CAPABILITY_TYPES.includes(type as CapabilityDefinition["type"]);
}

/* ── Effect discriminated union ──────────────────────────────────
   Structured mechanical effects produced by normalized entities.
   The catalog builder converts raw 5eTools structured mechanics
   into these effect types. Narrative text remains in RenderNode.  */

export type RuleEffect = RuleEffectMetadata & (
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
  | ConditionalRollModeEffect
  | AddCapabilityEffect
  | SetAcFormulaEffect
  | AddAcEffect
  | GrantSpellEffect
  | GrantResourceEffect
  | GrantAttackEffect
  | GrantFeatureEffect
);

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
  | "conditional-roll-mode"
  | "add-capability"
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
  "conditional-roll-mode",
  "add-capability",
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
  immunity: ImmunityDefinition;
}

export interface ConditionalRollModeEffect {
  type: "conditional-roll-mode";
  rollType: RollType;
  mode: RollMode;
  predicate: RollPredicate;
}

export interface AddCapabilityEffect {
  type: "add-capability";
  capability: CapabilityDefinition;
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

  if (!isRuleEffectMetadata(obj)) return false;

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
      if (!isImmunityDefinition(obj.immunity)) return false;
      return true;
    }
    case "conditional-roll-mode": {
      if (!isRollType(obj.rollType)) return false;
      if (!isRollMode(obj.mode)) return false;
      if (!isRollPredicate(obj.predicate)) return false;
      return true;
    }
    case "add-capability": {
      if (!isCapabilityDefinition(obj.capability)) return false;
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

/* ── Metadata factory ──────────────────────────────────────────── */

export function createRuleEffectMetadata(
  automationStatus: AutomationStatus,
  presentation: EffectPresentation,
  origin: EffectOrigin,
): RuleEffectMetadata {
  return { automationStatus, presentation, origin };
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createAddAbilityEffect(
  metadata: RuleEffectMetadata,
  ability: Ability,
  value: number,
): RuleEffectMetadata & AddAbilityEffect {
  return { ...metadata, type: "add-ability", ability, value };
}

export function createSetAbilityEffect(
  metadata: RuleEffectMetadata,
  ability: Ability,
  value: number,
): RuleEffectMetadata & SetAbilityEffect {
  return { ...metadata, type: "set-ability", ability, value };
}

export function createAddProficiencyEffect(
  metadata: RuleEffectMetadata,
  proficiency: ProficiencyRef,
): RuleEffectMetadata & AddProficiencyEffect {
  return { ...metadata, type: "add-proficiency", proficiency };
}

export function createAddExpertiseEffect(
  metadata: RuleEffectMetadata,
  skillId: EntityId,
): RuleEffectMetadata & AddExpertiseEffect {
  return { ...metadata, type: "add-expertise", skillId };
}

export function createAddLanguageEffect(
  metadata: RuleEffectMetadata,
  languageId: EntityId,
): RuleEffectMetadata & AddLanguageEffect {
  return { ...metadata, type: "add-language", languageId };
}

export function createSetMovementEffect(
  metadata: RuleEffectMetadata,
  mode: MovementMode,
  value: number,
): RuleEffectMetadata & SetMovementEffect {
  return { ...metadata, type: "set-movement", mode, value };
}

export function createAddMovementEffect(
  metadata: RuleEffectMetadata,
  mode: MovementMode,
  value: number,
): RuleEffectMetadata & AddMovementEffect {
  return { ...metadata, type: "add-movement", mode, value };
}

export function createAddSenseEffect(
  metadata: RuleEffectMetadata,
  sense: SenseDefinition,
): RuleEffectMetadata & AddSenseEffect {
  return { ...metadata, type: "add-sense", sense };
}

export function createAddResistanceEffect(
  metadata: RuleEffectMetadata,
  damageType: string,
): RuleEffectMetadata & AddResistanceEffect {
  return { ...metadata, type: "add-resistance", damageType };
}

export function createAddImmunityEffect(
  metadata: RuleEffectMetadata,
  immunity: ImmunityDefinition,
): RuleEffectMetadata & AddImmunityEffect {
  return { ...metadata, type: "add-immunity", immunity };
}

export function createConditionalRollModeEffect(
  metadata: RuleEffectMetadata,
  rollType: RollType,
  mode: RollMode,
  predicate: RollPredicate,
): RuleEffectMetadata & ConditionalRollModeEffect {
  return { ...metadata, type: "conditional-roll-mode", rollType, mode, predicate };
}

export function createAddCapabilityEffect(
  metadata: RuleEffectMetadata,
  capability: CapabilityDefinition,
): RuleEffectMetadata & AddCapabilityEffect {
  return { ...metadata, type: "add-capability", capability };
}

export function createSetAcFormulaEffect(
  metadata: RuleEffectMetadata,
  formula: ArmorClassFormula,
): RuleEffectMetadata & SetAcFormulaEffect {
  return { ...metadata, type: "set-ac-formula", formula };
}

export function createAddAcEffect(
  metadata: RuleEffectMetadata,
  value: number,
  condition?: EffectCondition,
): RuleEffectMetadata & AddAcEffect {
  return { ...metadata, type: "add-ac", value, condition };
}

export function createGrantSpellEffect(
  metadata: RuleEffectMetadata,
  spellId: EntityId,
  grant: SpellGrant,
): RuleEffectMetadata & GrantSpellEffect {
  return { ...metadata, type: "grant-spell", spellId, grant };
}

export function createGrantResourceEffect(
  metadata: RuleEffectMetadata,
  resource: ResourceDefinition,
): RuleEffectMetadata & GrantResourceEffect {
  return { ...metadata, type: "grant-resource", resource };
}

export function createGrantAttackEffect(
  metadata: RuleEffectMetadata,
  attack: AttackDefinition,
): RuleEffectMetadata & GrantAttackEffect {
  return { ...metadata, type: "grant-attack", attack };
}

export function createGrantFeatureEffect(
  metadata: RuleEffectMetadata,
  featureId: EntityId,
): RuleEffectMetadata & GrantFeatureEffect {
  return { ...metadata, type: "grant-feature", featureId };
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

/* ── Immunity definition factories ─────────────────────────────── */

export function createDamageImmunity(damageType: string): ImmunityDefinition {
  return { type: "damage", damageType };
}

export function createConditionImmunity(conditionId: EntityId): ImmunityDefinition {
  return { type: "condition", conditionId };
}

export function createDiseaseImmunity(): ImmunityDefinition {
  return { type: "disease" };
}

export function createMagicalSleepImmunity(): ImmunityDefinition {
  return { type: "magical-sleep" };
}

/* ── Capability definition factories ───────────────────────────── */

export function createNoBreathingRequiredCapability(): CapabilityDefinition {
  return { type: "no-breathing-required" };
}

export function createNoFoodRequiredCapability(): CapabilityDefinition {
  return { type: "no-food-required" };
}

export function createNoWaterRequiredCapability(): CapabilityDefinition {
  return { type: "no-water-required" };
}

export function createNoSleepRequiredCapability(): CapabilityDefinition {
  return { type: "no-sleep-required" };
}

export function createWaterBreathingCapability(): CapabilityDefinition {
  return { type: "water-breathing" };
}

/* ── Roll predicate factories ──────────────────────────────────── */

export function createAbilityRollPredicate(ability: Ability): RollPredicate {
  return { type: "ability", ability };
}

export function createSkillRollPredicate(skillId: EntityId): RollPredicate {
  return { type: "skill", skillId };
}

export function createConditionRollPredicate(
  conditionId: EntityId,
  purpose: "avoid" | "end" | "avoid-or-end",
): RollPredicate {
  return { type: "condition", conditionId, purpose };
}

export function createDamageTypeRollPredicate(damageType: string): RollPredicate {
  return { type: "damage-type", damageType };
}

export function createConcentrationRollPredicate(): RollPredicate {
  return { type: "concentration" };
}

/* ── Effect presentation factory ───────────────────────────────── */

export function createEffectPresentation(
  primary: SheetProjection,
  secondary: SheetProjection[],
): EffectPresentation {
  return { primary, secondary: [...secondary] };
}

/* ── Effect origin factory ─────────────────────────────────────── */

export function createEffectOrigin(
  entityId: EntityId,
  sourceId: SourceId,
  method: "structured" | "reviewed-mapping",
): EffectOrigin {
  return { entityId, sourceId, method };
}

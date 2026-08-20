import type { IndexedClassEntry, StartingEquipmentChoice, StartingEquipmentGrant } from "./class-index-types";
import { isAbility, createCanonicalEntityId, createEntityId, createSourceId, createRuleGrantId, createChoiceDefinitionId, createChoiceOptionId, isWeaponCategory, isWeaponPropertyRef, type Ability, type WeaponPropertyRef } from "@obsidian-dnd/domain";
import {
  createClassRule,
  createChoiceDefinition,
  createClosedOptionChoiceDefinition,
  createEquipmentQuery,
  createProficiencyQuery,
  createEntityQuery,
  createLevelDefinition,
  createFeatureGrant,
  type ClassRule,
  type LevelDefinition,
  type RenderNode,
  type RuleEffect,
  type RuleGrant,
  type ChoiceDefinition,
} from "@obsidian-dnd/catalog-contract";
import { createFiveEToolsExternalReference } from "./fiveetools-external-reference";
import {
  createRuleEffectMetadata,
  createAddProficiencyEffect,
  createProficiencySavingThrowRef,
  createEffectPresentation,
  createEffectOrigin,
  createWeaponCategoryScope,
  createWeaponFilterScope,
  createProficiencyToolRef,
  createProficiencyArmorRef,
} from "@obsidian-dnd/catalog-contract";

/* ── Diagnostic types ──────────────────────────────────────────── */

export type ClassNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID"
  | "MISSING_HIT_DIE"
  | "INVALID_HIT_DIE"
  | "MISSING_PRIMARY_ABILITIES"
  | "INVALID_PRIMARY_ABILITY"
  | "MISSING_SAVING_THROW_PROFICIENCIES"
  | "INVALID_SAVING_THROW_ABILITY"
  | "UNSUPPORTED_STARTING_EQUIPMENT"
  | "SUBCLASS_EXCLUDED";

export interface ClassNormalizerDiagnostic {
  readonly code: ClassNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

/* ── Input / Output ────────────────────────────────────────────── */

export interface ClassNormalizerInput {
  readonly entries: readonly IndexedClassEntry[];
}

export interface ClassNormalizerResult {
  readonly classes: readonly ClassRule[];
  readonly diagnostics: readonly ClassNormalizerDiagnostic[];
}

/* ── Internal helpers ──────────────────────────────────────────── */

interface NormalizerOptions {
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: ClassNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): ClassNormalizerDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "INVALID_CANONICAL_ID",
    "MISSING_HIT_DIE",
    "INVALID_HIT_DIE",
    "MISSING_PRIMARY_ABILITIES",
    "MISSING_SAVING_THROW_PROFICIENCIES",
    "UNSUPPORTED_STARTING_EQUIPMENT",
  ].includes(code);

  return Object.freeze({
    code,
    severity: isError ? "error" : "warning",
    message,
    recordName,
    source,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
}

/**
 * Converts a raw ability string array into validated Ability[].
 * Returns { abilities, invalid } where `invalid` lists unmapped strings.
 */
function validateAbilities(raw: readonly string[]): {
  readonly abilities: Ability[];
  readonly invalid: readonly string[];
} {
  const abilities: Ability[] = [];
  const invalid: string[] = [];

  for (const rawAbility of raw) {
    const upper = rawAbility.toUpperCase();
    if (isAbility(upper)) {
      abilities.push(upper);
    } else {
      invalid.push(rawAbility);
    }
  }

  return { abilities, invalid };
}

/**
 * Extracts narrative content from the resolved record's remaining fields.
 * Preserves narrative content as safe render nodes.
 */
function extractContent(remaining: Record<string, unknown>): RenderNode[] {
  const content: RenderNode[] = [];

  const entries = remaining.entries;
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (e.type === "paragraph" && typeof e.text === "string") {
        content.push({ type: "paragraph", text: e.text });
      } else if (e.type === "heading" && typeof e.text === "string") {
        const level = e.level;
        if (level === 2 || level === 3 || level === 4) {
          content.push({ type: "heading", level: level as 2 | 3 | 4, text: e.text });
        }
      } else if (e.type === "list" && Array.isArray(e.items)) {
        content.push({ type: "list", ordered: false, items: [] });
      } else {
        content.push({ type: "note", text: String(e.text ?? "") });
      }
    }
  }

  const description = remaining.description;
  if (typeof description === "string" && description.length > 0) {
    content.push({ type: "paragraph", text: description });
  }

  return content;
}

/**
 * Creates saving throw proficiency effects from validated abilities.
 */
function createSavingThrowEffects(
  abilities: Ability[],
  entityId: string,
  sourceId: string,
): RuleEffect[] {
  const effects: RuleEffect[] = [];

  const metadata = createRuleEffectMetadata(
    "full",
    createEffectPresentation("proficiencies", []),
    createEffectOrigin(createEntityId(entityId), createSourceId(sourceId), "structured"),
  );

  for (const ability of abilities) {
    effects.push(
      createAddProficiencyEffect(metadata, createProficiencySavingThrowRef(ability)),
    );
  }

  return effects;
}

/* ── Armor normalization helper ─────────────────────────────────── */

const ARMOR_CATEGORY_MAP: Record<string, "light" | "medium" | "heavy" | "shield"> = {
  "light armor": "light",
  "medium armor": "medium",
  "heavy armor": "heavy",
  "shield": "shield",
};

function normalizeArmorCategory(raw: string): "light" | "medium" | "heavy" | "shield" | null {
  const key = raw.toLowerCase().trim();
  return ARMOR_CATEGORY_MAP[key] ?? null;
}

/* ── Starting grants builder ───────────────────────────────────── */

function resolveStartingItemId(reference: string, entry: IndexedClassEntry) {
  if (reference.startsWith("item:")) return createEntityId(reference);
  const [name, rawSource] = reference.split("|");
  if (name === undefined || name.length === 0) return undefined;
  const source = rawSource?.toUpperCase() === "XPHB" ? "XPHB" : rawSource?.toUpperCase() === "PHB" ? "PHB" : entry.source;
  const resolved = createCanonicalEntityId({ kind: "item", ruleset: entry.ruleset, source, name });
  return resolved.ok ? resolved.id : undefined;
}

function buildNestedEquipmentChoices(
  entry: IndexedClassEntry,
  owner: string,
  path: string,
  choices: NonNullable<IndexedClassEntry["startingEquipmentChoices"][number]["options"][number]["equipmentChoices"]>,
): ChoiceDefinition[] {
  const result: ChoiceDefinition[] = [];
  for (let index = 0; index < choices.length; index++) {
    const equipment = choices[index]!;
    result.push(createChoiceDefinition(
      createChoiceDefinitionId(`${owner}:${path}:equipment:${index}`),
      "Choose starting equipment",
      "equipment",
      equipment.quantity,
      equipment.quantity,
      equipment.quantity > 1,
      createEquipmentQuery({ equipmentGroups: [...equipment.equipmentGroups] }),
      [],
    ));
  }
  return result;
}

function buildNestedStartingChoices(
  entry: IndexedClassEntry, owner: string, path: string, choices: readonly StartingEquipmentChoice[],
): ChoiceDefinition[] {
  return choices.map((choice, choiceIndex) => createClosedOptionChoiceDefinition(
    createChoiceDefinitionId(`${owner}:${path}:package:${choiceIndex}`),
    choice.label ?? "Choose starting equipment",
    choice.count,
    choice.count,
    false,
    choice.options.map((option, optionIndex) => ({
      id: createChoiceOptionId(`${owner}:${path}:package:${choiceIndex}:option:${optionIndex}`),
      label: option.label,
      grants: option.grants.flatMap((grant, grantIndex) => materializeStartingEquipmentGrant(
        grant,
        createRuleGrantId(`${owner}:${path}:package:${choiceIndex}:option:${optionIndex}:grant:${grantIndex}`),
        entry,
      )),
      choices: [
        ...buildNestedEquipmentChoices(entry, owner, `${path}:package:${choiceIndex}:option:${optionIndex}`, option.equipmentChoices ?? []),
        ...buildNestedStartingChoices(entry, owner, `${path}:package:${choiceIndex}:option:${optionIndex}`, option.choices ?? []),
      ],
    })),
    [],
  ));
}

function materializeStartingEquipmentGrant(
  grant: StartingEquipmentGrant, id: ReturnType<typeof createRuleGrantId>, entry: IndexedClassEntry,
): RuleGrant[] {
  if (grant.type === "item" && grant.itemId !== undefined) {
    const itemId = resolveStartingItemId(grant.itemId, entry);
    return itemId === undefined ? [] : [{ id, type: "item", itemId, quantity: grant.quantity ?? 1 }];
  }
  if (grant.type === "named-item" && grant.name !== undefined) return [{ id, type: "named-item", name: grant.name, quantity: grant.quantity ?? 1 }];
  if (grant.type === "currency" && grant.denomination !== undefined) {
    const denomination = grant.denomination as "cp" | "sp" | "ep" | "gp" | "pp";
    if (grant.fixedValue !== undefined) return [{ id, type: "currency", denomination, amount: { type: "fixed", value: grant.fixedValue } }];
    if (grant.diceCount !== undefined && grant.diceSides !== undefined) return [{ id, type: "currency", denomination, amount: { type: "dice", count: grant.diceCount, dieSides: grant.diceSides, multiplier: grant.diceMultiplier ?? 1 } }];
  }
  return [];
}

/**
 * Builds starting grants (RuleGrant[]) from indexed class entry data.
 *
 * Includes:
 * - Armor proficiency grants (effect type)
 * - Weapon proficiency grants (effect type, category or filter)
 * - Tool proficiency grants (effect type, fixed only; choices go to startingChoices)
 * - Equipment grants (item, named-item, currency)
 * - Starting gold (currency)
 */
function buildStartingGrants(
  entry: IndexedClassEntry,
): RuleGrant[] {
  const grants: RuleGrant[] = [];
  const entityId = entry.id;
  const metadata = createRuleEffectMetadata(
    "full",
    createEffectPresentation("proficiencies", []),
    createEffectOrigin(createEntityId(entityId), createSourceId(entry.sourceId), "structured"),
  );

  // Armor proficiency grants
  for (let i = 0; i < entry.startingArmorProficiencies.length; i++) {
    const rawArmor = entry.startingArmorProficiencies[i]!;
    const armor = normalizeArmorCategory(rawArmor);
    if (armor === null) continue;
    grants.push({
      id: createRuleGrantId(`${entityId}:starting:armor:${i}`),
      type: "effect",
      effect: createAddProficiencyEffect(metadata, createProficiencyArmorRef(armor)),
    });
  }

  // Weapon proficiency grants
  for (let i = 0; i < entry.startingWeaponProficiencies.length; i++) {
    const wp = entry.startingWeaponProficiencies[i]!;
    let effect: RuleEffect;
    if (wp.type === "category") {
      const category = wp.category;
      if (!isWeaponCategory(category)) continue;
      effect = createAddProficiencyEffect(metadata, createWeaponCategoryScope(category));
    } else {
      const category = wp.category;
      if (!isWeaponCategory(category)) continue;
      const props: WeaponPropertyRef[] = [];
      for (const prop of wp.requiredProperties) {
        if (isWeaponPropertyRef(prop)) {
          props.push(prop);
        }
      }
      if (props.length === 0) continue;
      effect = createAddProficiencyEffect(metadata, createWeaponFilterScope(category, props));
    }
    grants.push({
      id: createRuleGrantId(`${entityId}:starting:weapon:${i}`),
      type: "effect",
      effect,
    });
  }

  // Tool proficiency grants (fixed only; choices handled separately)
  for (let i = 0; i < entry.startingToolProficiencies.length; i++) {
    const tp = entry.startingToolProficiencies[i]!;
    if (tp.type === "fixed") {
      grants.push({
        id: createRuleGrantId(`${entityId}:starting:tool:${i}`),
        type: "effect",
        effect: createAddProficiencyEffect(metadata, createProficiencyToolRef(createEntityId(tp.toolRef))),
      });
    }
  }

  // Equipment grants
  for (let i = 0; i < entry.startingEquipmentGrants.length; i++) {
    const eg = entry.startingEquipmentGrants[i]!;
    const grantId = createRuleGrantId(`${entityId}:starting:equipment:${i}`);
    if (eg.type === "item" && eg.itemId) {
      const quantity = eg.quantity ?? 1;
      const itemId = resolveStartingItemId(eg.itemId, entry);
      if (itemId !== undefined) grants.push({ id: grantId, type: "item", itemId, quantity });
    } else if (eg.type === "named-item" && eg.name) {
      const quantity = eg.quantity ?? 1;
      grants.push({ id: grantId, type: "named-item", name: eg.name, quantity });
    } else if (eg.type === "currency" && eg.denomination) {
      const denomination = eg.denomination as "cp" | "sp" | "ep" | "gp" | "pp";
      let amount: { type: "fixed"; value: number } | { type: "dice"; count: number; dieSides: number; multiplier: number };
      if (eg.fixedValue !== undefined) {
        amount = { type: "fixed", value: eg.fixedValue };
      } else if (eg.diceCount !== undefined && eg.diceSides !== undefined) {
        amount = { type: "dice", count: eg.diceCount, dieSides: eg.diceSides, multiplier: eg.diceMultiplier ?? 1 };
      } else {
        continue;
      }
      grants.push({ id: grantId, type: "currency", denomination, amount });
    }
  }

  // Starting gold
  for (let i = 0; i < entry.startingGold.length; i++) {
    const gold = entry.startingGold[i]!;
    const grantId = createRuleGrantId(`${entityId}:starting:gold:${i}`);
    const denomination = gold.denomination as "cp" | "sp" | "ep" | "gp" | "pp";
    let amount: { type: "fixed"; value: number } | { type: "dice"; count: number; dieSides: number; multiplier: number };
    if (gold.fixedValue !== undefined) {
      amount = { type: "fixed", value: gold.fixedValue };
    } else if (gold.diceCount !== undefined && gold.diceSides !== undefined) {
      amount = { type: "dice", count: gold.diceCount, dieSides: gold.diceSides, multiplier: gold.diceMultiplier ?? 1 };
    } else {
      continue;
    }
    grants.push({ id: grantId, type: "currency", denomination, amount });
  }

  return grants;
}

/* ── Starting choices builder ──────────────────────────────────── */

/**
 * Builds starting choices (ChoiceDefinition[]) from indexed class entry data.
 *
 * Includes:
 * - Skill proficiency choices (pick N from list or any)
 * - Tool proficiency choices (pick N from group)
 * - Equipment choices (closed-option packages)
 */
function buildStartingChoices(
  entry: IndexedClassEntry,
): ChoiceDefinition[] {
  const choices: ChoiceDefinition[] = [];
  const entityId = entry.id;

  // Skill proficiency choices
  for (let i = 0; i < entry.startingSkillChoices.length; i++) {
    const sc = entry.startingSkillChoices[i]!;
    choices.push(createChoiceDefinition(
      createChoiceDefinitionId(`${entityId}:starting:skill:${i}`),
      `Choose ${sc.count} skill${sc.count > 1 ? "s" : ""}`,
      "skill-proficiency",
      sc.count,
      sc.count,
      false,
      sc.isAny ? createEntityQuery("skill") : createProficiencyQuery("skill"),
      [],
    ));
  }

  // Tool proficiency choices
  for (let i = 0; i < entry.startingToolProficiencies.length; i++) {
    const tp = entry.startingToolProficiencies[i]!;
    if (tp.type === "choice") {
      choices.push(createChoiceDefinition(
        createChoiceDefinitionId(`${entityId}:starting:tool:${i}`),
        `Choose ${tp.count} tool${tp.count > 1 ? "s" : ""} proficiencies`,
        "tool-proficiency",
        tp.count,
        tp.count,
        false,
        createProficiencyQuery("tool"),
        [],
      ));
    }
  }

  // Equipment choices (closed-option packages)
  for (let i = 0; i < entry.startingEquipmentChoices.length; i++) {
    const ec = entry.startingEquipmentChoices[i]!;
    const options = ec.options.map((opt, optIndex) => {
      const optGrants: RuleGrant[] = [];
      for (let gIndex = 0; gIndex < opt.grants.length; gIndex++) {
        const g = opt.grants[gIndex]!;
        const grantId = createRuleGrantId(`${entityId}:starting:choice:${i}:option:${optIndex}:grant:${gIndex}`);
        if (g.type === "item" && g.itemId) {
          const itemId = resolveStartingItemId(g.itemId, entry);
          if (itemId !== undefined) optGrants.push({ id: grantId, type: "item", itemId, quantity: g.quantity ?? 1 } as RuleGrant);
        } else if (g.type === "named-item" && g.name) {
          optGrants.push({ id: grantId, type: "named-item", name: g.name, quantity: g.quantity ?? 1 } as RuleGrant);
        } else if (g.type === "currency" && g.denomination) {
          const denomination = g.denomination as "cp" | "sp" | "ep" | "gp" | "pp";
          let amount: { type: "fixed"; value: number } | { type: "dice"; count: number; dieSides: number; multiplier: number };
          if (g.fixedValue !== undefined) {
            amount = { type: "fixed", value: g.fixedValue };
          } else if (g.diceCount !== undefined && g.diceSides !== undefined) {
            amount = { type: "dice", count: g.diceCount, dieSides: g.diceSides, multiplier: g.diceMultiplier ?? 1 };
          } else {
            continue;
          }
          optGrants.push({ id: grantId, type: "currency", denomination, amount } as RuleGrant);
        }
      }

      return {
        id: createChoiceOptionId(`${entityId}:starting:choice:${i}:option:${optIndex}`),
        label: opt.label,
        grants: optGrants,
        choices: [
          ...buildNestedEquipmentChoices(entry, entityId, `starting:choice:${i}:option:${optIndex}`, opt.equipmentChoices ?? []),
          ...buildNestedStartingChoices(entry, entityId, `starting:choice:${i}:option:${optIndex}`, opt.choices ?? []),
        ],
      };
    });

    choices.push(createClosedOptionChoiceDefinition(
      createChoiceDefinitionId(`${entityId}:starting:choice:${i}`),
      ec.label ?? "Choose starting equipment",
      ec.count,
      ec.count,
      false,
      options,
      [],
    ));
  }

  return choices;
}

/* ── Level-one features builder ────────────────────────────────── */

/**
 * Builds level-one features as a LevelDefinition record.
 *
 * Level-one features become FeatureGrants at level 1.
 */
function buildLevelOne(entry: IndexedClassEntry): Record<number, LevelDefinition> {
  if (entry.levelOneFeatures.length === 0) return {};

  const grants = entry.levelOneFeatures.map((feature, index) => {
    const featureId = feature.featureRef ? createEntityId(feature.featureRef) : createEntityId(`${entry.id}:feature:${index}`);
    return createFeatureGrant(featureId);
  });

  return { 1: createLevelDefinition(1, grants) };
}

type SingleResult =
  | { readonly ok: true; readonly classRule: ClassRule; readonly diagnostics: readonly ClassNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly ClassNormalizerDiagnostic[] };

function normalizeSingleClass(
  entry: IndexedClassEntry,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: ClassNormalizerDiagnostic[] = [];

  // 1. Subclass exclusion — only process top-level classes
  if (entry.isSubclass) {
    diagnostics.push(makeDiagnostic(
      "SUBCLASS_EXCLUDED",
      `Class "${entry.name}" is a subclass and excluded from class normalization.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Forward diagnostics from index loader
  for (const diag of entry.diagnostics) {
    const code = diag.code as ClassNormalizerDiagnosticCode;
    if (code === "EXCLUDED_SOURCE" || code === "INVALID_SOURCE" || code === "UNKNOWN_SOURCE" ||
        code === "UNSUPPORTED_STARTING_EQUIPMENT") {
      diagnostics.push(makeDiagnostic(
        code,
        diag.message,
        entry.name,
        opts,
        diag.source,
      ));
      return { ok: false, diagnostics: Object.freeze(diagnostics) };
    }
    if (code === "MISSING_HIT_DIE" || code === "INVALID_HIT_DIE" ||
        code === "MISSING_PRIMARY_ABILITIES" || code === "MISSING_SAVING_THROW_PROFICIENCIES" ||
        code === "INVALID_CANONICAL_ID") {
      diagnostics.push(makeDiagnostic(
        code,
        diag.message,
        entry.name,
        opts,
        diag.source,
      ));
    }
  }

  // 3. Validate hit die
  const hitDie = entry.hitDie;
  if (hitDie === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_HIT_DIE",
      `Class "${entry.name}" is missing a valid hitdie field.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 4. Validate primary abilities
  const { abilities: primaryAbilities, invalid: invalidPrimary } = validateAbilities(entry.primaryAbilities);
  if (primaryAbilities.length === 0) {
    diagnostics.push(makeDiagnostic(
      "MISSING_PRIMARY_ABILITIES",
      `Class "${entry.name}" has no valid primary ability scores.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }
  if (invalidPrimary.length > 0) {
    diagnostics.push(makeDiagnostic(
      "INVALID_PRIMARY_ABILITY",
      `Class "${entry.name}" has invalid primary abilities: ${invalidPrimary.join(", ")}.`,
      entry.name,
      opts,
      entry.source,
    ));
  }

  // 5. Validate saving throw proficiencies
  const { abilities: savingThrowAbilities, invalid: invalidSaving } = validateAbilities(entry.savingThrowProficiencies);
  if (savingThrowAbilities.length === 0) {
    diagnostics.push(makeDiagnostic(
      "MISSING_SAVING_THROW_PROFICIENCIES",
      `Class "${entry.name}" has no valid saving throw proficiencies.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }
  if (invalidSaving.length > 0) {
    diagnostics.push(makeDiagnostic(
      "INVALID_SAVING_THROW_ABILITY",
      `Class "${entry.name}" has invalid saving throw abilities: ${invalidSaving.join(", ")}.`,
      entry.name,
      opts,
      entry.source,
    ));
  }

  // 6. Extract narrative content
  const content = extractContent(entry.record.remaining);

  // 7. Create saving throw proficiency effects
  const effects = createSavingThrowEffects(
    savingThrowAbilities,
    entry.id,
    entry.sourceId,
  );

  // 8. Build starting grants (armor, weapon, tool proficiencies, equipment, gold)
  const startingGrants = buildStartingGrants(entry);

  // 9. Build starting choices (skill, tool, equipment choices)
  const startingChoices = buildStartingChoices(entry);

  // 10. Build level-one features
  const levels = buildLevelOne(entry);

  // 11. Assemble ClassRule
  const classRule = Object.freeze(createClassRule(
    createEntityId(entry.id),
    entry.name,
    createSourceId(entry.sourceId),
    entry.ruleset,
    "core", // access (PHB/XPHB are core)
    hitDie,
    primaryAbilities,
    savingThrowAbilities,
    startingChoices,
    levels,
    [], // subclassIds (populated after subclass normalization)
    content,
    [], // prerequisites (deferred)
    effects,
    [], // choices (deferred)
    [], // dependencies (deferred)
    false, // legacy
    undefined, // page
    undefined, // summary
    undefined, // spellcasting
    [], // grants
    startingGrants,
    [createFiveEToolsExternalReference("class", entry.name, entry.source)].filter((reference): reference is NonNullable<typeof reference> => reference !== undefined),
  ));

  return { ok: true, classRule, diagnostics: Object.freeze(diagnostics) };
}

/* ── Public normalizer ─────────────────────────────────────────── */

export function normalizeClasses(input: ClassNormalizerInput): ClassNormalizerResult {
  const classes: ClassRule[] = [];
  const diagnostics: ClassNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.entries.length; i++) {
    const entry = input.entries[i];
    if (entry === undefined) continue;

    const result = normalizeSingleClass(entry, {
      sourcePath: undefined,
      entityKind: "class",
      recordIndex: i,
    });

    if (result.ok) {
      classes.push(result.classRule);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    classes: Object.freeze(classes),
    diagnostics: Object.freeze(diagnostics),
  });
}

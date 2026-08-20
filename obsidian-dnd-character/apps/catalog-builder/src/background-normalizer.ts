import type { RawRecord } from "./raw-boundary";
import { classifyBackgroundSourceScope, type BackgroundSourceScopeContext } from "./background-source-scope";
import {
  extractContent,
  extractSkillProficiencies,
  extractFeatureId,
  extractPage,
  extractSummary,
} from "./background-field-extractors";
import { createCanonicalEntityId, createChoiceDefinitionId, createChoiceOptionId, createSourceId, type Ability, type EntityId } from "@obsidian-dnd/domain";
import { createBackgroundRule, createAbilityAllocationChoiceDefinition, createChoiceDefinition, createClosedOptionChoiceDefinition, createEntityQuery, createEquipmentQuery, createRuleEffectMetadata, createEffectPresentation, createEffectOrigin, createAddLanguageEffect, createAddProficiencyEffect, type ChoiceDefinition, type RuleEffect, type RuleGrant, type BackgroundRule } from "@obsidian-dnd/catalog-contract";
import { createDeterministicRuleGrantId } from "./rule-grant-id";
import { mapRawEquipmentType, mapRawEquipmentTypes } from "./equipment-group-mapping";
import type { DeferredEquipmentDestination, DeferredEquipmentIntent } from "./deferred-equipment-resolution";
import { createFiveEToolsExternalReference } from "./fiveetools-external-reference";
import { parseStartingEquipmentFilters, type StartingEquipmentFilterConstraint } from "./starting-equipment-filter";

export type BackgroundNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "INVALID_CANONICAL_ID"
  | "UNMAPPED_SKILL_PROFICIENCY"
  | "UNMAPPED_TOOL_PROFICIENCY"
  | "UNMAPPED_LANGUAGE"
  | "UNMAPPED_FEATURE"
  | "UNMAPPED_MECHANIC";

export interface BackgroundNormalizerDiagnostic {
  readonly code: BackgroundNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface BackgroundNormalizerInput {
  readonly records: readonly RawRecord[];
  readonly context: BackgroundSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
}

export interface BackgroundNormalizerResult {
  readonly backgrounds: readonly BackgroundRule[];
  readonly diagnostics: readonly BackgroundNormalizerDiagnostic[];
  readonly deferredEquipment: readonly DeferredEquipmentIntent[];
}

interface NormalizerOptions {
  readonly context: BackgroundSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: BackgroundNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): BackgroundNormalizerDiagnostic {
  return Object.freeze({
    code,
    severity: (["INVALID_CANONICAL_ID", "INVALID_SOURCE"].includes(code) ? "error" : "warning") as "warning" | "error",
    message,
    recordName,
    source,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
}

type SingleResult =
  | { readonly ok: true; readonly background: BackgroundRule; readonly diagnostics: readonly BackgroundNormalizerDiagnostic[]; readonly deferredEquipment: readonly DeferredEquipmentIntent[] }
  | { readonly ok: false; readonly diagnostics: readonly BackgroundNormalizerDiagnostic[] };

function itemId(reference: string, ruleset: "2014" | "2024", source: "PHB" | "XPHB") {
  const [name, itemSource] = reference.split("|");
  return name === undefined ? undefined : createCanonicalEntityId({ kind: "item", ruleset, source: (itemSource?.toUpperCase() === "PHB" ? "PHB" : itemSource?.toUpperCase() === "XPHB" ? "XPHB" : source), name });
}

function packageGrants(
  items: unknown[], owner: string, path: string, ruleset: "2014" | "2024", source: "PHB" | "XPHB", destination: DeferredEquipmentDestination,
): { grants: RuleGrant[]; deferredEquipment: DeferredEquipmentIntent[] } {
  const grants: RuleGrant[] = [];
  const deferredEquipment: DeferredEquipmentIntent[] = [];
  for (let index = 0; index < items.length; index++) {
    const value = items[index];
    const grantPath = `${path}:${index}`;
    if (typeof value === "string") {
      const resolved = itemId(value, ruleset, source);
      if (resolved?.ok) deferredEquipment.push({ mode: "canonical-reference-required", id: createDeterministicRuleGrantId(owner, grantPath), itemId: resolved.id, quantity: 1, destination, sourcePath: grantPath });
      continue;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry.item === "string") {
      const resolved = itemId(entry.item, ruleset, source);
      const quantity = typeof entry.quantity === "number" && Number.isInteger(entry.quantity) && entry.quantity > 0 ? entry.quantity : 1;
      if (resolved?.ok) deferredEquipment.push({ mode: "canonical-reference-required", id: createDeterministicRuleGrantId(owner, grantPath), itemId: resolved.id, quantity, destination, sourcePath: grantPath });
      if (typeof entry.containsValue === "number" && Number.isInteger(entry.containsValue) && entry.containsValue > 0) {
        grants.push({ id: createDeterministicRuleGrantId(owner, `${grantPath}:containsValue`), type: "currency", denomination: "cp", amount: { type: "fixed", value: entry.containsValue } });
      }
    } else if (typeof entry.special === "string" && entry.special.trim().length > 0) {
      const quantity = typeof entry.quantity === "number" && Number.isInteger(entry.quantity) && entry.quantity > 0 ? entry.quantity : 1;
      grants.push({ id: createDeterministicRuleGrantId(owner, grantPath), type: "named-item", name: entry.special.trim(), quantity });
    } else if (typeof entry.value === "number" && Number.isInteger(entry.value) && entry.value > 0) {
      grants.push({ id: createDeterministicRuleGrantId(owner, grantPath), type: "currency", denomination: "cp", amount: { type: "fixed", value: entry.value } });
    } else if (typeof entry.containsValue === "number" && Number.isInteger(entry.containsValue) && entry.containsValue > 0) {
      grants.push({ id: createDeterministicRuleGrantId(owner, grantPath), type: "currency", denomination: "cp", amount: { type: "fixed", value: entry.containsValue } });
    }
  }
  return { grants, deferredEquipment };
}

function packageChoices(items: unknown[], owner: string, path: string, filters: readonly StartingEquipmentFilterConstraint[] = []): ChoiceDefinition[] {
  const choices: ChoiceDefinition[] = [];
  for (let index = 0; index < items.length; index++) {
    const entry = items[index];
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const raw = entry as Record<string, unknown>;
    const groups = raw.equipmentType === undefined ? mapRawEquipmentTypes(raw.equipmentTypes) : (() => {
      const group = mapRawEquipmentType(raw.equipmentType);
      return group === undefined ? undefined : [group];
    })();
    if (groups === undefined) continue;
    const filter = filters[index];
    choices.push(createChoiceDefinition(
      createChoiceDefinitionId(`${owner}:${path}:${index}:equipment-group`),
      "Choose starting equipment",
      "equipment",
      1,
      1,
      false,
      createEquipmentQuery({ equipmentGroups: groups, sourceId: filter?.sourceId ? createSourceId(filter.sourceId) : undefined,
        eligibility: filter?.eligibility.length ? [...filter.eligibility] : undefined }),
      [],
    ));
  }
  return choices;
}

function isSupportedEquipmentEntry(value: unknown): boolean {
  if (typeof value === "string") return value.includes("|");
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  const validQuantity = entry.quantity === undefined || (typeof entry.quantity === "number" && Number.isInteger(entry.quantity) && entry.quantity > 0);
  if (typeof entry.item === "string") return validQuantity;
  if (typeof entry.special === "string") return validQuantity && entry.special.trim().length > 0;
  if (typeof entry.value === "number") return Number.isInteger(entry.value) && entry.value > 0;
  if (entry.equipmentType !== undefined) return entry.quantity === undefined && mapRawEquipmentType(entry.equipmentType) !== undefined;
  return entry.quantity === undefined && entry.equipmentTypes !== undefined && mapRawEquipmentTypes(entry.equipmentTypes) !== undefined;
}

function isSupportedEquipment(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((container) => typeof container === "object" && container !== null && !Array.isArray(container)
    && Object.values(container as Record<string, unknown>).every((items) => Array.isArray(items) && items.every(isSupportedEquipmentEntry)));
}

function isValidWeightedAbility(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((entry) => {
    const weighted = typeof entry === "object" && entry !== null && !Array.isArray(entry)
      ? (entry as { choose?: { weighted?: { from?: unknown; weights?: unknown } } }).choose?.weighted
      : undefined;
    if (weighted === undefined || !Array.isArray(weighted.from) || weighted.from.length === 0 || !Array.isArray(weighted.weights) || weighted.weights.length === 0) return false;
    const abilities = weighted.from.map((ability) => typeof ability === "string" ? ability.toUpperCase() : "");
    return abilities.every((ability) => ["STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(ability))
      && new Set(abilities).size === abilities.length
      && weighted.weights.every((weight) => typeof weight === "number" && Number.isInteger(weight) && weight > 0);
  });
}

function extractBackgroundChoices(
  remaining: Record<string, unknown>, owner: EntityId, ruleset: "2014" | "2024", source: "PHB" | "XPHB", includeAbility: boolean, includeEquipment: boolean,
): { choices: ChoiceDefinition[]; deferredEquipment: DeferredEquipmentIntent[]; diagnostics: readonly string[] } {
  const choices: ChoiceDefinition[] = [];
  const deferredEquipment: DeferredEquipmentIntent[] = [];
  const filterDiagnostics: string[] = [];
  const equipmentText = findEquipmentEntryText(remaining);
  const filters = parseStartingEquipmentFilters(equipmentText, filterDiagnostics, "startingEquipment");
  const languages = remaining.languageProficiencies;
  if (Array.isArray(languages)) languages.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return;
    const count = (entry as Record<string, unknown>).anyStandard;
    if (typeof count === "number" && Number.isInteger(count) && count > 0) choices.push(createChoiceDefinition(createChoiceDefinitionId(`${owner}:language:${index}`), "Choose languages", "language", count, count, false, createEntityQuery("language"), []));
  });
  const ability = includeAbility ? remaining.ability : undefined;
  if (Array.isArray(ability)) {
    const distributions: number[][] = [];
    let eligible: Ability[] = [];
    for (const entry of ability) {
      const weighted = typeof entry === "object" && entry !== null ? (entry as { choose?: { weighted?: { from?: unknown; weights?: unknown } } }).choose?.weighted : undefined;
      if (!weighted || !Array.isArray(weighted.from) || !Array.isArray(weighted.weights)) continue;
      const values = weighted.from.map((item) => typeof item === "string" ? item.toUpperCase() : "").filter((item): item is Ability => ["STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(item));
      if (values.length === 0 || weighted.weights.some((weight) => typeof weight !== "number" || !Number.isInteger(weight) || weight <= 0)) continue;
      eligible = values; distributions.push(weighted.weights as number[]);
    }
    if (eligible.length > 0 && distributions.length > 0) choices.push(createAbilityAllocationChoiceDefinition(createChoiceDefinitionId(`${owner}:ability:0`), "Choose ability increases", eligible, distributions.map((bonuses) => ({ bonuses })), []));
  }
  const equipment = includeEquipment ? remaining.startingEquipment : undefined;
  if (Array.isArray(equipment)) equipment.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return;
    const defaultPackage = (entry as Record<string, unknown>)._;
    if (Array.isArray(defaultPackage)) choices.push(...packageChoices(defaultPackage, owner, `startingEquipment:${index}:_`, filters.slice(index)));
    const options = Object.entries(entry as Record<string, unknown>).filter(([key, value]) => key !== "_" && Array.isArray(value));
    if (options.length < 2) return;
    const choiceId = createChoiceDefinitionId(`${owner}:equipment:${index}`);
    choices.push(createClosedOptionChoiceDefinition(choiceId, "Choose starting equipment", 1, 1, false, options.map(([key, value]) => {
      const optionId = createChoiceOptionId(`${owner}:equipment:${index}:${key}`);
      const packageResult = packageGrants(value as unknown[], owner, `startingEquipment:${index}:${key}`, ruleset, source, { scope: "choice-option-grants", ownerId: owner, choiceId, optionId });
      deferredEquipment.push(...packageResult.deferredEquipment);
      return { id: optionId, label: `Package ${key}`, grants: packageResult.grants, choices: packageChoices(value as unknown[], owner, `startingEquipment:${index}:${key}`, filters.slice(index)) };
    }), []));
  });
  return { choices, deferredEquipment, diagnostics: filterDiagnostics };
}

function findEquipmentEntryText(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const item of value) { const found = findEquipmentEntryText(item); if (found !== undefined) return found; }
  } else if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.name === "Equipment:" && typeof obj.entry === "string") return obj.entry;
    for (const child of Object.values(obj)) { const found = findEquipmentEntryText(child); if (found !== undefined) return found; }
  }
  return undefined;
}

function normalizeSingleBackground(record: RawRecord, opts: NormalizerOptions): SingleResult {
  const diagnostics: BackgroundNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifyBackgroundSourceScope(
    { record, sourcePath: opts.sourcePath, entityKind: opts.entityKind, recordIndex: opts.recordIndex },
    opts.context,
  );

  if (!scopeResult.ok) {
    const code = scopeResult.diagnostic.code === "INVALID_SOURCE"
      ? "INVALID_SOURCE"
      : "EXCLUDED_SOURCE";
    diagnostics.push(makeDiagnostic(code, scopeResult.diagnostic.message, record.name, opts, scopeResult.diagnostic.source));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Generate canonical ID
  const idResult = createCanonicalEntityId({
    kind: "background",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: record.name,
  });

  if (!idResult.ok) {
    diagnostics.push(makeDiagnostic("INVALID_CANONICAL_ID", idResult.diagnostic.message, record.name, opts));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 3. Extract skill proficiencies
  const { skillIds, unmapped: unmappedSkills } = extractSkillProficiencies(
    remaining,
    scopeResult.ruleset,
    scopeResult.source,
  );

  if (unmappedSkills.length > 0) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_SKILL_PROFICIENCY",
      `Background "${record.name}" has unmapped skill proficiencies: ${unmappedSkills.join(", ")}.`,
      record.name,
      opts,
    ));
  }

  // 4. Extract feature ID
  const { featureId, unmapped: unmappedFeature } = extractFeatureId(
    remaining,
    scopeResult.ruleset,
    scopeResult.source,
  );

  if (unmappedFeature) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_FEATURE",
      `Background "${record.name}" has an unmapped background feature.`,
      record.name,
      opts,
    ));
  }

  // 5. Extract page
  const page = extractPage(remaining);

  const metadata = createRuleEffectMetadata("full", createEffectPresentation("proficiencies", []), createEffectOrigin(idResult.id, idResult.sourceId, "structured"));
  const effects: RuleEffect[] = skillIds.map((entityId) => createAddProficiencyEffect(metadata, { kind: "skill", entityId }));
  const languages = remaining.languageProficiencies;
  if (Array.isArray(languages)) for (const entry of languages) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    for (const [name, value] of Object.entries(entry as Record<string, unknown>)) {
      if (name === "anyStandard" || value !== true) continue;
      const language = createCanonicalEntityId({ kind: "language", ruleset: scopeResult.ruleset, source: scopeResult.source, name });
      if (language.ok) effects.push(createAddLanguageEffect(metadata, language.id));
    }
  }
  const tools = remaining.toolProficiencies;
  if (Array.isArray(tools)) for (const entry of tools) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    for (const [name, value] of Object.entries(entry as Record<string, unknown>)) {
      if (value !== true) continue;
      const tool = createCanonicalEntityId({ kind: "item", ruleset: scopeResult.ruleset, source: scopeResult.source, name });
      if (tool.ok) effects.push(createAddProficiencyEffect(metadata, { kind: "tool", toolId: tool.id }));
    }
  }

  const owner = idResult.id;
  const equipmentIsValid = remaining.startingEquipment === undefined || isSupportedEquipment(remaining.startingEquipment);
  const abilityIsValid = remaining.ability === undefined || isValidWeightedAbility(remaining.ability);
  if (!equipmentIsValid) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_MECHANIC",
      `Background "${record.name}" has malformed or unsupported starting equipment.`,
      record.name,
      opts,
    ));
  }
  if (!abilityIsValid) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_MECHANIC",
      `Background "${record.name}" has malformed weighted ability allocation.`,
      record.name,
      opts,
    ));
  }
  const equipment = equipmentIsValid && Array.isArray(remaining.startingEquipment) ? remaining.startingEquipment : [];
  const baseEquipment = equipment.map((entry, index) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && Array.isArray((entry as Record<string, unknown>)._)
    ? packageGrants((entry as Record<string, unknown>)._ as unknown[], owner, `startingEquipment:${index}:_`, scopeResult.ruleset, scopeResult.source, { scope: "entity-grants", ownerId: owner }) : undefined).filter((result): result is { grants: RuleGrant[]; deferredEquipment: DeferredEquipmentIntent[] } => result !== undefined);
  const grants = baseEquipment.flatMap((result) => result.grants);
  const deferredEquipment = baseEquipment.flatMap((result) => result.deferredEquipment);
  const featGrants: RuleGrant[] = Array.isArray(remaining.feats) ? remaining.feats.flatMap((entry, index) => typeof entry === "object" && entry !== null && !Array.isArray(entry)
    ? Object.entries(entry as Record<string, unknown>).flatMap(([name, value]) => {
      if (value !== true) return [];
      const [featName, featSource] = name.split("|");
      const feat = featName === undefined ? undefined : createCanonicalEntityId({ kind: "feat", ruleset: scopeResult.ruleset, source: featSource?.toUpperCase() === "XPHB" ? "XPHB" : scopeResult.source, name: featName });
      return feat?.ok ? [{ id: createDeterministicRuleGrantId(owner, `feats:${index}:${name}`), type: "entity" as const, entityId: feat.id }] : [];
    }) : []) : [];

  // 6. Extract summary
  const summary = extractSummary(remaining);

  // 7. Extract narrative content
  const content = extractContent(remaining);

  // 8. Log unmapped fields as diagnostics
  const unmappedTools = remaining.toolProficiencies;
  if (Array.isArray(unmappedTools) && unmappedTools.length > 0) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_TOOL_PROFICIENCY",
      `Background "${record.name}" has unmapped tool proficiencies.`,
      record.name,
      opts,
    ));
  }

  const unmappedLang = remaining.languageProficiencies;
  if (Array.isArray(unmappedLang) && unmappedLang.length > 0) {
    diagnostics.push(makeDiagnostic(
      "UNMAPPED_LANGUAGE",
      `Background "${record.name}" has unmapped language proficiencies.`,
      record.name,
      opts,
    ));
  }

  // 9. Assemble BackgroundRule
  const choiceResult = extractBackgroundChoices(remaining, owner, scopeResult.ruleset, scopeResult.source, abilityIsValid, equipmentIsValid);
  deferredEquipment.push(...choiceResult.deferredEquipment);
  if (choiceResult.diagnostics.length > 0) {
    const backgroundDiagnostics = choiceResult.diagnostics.map((message) => makeDiagnostic("UNMAPPED_MECHANIC", message, record.name, opts));
    return { ok: false, diagnostics: Object.freeze(backgroundDiagnostics) };
  }
  const background = createBackgroundRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    skillIds,
    content,
    [], // prerequisites (deferred)
    effects,
    choiceResult.choices,
    [], // dependencies
    false, // legacy
    page,
    summary,
    featureId,
    [...grants, ...featGrants],
    [createFiveEToolsExternalReference("background", record.name, record.source)].filter((reference): reference is NonNullable<typeof reference> => reference !== undefined),
  );

  return { ok: true, background, diagnostics: Object.freeze(diagnostics), deferredEquipment: Object.freeze(deferredEquipment) };
}

export function normalizeBackgrounds(input: BackgroundNormalizerInput): BackgroundNormalizerResult {
  const backgrounds: BackgroundRule[] = [];
  const diagnostics: BackgroundNormalizerDiagnostic[] = [];
  const deferredEquipment: DeferredEquipmentIntent[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleBackground(record, {
      context: input.context,
      sourcePath: input.sourcePath,
      entityKind: input.entityKind,
      recordIndex: i,
    });

    if (result.ok) {
      backgrounds.push(result.background);
      deferredEquipment.push(...result.deferredEquipment);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    backgrounds: Object.freeze(backgrounds),
    diagnostics: Object.freeze(diagnostics),
    deferredEquipment: Object.freeze(deferredEquipment),
  });
}

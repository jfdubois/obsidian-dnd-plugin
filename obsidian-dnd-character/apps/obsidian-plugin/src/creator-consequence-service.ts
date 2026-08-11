import type { ChoiceInstanceId, EntityId, RuleGrantId, Ruleset, SourceId } from "@obsidian-dnd/domain";
import { createChoiceInstanceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type {
  BackgroundRule, CatalogQuery, ChoiceDefinition, ChoiceOption, ClassRule, EntityDetailResponse,
  ItemRule, RuleEffect, RuleGrant, SpeciesRule,
} from "@obsidian-dnd/catalog-contract";

export type CreatorDiagnosticCode =
  | "unresolved-choice" | "invalid-choice" | "stale-choice" | "unresolved-random-grant"
  | "invalid-random-grant" | "missing-catalog-origin" | "unsupported-consequence"
  | "no-choice-candidates" | "choice-cycle";

export interface CreatorConsequenceDiagnostic {
  code: CreatorDiagnosticCode;
  originId?: EntityId;
  choiceInstanceId?: ChoiceInstanceId;
  grantId?: RuleGrantId;
  message: string;
}

export interface ChoiceConsequence {
  instanceId: ChoiceInstanceId;
  definition: ChoiceDefinition;
  originId: EntityId;
  parentOptionId?: string;
  candidates: EntityDetailResponse[];
  selectedValue?: CharacterChoice["selectedValue"];
  status: "resolved" | "unresolved" | "invalid";
}

export interface GrantConsequence {
  grant: RuleGrant;
  originId: EntityId;
  provenance: "entity" | "starting-class" | "option";
  parentChoiceInstanceId?: ChoiceInstanceId;
  resolvedAmount?: number;
  randomResolution?: { status: "unresolved" | "resolved" | "invalid"; value?: number };
}

export interface OriginConsequence {
  origin: SpeciesRule | BackgroundRule | ClassRule;
  effects: RuleEffect[];
  grants: GrantConsequence[];
  choices: ChoiceConsequence[];
  levelOneGrants: ClassRule["levels"][number]["grants"];
}

export interface SelectionConsequenceModel {
  origins: OriginConsequence[];
  diagnostics: CreatorConsequenceDiagnostic[];
  activeChoiceIds: ReadonlySet<ChoiceInstanceId>;
  activeGrantIds: ReadonlySet<RuleGrantId>;
}

export interface CreatorConsequenceInput {
  speciesId: EntityId | null;
  backgroundId: EntityId | null;
  classId: EntityId | null;
  selections: Readonly<Record<ChoiceInstanceId, CharacterChoice>>;
  randomGrantResolutions: Readonly<Record<RuleGrantId, number>>;
  entities: readonly EntityDetailResponse[];
  /** Candidate policy belongs to consequence derivation, never to a renderer. */
  ruleset?: Ruleset | null;
  enabledSourceIds?: readonly SourceId[];
}

type Origin = SpeciesRule | BackgroundRule | ClassRule;

export function deriveSelectionConsequences(input: CreatorConsequenceInput): SelectionConsequenceModel {
  const diagnostics: CreatorConsequenceDiagnostic[] = [];
  const origins: OriginConsequence[] = [];
  const activeChoiceIds = new Set<ChoiceInstanceId>();
  const activeGrantIds = new Set<RuleGrantId>();
  const byId = new Map(input.entities.map((entity) => [entity.id, entity]));
  for (const [id, kind] of [[input.speciesId, "species"], [input.backgroundId, "background"], [input.classId, "class"]] as const) {
    if (id === null) continue;
    const origin = byId.get(id);
    if (origin === undefined || origin.kind !== kind) {
      diagnostics.push({ code: "missing-catalog-origin", originId: id, message: `Selected ${kind} is unavailable in the active catalog` });
      continue;
    }
    origins.push(deriveOrigin(origin as Origin, input, byId, diagnostics, activeChoiceIds, activeGrantIds));
  }
  for (const choice of Object.values(input.selections)) {
    if (!activeChoiceIds.has(choice.instanceId)) diagnostics.push({ code: "stale-choice", originId: choice.originGrantId, choiceInstanceId: choice.instanceId, message: "Choice resolution is not active for the selected origins" });
  }
  return { origins, diagnostics, activeChoiceIds, activeGrantIds };
}

function deriveOrigin(origin: Origin, input: CreatorConsequenceInput, byId: Map<EntityId, EntityDetailResponse>, diagnostics: CreatorConsequenceDiagnostic[], activeChoices: Set<ChoiceInstanceId>, activeGrants: Set<RuleGrantId>): OriginConsequence {
  const grants: GrantConsequence[] = [];
  const choices: ChoiceConsequence[] = [];
  const levelOneGrants = origin.kind === "class" ? (origin.levels[1]?.grants ?? []) : [];
  addGrants(origin.grants, origin.id, "entity", undefined, input, grants, diagnostics, activeGrants);
  if (origin.kind === "class") addGrants(origin.startingGrants, origin.id, "starting-class", undefined, input, grants, diagnostics, activeGrants);
  const definitions = origin.kind === "class" ? [...origin.choices, ...origin.startingChoices] : origin.choices;
  const levelChoiceIds = new Set(levelOneGrants.filter((grant) => grant.type === "choice" || grant.type === "subclass-choice" || grant.type === "ability-score-improvement").map((grant) => grant.choiceDefinitionId));
  for (const definition of definitions) if (!levelChoiceIds.has(definition.id) || definitions.includes(definition)) addChoice(definition, origin.id, undefined, input, byId, choices, grants, diagnostics, activeChoices, activeGrants, 0);
  return { origin, effects: [...origin.effects], grants, choices, levelOneGrants };
}

function addChoice(definition: ChoiceDefinition, originId: EntityId, parent: string | undefined, input: CreatorConsequenceInput, byId: Map<EntityId, EntityDetailResponse>, choices: ChoiceConsequence[], grants: GrantConsequence[], diagnostics: CreatorConsequenceDiagnostic[], activeChoices: Set<ChoiceInstanceId>, activeGrants: Set<RuleGrantId>, depth: number): void {
  if (depth > 32) { diagnostics.push({ code: "choice-cycle", originId, message: "Nested choice depth exceeds catalog safety limit" }); return; }
  const instanceId = createChoiceInstanceId(`${originId}:choice:${definition.id}${parent ? `:option:${parent}` : ""}`);
  activeChoices.add(instanceId);
  const resolution = input.selections[instanceId];
  const candidates = definition.type === "ability-allocation" || definition.type === "closed-option" ? [] : evaluateCandidates(definition.optionQuery, [...byId.values()], input);
  const result = validateCreatorChoiceValue(definition, resolution?.selectedValue, candidates);
  choices.push({ instanceId, definition, originId, parentOptionId: parent, candidates, selectedValue: resolution?.selectedValue, status: result.status });
  if (result.status !== "resolved") diagnostics.push({ code: result.status === "unresolved" ? "unresolved-choice" : "invalid-choice", originId, choiceInstanceId: instanceId, message: result.message });
  if (result.status !== "resolved" || definition.type !== "closed-option" || resolution?.selectedValue?.type !== "option-ids") return;
  for (const optionId of resolution.selectedValue.optionIds) {
    const option = definition.options.find((candidate) => candidate.id === optionId);
    if (option !== undefined) addOption(option, originId, instanceId, input, byId, choices, grants, diagnostics, activeChoices, activeGrants, depth + 1);
  }
}

function addOption(option: ChoiceOption, originId: EntityId, parentChoice: ChoiceInstanceId, input: CreatorConsequenceInput, byId: Map<EntityId, EntityDetailResponse>, choices: ChoiceConsequence[], grants: GrantConsequence[], diagnostics: CreatorConsequenceDiagnostic[], activeChoices: Set<ChoiceInstanceId>, activeGrants: Set<RuleGrantId>, depth: number): void {
  addGrants(option.grants, originId, "option", parentChoice, input, grants, diagnostics, activeGrants);
  for (const nested of option.choices) addChoice(nested, originId, option.id, input, byId, choices, grants, diagnostics, activeChoices, activeGrants, depth);
}

function addGrants(source: readonly RuleGrant[], originId: EntityId, provenance: GrantConsequence["provenance"], parentChoice: ChoiceInstanceId | undefined, input: CreatorConsequenceInput, result: GrantConsequence[], diagnostics: CreatorConsequenceDiagnostic[], activeGrants: Set<RuleGrantId>): void {
  for (const grant of source) {
    activeGrants.add(grant.id);
    const resolution = input.randomGrantResolutions[grant.id];
    let resolvedAmount: number | undefined;
    let randomResolution: GrantConsequence["randomResolution"];
    if (grant.type === "currency" && grant.amount.type === "dice") {
      const validation = validateDiceCurrencyResolution(grant.amount, resolution);
      randomResolution = validation.status === "resolved" ? { status: validation.status, value: resolution } : { status: validation.status };
      if (validation.status === "unresolved") diagnostics.push({ code: "unresolved-random-grant", originId, grantId: grant.id, message: validation.message });
      else if (validation.status === "invalid") diagnostics.push({ code: "invalid-random-grant", originId, grantId: grant.id, message: validation.message });
      else resolvedAmount = resolution;
    } else if (grant.type === "currency" && grant.amount.type === "fixed") {
      resolvedAmount = grant.amount.value;
    }
    result.push({ grant, originId, provenance, parentChoiceInstanceId: parentChoice, resolvedAmount, randomResolution });
  }
}

export function validateDiceCurrencyResolution(amount: { count: number; dieSides: number; multiplier: number }, resolution: number | undefined): { status: "unresolved" | "resolved" | "invalid"; message: string } {
  if (!isValidDiceCurrencyAmount(amount)) return { status: "invalid", message: "Random currency grant has an invalid catalog dice definition" };
  if (resolution === undefined) return { status: "unresolved", message: "Random currency grant requires explicit resolution" };
  const minimum = amount.count * amount.multiplier;
  const maximum = amount.count * amount.dieSides * amount.multiplier;
  if (!Number.isInteger(resolution) || resolution < minimum || resolution > maximum || resolution % amount.multiplier !== 0) {
    return { status: "invalid", message: "Random currency resolution is impossible for the active dice grant" };
  }
  return { status: "resolved", message: "" };
}

export function isValidDiceCurrencyAmount(amount: { count: number; dieSides: number; multiplier: number }): boolean {
  return Number.isInteger(amount.count) && amount.count > 0
    && Number.isInteger(amount.dieSides) && amount.dieSides > 0
    && Number.isInteger(amount.multiplier) && amount.multiplier > 0;
}

export function validateCreatorChoiceValue(definition: ChoiceDefinition, selected: CharacterChoice["selectedValue"] | undefined, candidates: readonly EntityDetailResponse[]): { status: ChoiceConsequence["status"]; message: string } {
  if (selected === undefined) return { status: "unresolved", message: "Required choice has no resolution" };
  if (definition.type === "ability-allocation") {
    if (selected.type !== "ability-allocation") return { status: "invalid", message: "Choice value has the wrong type" };
    const bonuses = selected.allocations.map((allocation) => allocation.bonus).sort((a, b) => b - a);
    const allowed = definition.distributions.some((distribution) => distribution.bonuses.slice().sort((a, b) => b - a).join(",") === bonuses.join(","));
    const valid = selected.allocations.every((allocation) => definition.eligibleAbilities.includes(allocation.ability)) && new Set(selected.allocations.map((allocation) => allocation.ability)).size === selected.allocations.length;
    return allowed && valid ? { status: "resolved", message: "" } : { status: "invalid", message: "Ability allocation does not match its definition" };
  }
  const ids = selected.type === "entity-ids" ? selected.entityIds : selected.type === "option-ids" ? selected.optionIds : undefined;
  if (ids === undefined) return { status: "invalid", message: "Choice value has the wrong type" };
  const minimum = definition.minimum; const maximum = definition.maximum;
  if (ids.length < minimum) return { status: "unresolved", message: "Choice has too few selected values" };
  if (ids.length > maximum || (!definition.repeatable && new Set(ids.map(String)).size !== ids.length)) return { status: "invalid", message: "Choice exceeds its selection constraints" };
  const eligibleValues: string[] = definition.type === "closed-option"
    ? definition.options.map((option) => String(option.id))
    : candidates.map((candidate) => String(candidate.id));
  const eligible = new Set<string>(eligibleValues);
  return ids.every((id) => eligible.has(id)) ? { status: "resolved", message: "" } : { status: "invalid", message: "Choice contains an ineligible selected value" };
}

function evaluateCandidates(query: CatalogQuery, entities: readonly EntityDetailResponse[], input?: Pick<CreatorConsequenceInput, "ruleset" | "enabledSourceIds">): EntityDetailResponse[] {
  const eligible = (entity: EntityDetailResponse): boolean =>
    (input?.ruleset === undefined || input.ruleset === null || entity.ruleset === input.ruleset)
    && (entity.access === "core" || input?.enabledSourceIds === undefined || input.enabledSourceIds.includes(entity.sourceId));
  if (query.type === "entity") return entities.filter((entity) => eligible(entity) && entity.kind === query.kind && (query.sourceId === undefined || entity.sourceId === query.sourceId) && (query.access === undefined || entity.access === query.access) && (query.excludeLegacy !== true || !("legacy" in entity && entity.legacy === true)) && (query.tags === undefined || query.tags.every((tag) => "tags" in entity && Array.isArray(entity.tags) && entity.tags.includes(tag))));
  if (query.type === "equipment") return entities.filter((entity): entity is ItemRule => eligible(entity) && entity.kind === "item" && (query.category === undefined || entity.category === query.category) && (query.rarity === undefined || entity.rarity === query.rarity) && (query.bodySlot === undefined || entity.bodySlot === query.bodySlot) && (query.sourceId === undefined || entity.sourceId === query.sourceId) && (query.access === undefined || entity.access === query.access) && (query.equipmentGroups === undefined || query.equipmentGroups.some((group) => entity.equipmentGroups.includes(group))));
  if (query.type === "proficiency") return entities.filter((entity) => eligible(entity)
    && (query.kind === "skill" || query.kind === "saving-throw" ? entity.kind === "skill" : entity.kind === "item")
    && (query.constraint?.type !== "exact-eligible-ids" || query.constraint.eligibleIds.includes(entity.id))
    && (query.constraint?.type !== "proficiency-groups" || (entity.kind === "item" && query.constraint.groups.some((group) => entity.proficiencyGroups.includes(group)))));
  return entities.filter((entity) => eligible(entity) && entity.kind === "spell" && (query.excludeKnown === undefined || !query.excludeKnown.includes(entity.id)));
}

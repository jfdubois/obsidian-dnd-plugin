import type { RawRecord } from "./raw-boundary";
import { classifySpeciesSourceScope, type SpeciesSourceScopeContext } from "./species-source-scope";
import { createCanonicalEntityId, createChoiceDefinitionId } from "@obsidian-dnd/domain";
import { createSpeciesRule, createChoiceDefinition, createAbilityAllocationChoiceDefinition, createEntityQuery, type ChoiceDefinition, type SpeciesRule } from "@obsidian-dnd/catalog-contract";
import {
  createRuleEffectMetadata,
  createAddAbilityEffect,
  createSetMovementEffect,
  createAddSenseEffect,
  createAddLanguageEffect,
  createAddProficiencyEffect,
  createEffectPresentation,
  createEffectOrigin,
  type RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";
import { isAbility, type Ability } from "@obsidian-dnd/domain";

export type SpeciesNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE" | "INVALID_SOURCE" | "INVALID_CANONICAL_ID"
  | "MISSING_SIZE" | "MISSING_SPEED" | "UNMAPPED_LANGUAGE"
  | "UNMAPPED_PROFICIENCY" | "UNMAPPED_MECHANIC"
  | "INVALID_ABILITY_FORMAT" | "INVALID_DARKVISION_FORMAT" | "INVALID_SPEED_FORMAT";

export interface SpeciesNormalizerDiagnostic {
  readonly code: SpeciesNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface SpeciesNormalizerInput {
  readonly records: readonly RawRecord[];
  readonly context: SpeciesSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
}

export interface SpeciesNormalizerResult {
  readonly species: readonly SpeciesRule[];
  readonly diagnostics: readonly SpeciesNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: SpeciesSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: SpeciesNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): SpeciesNormalizerDiagnostic {
  return Object.freeze({
    code,
    severity: (["MISSING_SIZE", "MISSING_SPEED", "INVALID_CANONICAL_ID", "INVALID_SOURCE"].includes(code) ? "error" : "warning") as "warning" | "error",
    message,
    recordName,
    source,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
}

/* ── Field extractors ──────────────────────────────────────────── */

function extractSize(remaining: Record<string, unknown>): string | undefined {
  const size = remaining.size;
  if (typeof size === "string" && size.length > 0) return size;
  if (Array.isArray(size) && size.length === 1 && typeof size[0] === "string") {
    const names: Record<string, string> = { T: "Tiny", S: "Small", M: "Medium", L: "Large", H: "Huge", G: "Gargantuan" };
    return names[size[0]];
  }
  return undefined;
}

function extractSpeed(remaining: Record<string, unknown>): number | undefined {
  const speed = remaining.speed;
  if (typeof speed === "number" && Number.isFinite(speed)) return Math.max(0, Math.floor(speed));
  if (typeof speed === "object" && speed !== null && !Array.isArray(speed)) {
    const walk = (speed as Record<string, unknown>).walk;
    if (typeof walk === "number" && Number.isFinite(walk)) return Math.max(0, Math.floor(walk));
  }
  return undefined;
}

interface DarkvisionExtract {
  readonly darkvision: boolean;
  readonly darkvisionRange?: number;
}

function extractDarkvision(remaining: Record<string, unknown>): DarkvisionExtract {
  const dv = remaining.darkvision;
  if (dv === true) return { darkvision: true };
  if (typeof dv === "number" && Number.isInteger(dv) && dv > 0) return { darkvision: true, darkvisionRange: dv };
  if (typeof dv === "string" && dv.length > 0) {
    const match = dv.match(/(\d+)/);
    if (match && match[1]) return { darkvision: true, darkvisionRange: parseInt(match[1], 10) };
  }
  return { darkvision: false };
}

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

function extractAbilityEffects(
  remaining: Record<string, unknown>,
  metadata: ReturnType<typeof createRuleEffectMetadata>,
): RuleEffect[] {
  const effects: RuleEffect[] = [];
  const ability = remaining.ability;

  if (Array.isArray(ability) && ability.length === 6) {
    const keys: Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    for (let i = 0; i < 6; i++) {
      const key = keys[i];
      const value = ability[i];
      if (key !== undefined && typeof value === "number" && value !== 0) {
        effects.push(createAddAbilityEffect(metadata, key, value));
      }
    }
  } else if (Array.isArray(ability)) {
    for (const entry of ability) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
        const normalized = key.toUpperCase() as Ability;
        if (isAbility(normalized) && typeof value === "number" && Number.isInteger(value) && value !== 0) {
          effects.push(createAddAbilityEffect(metadata, normalized, value));
        }
      }
    }
  } else if (typeof ability === "object" && ability !== null && !Array.isArray(ability)) {
    const abilityMap = ability as Record<string, unknown>;
    for (const [key, value] of Object.entries(abilityMap)) {
      if (typeof value === "number" && value !== 0) {
        const upper = key.toUpperCase() as Ability;
        if (isAbility(upper)) {
          effects.push(createAddAbilityEffect(metadata, upper, value));
        }
      }
    }
  }

  return effects;
}

function canonicalId(kind: "skill" | "language", name: string, ruleset: "2014" | "2024", source: "PHB" | "XPHB") {
  return createCanonicalEntityId({ kind, ruleset, source, name });
}

function extractFixedLanguageEffects(remaining: Record<string, unknown>, ruleset: "2014" | "2024", source: "PHB" | "XPHB", metadata: ReturnType<typeof createRuleEffectMetadata>): { effects: RuleEffect[]; invalid: boolean } {
  const effects: RuleEffect[] = [];
  let invalid = false;
  const entries = remaining.languageProficiencies;
  if (entries === undefined) return { effects, invalid };
  if (!Array.isArray(entries)) return { effects, invalid: true };
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) { invalid = true; continue; }
    for (const [name, value] of Object.entries(entry as Record<string, unknown>)) {
      if (name === "choose") continue;
      if (value !== true && value !== 1) { invalid = true; continue; }
      const result = canonicalId("language", name, ruleset, source);
      if (!result.ok) { invalid = true; continue; }
      effects.push(createAddLanguageEffect(metadata, result.id));
    }
  }
  return { effects, invalid };
}

function extractFixedSkillEffects(remaining: Record<string, unknown>, ruleset: "2014" | "2024", source: "PHB" | "XPHB", metadata: ReturnType<typeof createRuleEffectMetadata>): { effects: RuleEffect[]; invalid: boolean } {
  const effects: RuleEffect[] = [];
  let invalid = false;
  const entries = remaining.skillProficiencies;
  if (entries === undefined) return { effects, invalid };
  if (!Array.isArray(entries)) return { effects, invalid: true };
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) { invalid = true; continue; }
    for (const [name, value] of Object.entries(entry as Record<string, unknown>)) {
      if (name === "choose") continue;
      if (value !== true && value !== 1) { invalid = true; continue; }
      const result = canonicalId("skill", name, ruleset, source);
      if (!result.ok) { invalid = true; continue; }
      effects.push(createAddProficiencyEffect(metadata, { kind: "skill", entityId: result.id }));
    }
  }
  return { effects, invalid };
}

function extractChoices(remaining: Record<string, unknown>, id: string): ChoiceDefinition[] {
  const choices: ChoiceDefinition[] = [];
  const choiceFields: Array<["languageProficiencies" | "skillProficiencies", "language" | "skill"]> = [["languageProficiencies", "language"], ["skillProficiencies", "skill"]];
  for (const [field, kind] of choiceFields) {
    const entries = remaining[field];
    if (!Array.isArray(entries)) continue;
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      const choose = (entry as Record<string, unknown>).choose;
      if (typeof choose !== "object" || choose === null || Array.isArray(choose)) continue;
      const choice = choose as Record<string, unknown>;
      const count = choice.count ?? choice.amount;
      if (typeof count !== "number" || !Number.isInteger(count) || count < 1) continue;
      choices.push(createChoiceDefinition(createChoiceDefinitionId(`${id}:choice:${field}:${index}`), `Choose ${count} ${kind}${count === 1 ? "" : "s"}`, kind === "language" ? "language" : "skill-proficiency", count, count, false, createEntityQuery(kind), []));
    }
  }
  const ability = remaining.ability;
  if (Array.isArray(ability)) {
    for (let index = 0; index < ability.length; index++) {
      const entry = ability[index];
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      const choose = (entry as Record<string, unknown>).choose;
      if (typeof choose !== "object" || choose === null || Array.isArray(choose)) continue;
      const raw = choose as Record<string, unknown>;
      const from = raw.from;
      const amount = raw.amount;
      if (!Array.isArray(from) || from.length === 0 || typeof amount !== "number" || !Number.isInteger(amount) || amount < 1) continue;
      const eligible = from.map((value) => typeof value === "string" ? value.toUpperCase() : "").filter(isAbility);
      if (eligible.length === 0 || new Set(eligible).size !== eligible.length) continue;
      choices.push(createAbilityAllocationChoiceDefinition(createChoiceDefinitionId(`${id}:choice:ability:${index}`), "Choose ability increase", eligible, [{ bonuses: [amount] }], []));
    }
  }
  return choices;
}

type SingleResult =
  | { readonly ok: true; readonly species: SpeciesRule; readonly diagnostics: readonly SpeciesNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly SpeciesNormalizerDiagnostic[] };

function normalizeSingleSpecies(record: RawRecord, opts: NormalizerOptions): SingleResult {
  const diagnostics: SpeciesNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifySpeciesSourceScope(
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
    kind: "species",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: record.name,
  });

  if (!idResult.ok) {
    diagnostics.push(makeDiagnostic("INVALID_CANONICAL_ID", idResult.diagnostic.message, record.name, opts));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 3. Extract size
  const size = extractSize(remaining);
  if (size === undefined) {
    diagnostics.push(makeDiagnostic("MISSING_SIZE", `Species "${record.name}" is missing a valid size field.`, record.name, opts));
  }

  // 4. Extract speed
  const speed = extractSpeed(remaining);
  if (speed === undefined) {
    diagnostics.push(makeDiagnostic("MISSING_SPEED", `Species "${record.name}" is missing a valid speed field.`, record.name, opts));
  }

  // 5. Extract darkvision
  const { darkvision, darkvisionRange } = extractDarkvision(remaining);

  // 6. Build effects
  const metadata = createRuleEffectMetadata(
    "full",
    createEffectPresentation("species-traits", []),
    createEffectOrigin(idResult.id, idResult.sourceId, "structured"),
  );

  const effects: RuleEffect[] = [];

  // Ability score effects
  effects.push(...extractAbilityEffects(remaining, metadata));

  const languages = extractFixedLanguageEffects(remaining, scopeResult.ruleset, scopeResult.source, metadata);
  effects.push(...languages.effects);
  const skills = extractFixedSkillEffects(remaining, scopeResult.ruleset, scopeResult.source, metadata);
  effects.push(...skills.effects);

  // Movement (walk speed)
  if (speed !== undefined && speed > 0) {
    effects.push(createSetMovementEffect(metadata, "walk", speed));
  }

  // Darkvision sense effect
  if (darkvision && darkvisionRange !== undefined) {
    effects.push(createAddSenseEffect(metadata, { type: "darkvision", range: darkvisionRange }));
  }

  // 7. Extract narrative content
  const content = extractContent(remaining);

  // 8. Log unmapped fields as diagnostics
  if (languages.invalid) {
    diagnostics.push(makeDiagnostic("UNMAPPED_LANGUAGE", `Species "${record.name}" has unmapped language proficiencies.`, record.name, opts));
  }

  if (skills.invalid || Array.isArray(remaining.proficiency) || Array.isArray(remaining.startingProficiencies)) {
    diagnostics.push(makeDiagnostic("UNMAPPED_PROFICIENCY", `Species "${record.name}" has unmapped proficiencies.`, record.name, opts));
  }

  // 9. Assemble SpeciesRule
  const species = createSpeciesRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    size ?? "Medium",
    speed ?? 0,
    darkvision,
    [], // languageIds (unmapped)
    [], // traitDefs (deferred)
    content,
    [], // prerequisites (deferred)
    effects,
    extractChoices(remaining, idResult.id),
    [], // dependencies
    false, // legacy
  );

  return { ok: true, species, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeSpecies(input: SpeciesNormalizerInput): SpeciesNormalizerResult {
  const species: SpeciesRule[] = [];
  const diagnostics: SpeciesNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleSpecies(record, {
      context: input.context,
      sourcePath: input.sourcePath,
      entityKind: input.entityKind,
      recordIndex: i,
    });

    if (result.ok) {
      species.push(result.species);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    species: Object.freeze(species),
    diagnostics: Object.freeze(diagnostics),
  });
}

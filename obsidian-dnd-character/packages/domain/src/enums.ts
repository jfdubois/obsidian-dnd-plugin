/* ── Ruleset ──────────────────────────────────────────────────── */

export type Ruleset = "2014" | "2024";

export const RULESETS: ReadonlyArray<Ruleset> = ["2014", "2024"];

export function isRuleset(value: unknown): value is Ruleset {
  return value === "2014" || value === "2024";
}

/* ── Entity kind ──────────────────────────────────────────────── */

export type RuleEntityKind =
  | "species"
  | "background"
  | "class"
  | "subclass"
  | "class-feature"
  | "subclass-feature"
  | "feat"
  | "spell"
  | "item"
  | "optional-feature"
  | "skill"
  | "language";

export const RULE_ENTITY_KINDS: ReadonlyArray<RuleEntityKind> = [
  "species",
  "background",
  "class",
  "subclass",
  "class-feature",
  "subclass-feature",
  "feat",
  "spell",
  "item",
  "optional-feature",
  "skill",
  "language",
];

export function isRuleEntityKind(value: unknown): value is RuleEntityKind {
  return RULE_ENTITY_KINDS.includes(value as RuleEntityKind);
}

/* ── Ability ──────────────────────────────────────────────────── */

export type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export const ABILITIES: ReadonlyArray<Ability> = [
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA",
];

export function isAbility(value: unknown): value is Ability {
  return ABILITIES.includes(value as Ability);
}

/* ── Content access ───────────────────────────────────────────── */

export type ContentAccess = "core" | "source";

export const CONTENT_ACCESSES: ReadonlyArray<ContentAccess> = ["core", "source"];

export function isContentAccess(value: unknown): value is ContentAccess {
  return value === "core" || value === "source";
}

/* ── Source category ──────────────────────────────────────────── */

export type SourceCategory = "core" | "supplement" | "setting" | "adventure" | "other";

export const SOURCE_CATEGORIES: ReadonlyArray<SourceCategory> = [
  "core",
  "supplement",
  "setting",
  "adventure",
  "other",
];

export function isSourceCategory(value: unknown): value is SourceCategory {
  return SOURCE_CATEGORIES.includes(value as SourceCategory);
}

/* ── Diagnostic severity ──────────────────────────────────────── */

export type DiagnosticSeverity = "info" | "warning" | "error";

export const DIAGNOSTIC_SEVERITIES: ReadonlyArray<DiagnosticSeverity> = [
  "info",
  "warning",
  "error",
];

export function isDiagnosticSeverity(value: unknown): value is DiagnosticSeverity {
  return DIAGNOSTIC_SEVERITIES.includes(value as DiagnosticSeverity);
}

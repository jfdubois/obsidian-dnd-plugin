/**
 * Generic fields that require an explicit _preserve directive to be copied
 * from the base during a _copy merge. Matches 5eTools _MERGE_REQUIRES_PRESERVE_BASE.
 */
export const PRESERVE_BASE_FIELDS: ReadonlySet<string> = new Set([
  "page",
  "otherSources",
  "referenceSources",
  "srd",
  "srd52",
  "basicRules",
  "basicRules2024",
  "reprintedAs",
  "hasFluff",
  "hasFluffImages",
  "hasToken",
  "tokenCredit",
  "tokenCustom",
  "foundryTokenScale",
  "altArt",
  "_versions",
]);

/**
 * Entity-specific preserve-gated fields. Maps entity kind to additional fields
 * beyond the base set. Matches 5eTools per-entity _MERGE_REQUIRES_PRESERVE.
 */
export const PRESERVE_ENTITY_FIELDS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["monster", new Set(["legendaryGroup", "environment", "soundClip", "altArt", "variant", "dragonCastingColor", "familiar"])],
  ["item", new Set(["lootTables", "tier"])],
  ["itemGroup", new Set(["lootTables", "tier"])],
  ["magicvariant", new Set(["lootTables", "tier"])],
]);

/** Keys that must not appear in a _copy._preserve payload. */
export const PROTOTYPE_SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  "constructor",
  "__proto__",
  "prototype",
]);

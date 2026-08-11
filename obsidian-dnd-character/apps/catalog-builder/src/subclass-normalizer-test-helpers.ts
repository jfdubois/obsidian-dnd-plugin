import type { IndexedClassEntry } from "./class-index-types";
import type { CopyModRawRecord } from "./mod-types";

/* ── Helpers ───────────────────────────────────────────────────── */

export function makeCopyModRawRecord(overrides: Record<string, unknown> = {}): CopyModRawRecord {
  const { name, source, ...rest } = overrides;
  return Object.freeze({
    name: (name as string) ?? "Champion",
    source: (source as string) ?? "PHB",
    remaining: Object.freeze({
      parent: "Fighter",
      entries: [],
      ...rest,
    }),
  });
}

export function makeIndexedEntry(overrides: Partial<IndexedClassEntry> & { record?: CopyModRawRecord } = {}): IndexedClassEntry {
  const { record: recordOverride, ...restOverrides } = overrides;
  let record: CopyModRawRecord;
  if (recordOverride) {
    // If source override is provided and differs from the record's source,
    // create a new record with the overridden source.
    if (overrides.source && overrides.source !== recordOverride.source) {
      const { name, remaining } = recordOverride;
      record = makeCopyModRawRecord({ name, source: overrides.source, ...remaining });
    } else {
      record = recordOverride;
    }
  } else {
    record = makeCopyModRawRecord({
      name: overrides.name,
      source: overrides.source ?? "PHB",
    });
  }
  return Object.freeze({
    id: "subclass:2014:core:fighter-champion",
    sourceId: "source:2014:core:phb",
    name: "Champion",
    source: "PHB",
    ruleset: "2014",
    record,
    isSubclass: true,
    parentId: "Fighter",
    hitDie: undefined,
    primaryAbilities: [],
    savingThrowProficiencies: [],
    startingArmorProficiencies: [],
    startingWeaponProficiencies: [],
    startingToolProficiencies: [],
    startingSkillChoices: [],
    startingEquipmentGrants: [],
    startingEquipmentChoices: [],
    startingGold: [],
    levelOneFeatures: [],
    diagnostics: [],
    ...restOverrides,
  });
}

export const ctx = {
  knownPinnedSources: new Set(["PHB", "XPHB", "XGtE", "ERLW", "DMG", "MM"]),
};

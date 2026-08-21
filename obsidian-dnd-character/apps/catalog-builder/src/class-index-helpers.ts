import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary";
import type { CopyModRawRecord } from "./mod-types";
import { mapRawEquipmentType, mapRawEquipmentTypes } from "./equipment-group-mapping";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import type {
  ClassIndexDiagnostic,
  ClassIndexDiagnosticCode,
  StartingGoldEntry,
  LevelOneFeature,
} from "./class-index-types";
import { startingEquipmentFiltersForIndex, type StartingEquipmentFilterConstraint } from "./starting-equipment-filter";

/* ── Diagnostic builder ────────────────────────────────────────── */

export function makeDiagnostic(
  code: ClassIndexDiagnosticCode,
  message: string,
  recordName: string,
  opts: { sourcePath?: string; entityKind?: string; recordIndex?: number },
  source?: string,
): ClassIndexDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "UNKNOWN_SOURCE",
    "COPY_RESOLUTION_FAILED",
    "INVALID_CANONICAL_ID",
    "MISSING_HIT_DIE",
    "INVALID_HIT_DIE",
    "MISSING_PRIMARY_ABILITIES",
    "MISSING_SAVING_THROW_PROFICIENCIES",
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

/* ── Subclass detection ────────────────────────────────────────── */

export function isSubclassRecord(record: CopyModRawRecord): boolean {
  const remaining = record.remaining;
  // 5eTools (pinned 3c5d9d3) uses className/classSource for subclasses
  if (typeof remaining.className === "string" && remaining.className.length > 0) {
    return true;
  }
  // Legacy fallback
  if (typeof remaining.parent === "string" && remaining.parent.length > 0) {
    return true;
  }
  return false;
}

/**
 * Maps a 5eTools source abbreviation to the corresponding ruleset.
 */
function sourceToRuleset(source: string): "2014" | "2024" {
  if (source === "XPHB") return "2024";
  return "2014";
}

export function extractParentId(record: CopyModRawRecord): string | undefined {
  const remaining = record.remaining;

  // 5eTools (pinned 3c5d9d3) uses className/classSource for subclasses
  if (typeof remaining.className === "string" && remaining.className.length > 0) {
    const classSource = typeof remaining.classSource === "string" ? remaining.classSource : "PHB";
    const ruleset = sourceToRuleset(classSource);
    const idResult = createCanonicalEntityId({
      kind: "class",
      ruleset,
      source: classSource,
      name: remaining.className,
    });
    if (idResult.ok) {
      return idResult.id;
    }
  }

  // Legacy fallback
  if (typeof remaining.parent === "string" && remaining.parent.length > 0) {
    return remaining.parent;
  }

  return undefined;
}

/* ── Field extractors ──────────────────────────────────────────── */

/**
 * Extracts hit die faces from 5eTools source shapes.
 *
 * Pinned source (3c5d9d3) uses: hd: { number, faces }
 * Legacy fallback: hitdie: number (for test fixtures)
 */
export function extractHitDie(remaining: Record<string, unknown>): number | undefined {
  // 1. Try pinned source shape: hd: { number, faces }
  const hd = remaining.hd;
  if (typeof hd === "object" && hd !== null && !Array.isArray(hd)) {
    const hdObj = hd as Record<string, unknown>;
    const faces = hdObj.faces;
    if (typeof faces === "number" && Number.isInteger(faces) && faces > 0) {
      return faces;
    }
  }

  // 2. Fallback: legacy hitdie: number (for test fixtures)
  const hitDie = remaining.hitdie;
  if (typeof hitDie === "number" && Number.isInteger(hitDie) && hitDie > 0) {
    return hitDie;
  }

  return undefined;
}

/**
 * Extracts primary abilities for 2014 ruleset.
 *
 * 2014 (PHB) classes use `proficiency: ["str", "con"]` as saving throw proficiencies.
 * Primary abilities are derived from the same `proficiency` array.
 */
export function extractPrimaryAbilities2014(remaining: Record<string, unknown>): readonly string[] {
  const proficiency = remaining.proficiency;
  if (Array.isArray(proficiency)) {
    return Object.freeze(
      proficiency
        .filter((v) => typeof v === "string" && v.length > 0)
        .map((v) => (v as string).toUpperCase()) as string[],
    );
  }
  return Object.freeze([]);
}

/**
 * Extracts primary abilities for 2024 ruleset.
 *
 * 2024 (XPHB) classes use `primaryAbility: [{ "str": true, "cha": true }]`
 * where each object has ability keys set to true.
 */
export function extractPrimaryAbilities2024(remaining: Record<string, unknown>): readonly string[] {
  const primaryAbility = remaining.primaryAbility;
  if (!Array.isArray(primaryAbility)) {
    return Object.freeze([]);
  }

  const abilities: string[] = [];
  for (const entry of primaryAbility) {
    if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
      for (const key of Object.keys(entry)) {
        const upper = key.toUpperCase();
        if (upper === "STR" || upper === "DEX" || upper === "CON" || upper === "INT" || upper === "WIS" || upper === "CHA") {
          if (!abilities.includes(upper)) {
            abilities.push(upper);
          }
        }
      }
    }
  }

  return Object.freeze(abilities);
}

/**
 * Extracts saving throw proficiencies for 2014 ruleset.
 *
 * 2014 (PHB) classes use `proficiency: ["str", "con"]` as saving throw proficiencies.
 */
export function extractSavingThrows2014(remaining: Record<string, unknown>): readonly string[] {
  const proficiency = remaining.proficiency;
  if (Array.isArray(proficiency)) {
    return Object.freeze(
      proficiency
        .filter((v) => typeof v === "string" && v.length > 0)
        .map((v) => (v as string).toUpperCase()) as string[],
    );
  }
  return Object.freeze([]);
}

/**
 * Extracts saving throw proficiencies for 2024 ruleset.
 *
 * Some 2024 records use `proficiencies` entries like:
 * { name: "Athletics", type: "saving_throw", ability: "str" }.
 * The pinned XPHB class records use the established structured `proficiency`
 * string array, shared with the 2014 representation.
 */
export function extractSavingThrows2024(remaining: Record<string, unknown>): readonly string[] {
  const proficiencies = remaining.proficiencies;
  const abilities: string[] = [];
  if (Array.isArray(proficiencies)) {
    for (const entry of proficiencies) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        if (prof.type === "saving_throw") {
          const ability = prof.ability;
          if (typeof ability === "string" && ability.length > 0) {
            const upper = ability.toUpperCase();
            if (!abilities.includes(upper)) {
              abilities.push(upper);
            }
          }
        }
      }
    }
  }
  return abilities.length > 0 ? Object.freeze(abilities) : extractSavingThrows2014(remaining);
}

/**
 * Legacy helper: extracts a string array from a named field.
 * Kept for backward compatibility with test fixtures.
 */
export function extractAbilityArray(remaining: Record<string, unknown>, field: string): readonly string[] {
  const value = remaining[field];
  if (Array.isArray(value)) {
    return Object.freeze(value.filter((v) => typeof v === "string" && v.length > 0) as string[]);
  }
  return Object.freeze([]);
}

/* ── Record collection ─────────────────────────────────────────── */

export interface CollectedClassRecord {
  readonly record: RawRecord;
  readonly sourcePath: string;
  readonly entityKind: string;
  readonly recordIndex: number;
}

export function collectClassRecords(
  validatedFiles: Record<string, ValidatedFileEnvelope>,
  entityKind: string,
): readonly CollectedClassRecord[] {
  const results: CollectedClassRecord[] = [];

  for (const [filePath, envelope] of Object.entries(validatedFiles)) {
    for (const collection of envelope.collections) {
      if (collection.entityKind !== entityKind) continue;

      for (let i = 0; i < collection.records.length; i++) {
        const record = collection.records[i];
        if (record === undefined) continue;
        results.push({
          record,
          sourcePath: filePath,
          entityKind: collection.entityKind,
          recordIndex: i,
        });
      }
    }
  }

  return Object.freeze(results);
}

/* ── Starting proficiency extractors ──────────────────────────── */

import type {
  StartingWeaponProficiency,
  StartingToolProficiency,
  StartingSkillChoice,
} from "./class-index-types";

/**
 * Extracts starting armor proficiencies from raw class data.
 *
 * Pinned 5eTools (3c5d9d3) PHB format: startingProficiencies dict with armor array
 *   e.g. { armor: ["light", "medium", "heavy", "shield"] }
 * 2024 (XPHB): proficiencies array with type: "armor" entries
 */
export function extractStartingArmorProficiencies(remaining: Record<string, unknown>): readonly string[] {
  const armors: string[] = [];

  // Pinned 5eTools: startingProficiencies dict with armor array
  const startingProf = remaining.startingProficiencies;
  if (typeof startingProf === "object" && startingProf !== null && !Array.isArray(startingProf)) {
    const prof = startingProf as Record<string, unknown>;
    const armor = prof.armor;
    if (Array.isArray(armor)) {
      for (const a of armor) {
        if (typeof a === "string" && a.length > 0 && !armors.includes(a)) {
          armors.push(a);
        }
      }
    }
  }

  // 2024: proficiencies with type: "armor"
  const proficiencies = remaining.proficiencies;
  if (Array.isArray(proficiencies)) {
    for (const entry of proficiencies) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        if (prof.type === "armor") {
          const name = prof.name;
          if (typeof name === "string" && name.length > 0 && !armors.includes(name)) {
            armors.push(name);
          }
        }
      }
    }
  }

  return Object.freeze(armors);
}

/**
 * Extracts starting weapon proficiencies from raw class data.
 *
 * Pinned 5eTools (3c5d9d3) PHB format: startingProficiencies dict with weapons array
 *   e.g. { weapons: ["simple", "martial"] }
 * 2024 (XPHB): proficiencies with type: "weapon", or weaponProficiencies.all.fromFilter for filter-based
 */
export function extractStartingWeaponProficiencies(remaining: Record<string, unknown>): readonly StartingWeaponProficiency[] {
  const weapons: StartingWeaponProficiency[] = [];

  // Pinned 5eTools: startingProficiencies dict with weapons array
  const startingProf = remaining.startingProficiencies;
  if (typeof startingProf === "object" && startingProf !== null && !Array.isArray(startingProf)) {
    const prof = startingProf as Record<string, unknown>;
    const weaponsList = prof.weapons;
    if (Array.isArray(weaponsList)) {
      for (const w of weaponsList) {
        if (typeof w === "string" && w.length > 0) {
          weapons.push({ type: "category", category: w });
        }
      }
    }
  }

  // 2024: proficiencies with type: "weapon"
  const proficiencies = remaining.proficiencies;
  if (Array.isArray(proficiencies)) {
    for (const entry of proficiencies) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        if (prof.type === "weapon") {
          const name = prof.name;
          if (typeof name === "string" && name.length > 0) {
            weapons.push({ type: "category", category: name.toLowerCase() });
          }
        }
      }
    }
  }

  // Handle weaponProficiencies.all.fromFilter (XPHB Monk, Rogue)
  const weaponProfs = remaining.weaponProficiencies;
  if (typeof weaponProfs === "object" && weaponProfs !== null && !Array.isArray(weaponProfs)) {
    const wp = weaponProfs as Record<string, unknown>;
    const all = wp.all;
    if (typeof all === "object" && all !== null && !Array.isArray(all)) {
      const allObj = all as Record<string, unknown>;
      const fromFilter = allObj.fromFilter;
      if (typeof fromFilter === "string" && fromFilter.length > 0) {
        parseWeaponFilter(fromFilter, weapons);
      }
    }
  }

  return Object.freeze(weapons);
}

/**
 * Parses a weapon filter string like "type=martial weapon|property=light;finesse"
 * and adds filter proficiencies to the result array.
 *
 * The XPHB Rogue uses semicolons to separate OR options (finesse OR light).
 */
function parseWeaponFilter(filterStr: string, weapons: StartingWeaponProficiency[]): void {
  // Split by semicolon for OR options
  const options = filterStr.split(";").map(s => s.trim()).filter(s => s.length > 0);

  for (const option of options) {
    const category = extractFilterValue(option, "type");
    const properties = extractFilterProperties(option);

    if (category && properties.length > 0) {
      const firstProp = properties[0]!;
      // If multiple properties separated by |, create separate filter entries
      // (XPHB Rogue finesse OR light pattern)
      if (firstProp.includes("|")) {
        const propList = firstProp.split("|").map(p => p.trim()).filter(p => p.length > 0);
        for (const prop of propList) {
          weapons.push({ type: "filter", category, requiredProperties: [prop] });
        }
      } else {
        weapons.push({ type: "filter", category, requiredProperties: properties });
      }
    } else if (category) {
      weapons.push({ type: "category", category });
    }
  }
}

function extractFilterValue(str: string, key: string): string | undefined {
  const regex = new RegExp(`${key}=([^|;]+)`);
  const match = str.match(regex);
  if (match) {
    return match[1]!.trim();
  }
  return undefined;
}

function extractFilterProperties(str: string): string[] {
  const regex = /property=([^;]+)/;
  const match = str.match(regex);
  if (match) {
    return [match[1]!.trim()];
  }
  return [];
}

/**
 * Extracts starting tool proficiencies from raw class data.
 *
 * Pinned 5eTools (3c5d9d3) PHB format: startingProficiencies dict with tools/toolProficiencies
 *   e.g. { tools: ["herbalism kit"] } or { toolProficiencies: { anyArtisansTool: 1 } }
 * 2024 (XPHB): proficiencies with type: "tool"
 */
export function extractStartingToolProficiencies(remaining: Record<string, unknown>): readonly StartingToolProficiency[] {
  const tools: StartingToolProficiency[] = [];

  // Pinned 5eTools: startingProficiencies dict with tools array
  const startingProf = remaining.startingProficiencies;
  if (typeof startingProf === "object" && startingProf !== null && !Array.isArray(startingProf)) {
    const prof = startingProf as Record<string, unknown>;
    const toolsList = prof.tools;
    if (Array.isArray(toolsList)) {
      for (const t of toolsList) {
        if (typeof t === "string" && t.length > 0) {
          tools.push({ type: "fixed", toolRef: t });
        }
      }
    }
    // Also check toolProficiencies within startingProficiencies (Bard, etc.)
    const toolProfs = prof.toolProficiencies;
    if (typeof toolProfs === "object" && toolProfs !== null && !Array.isArray(toolProfs)) {
      const tp = toolProfs as Record<string, unknown>;
      const anyArtisans = tp.anyArtisansTool;
      const anyMusical = tp.anyMusicalInstrument;
      if (typeof anyArtisans === "number" && anyArtisans > 0) {
        tools.push({ type: "choice", count: anyArtisans, group: "artisan-tool" });
      }
      if (typeof anyMusical === "number" && anyMusical > 0) {
        tools.push({ type: "choice", count: anyMusical, group: "musical-instrument" });
      }
    }
  }

  // Handle toolProficiencies.anyArtisansTool / anyMusicalInstrument
  const toolProfs = remaining.toolProficiencies;
  if (typeof toolProfs === "object" && toolProfs !== null && !Array.isArray(toolProfs)) {
    const tp = toolProfs as Record<string, unknown>;
    const anyArtisans = tp.anyArtisansTool;
    const anyMusical = tp.anyMusicalInstrument;

    if (typeof anyArtisans === "number" && anyArtisans > 0) {
      tools.push({ type: "choice", count: anyArtisans, group: "artisan-tool" });
    }
    if (typeof anyMusical === "number" && anyMusical > 0) {
      tools.push({ type: "choice", count: anyMusical, group: "musical-instrument" });
    }
  }

  // 2024: proficiencies with type: "tool"
  const proficiencies = remaining.proficiencies;
  if (Array.isArray(proficiencies)) {
    for (const entry of proficiencies) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        if (prof.type === "tool") {
          const name = prof.name;
          if (typeof name === "string" && name.length > 0) {
            tools.push({ type: "fixed", toolRef: name });
          }
        }
      }
    }
  }

  return Object.freeze(tools);
}

/**
 * Extracts starting skill choices from raw class data.
 *
 * Pinned 5eTools (3c5d9d3) PHB format: startingProficiencies dict with skills array
 *   e.g. { skills: [{ choose: { count: 2, from: [...] } }] }
 * 2024 (XPHB): proficiencies with type: "skill" and choose sub-object
 */
export function extractStartingSkillChoices(remaining: Record<string, unknown>): readonly StartingSkillChoice[] {
  const choices: StartingSkillChoice[] = [];

  // Pinned 5eTools: startingProficiencies dict with skills array
  const startingProf = remaining.startingProficiencies;
  if (typeof startingProf === "object" && startingProf !== null && !Array.isArray(startingProf)) {
    const prof = startingProf as Record<string, unknown>;
    const skills = prof.skills;
    if (Array.isArray(skills)) {
      for (const skill of skills) {
        if (typeof skill === "object" && skill !== null && !Array.isArray(skill)) {
          const skillObj = skill as Record<string, unknown>;
          const choose = skillObj.choose;
          if (typeof choose === "object" && choose !== null && !Array.isArray(choose)) {
            const chooseObj = choose as Record<string, unknown>;
            const count = chooseObj.count;
            const from = chooseObj.from;
            if (typeof count === "number" && count > 0) {
              const skillList = Array.isArray(from)
                ? from.filter((s) => typeof s === "string" && s.length > 0) as string[]
                : [];
              choices.push({
                count,
                from: Object.freeze(skillList),
                isAny: skillList.length === 0,
              });
            }
          }
        }
      }
    }
  }

  // 2024: proficiencies with type: "skill" and choose
  const proficiencies = remaining.proficiencies;
  if (Array.isArray(proficiencies)) {
    for (const entry of proficiencies) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        if (prof.type === "skill") {
          const choose = prof.choose;
          if (typeof choose === "object" && choose !== null && !Array.isArray(choose)) {
            const chooseObj = choose as Record<string, unknown>;
            const count = chooseObj.count;
            const from = chooseObj.from;
            if (typeof count === "number" && count > 0) {
              const skillList = Array.isArray(from)
                ? from.filter((s) => typeof s === "string" && s.length > 0) as string[]
                : [];
              choices.push({
                count,
                from: Object.freeze(skillList),
                isAny: skillList.length === 0,
              });
            }
          }
        }
      }
    }
  }

  return Object.freeze(choices);
}

/* ── Starting equipment extractors ────────────────────────────── */

import type {
  StartingEquipmentGrant,
  StartingEquipmentChoice,
  StartingEquipmentOption,
  StartingEquipmentTypeChoice,
} from "./class-index-types";

/**
 * Extracts starting equipment grants and choices from raw class data.
 *
 * 2014 (PHB): startingEquipment array with items, values, and choose blocks
 * 2024 (XPHB): similar structure
 */
export function extractStartingEquipment(remaining: Record<string, unknown>): {
  readonly grants: readonly StartingEquipmentGrant[];
  readonly choices: readonly StartingEquipmentChoice[];
  readonly diagnostics: readonly string[];
} {
  const grants: StartingEquipmentGrant[] = [];
  const choices: StartingEquipmentChoice[] = [];
  const diagnostics: string[] = [];

  const startingEquipment = remaining.startingEquipment;
  if (isRecord(startingEquipment)) {
    const defaultData = startingEquipment.defaultData;
    if (!Array.isArray(defaultData)) {
      diagnostics.push("startingEquipment must contain a defaultData array.");
      return freezeStartingEquipment(grants, choices, diagnostics);
    }
    const defaultOption = parseStructuredEquipmentData(defaultData, diagnostics, startingEquipment.default);
    if (defaultOption === undefined) return freezeStartingEquipment([], [], diagnostics);
    const goldAlternative = parseGoldAlternative(startingEquipment.goldAlternative);
    if (startingEquipment.goldAlternative !== undefined && goldAlternative === undefined) {
      diagnostics.push("startingEquipment.goldAlternative must be a supported dice expression.");
      return freezeStartingEquipment([], [], diagnostics);
    }
    if (goldAlternative === undefined) {
      grants.push(...defaultOption.grants);
      choices.push(...(defaultOption.choices ?? []));
      if (defaultOption.equipmentChoices.length > 0) {
        choices.push({ count: 1, label: "Choose starting equipment", options: Object.freeze([{
          label: "Starting equipment", grants: Object.freeze([]), equipmentChoices: Object.freeze(defaultOption.equipmentChoices),
        }]) });
      }
      return freezeStartingEquipment(grants, choices, diagnostics);
    }
    choices.push({
      count: 1,
      label: "Choose starting equipment or gold",
      options: Object.freeze([
        { label: "Starting equipment", grants: Object.freeze(defaultOption.grants), choices: Object.freeze(defaultOption.choices ?? []), equipmentChoices: Object.freeze(defaultOption.equipmentChoices) },
        { label: "Starting gold", grants: Object.freeze([goldAlternative]) },
      ]),
    });
    return freezeStartingEquipment(grants, choices, diagnostics);
  }
  if (!Array.isArray(startingEquipment)) {
    return freezeStartingEquipment(grants, choices, diagnostics);
  }

  for (const entry of startingEquipment) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const eq = entry as Record<string, unknown>;

    // Direct item grant: { item: "longsword" } or { item: "longsword|xphb" }
    if (typeof eq.item === "string" && eq.item.length > 0) {
      grants.push({
        type: "item",
        itemId: eq.item,
        quantity: typeof eq.quantity === "number" && eq.quantity > 0 ? eq.quantity : 1,
      });
    }

    // Named item: { name: "Shield" }
    if (typeof eq.name === "string" && eq.name.length > 0 && !eq.item) {
      grants.push({
        type: "named-item",
        name: eq.name,
        quantity: typeof eq.quantity === "number" && eq.quantity > 0 ? eq.quantity : 1,
      });
    }

    // Currency value: { value: 10 } (fixed) or { value: "5d4" } (dice)
    const value = eq.value;
    if (typeof value === "number" && value > 0) {
      grants.push({
        type: "currency",
        denomination: "gp",
        fixedValue: value,
      });
    } else if (typeof value === "string" && value.length > 0) {
      const parsed = parseDiceExpression(value);
      if (parsed) {
        grants.push({
          type: "currency",
          denomination: "gp",
          ...parsed,
        });
      }
    }

    // Choose block: { choose: { count: 1, type: "equipment package", from: [...] } }
    const choose = eq.choose;
    if (typeof choose === "object" && choose !== null && !Array.isArray(choose)) {
      const chooseObj = choose as Record<string, unknown>;
      const count = chooseObj.count;
      if (typeof count === "number" && count > 0) {
        const from = chooseObj.from;
        if (Array.isArray(from)) {
          const options: StartingEquipmentOption[] = [];
          for (const option of from) {
            if (typeof option === "object" && option !== null && !Array.isArray(option)) {
              const opt = option as Record<string, unknown>;
              // Each option is a keyed package: { A: [...] }, { B: [...] }
              for (const [label, packageItems] of Object.entries(opt)) {
                if (Array.isArray(packageItems)) {
                  const optGrants: StartingEquipmentGrant[] = [];
                  for (const pkgItem of packageItems) {
                    if (typeof pkgItem === "object" && pkgItem !== null && !Array.isArray(pkgItem)) {
                      const pi = pkgItem as Record<string, unknown>;
                      if (typeof pi.item === "string" && pi.item.length > 0) {
                        optGrants.push({
                          type: "item",
                          itemId: pi.item,
                          quantity: typeof pi.quantity === "number" && pi.quantity > 0 ? pi.quantity : 1,
                        });
                      } else if (typeof pi.name === "string" && pi.name.length > 0) {
                        optGrants.push({
                          type: "named-item",
                          name: pi.name,
                          quantity: typeof pi.quantity === "number" && pi.quantity > 0 ? pi.quantity : 1,
                        });
                      } else if (typeof pi.value === "number" && pi.value > 0) {
                        optGrants.push({
                          type: "currency",
                          denomination: "gp",
                          fixedValue: pi.value,
                        });
                      } else if (typeof pi.value === "string" && pi.value.length > 0) {
                        const parsed = parseDiceExpression(pi.value);
                        if (parsed) {
                          optGrants.push({
                            type: "currency",
                            denomination: "gp",
                            ...parsed,
                          });
                        }
                      }
                    }
                  }
                  options.push({
                    label,
                    grants: Object.freeze(optGrants),
                  });
                }
              }
            }
          }
          choices.push({
            count,
            options: Object.freeze(options),
          });
        }
      }
    }
  }

  return freezeStartingEquipment(grants, choices, diagnostics);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function freezeStartingEquipment(
  grants: readonly StartingEquipmentGrant[], choices: readonly StartingEquipmentChoice[], diagnostics: readonly string[],
): { readonly grants: readonly StartingEquipmentGrant[]; readonly choices: readonly StartingEquipmentChoice[]; readonly diagnostics: readonly string[] } {
  return { grants: Object.freeze([...grants]), choices: Object.freeze([...choices]), diagnostics: Object.freeze([...diagnostics]) };
}

function parseStructuredEquipmentData(
  defaultData: readonly unknown[], diagnostics: string[], displayData: unknown,
): { grants: StartingEquipmentGrant[]; choices: StartingEquipmentChoice[]; equipmentChoices: StartingEquipmentTypeChoice[] } | undefined {
  const grants: StartingEquipmentGrant[] = [];
  const choices: StartingEquipmentChoice[] = [];
  const equipmentChoices: StartingEquipmentTypeChoice[] = [];
  for (let index = 0; index < defaultData.length; index++) {
    const container = defaultData[index];
    if (!isRecord(container)) {
      diagnostics.push(`startingEquipment.defaultData[${index}] must be an object.`);
      return undefined;
    }
    const entries = Object.entries(container);
    if (entries.length === 0 || entries.some(([, value]) => !Array.isArray(value))) {
      diagnostics.push(`startingEquipment.defaultData[${index}] must contain named item arrays.`);
      return undefined;
    }
    const automatic = container._;
    if (automatic !== undefined) {
      if (entries.length !== 1 || !Array.isArray(automatic)) {
        diagnostics.push(`startingEquipment.defaultData[${index}] mixes automatic and alternative packages.`);
        return undefined;
      }
      const parsed = parseEquipmentPackage(automatic, `startingEquipment.defaultData[${index}]`, diagnostics,
        startingEquipmentFiltersForIndex(displayData, index, diagnostics, `startingEquipment.default[${index}]`));
      if (parsed === undefined) return undefined;
      grants.push(...parsed.grants);
      choices.push(...parsed.choices);
      equipmentChoices.push(...parsed.equipmentChoices);
      continue;
    }
    if (entries.length < 2) {
      diagnostics.push(`startingEquipment.defaultData[${index}] requires at least two alternatives.`);
      return undefined;
    }
    const options: StartingEquipmentOption[] = [];
    const filters = startingEquipmentFiltersForIndex(displayData, index, diagnostics, `startingEquipment.default[${index}]`);
    let optionIndex = 0;
    for (const [label, packageItems] of entries) {
      const parsed = parseEquipmentPackage(packageItems as unknown[], `startingEquipment.defaultData[${index}].${label}`, diagnostics,
        filters.slice(optionIndex));
      optionIndex += parsed?.equipmentChoices.length ?? 0;
      if (parsed === undefined) return undefined;
      options.push({ label: `Package ${label.toUpperCase()}`, grants: Object.freeze(parsed.grants), choices: Object.freeze(parsed.choices), equipmentChoices: Object.freeze(parsed.equipmentChoices) });
    }
    choices.push({ count: 1, label: "Choose starting equipment", options: Object.freeze(options) });
  }
  return { grants, choices, equipmentChoices };
}

function parseEquipmentPackage(
  items: readonly unknown[], path: string, diagnostics: string[], filters: readonly StartingEquipmentFilterConstraint[] = [],
): { grants: StartingEquipmentGrant[]; choices: StartingEquipmentChoice[]; equipmentChoices: StartingEquipmentTypeChoice[] } | undefined {
  const grants: StartingEquipmentGrant[] = [];
  const equipmentChoices: StartingEquipmentTypeChoice[] = [];
  let filterIndex = 0;
  for (let index = 0; index < items.length; index++) {
    const entry = items[index];
    const entryPath = `${path}[${index}]`;
    if (typeof entry === "string" && entry.includes("|")) {
      grants.push({ type: "item", itemId: entry, quantity: 1 });
      continue;
    }
    if (!isRecord(entry)) {
      diagnostics.push(`${entryPath} must be an item reference or supported structured equipment entry.`);
      return undefined;
    }
    const quantity = entry.quantity === undefined ? 1 : entry.quantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      diagnostics.push(`${entryPath}.quantity must be a positive integer.`);
      return undefined;
    }
    if (typeof entry.item === "string" && entry.item.includes("|")) grants.push({ type: "item", itemId: entry.item, quantity });
    else if (typeof entry.special === "string" && entry.special.trim().length > 0) grants.push({ type: "named-item", name: entry.special.trim(), quantity });
    else if (typeof entry.value === "number" && Number.isSafeInteger(entry.value) && entry.value > 0) grants.push({ type: "currency", denomination: "cp", fixedValue: entry.value });
    else if (typeof entry.equipmentType === "string") {
      const group = mapRawEquipmentType(entry.equipmentType);
      const filter = filters[filterIndex++];
      if (group !== undefined) equipmentChoices.push({ equipmentGroups: [group], quantity, sourceId: filter?.sourceId,
        eligibility: filter?.eligibility.length ? filter.eligibility : undefined });
      else {
        diagnostics.push(`${entryPath}.equipmentType is not a supported equipment group.`);
        return undefined;
      }
    } else if (entry.equipmentTypes !== undefined) {
      const groups = mapRawEquipmentTypes(entry.equipmentTypes);
      const filter = filters[filterIndex++];
      if (groups !== undefined) equipmentChoices.push({ equipmentGroups: Object.freeze(groups), quantity, sourceId: filter?.sourceId,
        eligibility: filter?.eligibility.length ? filter.eligibility : undefined });
      else {
        diagnostics.push(`${entryPath}.equipmentTypes must be a non-empty array of supported equipment groups.`);
        return undefined;
      }
    }
    else {
      diagnostics.push(`${entryPath} uses an unsupported starting-equipment structure.`);
      return undefined;
    }
  }
  return { grants, choices: [], equipmentChoices };
}

function parseGoldAlternative(value: unknown): StartingEquipmentGrant | undefined {
  if (typeof value !== "string") return undefined;
  const dice = value.match(/(\d+)d(\d+)(?:\s*[×x*]\s*(\d+))?/i);
  if (dice === null) return undefined;
  return { type: "currency", denomination: "gp", diceCount: Number(dice[1]), diceSides: Number(dice[2]), diceMultiplier: dice[3] === undefined ? 1 : Number(dice[3]) };
}

/**
 * Parses a dice expression like "5d4" or "5d4 × 10" into a structured form.
 * Returns undefined for unsupported expressions.
 */
function parseDiceExpression(expr: string): {
  diceCount?: number;
  diceSides?: number;
  diceMultiplier?: number;
} | undefined {
  // Match patterns like "5d4", "5d4 × 10", "5d4x10", "5d4 * 10"
  const diceMatch = expr.match(/^(\d+)d(\d+)(?:\s*[×x*]\s*(\d+))?$/);
  if (diceMatch) {
    return {
      diceCount: parseInt(diceMatch[1]!, 10),
      diceSides: parseInt(diceMatch[2]!, 10),
      diceMultiplier: diceMatch[3] ? parseInt(diceMatch[3], 10) : 1,
    };
  }
  return undefined;
}

/**
 * Extracts starting gold from raw class data.
 *
 * 2014 (PHB): goldAlternative field with dice expression like "5d4" or "5d4 × 10"
 * 2024 (XPHB): typically absent
 */
export function extractStartingGold(remaining: Record<string, unknown>): readonly StartingGoldEntry[] {
  const golds: StartingGoldEntry[] = [];

  // Handle goldAlternative field
  const goldAlt = remaining.goldAlternative;
  if (typeof goldAlt === "string" && goldAlt.length > 0) {
    const parsed = parseDiceExpression(goldAlt);
    if (parsed) {
      golds.push({
        denomination: "gp",
        ...parsed,
      });
    }
  }

  // Handle gold field (some sources may use it directly)
  const gold = remaining.gold;
  if (typeof gold === "string" && gold.length > 0) {
    const parsed = parseDiceExpression(gold);
    if (parsed) {
      golds.push({
        denomination: "gp",
        ...parsed,
      });
    }
  } else if (typeof gold === "number" && gold > 0) {
    golds.push({
      denomination: "gp",
      fixedValue: gold,
    });
  }

  return Object.freeze(golds);
}

/* ── Level-one feature extractors ─────────────────────────────── */

/**
 * Parses a pipe-delimited classFeature reference string.
 *
 * PHB format: "Divine Sense|Paladin||1" (name|class|source|level, source may be empty)
 * XPHB format: "Spellcasting|Cleric|XPHB|1" (name|class|source|level)
 *
 * Returns the feature name and level, or undefined if the format is invalid.
 */
function parseClassFeatureRef(ref: string): { name: string; level: number } | undefined {
  const parts = ref.split("|");
  if (parts.length < 4) return undefined;
  const name = parts[0];
  const levelStr = parts[3];
  if (!name || name.length === 0) return undefined;
  if (typeof levelStr !== "string") return undefined;
  const level = parseInt(levelStr, 10);
  if (isNaN(level) || level < 1) return undefined;
  return { name, level };
}

/**
 * Extracts level-one features from raw class data.
 *
 * Pinned 5eTools (3c5d9d3) uses `classFeatures` array with pipe-delimited strings
 * or objects with `classFeature` property. Both PHB and XPHB share this structure.
 *
 * String format: "Divine Sense|Paladin||1" (PHB) or "Spellcasting|Cleric|XPHB|1" (XPHB)
 * Object format: { classFeature: "Cleric Subclass|Cleric|XPHB|3", gainSubclassFeature: true }
 */
export function extractLevelOneFeatures(remaining: Record<string, unknown>): readonly LevelOneFeature[] {
  const features: LevelOneFeature[] = [];

  // Parse classFeatures array (both PHB and XPHB)
  const classFeatures = remaining.classFeatures;
  if (Array.isArray(classFeatures)) {
    for (const cf of classFeatures) {
      if (typeof cf === "string" && cf.length > 0) {
        const parsed = parseClassFeatureRef(cf);
        if (parsed && parsed.level === 1) {
          if (!features.some((f) => f.name === parsed.name)) {
            features.push({ name: parsed.name });
          }
        }
      } else if (typeof cf === "object" && cf !== null && !Array.isArray(cf)) {
        const obj = cf as Record<string, unknown>;
        const classFeatureRef = obj.classFeature;
        if (typeof classFeatureRef === "string" && classFeatureRef.length > 0) {
          const parsed = parseClassFeatureRef(classFeatureRef);
          if (parsed && parsed.level === 1) {
            if (!features.some((f) => f.name === parsed.name)) {
              features.push({ name: parsed.name });
            }
          }
        }
      }
    }
  }

  return Object.freeze(features);
}

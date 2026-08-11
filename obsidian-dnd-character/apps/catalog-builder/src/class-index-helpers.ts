import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary";
import type { CopyModRawRecord } from "./mod-types";
import type {
  ClassIndexDiagnostic,
  ClassIndexDiagnosticCode,
  StartingGoldEntry,
  LevelOneFeature,
} from "./class-index-types";

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
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return true;
  }
  return false;
}

export function extractParentId(record: CopyModRawRecord): string | undefined {
  const remaining = record.remaining;
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return parent;
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
 * 2024 (XPHB) classes use `proficiencies` array with entries like:
 * { name: "Athletics", type: "saving_throw", ability: "str" }
 */
export function extractSavingThrows2024(remaining: Record<string, unknown>): readonly string[] {
  const proficiencies = remaining.proficiencies;
  if (!Array.isArray(proficiencies)) {
    return Object.freeze([]);
  }

  const abilities: string[] = [];
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

  return Object.freeze(abilities);
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
 * 2014 (PHB): startingProficiencies array with armor entries like { armor: ["light"] }
 * 2024 (XPHB): proficiencies array with type: "armor" entries
 */
export function extractStartingArmorProficiencies(remaining: Record<string, unknown>): readonly string[] {
  const armors: string[] = [];

  // 2014: startingProficiencies with armor entries
  const startingProf = remaining.startingProficiencies;
  if (Array.isArray(startingProf)) {
    for (const entry of startingProf) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        const armor = prof.armor;
        if (Array.isArray(armor)) {
          for (const a of armor) {
            if (typeof a === "string" && a.length > 0 && !armors.includes(a)) {
              armors.push(a);
            }
          }
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
 * 2014 (PHB): startingProficiencies with weapons: ["simple"] or weaponProficiencies.all.fromFilter
 * 2024 (XPHB): proficiencies with type: "weapon", or weaponProficiencies.all.fromFilter for filter-based
 */
export function extractStartingWeaponProficiencies(remaining: Record<string, unknown>): readonly StartingWeaponProficiency[] {
  const weapons: StartingWeaponProficiency[] = [];

  // 2014: startingProficiencies with weapons entries
  const startingProf = remaining.startingProficiencies;
  if (Array.isArray(startingProf)) {
    for (const entry of startingProf) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        const weaponsList = prof.weapons;
        if (Array.isArray(weaponsList)) {
          for (const w of weaponsList) {
            if (typeof w === "string" && w.length > 0) {
              weapons.push({ type: "category", category: w });
            }
          }
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
 * 2014 (PHB): startingProficiencies with tools entries, or toolProficiencies.anyArtisansTool
 * 2024 (XPHB): proficiencies with type: "tool"
 */
export function extractStartingToolProficiencies(remaining: Record<string, unknown>): readonly StartingToolProficiency[] {
  const tools: StartingToolProficiency[] = [];

  // 2014: startingProficiencies with tools entries
  const startingProf = remaining.startingProficiencies;
  if (Array.isArray(startingProf)) {
    for (const entry of startingProf) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
        const toolsList = prof.tools;
        if (Array.isArray(toolsList)) {
          for (const t of toolsList) {
            if (typeof t === "string" && t.length > 0) {
              tools.push({ type: "fixed", toolRef: t });
            }
          }
        }
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
 * 2014 (PHB): startingProficiencies with skills entries like { choose: { count: 2, from: [...] } }
 * 2024 (XPHB): proficiencies with type: "skill" and choose sub-object
 */
export function extractStartingSkillChoices(remaining: Record<string, unknown>): readonly StartingSkillChoice[] {
  const choices: StartingSkillChoice[] = [];

  // 2014: startingProficiencies with skills entries
  const startingProf = remaining.startingProficiencies;
  if (Array.isArray(startingProf)) {
    for (const entry of startingProf) {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        const prof = entry as Record<string, unknown>;
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
} {
  const grants: StartingEquipmentGrant[] = [];
  const choices: StartingEquipmentChoice[] = [];

  const startingEquipment = remaining.startingEquipment;
  if (!Array.isArray(startingEquipment)) {
    return { grants: Object.freeze(grants), choices: Object.freeze(choices) };
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

  return {
    grants: Object.freeze(grants),
    choices: Object.freeze(choices),
  };
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
 * Extracts level-one features from raw class data.
 *
 * 2014 (PHB): levels array with level 1 entries
 * 2024 (XPHB): proficiencies with type: "feature" at level 1
 */
export function extractLevelOneFeatures(remaining: Record<string, unknown>): readonly LevelOneFeature[] {
  const features: LevelOneFeature[] = [];

  // 2014: levels array with level 1 entries
  const levels = remaining.levels;
  if (Array.isArray(levels)) {
    for (const level of levels) {
      if (typeof level === "object" && level !== null && !Array.isArray(level)) {
        const lvl = level as Record<string, unknown>;
        if (lvl.level === 1) {
          const feats = lvl.feats;
          if (Array.isArray(feats)) {
            for (const feat of feats) {
              if (typeof feat === "string" && feat.length > 0) {
                features.push({ name: feat });
              } else if (typeof feat === "object" && feat !== null && !Array.isArray(feat)) {
                const f = feat as Record<string, unknown>;
                if (typeof f.name === "string" && f.name.length > 0) {
                  features.push({ name: f.name });
                }
              }
            }
          }
        }
      }
    }
  }

  // 2024: proficiencies with type: "feature" at level 1
  // (This is handled differently in 2024 - features are in the levels structure)
  const levels2024 = remaining.levels;
  if (Array.isArray(levels2024)) {
    for (const level of levels2024) {
      if (typeof level === "object" && level !== null && !Array.isArray(level)) {
        const lvl = level as Record<string, unknown>;
        if (lvl.level === 1) {
          // Check for features in 2024 format
          const featuresList = lvl.features;
          if (Array.isArray(featuresList)) {
            for (const feat of featuresList) {
              if (typeof feat === "string" && feat.length > 0) {
                if (!features.some(f => f.name === feat)) {
                  features.push({ name: feat });
                }
              } else if (typeof feat === "object" && feat !== null && !Array.isArray(feat)) {
                const f = feat as Record<string, unknown>;
                if (typeof f.name === "string" && f.name.length > 0) {
                  if (!features.some(f2 => f2.name === f.name)) {
                    features.push({ name: f.name });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return Object.freeze(features);
}

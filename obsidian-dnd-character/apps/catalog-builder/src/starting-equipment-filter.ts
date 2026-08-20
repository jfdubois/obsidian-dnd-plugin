import type { EquipmentEligibility } from "@obsidian-dnd/catalog-contract";

export interface StartingEquipmentFilterConstraint {
  readonly sourceId?: string;
  readonly eligibility: readonly EquipmentEligibility[];
}

const SUPPORTED_KEYS = new Set(["source", "category", "type", "melee weapon", "miscellaneous"]);

/** Extract the typed subset of an Items-page filter used by starting equipment. */
export function parseStartingEquipmentFilters(value: unknown, diagnostics: string[], path: string): readonly StartingEquipmentFilterConstraint[] {
  const texts: string[] = [];
  const visit = (candidate: unknown): void => {
    if (typeof candidate === "string") {
      const re = /\{@filter\s+[^|}]+\|items\|([^}]+)\}/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(candidate)) !== null) texts.push(match[1] ?? "");
    } else if (Array.isArray(candidate)) candidate.forEach(visit);
    else if (typeof candidate === "object" && candidate !== null) Object.values(candidate as Record<string, unknown>).forEach(visit);
  };
  visit(value);

  return Object.freeze(texts.map((expression, index) => {
    const sourceValues: string[] = [];
    const eligibility: EquipmentEligibility[] = [];
    for (const segment of expression.split("|")) {
      const equals = segment.indexOf("=");
      if (equals <= 0) continue;
      const key = segment.slice(0, equals).trim().toLowerCase();
      const rawValue = segment.slice(equals + 1).trim().toLowerCase();
      if (!SUPPORTED_KEYS.has(key)) {
        diagnostics.push(`${path}.filter[${index}] has unsupported constraint key "${key}"; selector was not narrowed.`);
        continue;
      }
      if (key === "source") {
        const values = rawValue.split(";").map((item) => item.trim()).filter(Boolean);
        if (values.length !== 1) diagnostics.push(`${path}.filter[${index}].source must contain exactly one source for a starting-equipment selector.`);
        else sourceValues.push(values[0]!);
      } else if (key === "category") {
        if (rawValue === "basic") eligibility.push("basic");
        else diagnostics.push(`${path}.filter[${index}].category=${rawValue} is unsupported for starting equipment.`);
      } else if (key === "miscellaneous") {
        if (rawValue === "mundane") eligibility.push("mundane");
        else if (rawValue !== "") diagnostics.push(`${path}.filter[${index}].miscellaneous=${rawValue} is unsupported for starting equipment.`);
      }
    }
    return Object.freeze({
      sourceId: sourceValues[0],
      eligibility: Object.freeze([...new Set(eligibility)]),
    });
  }));
}

export function startingEquipmentFiltersForIndex(
  value: unknown,
  index: number,
  diagnostics: string[],
  path: string,
): readonly StartingEquipmentFilterConstraint[] {
  const selected = Array.isArray(value) ? value[index] : value;
  return parseStartingEquipmentFilters(selected, diagnostics, path);
}

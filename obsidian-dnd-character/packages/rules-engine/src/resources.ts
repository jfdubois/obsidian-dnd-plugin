import type {
  RuleEffect,
  GrantResourceEffect,
  ResourceDefinition,
  ValueFormula,
  ResourceRecovery,
} from "@obsidian-dnd/catalog-contract";

/* ── Result types ────────────────────────────────────────────────
   Pure calculation results for feature resources (Rage, Ki, etc.).
   Deterministic and independent of Obsidian UI.                    */

/** A single resource entry with computed maximum and recovery info. */
export interface ResourceEntry {
  /** The resource name (e.g., "Rage", "Ki points"). */
  name: string;
  /** The computed maximum value for this resource. */
  maximum: number;
  /** The recovery type label (e.g., "short-rest", "long-rest", "none", "custom"). */
  recovery: string;
  /** Human-readable explanation of how the maximum was computed. */
  explanation: string;
}

/** Complete feature resources calculation result. */
export interface ResourcesResult {
  /** Deduplicated resource entries sorted by name. */
  resources: ReadonlyArray<ResourceEntry>;
  /** Explanation strings showing contributors. */
  explanations: ReadonlyArray<string>;
}

/* ── Effect type guards ─────────────────────────────────────────── */

/** Checks if a rule effect is a grant-resource effect. */
function isGrantResourceEffect(
  effect: RuleEffect,
): effect is RuleEffect & GrantResourceEffect {
  return effect.type === "grant-resource";
}

/* ── Value formula evaluation ───────────────────────────────────── */

/**
 * Evaluates a ValueFormula to produce a numeric maximum value.
 *
 * @param formula - The value formula to evaluate
 * @param characterLevel - The character's total level
 * @param abilities - Record mapping ability names to scores
 * @returns The computed numeric value
 */
function evaluateValueFormula(
  formula: ValueFormula,
  characterLevel: number,
  abilities: Record<string, number>,
): number {
  switch (formula.type) {
    case "fixed": {
      return formula.value;
    }

    case "level-based": {
      return characterLevel * formula.multiplier;
    }

    case "ability-based": {
      const score = abilities[formula.ability] ?? 10;
      return Math.floor((score - 10) / 2);
    }

    case "sum": {
      let total = 0;
      for (const operand of formula.operands) {
        total += evaluateValueFormula(operand, characterLevel, abilities);
      }
      return total;
    }
  }
}

/**
 * Generates a human-readable explanation string for a ValueFormula.
 *
 * @param formula - The value formula to describe
 * @param characterLevel - The character's total level
 * @param abilities - Record mapping ability names to scores
 * @returns Explanation string
 */
function explainValueFormula(
  formula: ValueFormula,
  characterLevel: number,
  abilities: Record<string, number>,
): string {
  switch (formula.type) {
    case "fixed": {
      return `fixed(${formula.value})`;
    }

    case "level-based": {
      return `level(${characterLevel}) * ${formula.multiplier}`;
    }

    case "ability-based": {
      const score = abilities[formula.ability] ?? 10;
      const modifier = Math.floor((score - 10) / 2);
      return `${formula.ability} mod(${modifier})`;
    }

    case "sum": {
      const parts = formula.operands.map((op) =>
        explainValueFormula(op, characterLevel, abilities),
      );
      return `sum(${parts.join(" + ")})`;
    }
  }
}

/* ── Recovery label extraction ──────────────────────────────────── */

/**
 * Extracts a recovery label string from a ResourceRecovery definition.
 *
 * @param recovery - The recovery definition
 * @returns Recovery label string
 */
function getRecoveryLabel(recovery: ResourceRecovery): string {
  switch (recovery.type) {
    case "short-rest": {
      return "short-rest";
    }
    case "long-rest": {
      return "long-rest";
    }
    case "none": {
      return "no-recovery";
    }
    case "custom": {
      return "custom";
    }
  }
}

/* ── Main calculation ───────────────────────────────────────────── */

/**
 * Calculates feature resources (Rage, Ki points, Second Wind, etc.)
 * from character effects.
 *
 * Process:
 * 1. Filter for grant-resource effects
 * 2. For each resource, evaluate the ValueFormula to compute maximum
 * 3. Track recovery type for each resource
 * 4. Deduplicate resources by name (keep highest maximum)
 * 5. Return structured result sorted by name
 *
 * @param effects - Array of rule effects to process
 * @param characterLevel - The character's total level
 * @param abilities - Record mapping ability names (e.g., "STR") to scores
 * @returns Structured resources result
 */
export function calculateResources(
  effects: RuleEffect[],
  characterLevel: number,
  abilities: Record<string, number>,
): ResourcesResult {
  // Map from resource name to the best ResourceEntry found so far
  const resourceMap = new Map<string, ResourceEntry>();
  const explanations: string[] = [];

  for (const effect of effects) {
    if (!isGrantResourceEffect(effect)) {
      continue;
    }

    const resource: ResourceDefinition = effect.resource;
    const maximum = evaluateValueFormula(resource.maximum, characterLevel, abilities);
    const recovery = getRecoveryLabel(resource.recovery);
    const explanation = explainValueFormula(resource.maximum, characterLevel, abilities);

    const entry: ResourceEntry = {
      name: resource.name,
      maximum,
      recovery,
      explanation: `${resource.name}: ${explanation} = ${maximum}`,
    };

    explanations.push(entry.explanation);

    // Deduplicate: keep the entry with the highest maximum
    const existing = resourceMap.get(resource.name);
    if (!existing || maximum > existing.maximum) {
      resourceMap.set(resource.name, entry);
    }
  }

  // Sort by name for deterministic output
  const sortedResources = [...resourceMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    resources: Object.freeze(sortedResources),
    explanations: Object.freeze(explanations),
  };
}

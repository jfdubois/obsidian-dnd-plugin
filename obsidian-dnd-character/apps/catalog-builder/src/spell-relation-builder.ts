import type { EntityId } from "@obsidian-dnd/domain";
import type { SpellRule } from "@obsidian-dnd/catalog-contract";

/* ── Relation types ────────────────────────────────────────────── */

export type SpellRelationType =
  | "prerequisite"
  | "level-chain"
  | "school-group";

export interface SpellPrerequisiteRelation {
  readonly type: "prerequisite";
  readonly sourceId: EntityId;
  readonly targetId: EntityId;
  readonly sourceName: string;
  readonly targetName: string;
}

export interface SpellLevelChainRelation {
  readonly type: "level-chain";
  readonly lowerId: EntityId;
  readonly higherId: EntityId;
  readonly spellName: string;
  readonly lowerLevel: number;
  readonly higherLevel: number;
}

export interface SpellSchoolGroupRelation {
  readonly type: "school-group";
  readonly school: string;
  readonly spellIds: readonly EntityId[];
}

export type SpellRelation =
  | SpellPrerequisiteRelation
  | SpellLevelChainRelation
  | SpellSchoolGroupRelation;

/* ── Diagnostic types ──────────────────────────────────────────── */

export type SpellRelationDiagnosticCode =
  | "BROKEN_PREREQUISITE_REF"
  | "BROKEN_DEPENDENCY_REF";

export interface SpellRelationDiagnostic {
  readonly code: SpellRelationDiagnosticCode;
  readonly severity: "warning";
  readonly message: string;
  readonly spellId: EntityId;
  readonly spellName: string;
  readonly missingId: EntityId;
}

/* ── Input / Output types ──────────────────────────────────────── */

export interface SpellRelationBuilderInput {
  readonly spells: readonly SpellRule[];
}

export interface SpellRelationBuilderResult {
  readonly relations: readonly SpellRelation[];
  readonly diagnostics: readonly SpellRelationDiagnostic[];
}

/* ── Internal helpers ──────────────────────────────────────────── */

function makeDiagnostic(
  code: SpellRelationDiagnosticCode,
  message: string,
  spellId: EntityId,
  spellName: string,
  missingId: EntityId,
): SpellRelationDiagnostic {
  return Object.freeze({
    code,
    severity: "warning",
    message,
    spellId,
    spellName,
    missingId,
  });
}

/* ── Prerequisite relation builder ─────────────────────────────── */

function buildPrerequisiteRelations(
  spells: readonly SpellRule[],
  spellMap: Map<string, SpellRule>,
  diagnostics: SpellRelationDiagnostic[],
): SpellPrerequisiteRelation[] {
  const relations: SpellPrerequisiteRelation[] = [];
  const seen = new Set<string>();

  for (const spell of spells) {
    // Check dependencies array
    for (const depId of spell.dependencies) {
      const depSpell = spellMap.get(depId);
      if (depSpell === undefined) {
        diagnostics.push(makeDiagnostic(
          "BROKEN_DEPENDENCY_REF",
          `Spell "${spell.name}" references dependency "${depId}" which is not in the spell set.`,
          spell.id,
          spell.name,
          depId,
        ));
        continue;
      }
      const key = `${depId}::${spell.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        relations.push(Object.freeze({
          type: "prerequisite",
          sourceId: depId,
          targetId: spell.id,
          sourceName: depSpell.name,
          targetName: spell.name,
        }));
      }
    }

    // Check entity-selection prerequisites
    for (const prereq of spell.prerequisites) {
      if (prereq.type !== "entity-selection") continue;
      const refSpell = spellMap.get(prereq.entityId);
      if (refSpell === undefined) {
        diagnostics.push(makeDiagnostic(
          "BROKEN_PREREQUISITE_REF",
          `Spell "${spell.name}" has prerequisite reference "${prereq.entityId}" which is not in the spell set.`,
          spell.id,
          spell.name,
          prereq.entityId,
        ));
        continue;
      }
      const key = `${prereq.entityId}::${spell.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        relations.push(Object.freeze({
          type: "prerequisite",
          sourceId: prereq.entityId,
          targetId: spell.id,
          sourceName: refSpell.name,
          targetName: spell.name,
        }));
      }
    }
  }

  return relations;
}

/* ── Level chain relation builder ──────────────────────────────── */

function buildLevelChainRelations(
  spells: readonly SpellRule[],
): SpellLevelChainRelation[] {
  // Group by lowercase name + ruleset
  const groups = new Map<string, SpellRule[]>();

  for (const spell of spells) {
    const key = `${spell.name.toLowerCase()}::${spell.ruleset}`;
    const group = groups.get(key);
    if (group === undefined) {
      const newGroup: SpellRule[] = [spell];
      groups.set(key, newGroup);
    } else {
      group.push(spell);
    }
  }

  const relations: SpellLevelChainRelation[] = [];

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    // Sort by level ascending, then by ID for determinism
    group.sort((a, b) => {
      const levelDiff = a.level - b.level;
      if (levelDiff !== 0) return levelDiff;
      return a.id.localeCompare(b.id);
    });

    // Chain adjacent levels
    for (let i = 0; i < group.length - 1; i++) {
      const lower = group[i]!;
      const higher = group[i + 1]!;

      // Only link if levels are adjacent (consecutive)
      if (higher.level - lower.level === 1) {
        relations.push(Object.freeze({
          type: "level-chain",
          lowerId: lower.id,
          higherId: higher.id,
          spellName: lower.name,
          lowerLevel: lower.level,
          higherLevel: higher.level,
        }));
      }
    }
  }

  return relations;
}

/* ── School group relation builder ─────────────────────────────── */

function buildSchoolGroupRelations(
  spells: readonly SpellRule[],
): SpellSchoolGroupRelation[] {
  const schoolGroups = new Map<string, EntityId[]>();

  for (const spell of spells) {
    const group = schoolGroups.get(spell.school);
    if (group === undefined) {
      schoolGroups.set(spell.school, [spell.id]);
    } else {
      group.push(spell.id);
    }
  }

  const relations: SpellSchoolGroupRelation[] = [];

  for (const [school, ids] of schoolGroups) {
    // Sort IDs for determinism
    const sorted = [...ids].sort();
    relations.push(Object.freeze({
      type: "school-group",
      school,
      spellIds: Object.freeze(sorted),
    }));
  }

  // Sort by school name for determinism
  relations.sort((a, b) => a.school.localeCompare(b.school));

  return relations;
}

/* ── Main builder ──────────────────────────────────────────────── */

export function buildSpellRelations(
  input: SpellRelationBuilderInput,
): SpellRelationBuilderResult {
  const spells = input.spells;

  if (spells.length === 0) {
    return Object.freeze({
      relations: Object.freeze([]),
      diagnostics: Object.freeze([]),
    });
  }

  // Build lookup map: entityId -> SpellRule
  const spellMap = new Map<string, SpellRule>();
  for (const spell of spells) {
    spellMap.set(spell.id, spell);
  }

  const diagnostics: SpellRelationDiagnostic[] = [];
  // Build each relation category
  const prerequisiteRelations = buildPrerequisiteRelations(spells, spellMap, diagnostics);
  const levelChainRelations = buildLevelChainRelations(spells);
  const schoolGroupRelations = buildSchoolGroupRelations(spells);

  // Combine and sort all relations
  const allRelations: SpellRelation[] = [
    ...prerequisiteRelations,
    ...levelChainRelations,
    ...schoolGroupRelations,
  ];

  // Sort for determinism: type order, then by first ID or school
  allRelations.sort((a, b) => {
    const typeOrder = { "prerequisite": 0, "level-chain": 1, "school-group": 2 };
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;

    if (a.type === "prerequisite" && b.type === "prerequisite") {
      return a.sourceId.localeCompare(b.sourceId) || a.targetId.localeCompare(b.targetId);
    }
    if (a.type === "level-chain" && b.type === "level-chain") {
      return a.spellName.localeCompare(b.spellName) || a.lowerId.localeCompare(b.lowerId);
    }
    // Both are school-group (only remaining type)
    const sa = a as SpellSchoolGroupRelation;
    const sb = b as SpellSchoolGroupRelation;
    return sa.school.localeCompare(sb.school);
  });

  // Sort diagnostics for determinism
  diagnostics.sort((a, b) => {
    const codeDiff = a.code.localeCompare(b.code);
    if (codeDiff !== 0) return codeDiff;
    return a.spellId.localeCompare(b.spellId);
  });
  return Object.freeze({
    relations: Object.freeze(allRelations),
    diagnostics: Object.freeze(diagnostics),
  });
}

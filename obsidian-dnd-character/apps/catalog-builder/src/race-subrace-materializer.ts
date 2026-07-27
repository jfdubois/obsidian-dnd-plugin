import {
  getRecordIdentity,
  type CopyResolverContext,
} from "./copy-resolver";
import {
  cloneObject,
  cloneRecord,
  cloneUnknown,
  isPlainObject,
} from "./copy-materialization-merge";
import { materializeCopyWithMods, type CopyModRawRecord } from "./mod-copy-resolver";
import type { MaterializationDiagnostic } from "./mod-types";
import { materializeCopyLevel, type CopyLevelMaterializationResult } from "./copy-template-materializer";
import type { RawRecord } from "./raw-boundary";
import { classifySourceFileRole, type SourceFileRole } from "./source-file-role";
import {
  makeRaceSubraceDiagnostic,
  parentIdentity,
  type RaceSubraceCandidateDiagnostic,
  type RaceSubraceMaterializationDiagnostic,
} from "./race-subrace-diagnostics";

export interface MaterializedSubraceTrace {
  readonly sourceEntityKind: "subrace";
  readonly sourcePath: string;
  readonly parentRace: {
    readonly name: string;
    readonly source: string;
    readonly sourcePath: string;
    readonly identity: Record<string, unknown>;
  };
}

export type RaceSubraceMaterializationResult =
  | { readonly ok: true; readonly record: RawRecord; readonly trace: MaterializedSubraceTrace }
  | { readonly ok: false; readonly diagnostics: readonly RaceSubraceMaterializationDiagnostic[] };

interface ParentCandidate {
  readonly record: RawRecord;
  readonly sourcePath: string;
  readonly sourceRole: SourceFileRole;
}

function isCanonical(candidate: ParentCandidate): boolean {
  return candidate.sourceRole === "canonical-content";
}

function toCandidateDiagnostic(candidate: ParentCandidate): RaceSubraceCandidateDiagnostic {
  return Object.freeze({
    name: candidate.record.name,
    source: candidate.record.source,
    entityKind: "race",
    sourcePath: candidate.sourcePath,
    sourceRole: candidate.sourceRole,
    identity: getRecordIdentity(candidate.record),
  });
}

function findParentCandidates(
  context: CopyResolverContext,
  raceName: string,
  raceSource: string,
): ParentCandidate[] {
  const candidates: ParentCandidate[] = [];
  for (const [sourcePath, envelope] of Object.entries(context.validatedFiles)) {
    const envelopeRole = envelope.sourceRole ?? classifySourceFileRole(sourcePath).role;
    for (const collection of envelope.collections) {
      if (collection.entityKind !== "race") continue;
      const sourceRole = collection.sourceRole ?? envelopeRole;
      for (const record of collection.records) {
        if (record.name === raceName && record.source === raceSource) {
          candidates.push({ record, sourcePath, sourceRole });
        }
      }
    }
  }
  return candidates;
}

function materializeRecordCopyIfNeeded(
  record: RawRecord,
  context: CopyResolverContext,
  sourcePath: string,
  sourceEntityKind: "race" | "subrace",
): { ok: true; record: CopyModRawRecord } | { ok: false; diagnostics: readonly MaterializationDiagnostic[] } {
  if (record.remaining._copy === undefined) return { ok: true, record: cloneRecord(record) };
  const resolved = materializeCopyWithMods(record, context, { sourcePath, sourceEntityKind });
  if (!resolved.ok) return { ok: false, diagnostics: resolved.diagnostics };
  return { ok: true, record: resolved.result.record };
}

function getSubraceParentFields(subrace: RawRecord): { raceName: string; raceSource: string } | null {
  const raceName = subrace.remaining.raceName;
  const raceSource = subrace.remaining.raceSource;
  if (typeof raceName !== "string" || raceName === "") return null;
  if (typeof raceSource !== "string" || raceSource === "") return null;
  return { raceName, raceSource };
}

function getSubraceName(raceName: string, subraceName: string): string {
  if (!subraceName) return raceName;
  const match = /^(.*?)(\(.*?\))$/i.exec(raceName);
  if (!match) return `${raceName} (${subraceName})`;
  const bracketPart = match[2]!.substring(1, match[2]!.length - 1);
  return `${match[1]}(${[bracketPart, subraceName].join("; ")})`;
}

function mergeAbility(parent: Record<string, unknown>, subrace: Record<string, unknown>): void {
  const ability = subrace.ability;
  if (!Array.isArray(ability)) return;
  const overwrite = isPlainObject(subrace.overwrite) && subrace.overwrite.ability === true;
  if (overwrite || !Array.isArray(parent.ability)) parent.ability = ability.map(() => ({}));
  if (!Array.isArray(parent.ability) || parent.ability.length !== ability.length) {
    throw new Error(`"race" and "subrace" ability array lengths did not match!`);
  }
  ability.forEach((item, index) => {
    if (!isPlainObject(item) || !isPlainObject((parent.ability as unknown[])[index])) return;
    Object.assign((parent.ability as Record<string, unknown>[])[index]!, cloneObject(item));
  });
  delete subrace.ability;
}

function mergeEntries(parent: Record<string, unknown>, subrace: Record<string, unknown>): void {
  if (!Array.isArray(subrace.entries)) return;
  if (!Array.isArray(parent.entries)) parent.entries = [];
  for (const entry of subrace.entries) {
    const entryData = isPlainObject(entry) && isPlainObject(entry.data) ? entry.data : null;
    const overwriteName = entryData?.overwrite;
    if (!isPlainObject(entry) || typeof overwriteName !== "string") {
      (parent.entries as unknown[]).push(cloneUnknown(entry));
      continue;
    }
    const index = (parent.entries as unknown[]).findIndex((it) =>
        isPlainObject(it)
        && typeof it.name === "string"
        && it.name.toLowerCase().trim() === overwriteName.toLowerCase().trim(),
    );
    if (index >= 0) (parent.entries as unknown[])[index] = cloneUnknown(entry);
    else (parent.entries as unknown[]).push(cloneUnknown(entry));
  }
  delete subrace.entries;
}

function mergeConcatenatedArray(parent: Record<string, unknown>, subrace: Record<string, unknown>, key: string): void {
  const value = subrace[key];
  if (!Array.isArray(value)) return;
  const overwrite = isPlainObject(subrace.overwrite) && subrace.overwrite[key] === true;
  parent[key] = overwrite || !Array.isArray(parent[key])
    ? cloneUnknown(value)
    : [...(parent[key] as unknown[]).map(cloneUnknown), ...value.map(cloneUnknown)];
  delete subrace[key];
}

function mergeSkillProficiencies(parent: Record<string, unknown>, subrace: Record<string, unknown>): void {
  const value = subrace.skillProficiencies;
  if (!Array.isArray(value)) return;
  const overwrite = isPlainObject(subrace.overwrite) && subrace.overwrite.skillProficiencies === true;
  if (!Array.isArray(parent.skillProficiencies) || overwrite) parent.skillProficiencies = cloneUnknown(value);
  else {
    if (value.length === 0 || parent.skillProficiencies.length === 0) throw new Error("No items!");
    if (value.length > 1 || parent.skillProficiencies.length > 1) throw new Error(`Merging "subrace" does not handle choices!`);
    if (!isPlainObject(value[0]) || !isPlainObject(parent.skillProficiencies[0])) return;
    Object.assign(parent.skillProficiencies[0], cloneObject(value[0]));
  }
  delete subrace.skillProficiencies;
}

function mergeParentAndSubrace(parentRace: RawRecord, subrace: RawRecord): RawRecord {
  const parent = cloneObject(parentRace.remaining);
  const sub = cloneObject(subrace.remaining);
  parent._baseName = parentRace.name;
  parent._baseSource = parentRace.source;
  for (const key of ["subraces", "srd", "srd52", "basicRules", "basicRules2024", "_versions", "hasFluff", "hasFluffImages", "reprintedAs"]) {
    delete parent[key];
  }
  if (subrace.name) {
    parent._subraceName = subrace.name;
    delete sub.name;
  }
  mergeAbility(parent, sub);
  mergeEntries(parent, sub);
  mergeConcatenatedArray(parent, sub, "traitTags");
  mergeConcatenatedArray(parent, sub, "languageProficiencies");
  mergeSkillProficiencies(parent, sub);
  Object.assign(parent, sub);
  parent.raceName = sub.raceName;
  parent.raceSource = sub.raceSource;
  for (const [key, value] of Object.entries(parent)) {
    if (value == null) delete parent[key];
  }
  for (const key of ["_versions", "_abstract", "_implementations", "_variables", "_mod", "_preserve", "_templates"]) {
    delete parent[key];
  }
  return { name: getSubraceName(parentRace.name, subrace.name), source: subrace.source, remaining: parent };
}

export function materializeSubraceVersionRecord(
  base: CopyModRawRecord,
  version: CopyModRawRecord,
  context: CopyResolverContext,
  sourcePath: string,
): CopyLevelMaterializationResult {
  return materializeCopyLevel(base, version, {
    resolverContext: context,
    sourcePath,
    sourceEntityKind: "subrace",
  });
}

export function materializeSubraceWithParent(
  subrace: RawRecord,
  context: CopyResolverContext,
  sourcePath: string,
): RaceSubraceMaterializationResult {
  let matSubrace: { ok: true; record: CopyModRawRecord } | { ok: false; diagnostics: readonly MaterializationDiagnostic[] } | undefined;
  let parentFields = getSubraceParentFields(subrace);
  if (!parentFields && subrace.remaining._copy !== undefined) {
    matSubrace = materializeRecordCopyIfNeeded(subrace, context, sourcePath, "subrace");
    if (!matSubrace.ok) return { ok: false, diagnostics: [makeRaceSubraceDiagnostic({
      code: "SUBRACE_COPY_MATERIALIZATION_FAILURE", message: `Failed to materialize subrace _copy`, sourcePath,
      recordName: subrace.name, recordSource: subrace.source,
      materializationCode: matSubrace.diagnostics[0]?.code, fieldTarget: matSubrace.diagnostics[0]?.fieldTarget,
      mode: matSubrace.diagnostics[0]?.mode, rawPayload: matSubrace.diagnostics[0]?.rawParam,
      inheritanceChain: matSubrace.diagnostics[0]?.inheritanceChain, underlyingDiagnostics: matSubrace.diagnostics,
    })] };
    parentFields = getSubraceParentFields(matSubrace.record);
  }
  if (!parentFields) {
    return { ok: false, diagnostics: [makeRaceSubraceDiagnostic({
      code: "MALFORMED_PARENT_DISCRIMINATOR",
      message: `Subrace "${subrace.name}" (${subrace.source}) is missing string raceName/raceSource parent discriminator fields`,
      sourcePath,
      recordName: subrace.name,
      recordSource: subrace.source,
      requestedIdentity: getRecordIdentity(subrace),
    })] };
  }
  const requestedIdentity = parentIdentity(parentFields.raceName, parentFields.raceSource);
  const allCandidates = findParentCandidates(context, parentFields.raceName, parentFields.raceSource);
  const eligible = allCandidates.filter(isCanonical);
  const ineligible = allCandidates.filter((candidate) => !isCanonical(candidate)).map(toCandidateDiagnostic);
  if (eligible.length === 0 || eligible.length > 1) {
    return { ok: false, diagnostics: [makeRaceSubraceDiagnostic({
      code: eligible.length === 0 ? "PARENT_RACE_NOT_FOUND" : "PARENT_RACE_AMBIGUOUS",
      message: eligible.length === 0
        ? `No eligible canonical parent race found for "${subrace.name}" (${subrace.source})`
        : `Multiple eligible canonical parent races found for "${subrace.name}" (${subrace.source})`,
      sourcePath,
      recordName: subrace.name,
      recordSource: subrace.source,
      raceName: parentFields.raceName,
      raceSource: parentFields.raceSource,
      requestedIdentity,
      candidates: eligible.map(toCandidateDiagnostic),
      ineligibleCandidates: ineligible,
    })] };
  }
  const parent = eligible[0]!;
  const matParent = materializeRecordCopyIfNeeded(parent.record, context, parent.sourcePath, "race");
  if (!matParent.ok) return { ok: false, diagnostics: [makeRaceSubraceDiagnostic({
    code: "PARENT_COPY_MATERIALIZATION_FAILURE", message: `Failed to materialize parent race _copy`, sourcePath,
    parentSourcePath: parent.sourcePath, recordName: subrace.name, recordSource: subrace.source,
    raceName: parentFields.raceName, raceSource: parentFields.raceSource, requestedIdentity,
    materializationCode: matParent.diagnostics[0]?.code, fieldTarget: matParent.diagnostics[0]?.fieldTarget,
    mode: matParent.diagnostics[0]?.mode, rawPayload: matParent.diagnostics[0]?.rawParam,
    inheritanceChain: matParent.diagnostics[0]?.inheritanceChain, underlyingDiagnostics: matParent.diagnostics,
  })] };
  matSubrace ??= materializeRecordCopyIfNeeded(subrace, context, sourcePath, "subrace");
  if (!matSubrace.ok) return { ok: false, diagnostics: [makeRaceSubraceDiagnostic({
    code: "SUBRACE_COPY_MATERIALIZATION_FAILURE", message: `Failed to materialize subrace _copy`, sourcePath,
    parentSourcePath: parent.sourcePath, recordName: subrace.name, recordSource: subrace.source,
    raceName: parentFields.raceName, raceSource: parentFields.raceSource, requestedIdentity,
    materializationCode: matSubrace.diagnostics[0]?.code, fieldTarget: matSubrace.diagnostics[0]?.fieldTarget,
    mode: matSubrace.diagnostics[0]?.mode, rawPayload: matSubrace.diagnostics[0]?.rawParam,
    inheritanceChain: matSubrace.diagnostics[0]?.inheritanceChain, underlyingDiagnostics: matSubrace.diagnostics,
  })] };
  try {
    const record = mergeParentAndSubrace(matParent.record, matSubrace.record);
    return { ok: true, record, trace: { sourceEntityKind: "subrace", sourcePath, parentRace: {
      name: parent.record.name, source: parent.record.source, sourcePath: parent.sourcePath, identity: getRecordIdentity(parent.record),
    } } };
  } catch (error) {
    return { ok: false, diagnostics: [makeRaceSubraceDiagnostic({
      code: "PARENT_SUBRACE_MERGE_FAILURE", message: error instanceof Error ? error.message : String(error), sourcePath,
      parentSourcePath: parent.sourcePath, recordName: subrace.name, recordSource: subrace.source,
      raceName: parentFields.raceName, raceSource: parentFields.raceSource, requestedIdentity,
    })] };
  }
}

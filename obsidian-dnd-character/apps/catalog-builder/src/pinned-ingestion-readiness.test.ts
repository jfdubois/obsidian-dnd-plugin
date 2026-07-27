import { describe, expect, it } from "vitest";
import {
  extractStructuredIdentity,
  isCopyResolutionSuccess,
  resolveCopy,
  type CopyResolverContext,
  type RawCopyValue,
} from "./copy-resolver";
import { validatePreservePayload } from "./copy-preserve-policy";
import { loadRawJsonFiles } from "./raw-loader";
import { validateRawBoundary, type RawRecord, type ValidatedFileEnvelope } from "./raw-boundary";
import { readSourceManifest } from "./source-manifest";
import { KNOWN_MOD_MODES_SET } from "./mod-types";
import { materializeCopyWithMods } from "./mod-copy-resolver";
import { expandVersions } from "./versions-expander";
import { pinnedFiveEToolsPath, pinnedFiveEToolsRevision } from "./test-pinned-source-path";

const PINNED_COMMIT = pinnedFiveEToolsRevision();
const CONSUMED_DIRECTIVES = [
  "_copy",
  "_mod",
  "_preserve",
  "_templates",
  "_versions",
  "_abstract",
  "_implementations",
  "_variables",
] as const;

interface LocatedRecord {
  readonly record: RawRecord;
  readonly entityKind: string;
  readonly sourcePath: string;
}

interface Inventory {
  readonly files: number;
  readonly collections: number;
  readonly records: number;
  readonly copies: number;
  readonly copyShapes: Readonly<Record<string, number>>;
  readonly nestedCopyChains: number;
  readonly preservePayloads: number;
  readonly preserveMarkerTypes: Readonly<Record<string, number>>;
  readonly recordsWithVersions: number;
  readonly versionEntries: number;
  readonly abstractBundles: number;
  readonly abstractImplementations: number;
  readonly copyTemplateReferences: number;
  readonly versionTemplateReferences: number;
  readonly monsterTemplateRecords: number;
  readonly legendaryGroupTemplateRecords: number;
  readonly copiedTemplateRecords: number;
  readonly modModes: readonly string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function loadContext(): {
  readonly context: CopyResolverContext;
  readonly loadedFileCount: number;
  readonly records: readonly LocatedRecord[];
} {
  const loaded = loadRawJsonFiles(pinnedFiveEToolsPath());
  expect(loaded.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  const boundary = validateRawBoundary(loaded.files);
  expect(Object.keys(boundary.validatedFiles).length).toBeGreaterThan(0);
  return {
    context: { validatedFiles: boundary.validatedFiles },
    loadedFileCount: loaded.summary.totalFound,
    records: flattenRecords(boundary.validatedFiles),
  };
}

function flattenRecords(files: Record<string, ValidatedFileEnvelope>): LocatedRecord[] {
  const records: LocatedRecord[] = [];
  for (const [sourcePath, envelope] of Object.entries(files)) {
    for (const collection of envelope.collections) {
      for (const record of collection.records) {
        records.push({ record, entityKind: collection.entityKind, sourcePath });
      }
    }
  }
  return records;
}

function copyValue(record: RawRecord): RawCopyValue | undefined {
  const raw = record.remaining._copy;
  return isPlainObject(raw) && typeof raw.source === "string"
    ? raw as RawCopyValue
    : undefined;
}

function identityShape(copy: RawCopyValue): string {
  return Object.keys(copy).filter((key) => !key.startsWith("_")).sort().join("+");
}

function markerType(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function collectModModes(value: unknown, modes: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectModModes(item, modes);
    return;
  }
  if (!isPlainObject(value)) return;
  if (typeof value.mode === "string") modes.add(value.mode);
  for (const nested of Object.values(value)) collectModModes(nested, modes);
}

function collectInventory(loadedFileCount: number, records: readonly LocatedRecord[]): Inventory {
  const copyShapes = new Map<string, number>();
  const markerTypes = new Map<string, number>();
  const modes = new Set<string>();
  const byIdentity = new Map<string, LocatedRecord[]>();
  let copies = 0;
  let preservePayloads = 0;
  let recordsWithVersions = 0;
  let versionEntries = 0;
  let abstractBundles = 0;
  let abstractImplementations = 0;
  let copyTemplateReferences = 0;
  let versionTemplateReferences = 0;
  let monsterTemplateRecords = 0;
  let legendaryGroupTemplateRecords = 0;
  let copiedTemplateRecords = 0;

  for (const located of records) {
    const key = `${located.entityKind}|${located.record.name}|${located.record.source}`;
    const existing = byIdentity.get(key) ?? [];
    existing.push(located);
    byIdentity.set(key, existing);
    if (located.entityKind === "monsterTemplate") monsterTemplateRecords += 1;
    if (located.entityKind === "legendaryGroupTemplate") legendaryGroupTemplateRecords += 1;
  }

  const collectionKeys = new Set(records.map((record) => `${record.sourcePath}|${record.entityKind}`));
  const collections = collectionKeys.size;

  let nestedCopyChains = 0;
  for (const { record, entityKind } of records) {
    const copy = copyValue(record);
    if (copy !== undefined) {
      copies += 1;
      copyShapes.set(identityShape(copy), (copyShapes.get(identityShape(copy)) ?? 0) + 1);
      if (copy._preserve !== undefined) {
        preservePayloads += 1;
        const type = markerType(copy._preserve);
        markerTypes.set(type, (markerTypes.get(type) ?? 0) + 1);
      }
      if (copy._templates !== undefined) copyTemplateReferences += 1;
      if (copy._mod !== undefined) collectModModes(copy._mod, modes);
      if (entityKind === "monsterTemplate" || entityKind === "legendaryGroupTemplate") copiedTemplateRecords += 1;
      const directKey = `${entityKind}|${String(copy.name)}|${copy.source}`;
      if ((byIdentity.get(directKey) ?? []).some((candidate) => copyValue(candidate.record) !== undefined)) {
        nestedCopyChains += 1;
      }
    }

    const versions = record.remaining._versions;
    if (!Array.isArray(versions)) continue;
    recordsWithVersions += 1;
    versionEntries += versions.length;
    for (const version of versions) {
      if (!isPlainObject(version)) continue;
      if (version._templates !== undefined) versionTemplateReferences += 1;
      if (version._mod !== undefined) collectModModes(version._mod, modes);
      if (isPlainObject(version._abstract)) {
        abstractBundles += 1;
        if (version._abstract._templates !== undefined) versionTemplateReferences += 1;
        if (version._abstract._mod !== undefined) collectModModes(version._abstract._mod, modes);
      }
      if (Array.isArray(version._implementations)) {
        abstractImplementations += version._implementations.length;
        for (const implementation of version._implementations) {
          if (isPlainObject(implementation) && implementation._mod !== undefined) {
            collectModModes(implementation._mod, modes);
          }
        }
      }
    }
  }

  return {
    files: loadedFileCount,
    collections,
    records: records.length,
    copies,
    copyShapes: Object.freeze(Object.fromEntries([...copyShapes].sort())),
    nestedCopyChains,
    preservePayloads,
    preserveMarkerTypes: Object.freeze(Object.fromEntries([...markerTypes].sort())),
    recordsWithVersions,
    versionEntries,
    abstractBundles,
    abstractImplementations,
    copyTemplateReferences,
    versionTemplateReferences,
    monsterTemplateRecords,
    legendaryGroupTemplateRecords,
    copiedTemplateRecords,
    modModes: Object.freeze([...modes].sort()),
  };
}

function findRecord(records: readonly LocatedRecord[], entityKind: string, sourcePath: string, name: string, source: string): LocatedRecord {
  const found = records.find((located) =>
    located.entityKind === entityKind
    && located.sourcePath === sourcePath
    && located.record.name === name
    && located.record.source === source);
  if (found === undefined) throw new Error(`Missing representative ${entityKind}:${name}|${source} at ${sourcePath}`);
  return found;
}

function findCopyRecord(records: readonly LocatedRecord[], entityKind: string, sourcePath: string, name: string, source: string): LocatedRecord {
  const found = records.find((located) =>
    located.entityKind === entityKind
    && located.sourcePath === sourcePath
    && located.record.name === name
    && located.record.source === source
    && copyValue(located.record) !== undefined);
  if (found === undefined) throw new Error(`Missing copy representative ${entityKind}:${name}|${source} at ${sourcePath}`);
  return found;
}

function findCollection(
  envelope: ValidatedFileEnvelope | undefined,
  entityKind: string,
): ValidatedFileEnvelope["collections"][number] {
  const collection = envelope?.collections.find((candidate) => candidate.entityKind === entityKind);
  if (collection === undefined) throw new Error(`Missing collection ${entityKind}`);
  return collection;
}

function expectResolved(
  context: CopyResolverContext,
  located: LocatedRecord,
  expected: {
    readonly firstName: string;
    readonly firstSource: string;
    readonly terminalName: string;
    readonly terminalSource: string;
    readonly terminalKind: string;
    readonly terminalPath: string;
  },
): void {
  const before = clone(located.record);
  const result = resolveCopy(located.record, context, {
    sourceEntityKind: located.entityKind,
    sourcePath: located.sourcePath,
  });
  if (!isCopyResolutionSuccess(result)) {
    throw new Error(JSON.stringify(result.diagnostic, null, 2));
  }
  expect(result.chain[0]).toMatchObject({
    entityName: expected.firstName,
    sourceAbbr: expected.firstSource,
  });
  expect(result.baseEntity.name).toBe(expected.terminalName);
  expect(result.baseEntity.source).toBe(expected.terminalSource);
  const terminalLevel = result.locatedLevels[result.locatedLevels.length - 1];
  expect(terminalLevel).toMatchObject({
    entityKind: expected.terminalKind,
    sourcePath: expected.terminalPath,
  });
  const copy = copyValue(located.record);
  expect(copy).toBeDefined();
  if (copy === undefined) throw new Error("Expected _copy");
  expect(result.chain[0]?.identity).toEqual(extractStructuredIdentity(copy));
  expect(clone(located.record)).toEqual(before);
}

function expectNoConsumedDirectives(record: RawRecord): void {
  for (const directive of CONSUMED_DIRECTIVES) {
    expect(record.remaining).not.toHaveProperty(directive);
  }
}

describe("pinned 5eTools ingestion readiness", () => {
  it("verifies the pinned source revision and clean inspection worktree", () => {
    const manifest = readSourceManifest(pinnedFiveEToolsPath());
    expect(manifest.commitHash).toBe(PINNED_COMMIT);
  });

  it("reconfirms the pinned directive inventory", () => {
    const { loadedFileCount, records } = loadContext();
    const inventory = collectInventory(loadedFileCount, records);
    expect(inventory).toEqual({
      files: 502,
      collections: 404,
      records: 25672,
      copies: 2801,
      copyShapes: {
        "abbreviation+source": 2,
        "className+classSource+level+name+source+subclassShortName+subclassSource": 75,
        "className+classSource+name+shortName+source": 146,
        "name+pantheon+source": 6,
        "name+raceName+raceSource+source": 3,
        "name+source": 2569,
      },
      nestedCopyChains: 317,
      preservePayloads: 259,
      preserveMarkerTypes: { object: 259 },
      recordsWithVersions: 127,
      versionEntries: 359,
      abstractBundles: 7,
      abstractImplementations: 50,
      copyTemplateReferences: 187,
      versionTemplateReferences: 21,
      monsterTemplateRecords: 66,
      legendaryGroupTemplateRecords: 1,
      copiedTemplateRecords: 3,
      modModes: [
        "addSkills",
        "addSpells",
        "appendArr",
        "appendIfNotExistsArr",
        "insertArr",
        "prependArr",
        "removeArr",
        "removeSpells",
        "renameArr",
        "replaceArr",
        "replaceSpells",
        "replaceTxt",
        "setProp",
      ],
    });
  });

  it("resolves representative pinned copy identities without fallback", () => {
    const { context, records } = loadContext();
    const cases = [
      [findCopyRecord(records, "background", "backgrounds.json", "Augen Trust (Spy)", "EGW"), "Variant Criminal (Spy)", "PHB", "Criminal", "PHB", "background", "backgrounds.json"],
      [findCopyRecord(records, "subrace", "races.json", "Amonkhet", "PSA"), "Variant", "PHB", "Variant", "PHB", "subrace", "races.json"],
      [findCopyRecord(records, "subclass", "class/class-artificer.json", "Alchemist", "TCE"), "Alchemist", "TCE", "Alchemist", "TCE", "subclass", "class/class-artificer.json"],
      [findCopyRecord(records, "subclassFeature", "class/class-cleric.json", "Channel Divinity: Touch of Death", "DMG"), "Channel Divinity: Touch of Death", "DMG", "Channel Divinity: Touch of Death", "DMG", "subclassFeature", "class/class-cleric.json"],
      [findCopyRecord(records, "deity", "deities.json", "Bahgtru", "VGM"), "Bahgtru", "SCAG", "Bahgtru", "SCAG", "deity", "deities.json"],
      [findCopyRecord(records, "monster", "bestiary/bestiary-bgdia.json", "Archduke Zariel of Avernus", "BGDIA"), "Zariel", "MTF", "Zariel", "MTF", "monster", "bestiary/bestiary-mtf.json"],
      [findCopyRecord(records, "background", "backgrounds.json", "Augen Trust (Spy)", "EGW"), "Variant Criminal (Spy)", "PHB", "Criminal", "PHB", "background", "backgrounds.json"],
      [findCopyRecord(records, "monster", "bestiary/bestiary-bgdia.json", "Sylvira Savikas", "BGDIA"), "Archmage", "MM", "Archmage", "MM", "monster", "bestiary/bestiary-mm.json"],
      [findCopyRecord(records, "monsterTemplate", "bestiary/template.json", "Hill Dwarf", "PHB"), "Mountain Dwarf", "PHB", "Mountain Dwarf", "PHB", "monsterTemplate", "bestiary/template.json"],
    ] as const;

    for (const [located, firstName, firstSource, terminalName, terminalSource, terminalKind, terminalPath] of cases) {
      expectResolved(context, located, { firstName, firstSource, terminalName, terminalSource, terminalKind, terminalPath });
    }
  });

  it("resolves abbreviation-based vehicle copies to the selected base record", () => {
    const { context, records } = loadContext();
    const derived = findCopyRecord(records, "itemType", "items-base.json", "Vehicle (Air)", "DMG");
    const selectedBase = findRecord(records, "itemType", "items-base.json", "Vehicle (Water)", "DMG");
    const derivedBefore = clone(derived.record);
    const selectedBaseBefore = clone(selectedBase.record);
    const copy = copyValue(derived.record);
    expect(copy).toBeDefined();
    if (copy === undefined) throw new Error("Expected _copy");
    const requestedIdentity = extractStructuredIdentity(copy);

    const resolved = resolveCopy(derived.record, context, {
      sourceEntityKind: derived.entityKind,
      sourcePath: derived.sourcePath,
    });
    if (!isCopyResolutionSuccess(resolved)) {
      throw new Error(JSON.stringify(resolved.diagnostic, null, 2));
    }

    expect(requestedIdentity).toEqual({ abbreviation: "SHP", source: "DMG" });
    expect(resolved.chain).toHaveLength(1);
    expect(resolved.chain[0]).toEqual({
      entityName: "Vehicle (Water)",
      sourceAbbr: "DMG",
      entityKind: "itemType",
      sourcePath: "items-base.json",
      identity: requestedIdentity,
    });
    expect(resolved.baseEntity).toBe(selectedBase.record);
    expect(resolved.baseEntity.name).toBe("Vehicle (Water)");
    expect(resolved.baseEntity.source).toBe("DMG");
    expect(resolved.baseEntity.remaining.abbreviation).toBe("SHP");
    expect(resolved.baseEntity.name).not.toBe(derived.record.name);
    const terminalLevel = resolved.locatedLevels[resolved.locatedLevels.length - 1];
    expect(terminalLevel).toMatchObject({
      record: selectedBase.record,
      entityKind: "itemType",
      sourcePath: "items-base.json",
      identity: requestedIdentity,
    });

    const materialized = materializeCopyWithMods(derived.record, context, {
      sourceEntityKind: derived.entityKind,
      sourcePath: derived.sourcePath,
    });
    expect(materialized.ok).toBe(true);
    if (!materialized.ok) throw new Error(materialized.diagnostics.map((diagnostic) => diagnostic.message).join("\n"));
    expect(materialized.result.identity.discriminators).toEqual({ abbreviation: "SHP", source: "DMG" });
    expect(materialized.result.terminalBase).toEqual({
      name: "Vehicle (Water)",
      source: "DMG",
      entityKind: "itemType",
      sourcePath: "items-base.json",
      identity: requestedIdentity,
    });
    expectNoConsumedDirectives(materialized.result.record);
    expect(clone(derived.record)).toEqual(derivedBefore);
    expect(clone(selectedBase.record)).toEqual(selectedBaseBefore);
  });

  it("validates every pinned _copy._preserve payload and observed _mod mode", () => {
    const { records } = loadContext();
    const modes = new Set<string>();
    for (const { record, entityKind } of records) {
      const copy = copyValue(record);
      if (copy === undefined) continue;
      if (copy._preserve !== undefined) {
        const result = validatePreservePayload(copy._preserve, entityKind);
        expect(result.valid, `${entityKind}:${record.name}|${record.source}`).toBe(true);
      }
      if (copy._mod !== undefined) collectModModes(copy._mod, modes);
    }
    expect([...modes].sort()).toEqual([...modes].filter((mode) => KNOWN_MOD_MODES_SET.has(mode)).sort());
  });

  it("materializes representative pinned outputs and consumes builder directives", () => {
    const { context, records } = loadContext();
    const representatives = [
      findRecord(records, "background", "backgrounds.json", "Augen Trust (Spy)", "EGW"),
      findRecord(records, "monster", "bestiary/bestiary-bgdia.json", "Sylvira Savikas", "BGDIA"),
      findRecord(records, "monster", "bestiary/bestiary-bgdia.json", "Archduke Zariel of Avernus", "BGDIA"),
    ];

    for (const located of representatives) {
      const before = clone(located.record);
      const result = materializeCopyWithMods(located.record, context, {
        sourceEntityKind: located.entityKind,
        sourcePath: located.sourcePath,
      });
      expect(result.ok, `${located.entityKind}:${located.record.name}|${located.record.source}`).toBe(true);
      if (!result.ok) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n"));
      expect(result.result.record.name).toBe(located.record.name);
      expect(result.result.record.source).toBe(located.record.source);
      expect(result.result.identity.sourcePath).toBe(located.sourcePath);
      expect(result.result.identity.entityKind).toBe(located.entityKind);
      expect(result.result.inheritanceChain.length).toBeGreaterThan(0);
      expectNoConsumedDirectives(result.result.record);
      expect(clone(located.record)).toEqual(before);
    }
  });

  it("expands P4-T005 pinned versions and representative abstract/template versions without diagnostics", () => {
    const { context } = loadContext();
    const selectedFiles = {
      "races.json": context.validatedFiles["races.json"]!,
      "bestiary/bestiary-bmt.json": context.validatedFiles["bestiary/bestiary-bmt.json"]!,
      "bestiary/bestiary-xphb.json": context.validatedFiles["bestiary/bestiary-xphb.json"]!,
      "bestiary/legendarygroups.json": context.validatedFiles["bestiary/legendarygroups.json"]!,
      "bestiary/template.json": context.validatedFiles["bestiary/template.json"]!,
    };
    const before = clone(selectedFiles);
    const result = expandVersions(selectedFiles);
    expect(
      result.ok,
      JSON.stringify(result.diagnostics.slice(0, 10), null, 2),
    ).toBe(true);
    expect(result.diagnostics).toEqual([]);
    const sourceBmtMonsters = findCollection(selectedFiles["bestiary/bestiary-bmt.json"], "monster");
    const bmtVersionEntries = sourceBmtMonsters.records.reduce((sum, record) => {
      const versions = record.remaining._versions;
      return sum + (Array.isArray(versions) ? versions.length : 0);
    }, 0);
    const expandedBmtMonsters = findCollection(result.validatedFiles["bestiary/bestiary-bmt.json"], "monster");
    expect(expandedBmtMonsters.recordCount).toBe(sourceBmtMonsters.recordCount + bmtVersionEntries);
    expect(expandedBmtMonsters.recordCount).toBe(43);
    expect(findCollection(result.validatedFiles["bestiary/bestiary-xphb.json"], "monster").records.some((record) => record.name === "Draconic Spirit (Acid)")).toBe(true);
    const sourceLegendaryGroups = findCollection(selectedFiles["bestiary/legendarygroups.json"], "legendaryGroup");
    const amethystDragon = sourceLegendaryGroups.records.find((record) =>
      record.name === "Amethyst Dragon"
      && record.source === "FTD");
    expect(amethystDragon).toBeDefined();
    if (amethystDragon === undefined) throw new Error("Missing Amethyst Dragon|FTD legendary group");
    const amethystDragonBefore = clone(amethystDragon);
    const shadowAmethystVersion = materializeCopyWithMods({
      name: "Shadow Dragon (Amethyst Dragon)",
      source: "FTD",
      remaining: {
        _copy: {
          name: "Amethyst Dragon",
          source: "FTD",
          _preserve: { "*": true },
          _templates: [{ name: "Shadow Dragon", source: "FTD" }],
        },
      },
    }, context, {
      sourceEntityKind: "legendaryGroup",
      sourcePath: "bestiary/legendarygroups.json",
    });
    expect(shadowAmethystVersion.ok).toBe(true);
    if (!shadowAmethystVersion.ok) throw new Error(shadowAmethystVersion.diagnostics.map((diagnostic) => diagnostic.message).join("\n"));
    expect(shadowAmethystVersion.result.metadata.appliedTemplates).toEqual([
      {
        name: "Shadow Dragon",
        source: "FTD",
        entityKind: "legendaryGroupTemplate",
        sourcePath: "bestiary/template.json",
      },
    ]);
    expect(shadowAmethystVersion.result.metadata.appliedTemplates).toHaveLength(1);
    expect(clone(amethystDragon)).toEqual(amethystDragonBefore);
    const expandedLegendaryGroups = findCollection(result.validatedFiles["bestiary/legendarygroups.json"], "legendaryGroup");
    const expandedShadowAmethyst = expandedLegendaryGroups.records.find((record) =>
      record.name === "Shadow Dragon (Amethyst Dragon)"
      && record.source === "FTD");
    expect(expandedShadowAmethyst).toBeDefined();
    if (expandedShadowAmethyst === undefined) throw new Error("Missing expanded Shadow Dragon (Amethyst Dragon)|FTD legendary group");
    expect(expandedLegendaryGroups.records).toContain(expandedShadowAmethyst);
    expect(expandedShadowAmethyst.name).toBe("Shadow Dragon (Amethyst Dragon)");
    expect(expandedShadowAmethyst.source).toBe("FTD");
    expectNoConsumedDirectives(expandedShadowAmethyst);
    expect(clone(selectedFiles)).toEqual(before);
  });
});

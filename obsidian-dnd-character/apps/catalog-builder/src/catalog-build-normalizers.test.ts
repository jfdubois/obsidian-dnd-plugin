import { describe, it, expect } from "vitest";
import { normalizeCopyModKind } from "./catalog-build-normalizers";
import { resolveCopyWithMods } from "./mod-copy-resolver";
import { toCopyModRecord } from "./catalog-build-helpers";
import type { ValidatedFileEnvelope, RawRecord, ValidatedCollection } from "./raw-boundary";

/* ── Fixtures ──────────────────────────────────────────────────── */

function makeRawRecord(name: string, source: string, remaining: Record<string, unknown> = {}): RawRecord {
  return Object.freeze({ name, source, remaining: Object.freeze({ ...remaining }) });
}

function makeCollection(records: RawRecord[], entityKind: string): ValidatedCollection {
  return {
    entityKind,
    recordCount: records.length,
    records,
    sourceRole: "canonical-content",
  };
}

function makeValidatedFiles(
  records: RawRecord[],
  entityKind: string,
  filePath = "feat.json",
): Record<string, ValidatedFileEnvelope> {
  return {
    [filePath]: {
      filePath,
      collections: [makeCollection(records, entityKind)],
      totalRecords: records.length,
      sourceRole: "canonical-content",
    },
  };
}

/* ── Direct record pass-through (no _copy) ───────────────────────
   This is the core fix: records without _copy must survive
   resolveCopiesForKind and reach the normalizer. ───────────────── */

describe("normalizeCopyModKind — direct records without _copy", () => {
  it("feat without _copy survives materialization and normalizes", () => {
    const featRecord = makeRawRecord("Tough", "PHB", {
      entries: [{ type: "paragraph", text: "Your hit point maximum increases." }],
    });

    const result = normalizeCopyModKind(
      "feat",
      [featRecord],
      makeValidatedFiles([featRecord], "feat"),
      "feat.json",
    );

    expect(result.entities.length).toBe(1);
    expect(result.entities[0]).toMatchObject({
      kind: "feat",
      name: "Tough",
    });
    expect(result.diagnostics.length).toBe(0);
  });

  it("spell without _copy survives materialization and normalizes", () => {
    const spellRecord = makeRawRecord("Fireball", "PHB", {
      entries: [],
      school: "E",
      level: 3,
      time: [{ number: 1, unit: "action" }],
      range: { type: "point", distance: { type: "feet", amount: 150 } },
      duration: [{ type: "instant" }],
      meta: {},
    });

    const result = normalizeCopyModKind(
      "spell",
      [spellRecord],
      makeValidatedFiles([spellRecord], "spell"),
      "spell.json",
    );

    expect(result.entities.length).toBe(1);
    expect(result.entities[0]).toMatchObject({
      kind: "spell",
      name: "Fireball",
    });
    expect(result.diagnostics.length).toBe(0);
  });

  it("item without _copy survives materialization and normalizes", () => {
    const itemRecord = makeRawRecord("Dagger", "PHB", {
      entries: [],
      category: "weapon",
      type: "simple melee",
    });

    const result = normalizeCopyModKind(
      "item",
      [itemRecord],
      makeValidatedFiles([itemRecord], "item"),
      "item.json",
    );

    expect(result.entities.length).toBe(1);
    expect(result.entities[0]).toMatchObject({
      kind: "item",
      name: "Dagger",
    });
    expect(result.diagnostics.length).toBe(0);
  });

  it("multiple direct records all survive materialization", () => {
    const records = [
      makeRawRecord("Tough", "PHB", { entries: [] }),
      makeRawRecord("Observant", "PHB", { entries: [] }),
      makeRawRecord("Keen Mind", "PHB", { entries: [] }),
    ];

    const result = normalizeCopyModKind(
      "feat",
      records,
      makeValidatedFiles(records, "feat"),
      "feat.json",
    );

    expect(result.entities.length).toBe(3);
    expect(result.diagnostics.length).toBe(0);
  });
});

/* ── Copy+mod records still work ─────────────────────────────────
   Records with _copy must still resolve through the copy pipeline.
   We test via resolveCopyWithMods directly since normalizeCopyModKind
   doesn't propagate copy-resolution diagnostics. ──────────────────── */

describe("resolveCopyWithMods — copy+mod records", () => {
  it("record with valid _copy resolves successfully", () => {
    const baseFeat = makeRawRecord("Tough", "PHB", {
      entries: [{ type: "paragraph", text: "Base text." }],
    });

    const derivedFeat = makeRawRecord("Tough Variant", "TST", {
      _copy: { name: "Tough", source: "PHB" },
      entries: [{ type: "paragraph", text: "Variant text." }],
    });

    const validatedFiles = makeValidatedFiles([baseFeat, derivedFeat], "feat");

    const copyModRecord = toCopyModRecord(derivedFeat);
    const resolution = resolveCopyWithMods(
      copyModRecord,
      { validatedFiles },
      { sourcePath: "feat.json", sourceEntityKind: "feat" },
    );

    expect(resolution.ok).toBe(true);
    if (resolution.ok) {
      expect(resolution.record.name).toBe("Tough Variant");
    }
  });
});

describe("resolveCopyWithMods — malformed _copy", () => {
  it("malformed _copy fails with diagnostics", () => {
    const malformedFeat = makeRawRecord("Bad Copy", "TST", {
      _copy: { name: "NonExistent", source: "XXX" },
      entries: [],
    });

    const validatedFiles = makeValidatedFiles([malformedFeat], "feat");

    const copyModRecord = toCopyModRecord(malformedFeat);
    const resolution = resolveCopyWithMods(
      copyModRecord,
      { validatedFiles },
      { sourcePath: "feat.json", sourceEntityKind: "feat" },
    );

    expect(resolution.ok).toBe(false);
    if (!resolution.ok) {
      expect(resolution.diagnostics.length).toBeGreaterThan(0);
      const diag = resolution.diagnostics[0] as { code?: string };
      expect(diag.code).toBe("BASE_ENTITY_NOT_FOUND");
    }
  });
});

/* ── Input records remain unchanged ────────────────────────────── */

describe("normalizeCopyModKind — input immutability", () => {
  it("input records remain unchanged after normalization", () => {
    const featRecord = makeRawRecord("Tough", "PHB", {
      entries: [{ type: "paragraph", text: "Your hit point maximum increases." }],
    });

    // Capture original state
    const originalName = featRecord.name;
    const originalSource = featRecord.source;
    const originalEntries = featRecord.remaining.entries;

    normalizeCopyModKind(
      "feat",
      [featRecord],
      makeValidatedFiles([featRecord], "feat"),
      "feat.json",
    );

    // Verify input record is unchanged
    expect(featRecord.name).toBe(originalName);
    expect(featRecord.source).toBe(originalSource);
    expect(featRecord.remaining.entries).toBe(originalEntries);
  });
});

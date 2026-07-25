import { describe, expect, it } from "vitest";
import { resolveCopyWithMods } from "./mod-copy-resolver";
import type { CopyResolverContext } from "./copy-resolver";
import type { CopyModRawRecord } from "./mod-copy-resolver";

function makeContext(records: CopyModRawRecord[]): CopyResolverContext {
  return {
    validatedFiles: {
      "test.json": {
        filePath: "test.json",
        collections: [
          {
            entityKind: "monster",
            recordCount: records.length,
            records,
          },
        ],
        totalRecords: records.length,
      },
    },
  };
}

describe("resolveCopyWithMods: addSenses", () => {
  it("applies addSenses to a cloned resolved record", () => {
    const base: CopyModRawRecord = {
      name: "Scout",
      source: "TST",
      remaining: { senses: ["passive Perception 12"] },
    };
    const record: CopyModRawRecord = {
      name: "Shadow Scout",
      source: "TST",
      remaining: {
        _copy: {
          name: "Scout",
          source: "TST",
          _mod: {
            _: { mode: "addSenses", senses: { type: "darkvision", range: 120 } },
          },
        },
      },
    };

    const result = resolveCopyWithMods(record, makeContext([base]), {
      sourcePath: "bestiary/template.json",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected addSenses resolution to succeed");
    expect(result.record.remaining).toEqual({
      senses: ["passive Perception 12", "darkvision 120 ft."],
    });
    expect(base.remaining).toEqual({ senses: ["passive Perception 12"] });
    expect(record.remaining).toEqual({
      _copy: {
        name: "Scout",
        source: "TST",
        _mod: {
          _: { mode: "addSenses", senses: { type: "darkvision", range: 120 } },
        },
      },
    });
  });

  it("rejects malformed senses payload with contextual diagnostics", () => {
    const result = resolveCopyWithMods(
      {
        name: "Shadow Scout",
        source: "TST",
        remaining: {
          _copy: {
            name: "Scout",
            source: "TST",
            _mod: {
              _: { mode: "addSenses", senses: { type: "darkvision", range: "far" } },
            },
          },
        },
      },
      makeContext([
        {
          name: "Scout",
          source: "TST",
          remaining: { senses: [] },
        },
      ]),
      { sourcePath: "bestiary/template.json" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected addSenses resolution to fail");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MOD_PAYLOAD",
      sourcePath: "bestiary/template.json",
      entityName: "Shadow Scout",
      entitySource: "TST",
      fieldTarget: "_",
      mode: "addSenses",
    });
    expect(result.diagnostics[0]?.message).toContain("senses.range");
    expect(result.diagnostics[0]?.rawParam).toMatchObject({ mode: "addSenses" });
  });
});

describe("resolveCopyWithMods: addSkills", () => {
  it("applies addSkills to a cloned resolved record", () => {
    const base: CopyModRawRecord = {
      name: "Scholar",
      source: "TST",
      remaining: { skill: { arcana: "+4" } },
    };
    const record: CopyModRawRecord = {
      name: "Investigative Scholar",
      source: "TST",
      remaining: {
        _copy: {
          name: "Scholar",
          source: "TST",
          _mod: {
            _: { mode: "addSkills", skills: { investigation: 2 } },
          },
        },
      },
    };

    const result = resolveCopyWithMods(record, makeContext([base]), {
      sourcePath: "bestiary/bestiary-bgdia.json",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected addSkills resolution to succeed");
    expect(result.record.remaining).toEqual({
      skill: { arcana: "+4", investigation: "+2" },
    });
    expect(base.remaining).toEqual({ skill: { arcana: "+4" } });
    expect(record.remaining).toEqual({
      _copy: {
        name: "Scholar",
        source: "TST",
        _mod: {
          _: { mode: "addSkills", skills: { investigation: 2 } },
        },
      },
    });
  });

  it("rejects malformed skills payload with contextual diagnostics", () => {
    const result = resolveCopyWithMods(
      {
        name: "Investigative Scholar",
        source: "TST",
        remaining: {
          _copy: {
            name: "Scholar",
            source: "TST",
            _mod: {
              _: { mode: "addSkills", skills: { investigation: "2" } },
            },
          },
        },
      },
      makeContext([
        {
          name: "Scholar",
          source: "TST",
          remaining: { skill: {} },
        },
      ]),
      { sourcePath: "bestiary/bestiary-bgdia.json" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected addSkills resolution to fail");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MOD_PAYLOAD",
      sourcePath: "bestiary/bestiary-bgdia.json",
      entityName: "Investigative Scholar",
      entitySource: "TST",
      fieldTarget: "_",
      mode: "addSkills",
    });
    expect(result.diagnostics[0]?.message).toContain("skills");
    expect(result.diagnostics[0]?.rawParam).toMatchObject({ mode: "addSkills" });
  });
});

describe("resolveCopyWithMods: unknown root mode", () => {
  it("rejects unknown _mod mode with contextual diagnostics", () => {
    const result = resolveCopyWithMods(
      {
        name: "Unknown Scholar",
        source: "TST",
        remaining: {
          _copy: {
            name: "Scholar",
            source: "TST",
            _mod: {
              _: { mode: "unknownMode", value: true },
            },
          },
        },
      },
      makeContext([
        {
          name: "Scholar",
          source: "TST",
          remaining: {},
        },
      ]),
      { sourcePath: "bestiary/custom.json" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected unknown mode resolution to fail");
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNKNOWN_MOD_MODE",
      sourcePath: "bestiary/custom.json",
      entityName: "Unknown Scholar",
      entitySource: "TST",
      fieldTarget: "_",
      mode: "unknownMode",
    });
  });
});

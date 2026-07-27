import { describe, it, expect } from "vitest";
import {
  execAppendArr,
  execAppendIfNotExistsArr,
  execInsertArr,
  execPrependArr,
  execRemoveArr,
  execRenameArr,
  execReplaceArr,
} from "./mod-array-executors";
import type {
  ModAppendArr,
  ModAppendIfNotExistsArr,
  ModInsertArr,
  ModPrependArr,
  ModRemoveArr,
  ModRenameArr,
  ModReplaceArr,
} from "./mod-types";

/* ── execAppendArr ───────────────────────────────────────────────── */

describe("execAppendArr", () => {
  const payload: ModAppendArr = { mode: "appendArr", items: { name: "Trait B" } };

  it("appends a single item to the end of the array", () => {
    const field = [{ name: "Trait A" }];
    const result = execAppendArr(field, payload);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ name: "Trait B" });
    }
  });

  it("appends multiple items when items is an array", () => {
    const multi: ModAppendArr = {
      mode: "appendArr",
      items: [{ name: "Trait B" }, { name: "Trait C" }],
    };
    const field = [{ name: "Trait A" }];
    const result = execAppendArr(field, multi);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({ name: "Trait C" });
    }
  });

  it("preserves the original field value", () => {
    const field = [{ name: "Trait A" }];
    const originalLength = field.length;
    execAppendArr(field, payload);
    expect(field).toHaveLength(originalLength);
  });

  it("creates a missing target array from cloned items", () => {
    const nested = { name: "Trait B", entries: [{ text: "nested" }] };
    const result = execAppendArr(undefined, { mode: "appendArr", items: nested });
    expect(result).toEqual([nested]);
    if (Array.isArray(result)) {
      expect(result[0]).not.toBe(nested);
      expect((result[0] as { entries: unknown[] }).entries).not.toBe(nested.entries);
    }
    expect(nested).toEqual({ name: "Trait B", entries: [{ text: "nested" }] });
  });

  it("treats null as a missing target", () => {
    const result = execAppendArr(null, { mode: "appendArr", items: ["A", "B"] });
    expect(result).toEqual(["A", "B"]);
  });

  it("appends into an empty existing array", () => {
    const result = execAppendArr([], payload);
    expect(result).toEqual([{ name: "Trait B" }]);
  });

  it("returns diagnostic when field is not an array", () => {
    const result = execAppendArr("not-an-array", payload);
    expect(result).toMatchObject({
      code: "MOD_FIELD_TARGET_MISSING",
      message: "appendArr target field is not an array",
    });
  });
});

/* ── execAppendIfNotExistsArr ────────────────────────────────────── */

describe("execAppendIfNotExistsArr", () => {
  const payload: ModAppendIfNotExistsArr = {
    mode: "appendIfNotExistsArr",
    items: ["Dwarvish", "Elvish", "Undercommon"],
  };

  it("appends only strings not already in the array", () => {
    const field = ["Common", "Dwarvish"];
    const result = execAppendIfNotExistsArr(field, payload);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toEqual(["Common", "Dwarvish", "Elvish", "Undercommon"]);
    }
  });

  it("preserves the original field value", () => {
    const field = ["Common", "Dwarvish"];
    const original = [...field];
    execAppendIfNotExistsArr(field, payload);
    expect(field).toEqual(original);
  });

  it("creates a missing target array", () => {
    const result = execAppendIfNotExistsArr(undefined, payload);
    expect(result).toEqual(["Dwarvish", "Elvish", "Undercommon"]);
  });

  it("treats null as a missing target", () => {
    const result = execAppendIfNotExistsArr(null, { mode: "appendIfNotExistsArr", items: "Elvish" });
    expect(result).toEqual(["Elvish"]);
  });

  it("uses structural equality for object items and preserves order", () => {
    const existing = [{ name: "A", nested: { n: 1 } }];
    const duplicate = { name: "A", nested: { n: 1 } };
    const added = { name: "B", nested: { n: 2 } };
    const result = execAppendIfNotExistsArr(existing, {
      mode: "appendIfNotExistsArr",
      items: [duplicate, added],
    });
    expect(result).toEqual([{ name: "A", nested: { n: 1 } }, { name: "B", nested: { n: 2 } }]);
    if (Array.isArray(result)) {
      expect(result[0]).not.toBe(existing[0]);
      expect(result[1]).not.toBe(added);
      expect((result[1] as { nested: object }).nested).not.toBe(added.nested);
    }
    expect(existing).toEqual([{ name: "A", nested: { n: 1 } }]);
  });

  it("does not append duplicate object items from the payload", () => {
    const item = { name: "A", nested: ["x"] };
    const result = execAppendIfNotExistsArr([], {
      mode: "appendIfNotExistsArr",
      items: [item, { name: "A", nested: ["x"] }],
    });
    expect(result).toEqual([{ name: "A", nested: ["x"] }]);
  });

  it("returns diagnostic when field is not an array", () => {
    const result = execAppendIfNotExistsArr("not-an-array", payload);
    expect(result).toMatchObject({
      code: "MOD_FIELD_TARGET_MISSING",
      message: "appendIfNotExistsArr target field is not an array",
    });
  });
});

/* ── execInsertArr ───────────────────────────────────────────────── */

describe("execInsertArr", () => {
  const payload: ModInsertArr = { mode: "insertArr", index: 1, items: { name: "Inserted" } };

  it("inserts a single item at the specified index", () => {
    const field = [{ name: "A" }, { name: "B" }];
    const result = execInsertArr(field, payload);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(3);
      expect(result[1]).toEqual({ name: "Inserted" });
      expect(result[2]).toEqual({ name: "B" });
    }
  });

  it("preserves the original field value", () => {
    const field = [{ name: "A" }, { name: "B" }];
    const original = JSON.parse(JSON.stringify(field));
    execInsertArr(field, payload);
    expect(field).toEqual(original);
  });

  it("returns diagnostic when field is not an array", () => {
    const result = execInsertArr(null, payload);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── execPrependArr ──────────────────────────────────────────────── */

describe("execPrependArr", () => {
  const payload: ModPrependArr = { mode: "prependArr", items: { name: "Trait A" } };

  it("prepends a single item to the beginning of the array", () => {
    const field = [{ name: "Trait B" }];
    const result = execPrependArr(field, payload);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "Trait A" });
      expect(result[1]).toEqual({ name: "Trait B" });
    }
  });

  it("preserves the original field value", () => {
    const field = [{ name: "Trait B" }];
    const original = JSON.parse(JSON.stringify(field));
    execPrependArr(field, payload);
    expect(field).toEqual(original);
  });

  it("creates a missing target array from cloned items", () => {
    const nested = { name: "Trait A", entries: [{ text: "nested" }] };
    const result = execPrependArr(undefined, { mode: "prependArr", items: nested });
    expect(result).toEqual([nested]);
    if (Array.isArray(result)) {
      expect(result[0]).not.toBe(nested);
      expect((result[0] as { entries: unknown[] }).entries).not.toBe(nested.entries);
    }
  });

  it("treats null as a missing target", () => {
    const result = execPrependArr(null, { mode: "prependArr", items: ["A", "B"] });
    expect(result).toEqual(["A", "B"]);
  });

  it("prepends into an empty existing array", () => {
    const result = execPrependArr([], payload);
    expect(result).toEqual([{ name: "Trait A" }]);
  });

  it("returns diagnostic when field is not an array", () => {
    const result = execPrependArr(42, payload);
    expect(result).toMatchObject({
      code: "MOD_FIELD_TARGET_MISSING",
      message: "prependArr target field is not an array",
    });
  });
});

/* ── execRemoveArr ───────────────────────────────────────────────── */

describe("execRemoveArr", () => {
  const payload: ModRemoveArr = { mode: "removeArr", names: "Bound" };

  it("removes items by name (single name)", () => {
    const field = [
      { name: "Bound" },
      { name: "Keen Sight" },
      { name: "Amphibious" },
    ];
    const result = execRemoveArr(field, payload);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2);
      expect(result.map((x: unknown) => (x as Record<string, unknown>).name)).toEqual([
        "Keen Sight",
        "Amphibious",
      ]);
    }
  });

  it("removes multiple items by array of names", () => {
    const multi: ModRemoveArr = { mode: "removeArr", names: ["Bound", "Amphibious"] };
    const field = [
      { name: "Bound" },
      { name: "Keen Sight" },
      { name: "Amphibious" },
    ];
    const result = execRemoveArr(field, multi);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: "Keen Sight" });
    }
  });

  it("preserves the original field value", () => {
    const field = [{ name: "Bound" }, { name: "Keen Sight" }];
    const original = JSON.parse(JSON.stringify(field));
    execRemoveArr(field, payload);
    expect(field).toEqual(original);
  });

  it("returns diagnostic when field is not an array", () => {
    const result = execRemoveArr("nope", payload);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── execRenameArr ───────────────────────────────────────────────── */

describe("execRenameArr", () => {
  const payload: ModRenameArr = {
    mode: "renameArr",
    renames: [{ rename: "Parry (Duelist Only)", with: "Parry" }],
  };

  it("renames an item by its name property", () => {
    const field = [{ name: "Parry (Duelist Only)" }];
    const result = execRenameArr(field, payload);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: "Parry" });
    }
  });

  it("preserves the original field value", () => {
    const field = [{ name: "Parry (Duelist Only)" }];
    const original = JSON.parse(JSON.stringify(field));
    execRenameArr(field, payload);
    expect(field).toEqual(original);
  });

  it("returns diagnostic when field is not an array", () => {
    const result = execRenameArr({}, payload);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── execReplaceArr ──────────────────────────────────────────────── */

describe("execReplaceArr", () => {
  const payload: ModReplaceArr = {
    mode: "replaceArr",
    replace: "Feature: Position of Privilege",
    items: { name: "Baldur's Gate Feature: Patriar" },
  };

  it("replaces an item by name with a new item", () => {
    const field = [
      { name: "Feature: Position of Privilege" },
      { name: "Skill Proficiencies" },
    ];
    const result = execReplaceArr(field, payload);
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "Baldur's Gate Feature: Patriar" });
      expect(result[1]).toEqual({ name: "Skill Proficiencies" });
    }
  });

  it("preserves the original field value", () => {
    const field = [{ name: "A" }];
    const original = JSON.parse(JSON.stringify(field));
    execReplaceArr(field, { mode: "replaceArr", replace: "A", items: { name: "B" } });
    expect(field).toEqual(original);
  });

  it("returns diagnostic when target name not found", () => {
    const result = execReplaceArr([{ name: "A" }], {
      mode: "replaceArr",
      replace: "Missing",
      items: { name: "B" },
    });
    expect(Array.isArray(result)).toBe(false);
  });

  it("returns diagnostic when field is not an array", () => {
    const result = execReplaceArr("nope", payload);
    expect(Array.isArray(result)).toBe(false);
  });
});

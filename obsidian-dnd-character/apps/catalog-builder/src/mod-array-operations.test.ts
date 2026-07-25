import { describe, it, expect } from "vitest";
import { applyArrayModOperation } from "./mod-array-operations";

/* ── appendArr via dispatcher ────────────────────────────────────── */

describe("applyArrayModOperation: appendArr", () => {
  it("appends a single item to the end of the array", () => {
    const field = [{ name: "Trait A" }];
    const result = applyArrayModOperation(field, {
      mode: "appendArr",
      items: { name: "Trait B" },
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ name: "Trait B" });
    }
  });

  it("rejects payload missing items", () => {
    const result = applyArrayModOperation([], { mode: "appendArr" } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });

  it("rejects null payload", () => {
    const result = applyArrayModOperation([], null);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── appendIfNotExistsArr via dispatcher ─────────────────────────── */

describe("applyArrayModOperation: appendIfNotExistsArr", () => {
  it("appends only strings not already in the array", () => {
    const field = ["Common", "Dwarvish"];
    const result = applyArrayModOperation(field, {
      mode: "appendIfNotExistsArr",
      items: ["Dwarvish", "Elvish", "Undercommon"],
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toEqual(["Common", "Dwarvish", "Elvish", "Undercommon"]);
    }
  });

  it("accepts a single string as items", () => {
    const field = ["Common"];
    const result = applyArrayModOperation(field, {
      mode: "appendIfNotExistsArr",
      items: "Elvish",
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toEqual(["Common", "Elvish"]);
    }
  });

  it("rejects non-string items in array", () => {
    const result = applyArrayModOperation([], {
      mode: "appendIfNotExistsArr",
      items: [42],
    } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── insertArr via dispatcher ────────────────────────────────────── */

describe("applyArrayModOperation: insertArr", () => {
  it("inserts a single item at the specified index", () => {
    const field = [{ name: "A" }, { name: "B" }];
    const result = applyArrayModOperation(field, {
      mode: "insertArr",
      index: 1,
      items: { name: "Inserted" },
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(3);
      expect(result[1]).toEqual({ name: "Inserted" });
    }
  });

  it("rejects payload with missing index", () => {
    const result = applyArrayModOperation([], {
      mode: "insertArr",
      items: { name: "X" },
    } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });

  it("rejects payload with non-numeric index", () => {
    const result = applyArrayModOperation([], {
      mode: "insertArr",
      index: "two",
      items: { name: "X" },
    } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── prependArr via dispatcher ───────────────────────────────────── */

describe("applyArrayModOperation: prependArr", () => {
  it("prepends a single item to the beginning of the array", () => {
    const field = [{ name: "Trait B" }];
    const result = applyArrayModOperation(field, {
      mode: "prependArr",
      items: { name: "Trait A" },
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "Trait A" });
    }
  });

  it("rejects payload missing items", () => {
    const result = applyArrayModOperation([], { mode: "prependArr" } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });

  it("rejects non-object payload", () => {
    const result = applyArrayModOperation([], "not-an-object");
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── removeArr via dispatcher ────────────────────────────────────── */

describe("applyArrayModOperation: removeArr", () => {
  it("removes items by name (single name)", () => {
    const field = [
      { name: "Bound" },
      { name: "Keen Sight" },
      { name: "Amphibious" },
    ];
    const result = applyArrayModOperation(field, {
      mode: "removeArr",
      names: "Bound",
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2);
    }
  });

  it("rejects payload missing names", () => {
    const result = applyArrayModOperation([], { mode: "removeArr" } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── renameArr via dispatcher ────────────────────────────────────── */

describe("applyArrayModOperation: renameArr", () => {
  it("renames an item by its name property", () => {
    const field = [{ name: "Parry (Duelist Only)" }];
    const result = applyArrayModOperation(field, {
      mode: "renameArr",
      renames: [{ rename: "Parry (Duelist Only)", with: "Parry" }],
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result[0]).toEqual({ name: "Parry" });
    }
  });

  it("rejects payload with non-array renames", () => {
    const result = applyArrayModOperation([], {
      mode: "renameArr",
      renames: { rename: "A", with: "B" },
    } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── replaceArr via dispatcher ───────────────────────────────────── */

describe("applyArrayModOperation: replaceArr", () => {
  it("replaces an item by name with a new item", () => {
    const field = [
      { name: "Feature: Position of Privilege" },
      { name: "Skill Proficiencies" },
    ];
    const result = applyArrayModOperation(field, {
      mode: "replaceArr",
      replace: "Feature: Position of Privilege",
      items: { name: "Baldur's Gate Feature: Patriar" },
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result[0]).toEqual({ name: "Baldur's Gate Feature: Patriar" });
    }
  });

  it("rejects payload with non-string replace", () => {
    const result = applyArrayModOperation([], {
      mode: "replaceArr",
      replace: 42,
      items: { name: "B" },
    } as unknown);
    expect(Array.isArray(result)).toBe(false);
  });
});

/* ── Dispatcher: unknown mode ────────────────────────────────────── */

describe("applyArrayModOperation dispatcher", () => {
  it("rejects unknown mode", () => {
    const result = applyArrayModOperation([], {
      mode: "unknownMode",
      items: [],
    });
    expect(Array.isArray(result)).toBe(false);
  });

  it("rejects payload without mode", () => {
    const result = applyArrayModOperation([], { items: [] });
    expect(Array.isArray(result)).toBe(false);
  });
});

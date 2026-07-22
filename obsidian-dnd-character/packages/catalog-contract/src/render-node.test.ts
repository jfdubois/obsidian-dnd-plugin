import { describe, it, expect } from "vitest";
import {
  isRenderNode,
  createRenderParagraph,
  createRenderHeading,
  createRenderListNode,
  createRenderTableNode,
  createRenderReferenceNode,
  createRenderDiceNode,
  createRenderNote,
  type RenderNode,
} from "./render-node";
import { createEntityId } from "@obsidian-dnd/domain";

describe("RenderNode", () => {
  /* ── Positive: paragraph ────────────────────────────────────── */

  it("validator accepts paragraph with text", () => {
    const node: unknown = { type: "paragraph", text: "This is a paragraph." };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts paragraph with empty text", () => {
    const node: unknown = { type: "paragraph", text: "" };
    expect(isRenderNode(node)).toBe(true);
  });

  /* ── Positive: heading ──────────────────────────────────────── */

  it("validator accepts heading level 2", () => {
    const node: unknown = { type: "heading", level: 2, text: "Section" };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts heading level 3", () => {
    const node: unknown = { type: "heading", level: 3, text: "Subsection" };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts heading level 4", () => {
    const node: unknown = { type: "heading", level: 4, text: "Sub-subsection" };
    expect(isRenderNode(node)).toBe(true);
  });

  /* ── Positive: list ─────────────────────────────────────────── */

  it("validator accepts unordered list", () => {
    const node: unknown = {
      type: "list",
      ordered: false,
      items: [[{ type: "paragraph", text: "Item 1" }]],
    };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts ordered list", () => {
    const node: unknown = {
      type: "list",
      ordered: true,
      items: [[{ type: "paragraph", text: "First" }]],
    };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts empty list", () => {
    const node: unknown = { type: "list", ordered: false, items: [] };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts nested list", () => {
    const node: unknown = {
      type: "list",
      ordered: false,
      items: [
        [
          { type: "paragraph", text: "Parent" },
          {
            type: "list",
            ordered: true,
            items: [[{ type: "paragraph", text: "Child" }]],
          },
        ],
      ],
    };
    expect(isRenderNode(node)).toBe(true);
  });

  /* ── Positive: table ────────────────────────────────────────── */

  it("validator accepts table with columns and rows", () => {
    const node: unknown = {
      type: "table",
      columns: ["Damage Type", "DC"],
      rows: [["Fire", "15"], ["Cold", "14"]],
    };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts table with empty rows", () => {
    const node: unknown = { type: "table", columns: ["A"], rows: [] };
    expect(isRenderNode(node)).toBe(true);
  });

  /* ── Positive: reference ────────────────────────────────────── */

  it("validator accepts reference with valid entityId", () => {
    const node: unknown = { type: "reference", entityId: "spell:2024:xphb:firebolt", label: "Firebolt" };
    expect(isRenderNode(node)).toBe(true);
  });

  /* ── Positive: dice ─────────────────────────────────────────── */

  it("validator accepts dice with expression only", () => {
    const node: unknown = { type: "dice", expression: "2d6" };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts dice with expression and label", () => {
    const node: unknown = { type: "dice", expression: "2d6+2", label: "Firebolt damage" };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts dice with empty label", () => {
    const node: unknown = { type: "dice", expression: "1d4", label: "" };
    expect(isRenderNode(node)).toBe(true);
  });

  /* ── Positive: note ─────────────────────────────────────────── */

  it("validator accepts note with text", () => {
    const node: unknown = { type: "note", text: "DM discretion applies." };
    expect(isRenderNode(node)).toBe(true);
  });

  it("validator accepts note with empty text", () => {
    const node: unknown = { type: "note", text: "" };
    expect(isRenderNode(node)).toBe(true);
  });

  /* ── Negative: paragraph ────────────────────────────────────── */

  it("validator rejects paragraph with missing text", () => {
    const node: unknown = { type: "paragraph" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects paragraph with non-string text", () => {
    const node: unknown = { type: "paragraph", text: 42 };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: heading ──────────────────────────────────────── */

  it("validator rejects heading level 1", () => {
    const node: unknown = { type: "heading", level: 1, text: "Title" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects heading level 5", () => {
    const node: unknown = { type: "heading", level: 5, text: "Deep" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects heading with non-number level", () => {
    const node: unknown = { type: "heading", level: "3", text: "Sub" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects heading with empty text", () => {
    const node: unknown = { type: "heading", level: 2, text: "" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects heading with missing text", () => {
    const node: unknown = { type: "heading", level: 3 };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: list ─────────────────────────────────────────── */

  it("validator rejects list with non-boolean ordered", () => {
    const node: unknown = { type: "list", ordered: "false", items: [] };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects list with non-array items", () => {
    const node: unknown = { type: "list", ordered: false, items: "not-array" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects list with flat items (not grouped)", () => {
    const node: unknown = { type: "list", ordered: false, items: [{ type: "paragraph", text: "x" }] };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects list with invalid nested render node", () => {
    const node: unknown = {
      type: "list",
      ordered: false,
      items: [[[{ type: "unknown", text: "x" }]]],
    };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: table ────────────────────────────────────────── */

  it("validator rejects table with non-string column", () => {
    const node: unknown = { type: "table", columns: [123], rows: [] };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects table with non-array rows", () => {
    const node: unknown = { type: "table", columns: ["A"], rows: "bad" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects table with non-string cell", () => {
    const node: unknown = { type: "table", columns: ["A"], rows: [[123]] };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects table with non-array row", () => {
    const node: unknown = { type: "table", columns: ["A"], rows: ["bad"] };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: reference ────────────────────────────────────── */

  it("validator rejects reference with empty entityId", () => {
    const node: unknown = { type: "reference", entityId: "", label: "Link" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects reference with missing entityId", () => {
    const node: unknown = { type: "reference", label: "Link" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects reference with empty label", () => {
    const node: unknown = { type: "reference", entityId: "spell:2024:xphb:firebolt", label: "" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects reference with missing label", () => {
    const node: unknown = { type: "reference", entityId: "spell:2024:xphb:firebolt" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects reference with non-string label", () => {
    const node: unknown = { type: "reference", entityId: "spell:2024:xphb:firebolt", label: 42 };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: dice ─────────────────────────────────────────── */

  it("validator rejects dice with empty expression", () => {
    const node: unknown = { type: "dice", expression: "" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects dice with missing expression", () => {
    const node: unknown = { type: "dice" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects dice with non-string expression", () => {
    const node: unknown = { type: "dice", expression: 42 };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects dice with non-string label", () => {
    const node: unknown = { type: "dice", expression: "1d4", label: 42 };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: note ─────────────────────────────────────────── */

  it("validator rejects note with missing text", () => {
    const node: unknown = { type: "note" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects note with non-string text", () => {
    const node: unknown = { type: "note", text: 42 };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: unknown type ─────────────────────────────────── */

  it("validator rejects unknown type string", () => {
    const node: unknown = { type: "blockquote", text: "quote" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects missing type", () => {
    const node: unknown = { text: "hello" };
    expect(isRenderNode(node)).toBe(false);
  });

  it("validator rejects non-string type", () => {
    const node: unknown = { type: 123, text: "hello" };
    expect(isRenderNode(node)).toBe(false);
  });

  /* ── Negative: type boundaries ──────────────────────────────── */

  it("validator rejects null", () => {
    expect(isRenderNode(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isRenderNode(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isRenderNode("paragraph")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isRenderNode(42)).toBe(false);
  });

  it("validator rejects boolean", () => {
    expect(isRenderNode(true)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isRenderNode([])).toBe(false);
  });

  it("validator rejects empty object", () => {
    expect(isRenderNode({})).toBe(false);
  });

  /* ── Factory: paragraph ─────────────────────────────────────── */

  it("createRenderParagraph produces valid node", () => {
    const node = createRenderParagraph("Hello world.");
    expect(isRenderNode(node)).toBe(true);
    expect(node.type).toBe("paragraph");
    expect(node.text).toBe("Hello world.");
  });

  /* ── Factory: heading ───────────────────────────────────────── */

  it("createRenderHeading produces valid node", () => {
    const node = createRenderHeading(3, "Subsection");
    expect(isRenderNode(node)).toBe(true);
    expect(node.type).toBe("heading");
    expect(node.level).toBe(3);
    expect(node.text).toBe("Subsection");
  });

  /* ── Factory: list ──────────────────────────────────────────── */

  it("createRenderListNode produces valid node", () => {
    const items = [[{ type: "paragraph" as const, text: "Item" }]];
    const node = createRenderListNode(false, items);
    expect(isRenderNode(node)).toBe(true);
    expect(node.type).toBe("list");
    expect(node.ordered).toBe(false);
  });

  it("createRenderListNode creates immutable copy of items", () => {
    const items: RenderNode[][] = [[createRenderParagraph("Item")]];
    const firstGroup = items[0]!;
    const node = createRenderListNode(false, items);
    firstGroup.push(createRenderParagraph("Added"));
    expect(node.items[0]!).toHaveLength(1);
  });

  /* ── Factory: table ─────────────────────────────────────────── */

  it("createRenderTableNode produces valid node", () => {
    const node = createRenderTableNode(["A", "B"], [["1", "2"], ["3", "4"]]);
    expect(isRenderNode(node)).toBe(true);
    expect(node.type).toBe("table");
    expect(node.columns).toEqual(["A", "B"]);
    expect(node.rows).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("createRenderTableNode creates immutable copy of columns and rows", () => {
    const columns = ["A"];
    const rows = [["1"]];
    const firstRow = rows[0]!;
    const node = createRenderTableNode(columns, rows);
    columns.push("B");
    firstRow.push("2");
    expect(node.columns).toHaveLength(1);
    expect(node.rows[0]!).toHaveLength(1);
  });

  /* ── Factory: reference ─────────────────────────────────────── */

  it("createRenderReferenceNode produces valid node", () => {
    const node = createRenderReferenceNode(createEntityId("spell:2024:xphb:firebolt"), "Firebolt");
    expect(isRenderNode(node)).toBe(true);
    expect(node.type).toBe("reference");
    expect(node.label).toBe("Firebolt");
  });

  /* ── Factory: dice ──────────────────────────────────────────── */

  it("createRenderDiceNode produces valid node without label", () => {
    const node = createRenderDiceNode("2d6+2");
    expect(isRenderNode(node)).toBe(true);
    expect(node.type).toBe("dice");
    expect(node.expression).toBe("2d6+2");
    expect(node.label).toBeUndefined();
  });

  it("createRenderDiceNode produces valid node with label", () => {
    const node = createRenderDiceNode("2d6+2", "Fire bolt damage");
    expect(isRenderNode(node)).toBe(true);
    expect(node.label).toBe("Fire bolt damage");
  });

  /* ── Factory: note ──────────────────────────────────────────── */

  it("createRenderNote produces valid node", () => {
    const node = createRenderNote("DM discretion.");
    expect(isRenderNode(node)).toBe(true);
    expect(node.type).toBe("note");
    expect(node.text).toBe("DM discretion.");
  });
});

describe("round-trip", () => {
  it("all variants round-trip through validator", () => {
    const nodes: RenderNode[] = [
      createRenderParagraph("A paragraph."),
      createRenderHeading(2, "Section"),
      createRenderHeading(3, "Subsection"),
      createRenderHeading(4, "Detail"),
      createRenderListNode(false, [[createRenderParagraph("Item")]]),
      createRenderListNode(true, []),
      createRenderTableNode(["Col"], [["Val"]]),
      createRenderReferenceNode(createEntityId("feat:2024:xphb:tough"), "Tough"),
      createRenderDiceNode("1d4"),
      createRenderDiceNode("1d4+1", "Damage"),
      createRenderNote("A note."),
    ];

    for (const node of nodes) {
      expect(isRenderNode(node)).toBe(true);
    }
  });

  it("complex nested structure round-trips", () => {
    const nested: RenderNode = createRenderListNode(false, [
      [
        createRenderHeading(3, "Features"),
        createRenderListNode(true, [
          [createRenderParagraph("First feature")],
          [createRenderParagraph("Second feature")],
        ]),
      ],
      [
        createRenderDiceNode("2d8", "Damage"),
        createRenderReferenceNode(createEntityId("spell:2024:xphb:burning-hands"), "Burning Hands"),
      ],
    ]);

    expect(isRenderNode(nested)).toBe(true);
    expect(nested.type).toBe("list");
    expect(nested.ordered).toBe(false);
    expect(nested.items).toHaveLength(2);
  });

  it("validator rejects list with deeply nested wrong shape", () => {
    const node: unknown = {
      type: "list",
      ordered: false,
      items: [[[{ type: "paragraph", text: "x" }]]],
    };
    expect(isRenderNode(node)).toBe(false);
  });
});

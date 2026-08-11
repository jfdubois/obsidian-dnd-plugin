import { describe, expect, it } from "vitest";
import { createFiveEToolsExternalReference } from "./fiveetools-external-reference";

describe("pinned 5eTools external reference subset", () => {
  it.each([
    ["species", "Elf", "PHB", "races.html#elf_phb"],
    ["species", "Aasimar (Legacy)", "XPHB", "races.html#aasimar%20(legacy)_xphb"],
    ["background", "Acolyte", "PHB", "backgrounds.html#acolyte_phb"],
    ["background", "Wayfarer", "XPHB", "backgrounds.html#wayfarer_xphb"],
    ["class", "Fighter", "PHB", "classes.html#fighter_phb"],
    ["class", "Monk", "XPHB", "classes.html#monk_xphb"],
  ] as const)("matches UrlUtil generic routing for %s", (kind, name, source, target) => {
    expect(createFiveEToolsExternalReference(kind, name, source)?.relativeTarget).toBe(target);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeFiveEToolsWebBaseUrl, resolveFiveEToolsExternalUrl } from "./fiveetools-external-url";

describe("5eTools external URL safety", () => {
  it.each([[" https://5e.tools ", "https://5e.tools/"], ["http://localhost:7775", "http://localhost:7775/"], ["https://example.invalid/apps/5etools", "https://example.invalid/apps/5etools/"]])("normalizes %s", (input, expected) => expect(normalizeFiveEToolsWebBaseUrl(input)).toBe(expected));
  it.each(["javascript:alert(1)", "ftp://example.invalid", "https://user:pass@example.invalid/", "https://example.invalid/?a=b", "https://example.invalid/#x", "not a url"])("rejects invalid base %s", (input) => expect(normalizeFiveEToolsWebBaseUrl(input)).toBeUndefined());
  it("composes roots and subpaths without escape", () => {
    const reference = { provider: "5etools", relativeTarget: "classes.html#fighter_phb" } as const;
    expect(resolveFiveEToolsExternalUrl("https://5e.tools", reference)).toBe("https://5e.tools/classes.html#fighter_phb");
    expect(resolveFiveEToolsExternalUrl("https://example.invalid/tools/5e/", reference)).toBe("https://example.invalid/tools/5e/classes.html#fighter_phb");
    expect(resolveFiveEToolsExternalUrl("https://example.invalid/tools/5e/", { provider: "5etools", relativeTarget: "../escape" })).toBeUndefined();
  });
});

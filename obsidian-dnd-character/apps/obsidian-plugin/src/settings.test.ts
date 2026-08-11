import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import { normalizeFiveEToolsWebBaseUrl } from "./fiveetools-external-url";

describe("5eTools web base settings migration", () => {
  it("migrates v1 settings with an empty disabled base without changing catalog settings", () => {
    const settings = normalizeSettings({ schemaVersion: 1, catalogServerUrl: "https://catalog.invalid/v1", catalogRevision: "r1", charactersVaultPath: "characters" });
    expect(settings.fiveEToolsWebBaseUrl).toBe("");
    expect(settings.catalogServerUrl).toBe("https://catalog.invalid/v1");
    expect(settings.catalogRevision).toBe("r1");
    expect(settings.charactersVaultPath).toBe("characters");
  });
  it("uses the disabled default and safely disables corrupt persisted bases", () => {
    expect(DEFAULT_SETTINGS.fiveEToolsWebBaseUrl).toBe("");
    expect(normalizeFiveEToolsWebBaseUrl(normalizeSettings({ fiveEToolsWebBaseUrl: "javascript:alert(1)" }).fiveEToolsWebBaseUrl)).toBeUndefined();
  });
});

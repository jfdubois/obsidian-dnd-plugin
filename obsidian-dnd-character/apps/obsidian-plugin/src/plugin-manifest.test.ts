/**
 * Plugin manifest and version-policy tests.
 *
 * Validates that:
 * - manifest.json minAppVersion covers every used Obsidian API with an @since version
 * - manifest version matches package.json version
 * - versions.json exists and includes the current plugin version
 * - isDesktopOnly remains false
 * - API_USAGE.md entries for revealLeaf and PluginSettingTab.display are correct
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_DIR = path.resolve(__dirname, "..");
const DOCS_DIR = path.resolve(__dirname, "../../../docs");

function readJsonFile<T>(relativePath: string): T {
  const fullPath = path.resolve(PLUGIN_DIR, relativePath);
  const content = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(content) as T;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl: string;
  isDesktopOnly: boolean;
}

interface PackageJson {
  name: string;
  version: string;
  private: boolean;
  type: string;
}

interface VersionsPolicy {
  [pluginVersion: string]: string;
}

describe("plugin manifest version policy", () => {
  const manifest = readJsonFile<PluginManifest>("manifest.json");
  const packageJson = readJsonFile<PackageJson>("package.json");

  it("manifest minAppVersion is 1.7.2", () => {
    expect(manifest.minAppVersion).toBe("1.7.2");
  });

  it("manifest minAppVersion covers revealLeaf @since 1.7.2", () => {
    // Workspace.revealLeaf is @since 1.7.2 in obsidian.d.ts (line 8043)
    // minAppVersion must be >= 1.7.2
    const cmp = (a: string, b: string) => {
      const ap = a.split(".").map(Number);
      const bp = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        if ((ap[i] ?? 0) > (bp[i] ?? 0)) return 1;
        if ((ap[i] ?? 0) < (bp[i] ?? 0)) return -1;
      }
      return 0;
    };
    expect(cmp(manifest.minAppVersion, "1.7.2")).toBeGreaterThanOrEqual(0);
  });

  it("manifest version matches package.json version", () => {
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.version).toBe("0.1.0");
  });

  it("manifest version is 0.1.0", () => {
    expect(manifest.version).toBe("0.1.0");
  });

  it("isDesktopOnly is false", () => {
    expect(manifest.isDesktopOnly).toBe(false);
  });

  it("manifest id is correct", () => {
    expect(manifest.id).toBe("obsidian-dnd-character");
  });

  it("manifest name is correct", () => {
    expect(manifest.name).toBe("D&D Character Manager");
  });
});

describe("versions.json version policy", () => {
  it("versions.json exists", () => {
    const versionsPath = path.resolve(PLUGIN_DIR, "versions.json");
    expect(fs.existsSync(versionsPath)).toBe(true);
  });

  it("versions.json includes current plugin version 0.1.0", () => {
    const versions = readJsonFile<VersionsPolicy>("versions.json");
    expect("0.1.0" in versions).toBe(true);
  });

  it("versions.json maps 0.1.0 to minAppVersion 1.7.2", () => {
    const versions = readJsonFile<VersionsPolicy>("versions.json");
    expect(versions["0.1.0"]).toBe("1.7.2");
  });
});

describe("API_USAGE.md correctness", () => {
  it("API_USAGE.md exists", () => {
    const apiUsagePath = path.resolve(DOCS_DIR, "API_USAGE.md");
    expect(fs.existsSync(apiUsagePath)).toBe(true);
  });

  it("PluginSettingTab.display entry uses correct @since", () => {
    const apiUsagePath = path.resolve(DOCS_DIR, "API_USAGE.md");
    const content = fs.readFileSync(apiUsagePath, "utf8");

    // The display() method is part of PluginSettingTab which is @since 0.9.7
    // It was deprecated since 1.13.0 as a legacy imperative fallback
    const displayLine = content.split("\n").find((line) =>
      line.includes("PluginSettingTab.display")
    );
    expect(displayLine).toBeDefined();
    expect(displayLine).toContain("0.9.7");
    expect(displayLine).toContain("deprecated since 1.13.0");
    expect(displayLine).toContain("legacy imperative fallback");

    // Should NOT contain the incorrect "1.13.0 (deprecated, legacy pattern)" text
    expect(displayLine).not.toContain("1.13.0 (deprecated, legacy pattern)");
  });

  it("revealLeaf entry uses correct @since 1.7.2", () => {
    const apiUsagePath = path.resolve(DOCS_DIR, "API_USAGE.md");
    const content = fs.readFileSync(apiUsagePath, "utf8");

    const revealLeafLine = content.split("\n").find((line) =>
      line.includes("Workspace.revealLeaf")
    );
    expect(revealLeafLine).toBeDefined();
    expect(revealLeafLine).toContain("1.7.2");
  });
});

describe("manifest minAppVersion covers all used APIs with @since", () => {
  const manifest = readJsonFile<PluginManifest>("manifest.json");

  // APIs used in the plugin that have explicit @since annotations
  // in the pinned obsidian.d.ts reference
  const usedApisWithSince = [
    { name: "Workspace.revealLeaf", since: "1.7.2" },
    { name: "Plugin.registerView", since: "0.9.7" },
    { name: "Workspace.getRightLeaf", since: "0.9.7" },
    { name: "Plugin.onload", since: "0.9.7" },
    { name: "Plugin.loadData", since: "0.9.7" },
    { name: "Plugin.saveData", since: "0.9.7" },
    { name: "Plugin.addCommand", since: "0.9.7" },
    { name: "Plugin.addSettingTab", since: "0.9.7" },
    { name: "PluginSettingTab", since: "0.9.7" },
    { name: "Setting", since: "0.9.7" },
    { name: "Setting.setHeading", since: "0.9.16" },
    { name: "Component.onunload", since: "0.9.7" },
    { name: "Component.register", since: "0.9.7" },
    { name: "Component.registerEvent", since: "0.9.7" },
    { name: "Vault.on (create)", since: "0.9.7" },
    { name: "Vault.on (modify)", since: "0.9.7" },
    { name: "Vault.on (delete)", since: "0.9.7" },
    { name: "Vault.on (rename)", since: "0.9.7" },
    { name: "ItemView", since: "0.9.7" },
    { name: "Plugin", since: "0.9.7" },
    { name: "TAbstractFile", since: "0.9.7" },
    { name: "App", since: "0.9.7" },
    { name: "App.workspace", since: "0.9.7" },
    { name: "App.vault", since: "0.9.7" },
    { name: "Setting.setDisabled", since: "1.2.3" },
    { name: "ItemView.getViewType", since: "0.9.7" },
    { name: "ItemView.getDisplayText", since: "0.9.7" },
    { name: "ItemView.onOpen", since: "0.9.7" },
    { name: "ItemView.onClose", since: "0.9.7" },
    { name: "Vault.createFolder", since: "1.4.0" },
    { name: "Vault.getFolderByPath", since: "1.5.7" },
    { name: "Vault.create", since: "0.9.7" },
    { name: "Vault.getFileByPath", since: "0.9.7" },
    { name: "Vault.cachedRead", since: "0.9.7" },
    { name: "Vault.process", since: "1.1.0" },
    { name: "Vault.delete", since: "0.9.7" },
  ];

  it.each(usedApisWithSince)(
    "minAppVersion ($manifestMinAppVersion) covers $name @since $since",
    ({ since }) => {
      const minParts = manifest.minAppVersion.split(".").map(Number);
      const sinceParts = since.split(".").map(Number);

      // Compare version tuples element by element
      for (let i = 0; i < 3; i++) {
        if ((minParts[i] ?? 0) > (sinceParts[i] ?? 0)) return;
        if ((minParts[i] ?? 0) < (sinceParts[i] ?? 0)) {
          throw new Error(
            `minAppVersion ${manifest.minAppVersion} is less than @since ${since} for ${since}`
          );
        }
      }
    }
  );

  it("minAppVersion is the highest @since among all used APIs", () => {
    // The highest @should be 1.7.2 from Workspace.revealLeaf
    const maxSince = "1.7.2";
    expect(manifest.minAppVersion).toBe(maxSince);
  });
});

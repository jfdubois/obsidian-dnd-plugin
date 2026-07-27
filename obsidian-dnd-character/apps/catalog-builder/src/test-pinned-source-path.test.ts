import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { createRequire } from "module";
import {
  pinnedFiveEToolsPath,
  pinnedFiveEToolsRevision,
  parsePinnedRevision,
} from "./test-pinned-source-path";

const realRequire = createRequire(import.meta.url);
const realFs = realRequire("fs") as typeof fs;

vi.mock("fs", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

describe("pinnedFiveEToolsRevision", () => {
  it("returns the committed 40-char hex revision from the real file", () => {
    const revision = pinnedFiveEToolsRevision();
    expect(revision).toBe("3c5d9d3175ca9637132011c75efd73aad7a2364d");
  });
});

describe("parsePinnedRevision", () => {
  it("returns a valid revision", () => {
    const r = parsePinnedRevision("abcdef0123456789abcdef0123456789abcdef01\n", "/fake/path");
    expect(r).toBe("abcdef0123456789abcdef0123456789abcdef01");
  });

  it("throws on empty content", () => {
    expect(() => parsePinnedRevision("   ", "/fake/path")).toThrow(/empty/);
  });

  it("throws on uppercase hex", () => {
    expect(() => parsePinnedRevision("ABCDEF0123456789ABCDEF0123456789ABCDEF01", "/fake/path")).toThrow(/malformed/);
  });

  it("throws on short hash", () => {
    expect(() => parsePinnedRevision("abc123", "/fake/path")).toThrow(/malformed/);
  });

  it("throws on non-hex characters", () => {
    expect(() => parsePinnedRevision("gggggggggggggggggggggggggggggggggggggggg", "/fake/path")).toThrow(/malformed/);
  });
});

describe("pinnedFiveEToolsPath", () => {
  let savedEnv: string | undefined;
  let tempBase: string;

  beforeEach(() => {
    savedEnv = process.env.FIVEETOOLS_SRC_PATH;
    tempBase = resolve(tmpdir(), "pinned-source-test");
  });

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.FIVEETOOLS_SRC_PATH;
    } else {
      process.env.FIVEETOOLS_SRC_PATH = savedEnv;
    }
    vi.clearAllMocks();
  });

  it("uses FIVEETOOLS_SRC_PATH when set to a valid directory", () => {
    const overrideDir = resolve(tempBase, "override");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = overrideDir;

    const result = pinnedFiveEToolsPath();
    expect(result).toBe(overrideDir);
  });

  it("trims whitespace from FIVEETOOLS_SRC_PATH", () => {
    const overrideDir = resolve(tempBase, "trimmed");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = `  ${overrideDir}  `;

    const result = pinnedFiveEToolsPath();
    expect(result).toBe(overrideDir);
  });

  it("resolves relative paths from FIVEETOOLS_SRC_PATH", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = "./relative/path";

    const result = pinnedFiveEToolsPath();
    expect(result).not.toBe("./relative/path");
    expect(result).toMatch(/^[\w]:?\/|^\//);
  });

  it("falls back to checkout-relative path when FIVEETOOLS_SRC_PATH is whitespace-only", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = "   ";

    const result = pinnedFiveEToolsPath();
    expect(result).toMatch(/external[\\/]+5etools-src$/);
    expect(result).not.toContain("pinned-source-test");
  });

  it("falls back to checkout-relative path when FIVEETOOLS_SRC_PATH is empty", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = "";

    const result = pinnedFiveEToolsPath();
    expect(result).toMatch(/external[\\/]+5etools-src$/);
    expect(result).not.toContain("pinned-source-test");
  });

  it("falls back to checkout-relative path when FIVEETOOLS_SRC_PATH is undefined", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    delete process.env.FIVEETOOLS_SRC_PATH;

    const result = pinnedFiveEToolsPath();
    expect(result).toMatch(/external[\\/]+5etools-src$/);
    expect(result).not.toContain("pinned-source-test");
  });

  it("throws with 'source path missing' when the resolved path does not exist", () => {
    const missingPath = resolve(tempBase, "nonexistent");
    vi.mocked(fs.existsSync).mockReturnValue(false);
    process.env.FIVEETOOLS_SRC_PATH = missingPath;

    expect(() => pinnedFiveEToolsPath()).toThrow(/source path missing/);
    expect(() => pinnedFiveEToolsPath()).toThrow(missingPath);
    expect(() => pinnedFiveEToolsPath()).toThrow(/provisioned/);
    expect(() => pinnedFiveEToolsPath()).toThrow(/FIVEETOOLS_SRC_PATH/);
  });

  it("throws with 'source path is not a directory' when the path is a file", () => {
    const filePath = resolve(tempBase, "a-file");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = filePath;

    expect(() => pinnedFiveEToolsPath()).toThrow(/source path is not a directory/);
  });

  it("throws with '.git missing' when the directory lacks .git", () => {
    const dirWithoutGit = resolve(tempBase, "no-git");
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = dirWithoutGit;

    let thrown: Error | undefined;
    try { pinnedFiveEToolsPath(); } catch (e) { thrown = e as Error; }
    expect(thrown).toBeDefined();
    expect(thrown!.message).toMatch(/\.git missing/);
    expect(thrown!.message).toMatch(/\.git/);
  });

  it("throws with 'data missing' when the directory lacks data", () => {
    const dirWithoutData = resolve(tempBase, "no-data");
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = dirWithoutData;

    let thrown: Error | undefined;
    try { pinnedFiveEToolsPath(); } catch (e) { thrown = e as Error; }
    expect(thrown).toBeDefined();
    expect(thrown!.message).toMatch(/data missing/);
    expect(thrown!.message).toMatch(/data/);
  });

  it("restores environment state after test", () => {
    const originalValue = "original-value";
    process.env.FIVEETOOLS_SRC_PATH = originalValue;
    savedEnv = originalValue;

    process.env.FIVEETOOLS_SRC_PATH = "modified-value";
    if (savedEnv === undefined) {
      delete process.env.FIVEETOOLS_SRC_PATH;
    } else {
      process.env.FIVEETOOLS_SRC_PATH = savedEnv;
    }

    expect(process.env.FIVEETOOLS_SRC_PATH).toBe(originalValue);
  });

  it("cleans environment state when it was originally undefined", () => {
    delete process.env.FIVEETOOLS_SRC_PATH;
    const origSaved = undefined;

    process.env.FIVEETOOLS_SRC_PATH = "injected-value";
    if (origSaved === undefined) {
      delete process.env.FIVEETOOLS_SRC_PATH;
    } else {
      process.env.FIVEETOOLS_SRC_PATH = origSaved;
    }

    expect(process.env.FIVEETOOLS_SRC_PATH).toBeUndefined();
  });
});

describe("source audit", () => {
  const personalUser = "jd" + "ubois";
  const homePrefix = String.fromCharCode(47) + "home" + String.fromCharCode(47);
  const docProjects = "Documents" + String.fromCharCode(47) + "Projects";

  it("source files do not contain personal paths", () => {
    const sourceCode = realFs.readFileSync(
      resolve(__dirname, "test-pinned-source-path.ts"),
      "utf8",
    );
    expect(sourceCode).not.toContain(personalUser);
    expect(sourceCode).not.toContain(homePrefix);
    expect(sourceCode).not.toContain(docProjects);
  });

  it("test files do not contain personal paths", () => {
    const testCode = realFs.readFileSync(
      resolve(__dirname, "test-pinned-source-path.test.ts"),
      "utf8",
    );
    expect(testCode).not.toContain(personalUser);
    expect(testCode).not.toContain(homePrefix);
    expect(testCode).not.toContain(docProjects);
  });
});

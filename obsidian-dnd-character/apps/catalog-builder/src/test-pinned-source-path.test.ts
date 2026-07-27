import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import {
  pinnedFiveEToolsPath,
  pinnedFiveEToolsRevision,
} from "./test-pinned-source-path";

vi.mock("fs", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("fs");
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

describe("pinnedFiveEToolsRevision", () => {
  it("returns the 40-char hex revision from the file", () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      "abcdef0123456789abcdef0123456789abcdef01\n",
    );

    const revision = pinnedFiveEToolsRevision();
    expect(revision).toMatch(/^[0-9a-f]{40}$/);
  });

  it("throws when revision content is not 40 lowercase hex chars", () => {
    vi.mocked(fs.readFileSync).mockReturnValue("not-a-sha");

    expect(() => pinnedFiveEToolsRevision()).toThrow(/malformed/);
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
    process.env.FIVEETOOLS_SRC_PATH = savedEnv;
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

  it("falls back to checkout-relative path when FIVEETOOLS_SRC_PATH is undefined", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    delete process.env.FIVEETOOLS_SRC_PATH;

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

  it("throws when the resolved path does not exist", () => {
    const missingPath = resolve(tempBase, "nonexistent");
    vi.mocked(fs.existsSync).mockReturnValue(false);
    process.env.FIVEETOOLS_SRC_PATH = missingPath;

    expect(() => pinnedFiveEToolsPath()).toThrow(missingPath);
    expect(() => pinnedFiveEToolsPath()).toThrow(/provisioned/);
  });

  it("throws when the directory is missing .git", () => {
    const dirWithoutGit = resolve(tempBase, "no-git");
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = dirWithoutGit;

    expect(() => pinnedFiveEToolsPath()).toThrow(dirWithoutGit);
    expect(() => pinnedFiveEToolsPath()).toThrow(/provisioned/);
  });

  it("throws when the directory is missing data", () => {
    const dirWithoutData = resolve(tempBase, "no-data");
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);
    process.env.FIVEETOOLS_SRC_PATH = dirWithoutData;

    expect(() => pinnedFiveEToolsPath()).toThrow(dirWithoutData);
    expect(() => pinnedFiveEToolsPath()).toThrow(/provisioned/);
  });
});

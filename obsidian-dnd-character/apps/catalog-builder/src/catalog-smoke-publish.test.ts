import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const builderRoot = path.join(projectRoot, "apps", "catalog-builder");
const loaderPath = path.join(builderRoot, "catalog-node-loader.config.mjs");
const cliPath = path.join(builderRoot, "dist", "catalog-smoke-publish.js");
let root: string;
let networkBlocker: string;

function run(command: string, args: string[], environment: NodeJS.ProcessEnv = {}): ReturnType<typeof spawnSync> {
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, ...environment },
  });
}

function runCli(outputRoot: string, revision = "manual-smoke-001", environment?: NodeJS.ProcessEnv) {
  return run(process.execPath, [
    "--experimental-loader",
    loaderPath,
    cliPath,
    "--output-root",
    outputRoot,
    "--revision",
    revision,
  ], environment);
}

function output(result: ReturnType<typeof spawnSync>): string {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

beforeAll(() => {
  const build = run("npm", ["--prefix", projectRoot, "run", "build", "--workspace=apps/catalog-builder"]);
  expect(build.status, output(build)).toBe(0);
});

afterEach(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

describe("catalog smoke publication CLI", () => {
  it("publishes through the documented root command and reports its release paths", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-smoke-cli-"));
    const result = run("npm", [
      "--prefix", projectRoot,
      "run", "publish:catalog-smoke", "--",
      "--output-root", root,
      "--revision", "manual-smoke-001",
    ]);
    expect(result.status, output(result)).toBe(0);
    expect(result.stdout).toContain("Catalog revision: manual-smoke-001");
    expect(result.stdout).toContain("Source revision: manual-smoke-source-001");
    expect(result.stdout).toContain("Revision path:");
    expect(result.stdout).toContain("Current pointer path:");
    expect(fs.existsSync(path.join(root, "catalog", "v1", "current.json"))).toBe(true);
  }, 60_000);

  it("rejects invalid revisions and a missing required output root", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-smoke-cli-"));
    const invalid = runCli(root, "");
    expect(invalid.status).not.toBe(0);
    expect(output(invalid)).toContain("Catalog smoke publication failed");
    const missingOutput = run(process.execPath, ["--experimental-loader", loaderPath, cliPath]);
    expect(missingOutput.status).not.toBe(0);
    expect(output(missingOutput)).toContain("Missing required --output-root");
  });

  it("succeeds while standard outgoing Node transports are blocked", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-smoke-cli-"));
    networkBlocker = path.join(root, "block-network.mjs");
    fs.writeFileSync(networkBlocker, [
      'import net from "node:net";',
      'import tls from "node:tls";',
      'import http from "node:http";',
      'import https from "node:https";',
      'const block = () => { throw new Error("network access attempted by smoke CLI"); };',
      'net.connect = block; net.createConnection = block; tls.connect = block;',
      'http.request = block; http.get = block; https.request = block; https.get = block;',
      'globalThis.fetch = block;',
    ].join("\n"), "utf8");
    const result = runCli(root, "manual-smoke-001", { NODE_OPTIONS: `--import=${networkBlocker}` });
    expect(result.status, output(result)).toBe(0);
    expect(output(result)).not.toContain("network access attempted");
  });

  it("preserves immutable revisions and reactivates a repeated requested revision", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-smoke-cli-"));
    expect(runCli(root, "release-a").status).toBe(0);
    const revisionA = path.join(root, "catalog", "v1", "revisions", "release-a");
    const before = crypto.hash("sha256", fs.readFileSync(path.join(revisionA, "manifest.json")));
    expect(runCli(root, "release-b").status).toBe(0);
    expect(runCli(root, "release-a").status).toBe(0);
    expect(fs.existsSync(revisionA)).toBe(true);
    expect(crypto.hash("sha256", fs.readFileSync(path.join(revisionA, "manifest.json")))).toBe(before);
    expect(JSON.parse(fs.readFileSync(path.join(root, "catalog", "v1", "current.json"), "utf8"))).toEqual({ currentRevision: "release-a" });
  });
});

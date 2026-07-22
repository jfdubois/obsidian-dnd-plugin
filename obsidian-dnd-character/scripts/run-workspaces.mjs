import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const scriptName = process.argv[2];

if (!scriptName) {
  console.error("Usage: node run-workspaces.mjs <script-name>");
  process.exit(1);
}

const cwd = process.cwd();

function listWorkspaceDirs(parentDir) {
  const base = join(cwd, parentDir);
  if (!existsSync(base)) {
    return [];
  }
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parentDir, entry.name));
}

const workspaceDirs = [
  ...listWorkspaceDirs("apps"),
  ...listWorkspaceDirs("packages"),
];

const existingWorkspaces = workspaceDirs.filter(
  (dir) => existsSync(join(cwd, dir, "package.json"))
);

if (existingWorkspaces.length === 0) {
  console.log(`No workspace packages found. Skipping "${scriptName}".`);
  process.exit(0);
}

let failed = false;

for (const workspace of existingWorkspaces) {
  const pkgPath = join(cwd, workspace, "package.json");
  const pkg = JSON.parse(
    await import("node:fs/promises").then((m) => m.default.readFile(pkgPath, "utf8"))
  );

  if (!pkg.scripts || !pkg.scripts[scriptName]) {
    continue;
  }

  try {
    execSync(`npm run ${scriptName} -w ${workspace}`, {
      stdio: "inherit",
    });
  } catch {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

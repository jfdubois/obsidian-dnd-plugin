import { existsSync, readFileSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");

const REVISION_FILE = resolve(repositoryRoot, "config/pinned-5etools-revision.txt");

function buildErrorMessage(path: string): string {
  return [
    `Pinned 5eTools source clone not found at: ${path}`,
    `Ensure the external 5eTools clone is provisioned at that location.`,
    `Set FIVEETOOLS_SRC_PATH to override the default path.`,
  ].join("\n");
}

export function pinnedFiveEToolsPath(): string {
  const envPath = process.env.FIVEETOOLS_SRC_PATH;
  const clonePath =
    typeof envPath === "string" && envPath.length > 0
      ? envPath
      : resolve(repositoryRoot, "../external/5etools-src");

  if (!existsSync(clonePath)) {
    throw new Error(buildErrorMessage(clonePath));
  }

  const stats = statSync(clonePath);
  if (!stats.isDirectory()) {
    throw new Error(buildErrorMessage(clonePath));
  }

  if (!existsSync(resolve(clonePath, ".git"))) {
    throw new Error(buildErrorMessage(clonePath));
  }

  if (!existsSync(resolve(clonePath, "data"))) {
    throw new Error(buildErrorMessage(clonePath));
  }

  return clonePath;
}

export function pinnedFiveEToolsRevision(): string {
  let raw: string;
  try {
    raw = readFileSync(REVISION_FILE, "utf8");
  } catch {
    throw new Error(
      `Pinned 5eTools revision file not found at: ${REVISION_FILE}`,
    );
  }

  const revision = raw.trim();

  if (revision.length === 0) {
    throw new Error(
      `Pinned 5eTools revision file is empty: ${REVISION_FILE}`,
    );
  }

  if (!/^[0-9a-f]{40}$/.test(revision)) {
    throw new Error(
      `Pinned 5eTools revision is malformed (expected 40 lowercase hex chars): ${REVISION_FILE}`,
    );
  }

  return revision;
}

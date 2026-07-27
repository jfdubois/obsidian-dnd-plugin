import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");

export function pinnedFiveEToolsPath(): string {
  const clonePath = resolve(repositoryRoot, "../external/5etools-src");
  if (!existsSync(resolve(clonePath, "data"))) {
    throw new Error(
      `Pinned 5eTools source clone not found at checkout-relative path: ${clonePath}`,
    );
  }
  return clonePath;
}

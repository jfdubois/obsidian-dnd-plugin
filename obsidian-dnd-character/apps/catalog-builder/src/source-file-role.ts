export type SourceFileRole =
  | "canonical-content"
  | "platform-augmentation"
  | "generated-support"
  | "index-or-manifest"
  | "fluff-or-narrative"
  | "unknown-data";

export interface SourceFileRoleMetadata {
  readonly sourcePath: string;
  readonly role: SourceFileRole;
  readonly reason: string;
  readonly isCanonicalCopyCandidate: boolean;
}

function normalizedPath(sourcePath: string): string {
  return sourcePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^data\//, "");
}

function basename(sourcePath: string): string {
  const parts = normalizedPath(sourcePath).split("/");
  return parts[parts.length - 1] ?? sourcePath;
}

export function classifySourceFileRole(sourcePath: string): SourceFileRoleMetadata {
  const path = normalizedPath(sourcePath);
  const fileName = basename(path);

  if (!fileName.endsWith(".json")) {
    return {
      sourcePath,
      role: "unknown-data",
      reason: "Path is not a JSON data file.",
      isCanonicalCopyCandidate: false,
    };
  }

  if (/^foundry(?:-[^/]+)?\.json$/.test(fileName)) {
    return {
      sourcePath,
      role: "platform-augmentation",
      reason: "Pinned upstream treats foundry.json and foundry-*.json as Foundry platform data.",
      isCanonicalCopyCandidate: false,
    };
  }

  if (path.startsWith("generated/") || fileName.startsWith("gendata-") || fileName.startsWith("bookref-")) {
    return {
      sourcePath,
      role: "generated-support",
      reason: "Generated support data is produced from canonical sources and is not a primary entity source.",
      isCanonicalCopyCandidate: false,
    };
  }

  if (
    fileName === "index.json"
    || fileName === "fluff-index.json"
    || fileName === "sources.json"
    || fileName.startsWith("index-")
    || fileName === "package.json"
    || fileName === "package-lock.json"
  ) {
    return {
      sourcePath,
      role: "index-or-manifest",
      reason: "Index and manifest files route or describe data files rather than define canonical records.",
      isCanonicalCopyCandidate: false,
    };
  }

  if (fileName.startsWith("fluff-")) {
    return {
      sourcePath,
      role: "fluff-or-narrative",
      reason: "Fluff files contain narrative or media adjunct records.",
      isCanonicalCopyCandidate: false,
    };
  }

  return {
    sourcePath,
    role: "canonical-content",
    reason: "Pinned data JSON file is not a known support, index, narrative, or platform augmentation file.",
    isCanonicalCopyCandidate: true,
  };
}

export function isCanonicalCopyCandidateSource(sourcePath: string): boolean {
  return classifySourceFileRole(sourcePath).isCanonicalCopyCandidate;
}

import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, relative } from "path";

/* ── Types ─────────────────────────────────────────────────────── */

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface RawLoaderDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  path: string;
}

export interface RawLoadSummary {
  totalFound: number;
  successfullyParsed: number;
  parseFailures: number;
  readFailures: number;
}

export interface RawLoadResult {
  files: Record<string, unknown>;
  diagnostics: RawLoaderDiagnostic[];
  summary: RawLoadSummary;
}

/* ── Error ─────────────────────────────────────────────────────── */

export class RawLoaderError extends Error {
  constructor(
    public readonly code:
      | "DATA_DIR_NOT_FOUND"
      | "DATA_DIR_NOT_DIRECTORY"
      | "READ_PERMISSION_DENIED"
      | "JSON_PARSE_ERROR"
      | "UNEXPECTED_STRUCTURE",
    message: string,
    public readonly path?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RawLoaderError";
  }
}

/* ── Helpers ───────────────────────────────────────────────────── */

function discoverJsonFiles(directory: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(currentDir, { withFileTypes: false, encoding: "utf-8" }) as string[];
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = resolve(currentDir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (entry.endsWith(".json")) {
          results.push(fullPath);
        }
      } catch {
        // Skip entries we can't stat (e.g., broken symlinks)
      }
    }
  }

  walk(directory);
  return results;
}

function safeReadFile(filePath: string): { content: string } | RawLoaderDiagnostic {
  try {
    const content = readFileSync(filePath, { encoding: "utf-8" }) as string;
    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.includes("EACCES") || message.includes("permission")
      ? "READ_PERMISSION_DENIED"
      : "READ_ERROR";
    return {
      code,
      severity: "error",
      message: `Failed to read file: ${message}`,
      path: filePath,
    };
  }
}

function safeParseJson(content: string, filePath: string): { parsed: unknown } | RawLoaderDiagnostic {
  try {
    const parsed = JSON.parse(content);
    return { parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let lineInfo = "";

    // Extract line/column info from JSON parse error message
    const posMatch = message.match(/position\s+(\d+)/i);
    if (posMatch && posMatch[1]) {
      const position = parseInt(posMatch[1], 10);
      const lines = content.substring(0, position).split("\n");
      const lastLine = lines[lines.length - 1] ?? "";
      lineInfo = ` (line ${lines.length}, column ${lastLine.length + 1})`;
    }

    return {
      code: "JSON_PARSE_ERROR",
      severity: "error",
      message: `Failed to parse JSON${lineInfo}: ${message}`,
      path: filePath,
    };
  }
}

/* ── Main loader ───────────────────────────────────────────────── */

export function loadRawJsonFiles(clonePath: string): RawLoadResult {
  const resolvedClonePath = resolve(clonePath);
  const dataDir = resolve(resolvedClonePath, "data");

  // Verify data directory exists
  let dataStat;
  try {
    dataStat = statSync(dataDir);
  } catch {
    return {
      files: {},
      diagnostics: [
        {
          code: "DATA_DIR_NOT_FOUND",
          severity: "error",
          message: `Data directory not found: ${dataDir}`,
          path: dataDir,
        },
      ],
      summary: {
        totalFound: 0,
        successfullyParsed: 0,
        parseFailures: 0,
        readFailures: 0,
      },
    };
  }

  if (!dataStat.isDirectory()) {
    return {
      files: {},
      diagnostics: [
        {
          code: "DATA_DIR_NOT_DIRECTORY",
          severity: "error",
          message: `Data path is not a directory: ${dataDir}`,
          path: dataDir,
        },
      ],
      summary: {
        totalFound: 0,
        successfullyParsed: 0,
        parseFailures: 0,
        readFailures: 0,
      },
    };
  }

  // Discover all JSON files
  const jsonFiles = discoverJsonFiles(dataDir);
  const files: Record<string, unknown> = {};
  const diagnostics: RawLoaderDiagnostic[] = [];
  let successfullyParsed = 0;
  let parseFailures = 0;
  let readFailures = 0;

  // Process each file independently — one failure doesn't stop others
  for (const filePath of jsonFiles) {
    const relativePath = relative(dataDir, filePath).replace(/\\/g, "/");

    // Read file
    const readResult = safeReadFile(filePath);
    if ("code" in readResult) {
      diagnostics.push(readResult);
      readFailures++;
      continue;
    }

    // Parse JSON
    const parseResult = safeParseJson(readResult.content, filePath);
    if ("code" in parseResult) {
      diagnostics.push(parseResult);
      parseFailures++;
      continue;
    }

    files[relativePath] = parseResult.parsed;
    successfullyParsed++;
  }

  // Add info diagnostic for total files discovered
  if (jsonFiles.length > 0) {
    diagnostics.push({
      code: "DISCOVERY_COMPLETE",
      severity: "info",
      message: `Discovered ${jsonFiles.length} JSON files under data/`,
      path: dataDir,
    });
  }

  return {
    files,
    diagnostics,
    summary: {
      totalFound: jsonFiles.length,
      successfullyParsed,
      parseFailures,
      readFailures,
    },
  };
}

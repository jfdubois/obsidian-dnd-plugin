/**
 * Vault-safe character file paths.
 *
 * Character IDs are persisted unchanged in document content, but are URI
 * encoded when used as one Vault filename segment. This keeps ISO timestamps
 * (which contain `:`) usable on Windows-backed vaults.
 */

export type CharacterVaultPathResult =
  | { status: "valid"; folderPath: string; filePath: string }
  | { status: "invalid"; message: string };

export function characterVaultFilePath(
  charactersVaultPath: string,
  characterId: string,
): CharacterVaultPathResult {
  const folderPath = normalizeCharacterFolderPath(charactersVaultPath);
  if (folderPath === null) {
    return { status: "invalid", message: "The configured character folder path is invalid." };
  }
  if (characterId.length === 0) {
    return { status: "invalid", message: "The character identifier cannot be used as a Vault filename." };
  }
  return {
    status: "valid",
    folderPath,
    filePath: `${folderPath}/${encodeURIComponent(characterId)}.json`,
  };
}

export function normalizeCharacterFolderPath(path: string): string | null {
  const segments = path.split("/");
  if (segments.length === 0 || segments.some((segment) =>
    segment.length === 0 || segment === "." || segment === ".." || /[\\\\:*?"<>|]/.test(segment))) {
    return null;
  }
  return segments.join("/");
}

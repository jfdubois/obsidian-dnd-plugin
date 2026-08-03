/**
 * Validates that an artifact path is safe for URL construction.
 *
 * Rejects paths that could lead to path traversal, protocol abuse,
 * or unexpected server behavior.
 *
 * Rules:
 * 1. Must be a non-empty string
 * 2. Must not contain ".." path segments
 * 3. Must not be absolute (no leading "/" or drive letter)
 * 4. Must not contain backslashes
 * 5. Must not contain "." as a standalone segment
 * 6. Must not contain query strings ("?") or fragments ("#")
 * 7. Must not contain URL schemes (http://, https://, javascript:, data:, etc.)
 * 8. Must not contain null bytes
 * 9. Must not contain control characters
 * 10. Must end with ".json"
 *
 * @throws Error if the path is unsafe
 */
export function validateArtifactPath(path: string): void {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error('Artifact path must be a non-empty string');
  }

  if (path.includes('..')) {
    throw new Error('Artifact path must not contain \'..\' path segments');
  }

  if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) {
    throw new Error('Artifact path must not be absolute');
  }

  if (path.includes('\\')) {
    throw new Error('Artifact path must not contain backslashes');
  }

  // Reject "." as a standalone segment
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment === '.') {
      throw new Error('Artifact path must not contain \'.\' segments');
    }
  }

  if (path.includes('?') || path.includes('#')) {
    throw new Error('Artifact path must not contain query strings or fragments');
  }

  const lower = path.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:')
  ) {
    throw new Error('Artifact path must not contain URL schemes');
  }

  if (path.includes('\0')) {
    throw new Error('Artifact path must not contain null bytes');
  }

  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i);
    if (code < 0x20 && code !== 0x09) {
      throw new Error('Artifact path must not contain control characters');
    }
  }

  if (!path.endsWith('.json')) {
    throw new Error('Artifact path must end with \'.json\'');
  }
}

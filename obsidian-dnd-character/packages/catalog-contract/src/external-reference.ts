/** Supplemental catalog-owned links to an external reference provider. */
export interface ExternalReference {
  provider: "5etools";
  relativeTarget: string;
}

export function isExternalReference(value: unknown): value is ExternalReference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return obj.provider === "5etools" && isRelativeExternalTarget(obj.relativeTarget);
}

export function isExternalReferenceCollection(value: unknown): value is ExternalReference[] {
  return Array.isArray(value)
    && value.every(isExternalReference)
    && new Set(value.map((reference) => reference.provider)).size === value.length;
}

/** A provider target is site-relative and may not escape a configured base path. */
export function isRelativeExternalTarget(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.startsWith("/") || value.includes("\\")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.includes("@")) return false;
  const path = value.split(/[?#]/, 1)[0] ?? "";
  return path.split("/").every((segment) => segment !== ".." && segment !== ".");
}

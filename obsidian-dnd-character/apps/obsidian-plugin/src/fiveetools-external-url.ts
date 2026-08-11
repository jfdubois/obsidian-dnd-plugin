import { isExternalReference, type ExternalReference } from "@obsidian-dnd/catalog-contract";

export function normalizeFiveEToolsWebBaseUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.search || url.hash) return undefined;
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  } catch { return undefined; }
}

export function resolveFiveEToolsExternalUrl(baseUrl: unknown, reference: unknown): string | undefined {
  const normalizedBase = normalizeFiveEToolsWebBaseUrl(baseUrl);
  if (normalizedBase === undefined || !isExternalReference(reference)) return undefined;
  try {
    const base = new URL(normalizedBase);
    const target = new URL(reference.relativeTarget, base);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) return undefined;
    return target.toString();
  } catch { return undefined; }
}

export function findFiveEToolsExternalReference(references: readonly ExternalReference[] | undefined): ExternalReference | undefined {
  return references?.find((reference) => reference.provider === "5etools");
}

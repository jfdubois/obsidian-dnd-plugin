import type { CopyModRawRecord } from "./mod-types";

/* ── Helpers ───────────────────────────────────────────────────── */

export function makeCopyModRawRecord(overrides: Record<string, unknown> = {}): CopyModRawRecord {
  const { name, source, ...rest } = overrides;
  return Object.freeze({
    name: (name as string) ?? "Common",
    source: (source as string) ?? "PHB",
    remaining: Object.freeze({
      entries: [],
      type: "language",
      speakerType: "All races",
      ...rest,
    }),
  });
}

export const ctx = {
  knownPinnedSources: new Set(["PHB", "XPHB", "XGtE", "ERLW", "DMG", "MM"]),
};

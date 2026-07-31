import type { CopyModRawRecord } from "./mod-types";

/* ── Helpers ───────────────────────────────────────────────────── */

export function makeCopyModRawRecord(overrides: Record<string, unknown> = {}): CopyModRawRecord {
  const { name, source, ...rest } = overrides;
  return Object.freeze({
    name: (name as string) ?? "Frenzy",
    source: (source as string) ?? "PHB",
    remaining: Object.freeze({
      className: "Barbarian",
      subclassShortName: "Berserker",
      level: 1,
      entries: [],
      ...rest,
    }),
  });
}

export const ctx = {
  knownPinnedSources: new Set(["PHB", "XPHB", "XGtE", "ERLW", "DMG", "MM"]),
};

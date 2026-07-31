import type { CopyModRawRecord } from "./mod-types";

/* ── Helpers ───────────────────────────────────────────────────── */

export function makeCopyModRawRecord(overrides: Record<string, unknown> = {}): CopyModRawRecord {
  const { name, source, ...rest } = overrides;
  return Object.freeze({
    name: (name as string) ?? "Fireball",
    source: (source as string) ?? "PHB",
    remaining: Object.freeze({
      entries: [],
      school: "V",
      level: 3,
      time: [{ number: 1, unit: "action" }],
      range: { type: "point", distance: { type: "feet", amount: 150 } },
      duration: [{ type: "instant" }],
      meta: {},
      ...rest,
    }),
  });
}

export const ctx = {
  knownPinnedSources: new Set(["PHB", "XPHB", "XGtE", "ERLW", "DMG", "MM"]),
};

import type { RandomSource } from "./creator-random-grant-resolution";

/** Browser-safe entropy adapter; creator controls never implement dice rolling. */
export function createCreatorRandomSource(): RandomSource {
  return {
    next(): number {
      const values = new Uint32Array(1);
      globalThis.crypto.getRandomValues(values);
      return values[0]! / 0x1_0000_0000;
    },
  };
}

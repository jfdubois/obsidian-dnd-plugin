export interface CharacterCurrencyState { cp: number; sp: number; ep: number; gp: number; pp: number; }
export const EMPTY_CHARACTER_CURRENCY: CharacterCurrencyState = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
export function isCharacterCurrencyState(value: unknown): value is CharacterCurrencyState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return [obj.cp, obj.sp, obj.ep, obj.gp, obj.pp].every((amount) => typeof amount === "number" && Number.isInteger(amount) && amount >= 0);
}

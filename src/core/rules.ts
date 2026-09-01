import type { Speed } from "./types";

export interface RulesProfile {
  id: "official-1980" | "brien";
  name: string;
  wind: boolean;
  injuries: boolean;
  ejections: boolean;
  pitcherPickoffs: boolean;
  voluntaryStealBases: Array<2 | 3 | 4>;
  ignoreModernBatterModifiers: boolean;
  switchHittersUsePrintedGrade: boolean;
  fixedDefense: boolean;
}

export const OFFICIAL_1980: RulesProfile = {
  id: "official-1980",
  name: "Official 1980",
  wind: true,
  injuries: true,
  ejections: true,
  pitcherPickoffs: true,
  voluntaryStealBases: [2, 3, 4],
  ignoreModernBatterModifiers: false,
  switchHittersUsePrintedGrade: false,
  fixedDefense: false,
};

export const BRIEN_RULES: RulesProfile = {
  id: "brien",
  name: "Brien's Rules",
  wind: false,
  injuries: false,
  ejections: false,
  pitcherPickoffs: false,
  voluntaryStealBases: [2],
  ignoreModernBatterModifiers: true,
  switchHittersUsePrintedGrade: true,
  fixedDefense: true,
};

export const RULES_PROFILES = [BRIEN_RULES, OFFICIAL_1980] as const;

export interface AutoStealContext {
  speed: Speed;
  outs: number;
  secondOccupied: boolean;
  twoStrikeCountPickup: boolean;
}

export function shouldAutoStealSecond(context: AutoStealContext): boolean {
  if (context.secondOccupied) return false;
  if (context.speed === "**") return context.outs < 2;
  if (context.speed === "*") return context.outs === 0 && !context.twoStrikeCountPickup;
  return false;
}

export function shouldAttemptExtraBase(arm: number, distanceFromNextBase: number): boolean {
  if (arm === 9) return distanceFromNextBase >= 10;
  if (arm === 8) return distanceFromNextBase >= 8;
  return false;
}

/** Chart-mandated and forced actions always stand, regardless of managerial restrictions. */
export function actionAllowed(origin: "chart" | "forced" | "managerial", requestedBase: 2 | 3 | 4): boolean {
  return origin !== "managerial" || BRIEN_RULES.voluntaryStealBases.includes(requestedBase);
}

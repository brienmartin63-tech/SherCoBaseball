import type { OffensiveGrade, PitcherRate } from "./types";

const grades: OffensiveGrade[] = ["AAA", "AA", "A", "B", "C", "D", "E", "F", "G"];
const rates: PitcherRate[] = ["J", "K", "L", "M", "X", "Y", "Z"];

const thresholds = [
  [44, 36, 35, 34, 33, 26, 25],
  [45, 44, 36, 35, 34, 33, 26],
  [46, 45, 44, 36, 35, 34, 33],
  [46, 45, 45, 44, 44, 36, 36],
  [46, 46, 45, 45, 44, 44, 36],
  [55, 46, 46, 45, 45, 44, 44],
  [55, 55, 46, 46, 45, 45, 44],
  [56, 55, 55, 46, 46, 45, 45],
  [56, 56, 55, 55, 46, 46, 45],
] as const;

export function hitNumber(grade: OffensiveGrade, rate: PitcherRate): number {
  return thresholds[grades.indexOf(grade)][rates.indexOf(rate)];
}

export function classifyPitch(shercoRoll: number, threshold: number): "PROBABLE_HIT" | "PROBABLE_OUT" | "SPECIAL_EVENT" {
  if (shercoRoll === 66) return "SPECIAL_EVENT";
  return shercoRoll >= threshold ? "PROBABLE_HIT" : "PROBABLE_OUT";
}

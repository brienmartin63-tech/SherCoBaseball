import { mirrorForLeftHandedBatter } from "./geometry";
import type { Batter, Coordinate, GameState, Hand, Park, Pitcher, PitcherRate, PlateAppearanceResolution } from "./types";
import {
  BASES_EMPTY_HIT_ERROR,
  BASES_EMPTY_OUT_ERROR,
  BASES_EMPTY_PROBABLE_HIT,
  BASES_EMPTY_PROBABLE_OUT,
  BASES_EMPTY_SPECIAL_EVENT,
  SHERCO_CHART_ROLLS,
  type BallTargetRule,
  type BattedBallChartEntry,
  type OneDieRoll,
  type ShercoChartRoll,
} from "../data/charts1980";

const shercoIndex = new Map(SHERCO_CHART_ROLLS.map((roll, index) => [roll, index]));

export function isShercoChartRoll(roll: number): roll is ShercoChartRoll {
  return shercoIndex.has(roll as ShercoChartRoll);
}

export function effectiveBattingHand(batterHand: Hand, pitcherHand: Pitcher["throws"]): "L" | "R" {
  if (batterHand !== "S") return batterHand;
  return pitcherHand === "R" ? "L" : "R";
}

/** The Special Events note changes these rates instead of producing an event. */
export function specialEventPitcherRate(rate: PitcherRate): PitcherRate | undefined {
  if (rate === "J") return "K";
  if (rate === "K") return "L";
  if (rate === "Y") return "X";
  if (rate === "Z") return "Y";
  return undefined;
}

export function withinHomeRunRating(roll: ShercoChartRoll, homeRunRating?: number): boolean {
  if (!homeRunRating || !isShercoChartRoll(homeRunRating)) return false;
  return (shercoIndex.get(roll) ?? Number.POSITIVE_INFINITY) <= (shercoIndex.get(homeRunRating) ?? -1);
}

function parseRatingBoundary(value: string): ShercoChartRoll | undefined {
  const number = Number(value.trim());
  return isShercoChartRoll(number) ? number : undefined;
}

/** Resolve the BB/K exception that is checked only after a Probable Out pitch. */
export function directPitchResult(roll: number, walkStrikeout: string): "WALK" | "STRIKEOUT" | undefined {
  if (!isShercoChartRoll(roll)) return undefined;
  const [walkText = "n", strikeoutText = "n"] = walkStrikeout.split(/[–—-]/u);
  const walkMaximum = parseRatingBoundary(walkText);
  const strikeoutMaximum = parseRatingBoundary(strikeoutText);
  const rollIndex = shercoIndex.get(roll)!;
  const walkIndex = walkMaximum ? shercoIndex.get(walkMaximum)! : -1;
  const strikeoutIndex = strikeoutMaximum ? shercoIndex.get(strikeoutMaximum)! : -1;
  if (walkMaximum && rollIndex <= walkIndex) return "WALK";
  if (strikeoutMaximum && rollIndex > walkIndex && rollIndex <= strikeoutIndex) return "STRIKEOUT";
  return undefined;
}

function moveTowardHome(coordinate: Coordinate, squares: number): Coordinate {
  return {
    row: Math.max(1, coordinate.row - squares),
    column: Math.max(1, coordinate.column - squares),
  };
}

function targetCoordinate(rule: BallTargetRule, batter: Batter, pitcher: Pitcher, park: Park): Coordinate | undefined {
  const base = rule.coordinate ?? park.fielders.find((fielder) => fielder.position === rule.fielder)?.at;
  if (!base) return undefined;
  const relative = rule.squaresInFront ? moveTowardHome(base, rule.squaresInFront) : base;
  const hand = effectiveBattingHand(batter.bats, pitcher.throws);
  const shouldMirror = rule.spray === "opposite" ? hand === "R" : rule.spray !== "fixed" && hand === "L";
  return shouldMirror ? mirrorForLeftHandedBatter(relative) : { ...relative };
}

export function resolveBasesEmptyBattedBall(
  chartFamily: "PROBABLE_HIT" | "PROBABLE_OUT",
  roll: number,
  batter: Batter,
  pitcher: Pitcher,
  park: Park,
  outs: GameState["outs"],
): PlateAppearanceResolution {
  if (!isShercoChartRoll(roll)) throw new Error(`Invalid SherCo chart roll: ${roll}`);
  const entry: BattedBallChartEntry = chartFamily === "PROBABLE_HIT"
    ? BASES_EMPTY_PROBABLE_HIT[roll]
    : BASES_EMPTY_PROBABLE_OUT[roll];
  if (entry.route === "SPECIAL_EVENT") return { phase: "SPECIAL_EVENT", baseState: "EMPTY", chartFamily: "SPECIAL_EVENT", description: entry.description, source: "1980 rulebook p.25" };
  if (entry.route === "ERROR") return { phase: "ERROR_CHART", baseState: "EMPTY", chartFamily: "OUT_ERROR", description: entry.description, source: "1980 rulebook p.25" };
  if (entry.route === "HIT_ERROR_CHECK") return { phase: "HIT_ERROR_CHECK", baseState: "EMPTY", chartFamily: "HIT_ERROR", description: entry.description, source: "1980 rulebook p.24" };

  const normalRule = entry.alternateByOuts?.[outs as 0 | 1 | 2] ?? entry.ball;
  const isProbableHomeRun = chartFamily === "PROBABLE_HIT" && Boolean(entry.homeRunBall) && withinHomeRunRating(roll, batter.homeRun);
  const ballRule = isProbableHomeRun ? entry.homeRunBall : normalRule;
  const ballAt = ballRule ? targetCoordinate(ballRule, batter, pitcher, park) : undefined;
  if (chartFamily === "PROBABLE_OUT" && entry.pitcherErrorCheckWithRunnersOut && outs > 0) {
    return {
      phase: "PITCHER_ERROR_CHECK",
      baseState: "EMPTY",
      chartFamily,
      description: "Grounder to 6-6; roll one die for the possible pitcher error (1 = error).",
      source: "1980 rulebook p.25",
      battedBallType: ballRule?.type,
      ballAt,
    };
  }
  return {
    phase: "BALL_IN_PLAY",
    baseState: "EMPTY",
    chartFamily,
    description: `${isProbableHomeRun ? "Probable home run. " : ""}${entry.description}`,
    source: chartFamily === "PROBABLE_HIT" ? "1980 rulebook p.24" : "1980 rulebook p.25",
    battedBallType: ballRule?.type,
    ballAt,
  };
}

export function resolveBasesEmptySpecialEvent(roll: OneDieRoll, batter: Batter, pitcher: Pitcher, park: Park): PlateAppearanceResolution {
  const entry = BASES_EMPTY_SPECIAL_EVENT[roll];
  if (entry.route === "BALL_CHECK") return { phase: "BALL_CHECK", baseState: "EMPTY", chartFamily: "SPECIAL_EVENT", description: entry.description, source: "1980 rulebook p.25" };
  if (entry.route === "COUNT_PENDING") return { phase: "COUNT_PENDING", baseState: "EMPTY", chartFamily: "SPECIAL_EVENT", description: entry.description, source: "1980 rulebook p.25" };
  const coordinate = entry.ball ? targetCoordinate(entry.ball, batter, pitcher, park) : undefined;
  return {
    phase: coordinate ? "BALL_IN_PLAY" : "DIRECT_RESULT",
    baseState: "EMPTY",
    chartFamily: "SPECIAL_EVENT",
    description: entry.description,
    source: "1980 rulebook p.25",
    battedBallType: entry.ball?.type,
    ballAt: coordinate,
  };
}

export function resolveBasesEmptyError(chartFamily: "HIT_ERROR" | "OUT_ERROR", roll: OneDieRoll): PlateAppearanceResolution {
  const entry = chartFamily === "HIT_ERROR" ? BASES_EMPTY_HIT_ERROR[roll] : BASES_EMPTY_OUT_ERROR[roll];
  return {
    phase: "DIRECT_RESULT",
    baseState: "EMPTY",
    chartFamily,
    description: entry.description,
    source: chartFamily === "HIT_ERROR" ? "1980 rulebook p.24" : "1980 rulebook p.25",
  };
}

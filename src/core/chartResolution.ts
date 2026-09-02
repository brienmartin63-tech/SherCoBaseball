import { farthestInPlaySquare, HOME_PLATE_SQUARE, mirrorForLeftHandedBatter, parkTerrainAt, squaresBetween } from "./geometry";
import type { Batter, Coordinate, FielderPosition, GameState, Hand, Park, Pitcher, PitcherRate, PlateAppearanceResolution } from "./types";
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

function advanceShercoRating(rating?: number): ShercoChartRoll {
  if (!rating || !isShercoChartRoll(rating)) return 11;
  return SHERCO_CHART_ROLLS[Math.min(SHERCO_CHART_ROLLS.indexOf(rating) + 1, SHERCO_CHART_ROLLS.length - 1)];
}

export function effectivePowerRatings(batter: Batter, pitcher: Pitcher): { homeRun?: ShercoChartRoll; triple?: ShercoChartRoll; gopherAdjusted: boolean } {
  const homeRun = batter.homeRun && isShercoChartRoll(batter.homeRun) ? batter.homeRun : undefined;
  const triple = batter.triple && isShercoChartRoll(batter.triple) ? batter.triple : undefined;
  if (pitcher.ratingPrefix !== "+") return { homeRun, triple, gopherAdjusted: false };
  return {
    homeRun: advanceShercoRating(homeRun),
    triple: triple ? advanceShercoRating(triple) : undefined,
    gopherAdjusted: true,
  };
}

export function isTripleRatingRoll(roll: ShercoChartRoll, tripleRating?: number): boolean {
  return Boolean(tripleRating) && roll === tripleRating;
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

function fieldLane(coordinate: Coordinate): Coordinate {
  if (coordinate.row === coordinate.column) return { row: 1, column: 1 };
  return coordinate.row < coordinate.column ? { row: 0, column: 1 } : { row: 1, column: 0 };
}

/** Move directly toward home on the fielder's RF, CF, or LF lane. */
export function moveInFrontOfFielder(coordinate: Coordinate, squares: number): Coordinate {
  const lane = fieldLane(coordinate);
  return {
    row: Math.max(1, coordinate.row - lane.row * squares),
    column: Math.max(1, coordinate.column - lane.column * squares),
  };
}

/** Move directly away from home on the same RF, CF, or LF lane. */
export function moveBehindFielder(coordinate: Coordinate, squares: number): Coordinate {
  const lane = fieldLane(coordinate);
  return {
    row: Math.min(28, coordinate.row + lane.row * squares),
    column: Math.min(28, coordinate.column + lane.column * squares),
  };
}

function targetCoordinate(rule: BallTargetRule, batter: Batter, pitcher: Pitcher, park: Park): Coordinate | undefined {
  const base = rule.coordinate ?? park.fielders.find((fielder) => fielder.position === rule.fielder)?.at;
  if (!base) return undefined;
  const relative = rule.squaresInFront
    ? moveInFrontOfFielder(base, rule.squaresInFront)
    : rule.squaresBehind
      ? moveBehindFielder(base, rule.squaresBehind)
      : base;
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
  brienRules = false,
): PlateAppearanceResolution {
  if (!isShercoChartRoll(roll)) throw new Error(`Invalid SherCo chart roll: ${roll}`);
  const entry: BattedBallChartEntry = chartFamily === "PROBABLE_HIT"
    ? BASES_EMPTY_PROBABLE_HIT[roll]
    : BASES_EMPTY_PROBABLE_OUT[roll];
  if (entry.route === "SPECIAL_EVENT") return { phase: "SPECIAL_EVENT", baseState: "EMPTY", chartFamily: "SPECIAL_EVENT", description: entry.description, source: "1980 rulebook p.25" };
  if (entry.route === "ERROR") return { phase: "ERROR_CHART", baseState: "EMPTY", chartFamily: "OUT_ERROR", description: entry.description, source: "1980 rulebook p.25" };
  if (entry.route === "HIT_ERROR_CHECK") {
    return brienRules
      ? { phase: "ERROR_CHART", baseState: "EMPTY", chartFamily: "HIT_ERROR", description: "Brien's Rules: roll one die directly on the Bases Empty Probable Hit Error Chart.", source: "Brien's Rules error sequence" }
      : { phase: "HIT_ERROR_CHECK", baseState: "EMPTY", chartFamily: "HIT_ERROR", description: entry.description, source: "1980 rulebook p.24" };
  }

  const powerRatings = effectivePowerRatings(batter, pitcher);
  const ratingAdjustment = powerRatings.gopherAdjusted
    ? `Gopher-ball adjustment: HR ${batter.homeRun ?? "none"}→${powerRatings.homeRun}${batter.triple ? `, triple ${batter.triple}→${powerRatings.triple}` : ""}. `
    : "";
  const tripleTriggered = chartFamily === "PROBABLE_HIT" && isTripleRatingRoll(roll, powerRatings.triple);
  if (tripleTriggered && !brienRules) {
    return {
      phase: "TRIPLE_DECISION",
      baseState: "EMPTY",
      chartFamily,
      description: `${ratingAdjustment}Triple rating ${powerRatings.triple}: choose the printed play or relocate the ball in fair territory.`,
      source: "1980 rulebook Rule 21e",
    };
  }
  if (tripleTriggered) {
    const tripleTarget = farthestInPlaySquare(park);
    if (tripleTarget) {
      return {
        phase: "BALL_IN_PLAY",
        baseState: "EMPTY",
        chartFamily,
        description: `${ratingAdjustment}Triple rating ${powerRatings.triple}: Brien's Rules moves the ball to ${tripleTarget.row}-${tripleTarget.column}, a farthest legal square (${squaresBetween(HOME_PLATE_SQUARE, tripleTarget)} from home), for a possible triple.`,
        source: "1980 rulebook Rule 21e; Brien automatic offensive choice",
        battedBallType: entry.ball?.type,
        ballAt: tripleTarget,
      };
    }
  }

  const normalRule = entry.alternateByOuts?.[outs as 0 | 1 | 2] ?? entry.ball;
  const isProbableHomeRun = chartFamily === "PROBABLE_HIT" && Boolean(entry.homeRunBall) && withinHomeRunRating(roll, powerRatings.homeRun);
  const ballRule = isProbableHomeRun ? entry.homeRunBall : normalRule;
  const ballAt = ballRule ? targetCoordinate(ballRule, batter, pitcher, park) : undefined;
  if (isProbableHomeRun && ballAt && parkTerrainAt(park, ballAt) === "beyondFence") {
    return {
      phase: "DIRECT_RESULT",
      baseState: "EMPTY",
      chartFamily,
      terminalOutcome: "HOME_RUN",
      description: `${ratingAdjustment}Home run: the adjusted HR result sends the fly to ${ballAt.row}-${ballAt.column}, beyond the fence.`,
      source: "1980 rulebook Rules 5k and 5q",
      battedBallType: "fly",
      ballAt,
    };
  }
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
    description: `${ratingAdjustment}${isProbableHomeRun ? "Probable home run. " : ""}${entry.description}`,
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
    terminalOutcome: roll === 1 ? "WALK" : roll === 5 ? "HIT_BY_PITCH" : roll === 6 ? "STRIKEOUT" : undefined,
  };
}

export function basesEmptyErrorFielder(
  chartFamily: "HIT_ERROR" | "OUT_ERROR",
  roll: OneDieRoll,
  batter: Batter,
  pitcher: Pitcher,
): FielderPosition | undefined {
  if (chartFamily !== "HIT_ERROR") return undefined;
  if (roll === 1 || roll === 2) return "CF";
  if (roll === 3) return "LF";
  if (roll === 4) return "3B";
  if (roll === 5) return "RF";
  return effectiveBattingHand(batter.bats, pitcher.throws) === "R" ? "LF" : "RF";
}

export function resolveBasesEmptyError(
  chartFamily: "HIT_ERROR" | "OUT_ERROR",
  roll: OneDieRoll,
  superiorErrorCheck = false,
  errorFielderPosition?: FielderPosition,
): PlateAppearanceResolution {
  const entry = chartFamily === "HIT_ERROR" ? BASES_EMPTY_HIT_ERROR[roll] : BASES_EMPTY_OUT_ERROR[roll];
  if (chartFamily === "HIT_ERROR" && superiorErrorCheck && errorFielderPosition) {
    return {
      phase: "SUPERIOR_ERROR_CHECK",
      baseState: "EMPTY",
      chartFamily,
      description: `${errorFielderPosition} is Superior. Roll one die: 1–3, no error; 4–6, apply error-chart result ${roll}.`,
      source: "1980 rulebook Rule 19d and p.24",
      errorChartRoll: roll,
      errorFielderPosition,
    };
  }
  const awardedBase = chartFamily === "HIT_ERROR"
    ? roll === 6 ? "THIRD" : "SECOND"
    : roll === 3 ? "SECOND" : "FIRST";
  return {
    phase: "DIRECT_RESULT",
    baseState: "EMPTY",
    chartFamily,
    description: entry.description,
    source: chartFamily === "HIT_ERROR" ? "1980 rulebook p.24" : "1980 rulebook p.25",
    terminalOutcome: "ERROR",
    awardedBase,
    creditedHit: chartFamily === "HIT_ERROR" && (roll === 1 || roll === 5),
    errorChartRoll: roll,
    errorFielderPosition,
    chartAdvancementLocked: true,
  };
}

export function resolveBasesEmptySuperiorError(
  pending: PlateAppearanceResolution,
  roll: OneDieRoll,
): PlateAppearanceResolution {
  if (pending.phase !== "SUPERIOR_ERROR_CHECK" || pending.chartFamily !== "HIT_ERROR" || !pending.errorChartRoll) return pending;
  if (roll >= 4) {
    return resolveBasesEmptyError("HIT_ERROR", pending.errorChartRoll, false, pending.errorFielderPosition);
  }

  const isSingle = pending.errorChartRoll === 5;
  return {
    phase: "DIRECT_RESULT",
    baseState: "EMPTY",
    chartFamily: "HIT_ERROR",
    terminalOutcome: isSingle ? "SINGLE" : "OUT",
    description: isSingle
      ? "Superior right fielder prevents the error; score a single only, with the batter at first."
      : `Superior ${pending.errorFielderPosition ?? "fielder"} prevents the error and records the out.`,
    source: "1980 rulebook Rule 19d and p.24",
    errorChartRoll: pending.errorChartRoll,
    errorFielderPosition: pending.errorFielderPosition,
    chartAdvancementLocked: true,
  };
}

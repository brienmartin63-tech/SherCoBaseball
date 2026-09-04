import rawCharts from "../data/occupiedCharts1980.json";
import { farthestInPlaySquare, parkTerrainAt, squaresBetween, HOME_PLATE_SQUARE } from "./geometry";
import { effectivePowerRatings, isShercoChartRoll, isTripleRatingRoll, targetCoordinate, withinHomeRunRating } from "./chartResolution";
import type { BallTargetRule, OneDieRoll, ShercoChartRoll } from "../data/charts1980";
import type { BaseState, Batter, ChartFamily, GameState, Park, Pitcher, PlateAppearanceResolution } from "./types";

export type OccupiedBaseState = Exclude<BaseState, "EMPTY">;

interface MainEntry {
  description: string;
  ball?: BallTargetRule;
  homeRunBall?: BallTargetRule;
  route?: "HIT_ERROR" | "OUT_ERROR";
}

interface OneDieEntry {
  description: string;
}

interface OccupiedTables {
  probableHit: Record<string, MainEntry>;
  hitError: Record<string, OneDieEntry>;
  probableOut: Record<string, MainEntry>;
  outError: Record<string, OneDieEntry>;
  specialEvent: Record<string, OneDieEntry>;
}

export const OCCUPIED_CHARTS_1980 = rawCharts as unknown as Record<OccupiedBaseState, OccupiedTables>;

const SOURCE_PAGE: Record<OccupiedBaseState, { hit: number; out: number }> = {
  FIRST: { hit: 26, out: 27 },
  SECOND: { hit: 28, out: 29 },
  THIRD: { hit: 30, out: 31 },
  FIRST_SECOND: { hit: 32, out: 33 },
  FIRST_THIRD: { hit: 34, out: 35 },
  SECOND_THIRD: { hit: 36, out: 37 },
  LOADED: { hit: 39, out: 40 },
};

export function occupiedChartEntry(
  baseState: OccupiedBaseState,
  family: ChartFamily,
  roll: ShercoChartRoll | OneDieRoll,
): MainEntry | OneDieEntry {
  const tables = OCCUPIED_CHARTS_1980[baseState];
  const table = family === "PROBABLE_HIT" ? tables.probableHit
    : family === "PROBABLE_OUT" ? tables.probableOut
      : family === "HIT_ERROR" ? tables.hitError
        : family === "OUT_ERROR" ? tables.outError
          : tables.specialEvent;
  const entry = table[String(roll)];
  if (!entry) throw new Error(`Missing 1980 ${baseState} ${family} result ${roll}.`);
  return entry;
}

export function resolveOccupiedBattedBall(
  baseState: OccupiedBaseState,
  chartFamily: "PROBABLE_HIT" | "PROBABLE_OUT",
  roll: number,
  batter: Batter,
  pitcher: Pitcher,
  park: Park,
  brienRules: boolean,
): PlateAppearanceResolution {
  if (!isShercoChartRoll(roll)) throw new Error(`Invalid SherCo chart roll: ${roll}`);
  const entry = occupiedChartEntry(baseState, chartFamily, roll) as MainEntry;
  const page = chartFamily === "PROBABLE_HIT" ? SOURCE_PAGE[baseState].hit : SOURCE_PAGE[baseState].out;
  if (entry.route) {
    return {
      phase: "ERROR_CHART",
      baseState,
      chartFamily: entry.route,
      description: entry.description,
      source: `1980 rulebook p.${page}`,
    };
  }

  const power = effectivePowerRatings(batter, pitcher);
  const tripleTriggered = chartFamily === "PROBABLE_HIT" && isTripleRatingRoll(roll, power.triple);
  if (tripleTriggered && !brienRules) {
    return {
      phase: "TRIPLE_DECISION",
      baseState,
      chartFamily,
      description: `Triple rating ${power.triple}: choose the printed play or relocate the ball in fair territory. ${entry.description}`,
      source: `1980 rulebook Rule 21e and p.${page}`,
    };
  }
  if (tripleTriggered) {
    const tripleTarget = farthestInPlaySquare(park);
    if (tripleTarget) {
      return {
        phase: "BALL_IN_PLAY",
        baseState,
        chartFamily,
        battedBallType: entry.ball?.type,
        ballAt: tripleTarget,
        description: `Triple rating ${power.triple}: Brien's Rules moves the ball to ${tripleTarget.row}-${tripleTarget.column}, a farthest legal square (${squaresBetween(HOME_PLATE_SQUARE, tripleTarget)} from home), for a possible triple.`,
        source: `1980 rulebook Rule 21e and p.${page}; Brien automatic offensive choice`,
      };
    }
  }

  const homeRunResult = chartFamily === "PROBABLE_HIT" && Boolean(entry.homeRunBall) && withinHomeRunRating(roll, power.homeRun);
  const rule = homeRunResult ? entry.homeRunBall : entry.ball;
  const ballAt = rule ? targetCoordinate(rule, batter, pitcher, park) : undefined;
  if (!rule || !ballAt) throw new Error(`No compiled ball placement for ${baseState} ${chartFamily} ${roll}.`);
  const outside = parkTerrainAt(park, ballAt) === "beyondFence";
  return {
    phase: homeRunResult && outside ? "DIRECT_RESULT" : "BALL_IN_PLAY",
    baseState,
    chartFamily,
    terminalOutcome: homeRunResult && outside ? "HOME_RUN" : undefined,
    battedBallType: rule.type,
    ballAt,
    description: `${entry.description}${homeRunResult ? outside ? ` Home run at ${ballAt.row}-${ballAt.column}.` : ` The HR-rating fly remains in play at ${ballAt.row}-${ballAt.column}.` : ""}`,
    source: `1980 rulebook p.${page}`,
  };
}

export function resolveOccupiedOneDie(baseState: OccupiedBaseState, family: "SPECIAL_EVENT" | "HIT_ERROR" | "OUT_ERROR", roll: OneDieRoll): PlateAppearanceResolution {
  const entry = occupiedChartEntry(baseState, family, roll);
  const lower = entry.description.toLowerCase();
  const terminalOutcome = family === "SPECIAL_EVENT"
    ? lower.startsWith("base on balls") ? "WALK"
      : lower.startsWith("hit by pitch") || lower.startsWith("hit by pitcher") ? "HIT_BY_PITCH"
        : (lower.startsWith("called third strike") && !lower.includes("if third out")) || lower.startsWith("called strike out") || lower.startsWith("batter strikes out") ? "STRIKEOUT"
          : undefined
    : undefined;
  return {
    phase: terminalOutcome ? "DIRECT_RESULT" : "CHART_RESULT_PENDING",
    baseState,
    chartFamily: family,
    terminalOutcome,
    description: entry.description,
    source: `1980 rulebook ${baseState.replace("_", "/")} ${family.replace("_", " ")} chart`,
  };
}

export function isOccupiedBaseState(baseState: GameState["resolution"]["baseState"]): baseState is OccupiedBaseState {
  return baseState !== "EMPTY";
}

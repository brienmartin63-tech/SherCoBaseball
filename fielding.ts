import { BASE_REFERENCE_SQUARES, directPath, distanceToBase, moveAlongPath, nearestFielder, resolveGroundBallRicochet, squaresBetween, type RatedFielder } from "./geometry";
import type { BaseName, Batter, Coordinate, FieldingAttempt, FielderPosition, Park, Pitcher, Speed, Team } from "./types";

export interface NamedRatedFielder extends RatedFielder {
  name: string;
}

export type ThrowResult = "OUT" | "TIE" | "SAFE";

export interface ThrowResolution {
  allowance: number;
  remaining: number;
  result: ThrowResult;
  ballAt: Coordinate;
  path: Coordinate[];
}

export interface ContinuousPlayTarget {
  base: BaseName;
  pivotArm?: number;
}

export interface ContinuousPlayLeg {
  base: BaseName;
  routeDistance: number;
  result: ThrowResult;
}

export interface ContinuousPlayResolution extends ThrowResolution {
  rawAllowance: number;
  pivotPenalty: number;
  totalRoute: number;
  legs: ContinuousPlayLeg[];
}

export function buildRatedDefense(team: Team, pitcher: Pitcher, park: Park): NamedRatedFielder[] {
  return park.fielders.map((location) => {
    const player = location.position === "P"
      ? pitcher
      : team.lineup.find((candidate) => candidate.position === location.position);
    if (!player) throw new Error(`No ${location.position} is available for ${team.nickname}.`);
    return {
      ...location,
      name: player.name,
      arm: player.defense.arm,
      range: player.defense.range,
    };
  });
}

export function createFieldingAttempt(
  batter: Batter,
  park: Park,
  defense: NamedRatedFielder[],
  ballAt: Coordinate,
  battedBallType: FieldingAttempt["battedBallType"],
): FieldingAttempt {
  const ricochet = battedBallType === "ground" ? resolveGroundBallRicochet(park, ballAt) : undefined;
  const playableBallAt = ricochet?.finalBallAt ?? ballAt;
  const fielder = nearestFielder(playableBallAt, defense, battedBallType);
  if (!fielder) throw new Error("No fielder is available to play the ball.");
  const named = fielder as NamedRatedFielder;
  return {
    batterId: batter.id,
    ballAt: playableBallAt,
    battedBallType,
    fielderPosition: named.position,
    fielderName: named.name,
    fielderAt: named.at,
    arm: named.arm as 8 | 9,
    range: named.range as 4 | 5,
    fieldingDistance: ricochet
      ? squaresBetween(named.at, ricochet.fenceAt) + squaresBetween(ricochet.fenceAt, playableBallAt)
      : squaresBetween(named.at, playableBallAt),
    targetBase: "FIRST",
    targetDistance: distanceToBase(playableBallAt, "FIRST"),
    fieldingPath: ricochet
      ? [...directPath(named.at, ricochet.fenceAt), ...directPath(ricochet.fenceAt, playableBallAt)]
      : directPath(named.at, playableBallAt),
    ricochet: ricochet ? {
      originalLandingAt: ricochet.originalLandingAt,
      fenceAt: ricochet.fenceAt,
      depth: ricochet.depth,
    } : undefined,
  };
}

export function isAirborneCatch(attempt: FieldingAttempt): boolean {
  return attempt.battedBallType !== "ground" && attempt.fieldingDistance <= attempt.range;
}

export function resolveThrow(attempt: FieldingAttempt, diceTotal: number): ThrowResolution {
  const allowance = Math.max(attempt.arm, diceTotal);
  const remaining = Math.max(0, allowance - attempt.fieldingDistance);
  const result = remaining > attempt.targetDistance ? "OUT" : remaining === attempt.targetDistance ? "TIE" : "SAFE";
  const path = directPath(attempt.ballAt, BASE_REFERENCE_SQUARES[attempt.targetBase]);
  return {
    allowance,
    remaining,
    result,
    ballAt: moveAlongPath(path, remaining, attempt.ballAt),
    path: path.slice(0, remaining),
  };
}

export function pivotRulePenalty(initialArm: number, pivotArm?: number): number {
  return pivotArm !== undefined && pivotArm < initialArm ? 1 : 0;
}

/**
 * A double or triple play is one continuous action using the initial fielder's
 * allowance. Pivot movement is free; a weaker pivot arm reduces that allowance
 * by one under Brien's adopted Pivot Rule.
 */
export function resolveContinuousPlay(
  attempt: Pick<FieldingAttempt, "arm" | "fieldingDistance" | "ballAt">,
  diceTotal: number,
  targets: ContinuousPlayTarget[],
): ContinuousPlayResolution {
  const rawAllowance = Math.max(attempt.arm, diceTotal);
  const pivotPenalty = pivotRulePenalty(attempt.arm, targets[0]?.pivotArm);
  const allowance = Math.max(0, rawAllowance - pivotPenalty);
  const throwingPoints = Math.max(0, allowance - attempt.fieldingDistance);
  const path: Coordinate[] = [];
  const legs: ContinuousPlayLeg[] = [];
  let cursor = attempt.ballAt;
  let cumulativeRoute = attempt.fieldingDistance;

  for (const target of targets) {
    const legPath = directPath(cursor, BASE_REFERENCE_SQUARES[target.base]);
    path.push(...legPath);
    cumulativeRoute += legPath.length;
    legs.push({
      base: target.base,
      routeDistance: cumulativeRoute,
      result: allowance > cumulativeRoute ? "OUT" : allowance === cumulativeRoute ? "TIE" : "SAFE",
    });
    cursor = BASE_REFERENCE_SQUARES[target.base];
  }

  const totalRoute = cumulativeRoute;
  const lastResult = legs.at(-1)?.result ?? "SAFE";
  return {
    rawAllowance,
    allowance,
    pivotPenalty,
    remaining: throwingPoints,
    result: lastResult,
    totalRoute,
    legs,
    path: path.slice(0, throwingPoints),
    ballAt: moveAlongPath(path, throwingPoints, attempt.ballAt),
  };
}

export function automaticUmpireCall(roll: number, arm: 8 | 9, speed: Speed): "OUT" | "SAFE" {
  if (roll === 66) return "OUT"; // Ejections are ignored under Brien's current profile.
  const maximumOut = arm === 9
    ? speed === "**" ? 23 : speed === "*" ? 25 : 33
    : speed === "**" ? 16 : speed === "*" ? 23 : 25;
  return roll <= maximumOut ? "OUT" : "SAFE";
}

export function positionName(position: FielderPosition): string {
  return ({
    P: "pitcher", C: "catcher", "1B": "first baseman", "2B": "second baseman",
    "3B": "third baseman", SS: "shortstop", LF: "left fielder", CF: "center fielder", RF: "right fielder",
  } as const)[position];
}

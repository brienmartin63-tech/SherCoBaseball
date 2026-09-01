import { BASE_REFERENCE_SQUARES, distanceToBase, moveToward, nearestFielder, squaresBetween, type RatedFielder } from "./geometry";
import type { Batter, Coordinate, FieldingAttempt, FielderPosition, Park, Pitcher, Speed, Team } from "./types";

export interface NamedRatedFielder extends RatedFielder {
  name: string;
}

export type ThrowResult = "OUT" | "TIE" | "SAFE";

export interface ThrowResolution {
  allowance: number;
  remaining: number;
  result: ThrowResult;
  ballAt: Coordinate;
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
  const fielder = nearestFielder(ballAt, defense, battedBallType);
  if (!fielder) throw new Error("No fielder is available to play the ball.");
  const named = fielder as NamedRatedFielder;
  return {
    batterId: batter.id,
    ballAt,
    battedBallType,
    fielderPosition: named.position,
    fielderName: named.name,
    fielderAt: named.at,
    arm: named.arm as 8 | 9,
    range: named.range as 4 | 5,
    fieldingDistance: squaresBetween(named.at, ballAt),
    targetBase: "FIRST",
    targetDistance: distanceToBase(ballAt, "FIRST"),
  };
}

export function isAirborneCatch(attempt: FieldingAttempt): boolean {
  return attempt.battedBallType !== "ground" && attempt.fieldingDistance <= attempt.range;
}

export function resolveThrow(attempt: FieldingAttempt, diceTotal: number): ThrowResolution {
  const allowance = Math.max(attempt.arm, diceTotal);
  const remaining = Math.max(0, allowance - attempt.fieldingDistance);
  const result = remaining > attempt.targetDistance ? "OUT" : remaining === attempt.targetDistance ? "TIE" : "SAFE";
  return {
    allowance,
    remaining,
    result,
    ballAt: moveToward(attempt.ballAt, BASE_REFERENCE_SQUARES[attempt.targetBase], remaining),
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

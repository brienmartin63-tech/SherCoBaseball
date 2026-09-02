import { distanceToBase } from "./geometry";
import { shouldAttemptExtraBase } from "./rules";
import type { BaseName, Coordinate } from "./types";

export type RunnerDistanceTone = "red" | "yellow" | "green";

export interface RunnerDistance {
  from: BaseName;
  to: BaseName;
  distance: number;
  tone: RunnerDistanceTone;
  mustAdvance: boolean;
  safeBeforeThrow: boolean;
}

export function nextBase(from: BaseName): BaseName | undefined {
  if (from === "HOME") return "FIRST";
  if (from === "FIRST") return "SECOND";
  if (from === "SECOND") return "THIRD";
  if (from === "THIRD") return "HOME";
  return undefined;
}

export function runnerDistanceTone(distance: number): RunnerDistanceTone {
  if (distance >= 13) return "green";
  if (distance >= 9) return "yellow";
  return "red";
}

/**
 * Brien's runner test is always the ball's present distance from the next base.
 * Fielder-to-ball movement belongs to fielding resolution and is never added here.
 */
export function runnerDistance(ballAt: Coordinate, from: BaseName, arm: 8 | 9): RunnerDistance {
  const to = nextBase(from);
  if (!to) throw new Error(`No next base exists after ${from}.`);
  const distance = distanceToBase(ballAt, to);
  return {
    from,
    to,
    distance,
    tone: runnerDistanceTone(distance),
    mustAdvance: shouldAttemptExtraBase(arm, distance),
    safeBeforeThrow: distance >= 13,
  };
}

/**
 * On a two-out hit-and-run, runners occupying a base receive a two-base head start
 * before the first throw. The batter-runner still advances one base at a time.
 */
export function twoOutHitAndRunDestination(from: BaseName, isBatterRunner = false): BaseName {
  if (isBatterRunner || from === "HOME") return "FIRST";
  if (from === "FIRST") return "THIRD";
  return "HOME";
}

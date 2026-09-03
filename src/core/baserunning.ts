import { distanceToBase } from "./geometry";
import { shouldAttemptExtraBase } from "./rules";
import type { BaseName, BaseRunners, Coordinate } from "./types";

export type RunnerDistanceTone = "red" | "yellow" | "green";

export interface RunnerDistance {
  from: BaseName;
  to: BaseName;
  distance: number;
  tone: RunnerDistanceTone;
  mustAdvance: boolean;
  safeBeforeThrow: boolean;
}

export type LeadRunnerStatus = "GO" | "HOLD" | "BLOCKED";

export interface LeadRunnerDecision extends RunnerDistance {
  runnerId: string;
  status: LeadRunnerStatus;
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
 * Existing runners are evaluated lead runner first. Once a lead runner holds,
 * no trailing runner may advance past the occupied sequence behind him.
 */
export function leadRunnerDecisions(ballAt: Coordinate, runners: BaseRunners, arm: 8 | 9): LeadRunnerDecision[] {
  const candidates = [
    runners.third ? { runnerId: runners.third, from: "THIRD" as const } : undefined,
    runners.second ? { runnerId: runners.second, from: "SECOND" as const } : undefined,
    runners.first ? { runnerId: runners.first, from: "FIRST" as const } : undefined,
  ].filter(Boolean) as { runnerId: string; from: "FIRST" | "SECOND" | "THIRD" }[];

  let blocked = false;
  return candidates.map(({ runnerId, from }) => {
    const distance = runnerDistance(ballAt, from, arm);
    const status: LeadRunnerStatus = blocked ? "BLOCKED" : distance.mustAdvance ? "GO" : "HOLD";
    if (status === "HOLD") blocked = true;
    return { ...distance, runnerId, status };
  });
}

export interface TwoOutPreThrowState {
  runners: BaseRunners;
  scored: string[];
}

export interface HomeThrowChoice {
  choice: "CUT" | "THROW_HOME";
  label: string;
  runnerAtRisk?: string;
  concededRun?: string;
  trailingAdvance?: { runnerId: string; from: "FIRST"; to: "SECOND" };
}

/** Existing runners take the two-out two-base jump before the first throw. */
export function applyTwoOutPreThrowAdvance(runners: BaseRunners, batterId: string): TwoOutPreThrowState {
  return {
    runners: {
      first: batterId,
      third: runners.first,
    },
    scored: [runners.third, runners.second].filter(Boolean) as string[],
  };
}

/** Defensive choices when the lead runner goes home and a trailer occupies first. */
export function homeThrowChoices(runners: BaseRunners): HomeThrowChoice[] {
  if (!runners.third || !runners.first) return [];
  return [
    {
      choice: "CUT",
      label: "Cut throw — concede run; hold trailing runner at first",
      concededRun: runners.third,
    },
    {
      choice: "THROW_HOME",
      label: "Throw home — play on lead runner; trailing runner takes second",
      runnerAtRisk: runners.third,
      trailingAdvance: { runnerId: runners.first, from: "FIRST", to: "SECOND" },
    },
  ];
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

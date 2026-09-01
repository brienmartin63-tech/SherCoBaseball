import type { Team } from "./types";

/** The tenth inning is always available as X; later innings extend the scrollable line. */
export function scoreboardInnings(currentInning: number): number[] {
  return Array.from({ length: Math.max(10, currentInning) }, (_, index) => index + 1);
}

export function inningLabel(inning: number): string {
  return inning === 10 ? "X" : String(inning);
}

export function hasScoreboardSpacerAfter(inning: number): boolean {
  return inning === 3 || inning === 6 || inning === 9;
}

/** The park scoreboard identifies visitors by city and the home club by nickname. */
export function scoreboardTeamName(team: Team, side: "away" | "home"): string {
  return side === "away" ? team.city : team.nickname;
}

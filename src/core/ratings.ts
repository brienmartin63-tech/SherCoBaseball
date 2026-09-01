import type { Batter, Pitcher } from "./types";

/** Reconstruct a batter's complete printed SherCo rating from structured data. */
export function formatBatterRating(batter: Batter): string {
  const clutch = batter.clutch ? "#" : "";
  const homeRun = batter.homeRun ?? "";
  const triple = batter.triple ? `(${batter.triple})` : "";
  const speed = batter.speed === "REGULAR" ? "" : batter.speed;
  return `${clutch}${batter.offensiveGrade}${homeRun}${triple}${speed}`;
}

/** Reconstruct the complete rate/innings/fatigue/BB-K line used during play. */
export function formatPitcherRating(pitcher: Pitcher): string {
  return `${pitcher.ratingPrefix ?? ""}${pitcher.rate}${pitcher.effectivenessInnings}/${pitcher.fatiguedRate} (${pitcher.walkStrikeout})`;
}

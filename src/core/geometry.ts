import type { BattedBallType, Coordinate, FielderLocation } from "./types";

export interface RatedFielder extends FielderLocation {
  arm: number;
  range: number;
}

export function squaresBetween(a: Coordinate, b: Coordinate): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.column - b.column));
}

export function mirrorForLeftHandedBatter(at: Coordinate): Coordinate {
  return { row: at.column, column: at.row };
}

export function resolvePullCoordinate(at: Coordinate, battingSide: "L" | "R"): Coordinate {
  return battingSide === "L" ? mirrorForLeftHandedBatter(at) : at;
}

export function nearestFielder(
  ball: Coordinate,
  fielders: RatedFielder[],
  ballType: BattedBallType,
): RatedFielder | undefined {
  const ordered = [...fielders].sort((left, right) => {
    const distance = squaresBetween(left.at, ball) - squaresBetween(right.at, ball);
    if (distance !== 0) return distance;
    const rating = ballType === "ground" ? right.arm - left.arm : right.range - left.range;
    if (rating !== 0) return rating;
    return left.position.localeCompare(right.position);
  });
  return ordered[0];
}

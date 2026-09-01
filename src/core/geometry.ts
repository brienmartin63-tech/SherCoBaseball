import type { BattedBallType, Coordinate, FielderLocation, Park } from "./types";

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

export const HOME_PLATE_SQUARE: Coordinate = { row: 2, column: 2 };

export function parkTerrainAt(park: Park, at: Coordinate) {
  return park.cells[28 - at.row]?.[28 - at.column];
}

function isLegalInPlaySquare(park: Park, at: Coordinate): boolean {
  const terrain = parkTerrainAt(park, at);
  return terrain === "field" || terrain === "dirt";
}

/** Brien triple-rule placement: maximum SherCo distance, independent of batting hand. */
export function farthestInPlaySquare(park: Park): Coordinate | undefined {
  const candidates: Coordinate[] = [];
  for (let row = 1; row <= 28; row += 1) {
    for (let column = 1; column <= 28; column += 1) {
      const at = { row, column };
      if (isLegalInPlaySquare(park, at)) candidates.push(at);
    }
  }
  return candidates.sort((left, right) => {
    const squareDistance = squaresBetween(HOME_PLATE_SQUARE, right) - squaresBetween(HOME_PLATE_SQUARE, left);
    if (squareDistance !== 0) return squareDistance;
    const leftRadial = (left.row - 2) ** 2 + (left.column - 2) ** 2;
    const rightRadial = (right.row - 2) ** 2 + (right.column - 2) ** 2;
    if (leftRadial !== rightRadial) return rightRadial - leftRadial;
    return right.row - left.row || right.column - left.column;
  })[0];
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

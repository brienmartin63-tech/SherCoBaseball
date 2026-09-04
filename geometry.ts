import type { BaseName, BattedBallType, Coordinate, FielderLocation, Park } from "./types";

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

export const HOME_PLATE_SQUARE: Coordinate = { row: 3, column: 3 };

/**
 * Reference squares used by Brien's four-number distance workbook.
 * These literal row-column anchors never change between parks.
 */
export const BASE_REFERENCE_SQUARES: Record<BaseName, Coordinate> = {
  HOME: { row: 3, column: 3 },
  FIRST: { row: 8, column: 3 },
  SECOND: { row: 8, column: 8 },
  THIRD: { row: 3, column: 8 },
};

export function distanceToBase(at: Coordinate, base: BaseName): number {
  return squaresBetween(at, BASE_REFERENCE_SQUARES[base]);
}

export function moveToward(from: Coordinate, to: Coordinate, squares: number): Coordinate {
  const step = (current: number, target: number) => current === target ? current : current + Math.sign(target - current);
  let current = { ...from };
  for (let index = 0; index < squares && (current.row !== to.row || current.column !== to.column); index += 1) {
    current = { row: step(current.row, to.row), column: step(current.column, to.column) };
  }
  return current;
}

/** The deterministic SherCo straight-line route, excluding the starting square. */
export function directPath(from: Coordinate, to: Coordinate): Coordinate[] {
  const path: Coordinate[] = [];
  let current = { ...from };
  while (current.row !== to.row || current.column !== to.column) {
    current = moveToward(current, to, 1);
    path.push(current);
  }
  return path;
}

export interface GroundBallRicochet {
  originalLandingAt: Coordinate;
  fenceAt: Coordinate;
  finalBallAt: Coordinate;
  depth: number;
}

/**
 * Brien's Ricochet Rule mirrors only a ground ball plotted beyond the fence.
 * The last in-play square is the base of the wall; penetration depth is then
 * retraced into the field along the original straight line.
 */
export function resolveGroundBallRicochet(park: Park, landingAt: Coordinate): GroundBallRicochet | undefined {
  if (parkTerrainAt(park, landingAt) !== "beyondFence") return undefined;
  const flight = directPath(HOME_PLATE_SQUARE, landingAt);
  let depth = 0;
  for (let index = flight.length - 1; index >= 0; index -= 1) {
    if (parkTerrainAt(park, flight[index]) !== "beyondFence") break;
    depth += 1;
  }
  if (depth === 0) return undefined;
  const firstBeyond = flight.length - depth;
  if (firstBeyond <= 0) return undefined;

  const fenceAt = flight[firstBeyond - 1];
  const reflectedIndex = Math.max(0, firstBeyond - depth);
  return {
    originalLandingAt: landingAt,
    fenceAt,
    finalBallAt: flight[reflectedIndex],
    depth,
  };
}

export function moveAlongPath(path: Coordinate[], squares: number, fallback: Coordinate): Coordinate {
  if (squares <= 0 || path.length === 0) return fallback;
  return path[Math.min(squares, path.length) - 1];
}

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

import type { BattedBallType, Coordinate, FielderPosition } from "../core/types";

export type ShercoChartRoll = 11 | 12 | 13 | 14 | 15 | 16 | 22 | 23 | 24 | 25 | 26 | 33 | 34 | 35 | 36 | 44 | 45 | 46 | 55 | 56 | 66;
export type OneDieRoll = 1 | 2 | 3 | 4 | 5 | 6;
export type SprayRule = "pull" | "opposite" | "fixed";

export interface BallTargetRule {
  type: BattedBallType;
  coordinate?: Coordinate;
  fielder?: FielderPosition;
  squaresInFront?: number;
  spray?: SprayRule;
}

export interface BattedBallChartEntry {
  description: string;
  ball?: BallTargetRule;
  homeRunBall?: BallTargetRule;
  alternateByOuts?: Partial<Record<0 | 1 | 2, BallTargetRule>>;
  pitcherErrorCheckWithRunnersOut?: boolean;
  route?: "SPECIAL_EVENT" | "ERROR" | "HIT_ERROR_CHECK";
}

export interface OneDieChartEntry {
  description: string;
  ball?: BallTargetRule;
  route?: "BALL_CHECK" | "COUNT_PENDING";
}

/** 1980 rulebook, page 24: Probable Hit — Bases Empty. */
export const BASES_EMPTY_PROBABLE_HIT: Record<ShercoChartRoll, BattedBallChartEntry> = {
  11: { description: "Fly ball to 6-25. If within the batter's HR rating, fly to 6-28.", ball: { type: "fly", coordinate: { row: 6, column: 25 } }, homeRunBall: { type: "fly", coordinate: { row: 6, column: 28 } } },
  12: { description: "Grounder to 12-25. If within the batter's HR rating, fly to 12-27.", ball: { type: "ground", coordinate: { row: 12, column: 25 } }, homeRunBall: { type: "fly", coordinate: { row: 12, column: 27 } } },
  13: { description: "Grounder to 14-26. If within the batter's HR rating, fly to 14-28.", ball: { type: "ground", coordinate: { row: 14, column: 26 } }, homeRunBall: { type: "fly", coordinate: { row: 14, column: 28 } } },
  14: { description: "Grounder to 9-26. If within the batter's HR rating, fly to 9-28.", ball: { type: "ground", coordinate: { row: 9, column: 26 } }, homeRunBall: { type: "fly", coordinate: { row: 9, column: 28 } } },
  15: { description: "Grounder to 10-26. If within the batter's HR rating, fly to 10-28.", ball: { type: "ground", coordinate: { row: 10, column: 26 } }, homeRunBall: { type: "fly", coordinate: { row: 10, column: 28 } } },
  16: { description: "Grounder to 3-19. If within the batter's HR rating, fly to 3-26.", ball: { type: "ground", coordinate: { row: 3, column: 19 } }, homeRunBall: { type: "fly", coordinate: { row: 3, column: 26 } } },
  22: { description: "Grounder to 3-18. If within the batter's HR rating, fly to 4-26.", ball: { type: "ground", coordinate: { row: 3, column: 18 } }, homeRunBall: { type: "fly", coordinate: { row: 4, column: 26 } } },
  23: { description: "Grounder to 3-20. If within the batter's HR rating, fly to 3-27.", ball: { type: "ground", coordinate: { row: 3, column: 20 } }, homeRunBall: { type: "fly", coordinate: { row: 3, column: 27 } } },
  24: { description: "Grounder to 3-19; ball goes to opposite field.", ball: { type: "ground", coordinate: { row: 3, column: 19 }, spray: "opposite" } },
  25: { description: "Grounder to 12-18.", ball: { type: "ground", coordinate: { row: 12, column: 18 } } },
  26: { description: "Grounder to 14-19.", ball: { type: "ground", coordinate: { row: 14, column: 19 } } },
  33: { description: "Grounder to 10-20.", ball: { type: "ground", coordinate: { row: 10, column: 20 } } },
  34: { description: "Grounder to 8-20.", ball: { type: "ground", coordinate: { row: 8, column: 20 } } },
  35: { description: "Grounder to 14-20 or 20-14; use the pull-field option.", ball: { type: "ground", coordinate: { row: 14, column: 20 } } },
  36: { description: "Grounder to 11-20.", ball: { type: "ground", coordinate: { row: 11, column: 20 } } },
  44: { description: "Grounder to 7-18 or 18-7; use the pull-field option.", ball: { type: "ground", coordinate: { row: 7, column: 18 } } },
  45: { description: "Grounder to 9-18 or 18-9; use the pull-field option.", ball: { type: "ground", coordinate: { row: 9, column: 18 } } },
  46: { description: "Grounder to 17-17.", ball: { type: "ground", coordinate: { row: 17, column: 17 } } },
  55: { description: "Grounder to 16-19 or 19-16; use the pull-field option.", ball: { type: "ground", coordinate: { row: 16, column: 19 } } },
  56: { description: "Grounder to 6-19.", ball: { type: "ground", coordinate: { row: 6, column: 19 } } },
  66: { description: "Possible error; make the outs-based error check.", route: "HIT_ERROR_CHECK" },
};

/** 1980 rulebook, page 25: Probable Out — Bases Empty. */
export const BASES_EMPTY_PROBABLE_OUT: Record<ShercoChartRoll, BattedBallChartEntry> = {
  11: { description: "Special Event; roll one die. J/K/Y/Z pitcher adjustment applies before the event.", route: "SPECIAL_EVENT" },
  12: { description: "High fly ball to 7-22.", ball: { type: "fly", coordinate: { row: 7, column: 22 } } },
  13: { description: "Fly ball to 19-19.", ball: { type: "fly", coordinate: { row: 19, column: 19 } } },
  14: { description: "Hard grounder hit right to shortstop.", ball: { type: "ground", fielder: "SS", spray: "fixed" } },
  15: { description: "Sinking liner one square in front of the right fielder.", ball: { type: "line", fielder: "RF", squaresInFront: 1, spray: "fixed" } },
  16: { description: "High hopper hit to third baseman.", ball: { type: "ground", fielder: "3B", spray: "fixed" } },
  22: { description: "Ground ball hit right to second baseman.", ball: { type: "ground", fielder: "2B", spray: "fixed" } },
  23: { description: "Ground ball hit sharply to first baseman; with one or two out, to second baseman.", ball: { type: "ground", fielder: "1B", spray: "fixed" }, alternateByOuts: { 1: { type: "ground", fielder: "2B", spray: "fixed" }, 2: { type: "ground", fielder: "2B", spray: "fixed" } } },
  24: { description: "Slow roller tapped to 3-7.", ball: { type: "ground", coordinate: { row: 3, column: 7 } } },
  25: { description: "Soft line drive two squares in front of center fielder.", ball: { type: "line", fielder: "CF", squaresInFront: 2, spray: "fixed" } },
  26: { description: "Grounder to 6-9; with one or two out, grounder to 6-6 with a possible pitcher error.", ball: { type: "ground", coordinate: { row: 6, column: 9 } }, alternateByOuts: { 1: { type: "ground", coordinate: { row: 6, column: 6 } }, 2: { type: "ground", coordinate: { row: 6, column: 6 } } }, pitcherErrorCheckWithRunnersOut: true },
  33: { description: "Grounder to 6-9.", ball: { type: "ground", coordinate: { row: 6, column: 9 } } },
  34: { description: "Grounder to 6-8.", ball: { type: "ground", coordinate: { row: 6, column: 8 } } },
  35: { description: "Grounder to 7-9.", ball: { type: "ground", coordinate: { row: 7, column: 9 } } },
  36: { description: "Tricky out to the mound at 5-6; with one or two out, grounder to 8-9.", ball: { type: "ground", coordinate: { row: 5, column: 6 } }, alternateByOuts: { 1: { type: "ground", coordinate: { row: 8, column: 9 } }, 2: { type: "ground", coordinate: { row: 8, column: 9 } } } },
  44: { description: "Fly ball to 7-20 or 20-7; use the pull-field option.", ball: { type: "fly", coordinate: { row: 7, column: 20 } } },
  45: { description: "Fly ball to 18-20 or 20-18; use the pull-field option.", ball: { type: "fly", coordinate: { row: 18, column: 20 } } },
  46: { description: "Pop up to 7-11.", ball: { type: "pop", coordinate: { row: 7, column: 11 } } },
  55: { description: "Pop up to 6-11.", ball: { type: "pop", coordinate: { row: 6, column: 11 } } },
  56: { description: "Pop up to 1-5; with two out, pop up to 1-11.", ball: { type: "pop", coordinate: { row: 1, column: 5 } }, alternateByOuts: { 2: { type: "pop", coordinate: { row: 1, column: 11 } } } },
  66: { description: "Error; roll one die on the Bases Empty Probable Out Error Chart.", route: "ERROR" },
};

/** 1980 rulebook, page 25: Bases Empty Special Events. */
export const BASES_EMPTY_SPECIAL_EVENT: Record<OneDieRoll, OneDieChartEntry> = {
  1: { description: "Base on balls." },
  2: { description: "Ball; roll one die again. On a 6, the batter walks.", route: "BALL_CHECK" },
  3: { description: "Pop up to 1-12.", ball: { type: "pop", coordinate: { row: 1, column: 12 } } },
  4: { description: "Called strike; pick up the count. With two strikes, the batter strikes out.", route: "COUNT_PENDING" },
  5: { description: "Hit by pitch; batter takes first." },
  6: { description: "Called third strike." },
};

/** 1980 rulebook, page 24: Bases Empty Probable Hit Error Chart. */
export const BASES_EMPTY_HIT_ERROR: Record<OneDieRoll, OneDieChartEntry> = {
  1: { description: "Single to center; center fielder throws wild and the batter reaches second. A Superior CF can turn this into an out." },
  2: { description: "Center fielder drops a liner for a two-base error. A Superior CF can turn this into an out." },
  3: { description: "Left fielder drops a fly for a two-base error. A Superior LF can turn this into an out." },
  4: { description: "Third baseman lets a hard shot through for a two-base error. A Superior 3B can turn this into an out." },
  5: { description: "Single to right plus an error allowing second. A Superior RF holds the batter to the single." },
  6: { description: "Deep fly dropped by the pull-side corner outfielder at the wall; batter reaches third. A Superior fielder can turn this into an out." },
};

/** 1980 rulebook, page 25: Bases Empty Probable Out Error Chart. */
export const BASES_EMPTY_OUT_ERROR: Record<OneDieRoll, OneDieChartEntry> = {
  1: { description: "Second baseman boots the ball; batter safe at first. A Superior 2B can record the out." },
  2: { description: "Shortstop bobbles the grounder; batter safe at first. A Superior SS can record the out." },
  3: { description: "Third baseman throws wild; batter reaches second. A Superior first baseman may hold him at first; a Superior 3B can record the out." },
  4: { description: "Shortstop hurries the throw; roll to assign the error to SS or 1B. A Superior responsible fielder can record the out." },
  5: { description: "Shortstop throws into the dirt; batter safe at first. A Superior SS or 1B can record the out." },
  6: { description: "Pull-side corner infielder bobbles the ball; batter safe. A Superior responsible fielder can record the out." },
};

export const SHERCO_CHART_ROLLS: ShercoChartRoll[] = [11, 12, 13, 14, 15, 16, 22, 23, 24, 25, 26, 33, 34, 35, 36, 44, 45, 46, 55, 56, 66];

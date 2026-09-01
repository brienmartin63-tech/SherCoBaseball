export type Hand = "L" | "R" | "S";
export type Speed = "REGULAR" | "*" | "**";
export type OffensiveGrade = "AAA" | "AA" | "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type PitcherRate = "J" | "K" | "L" | "M" | "X" | "Y" | "Z";
export type BattedBallType = "ground" | "fly" | "line" | "pop";
export type FielderPosition = "P" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF";
export type Terrain = "field" | "dirt" | "beyondFence" | "special";

export interface Coordinate {
  row: number;
  column: number;
}

export interface FielderLocation {
  position: FielderPosition;
  at: Coordinate;
}

export interface Park {
  id: string;
  name: string;
  team: string;
  location: string;
  dimensions: 28;
  cells: Terrain[][];
  fielders: FielderLocation[];
  sourceSheet: string;
}

export interface Batter {
  id: string;
  name: string;
  bats: Hand;
  offensiveGrade: OffensiveGrade;
  speed: Speed;
  homeRun?: number;
  triple?: number;
  clutch?: boolean;
  position: FielderPosition | "DH";
  average: number;
  ops: number;
  homeRuns: number;
  runsBattedIn: number;
}

export interface Pitcher {
  id: string;
  name: string;
  throws: Exclude<Hand, "S">;
  rate: PitcherRate;
  effectivenessInnings: number;
  fatiguedRate: PitcherRate;
  ratingPrefix?: "+" | "−";
  walkStrikeout: string;
  role: "SP" | "RP";
  era: number;
}

export interface Team {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  lineup: Batter[];
  bullpen: Pitcher[];
  starter: Pitcher;
}

export type DiceKind = "pitch" | "chart" | "fielding" | "throw" | "steal" | "umpire";
export type BaseState = "EMPTY" | "FIRST" | "SECOND" | "THIRD" | "FIRST_SECOND" | "FIRST_THIRD" | "SECOND_THIRD" | "LOADED";
export type PlateAppearancePhase = "PITCH" | "BATTED_BALL_CHART" | "SPECIAL_EVENT" | "HIT_ERROR_CHECK" | "PITCHER_ERROR_CHECK" | "ERROR_CHART" | "BALL_CHECK" | "COUNT_PENDING" | "BALL_IN_PLAY" | "DIRECT_RESULT";
export type ChartFamily = "PROBABLE_HIT" | "PROBABLE_OUT" | "SPECIAL_EVENT" | "HIT_ERROR" | "OUT_ERROR";

export interface PlateAppearanceResolution {
  phase: PlateAppearancePhase;
  baseState: BaseState;
  chartFamily?: ChartFamily;
  description?: string;
  source?: string;
  battedBallType?: BattedBallType;
  ballAt?: Coordinate;
}

export interface DiceRoll {
  id: string;
  kind: DiceKind;
  dice: [number] | [number, number];
  sherco: number;
  total: number;
  label: string;
  explanation: string;
  resultLabel?: string;
  resultTone?: "out" | "hit" | "event" | "error" | "neutral";
}

export interface ScoreLine {
  innings: number[];
  runs: number;
  hits: number;
  errors: number;
}

export interface PlayEvent {
  id: string;
  inning: number;
  half: "top" | "bottom";
  outsBefore: number;
  officialText: string;
  auditText: string;
  roll?: DiceRoll;
}

export interface GameState {
  schemaVersion: 2;
  seed: number;
  inning: number;
  half: "top" | "bottom";
  outs: number;
  away: ScoreLine;
  home: ScoreLine;
  awayBatterIndex: number;
  homeBatterIndex: number;
  pitchCount: number;
  activePitcherRate?: PitcherRate;
  resolution: PlateAppearanceResolution;
  ballAt?: Coordinate;
  selectedParkId: string;
  rulesProfileId: "official-1980" | "brien";
  lastRoll?: DiceRoll;
  events: PlayEvent[];
}

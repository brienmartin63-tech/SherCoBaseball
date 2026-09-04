import { rollOneDie, rollTwoDice } from "./dice";
import { basesEmptyErrorFielder, directPitchResult, resolveBasesEmptyBattedBall, resolveBasesEmptyError, resolveBasesEmptySpecialEvent, resolveBasesEmptySuperiorError, specialEventPitcherRate } from "./chartResolution";
import { classifyPitch, hitNumber, pitchResultLabel } from "./pitching";
import { automaticUmpireCall, buildRatedDefense, createFieldingAttempt, isAirborneCatch, positionName, resolveThrow } from "./fielding";
import { leadRunnerDecisions, runnerDistance } from "./baserunning";
import { distanceToBase } from "./geometry";
import { createRandomSeed } from "./rng";
import { isOccupiedBaseState, resolveOccupiedBattedBall, resolveOccupiedOneDie } from "./occupiedChartResolution";
import type { BaseName, BaseRunners, BaseState, Batter, DefenseTargetOption, DiceRoll, FieldingAttempt, GameState, Park, PendingRunnerPlay, Pitcher, PlateAppearanceResolution, PlayEvent, RunnerMovement, ScoreLine, Team, TerminalOutcome } from "./types";

export function createInitialGame(selectedParkId: string, seed = createRandomSeed()): GameState {
  return {
    schemaVersion: 4,
    seed,
    inning: 1,
    half: "top",
    outs: 0,
    away: { innings: [0], runs: 0, hits: 0, errors: 0 },
    home: { innings: [0], runs: 0, hits: 0, errors: 0 },
    awayBatterIndex: 0,
    homeBatterIndex: 0,
    pitchCount: 0,
    resolution: { phase: "PITCH", baseState: "EMPTY" },
    selectedParkId,
    rulesProfileId: "brien",
    activePitchers: {},
    events: [],
    runners: {},
  };
}

export function selectPitcher(state: GameState, side: "away" | "home", pitcherId: string): GameState {
  return {
    ...state,
    activePitchers: { ...state.activePitchers, [side]: pitcherId },
    activePitcherRate: undefined,
  };
}

export function rollPitch(state: GameState, batter: Batter, pitcher: Pitcher): GameState {
  if (state.resolution.phase !== "PITCH") return state;
  const currentRate = state.activePitcherRate ?? pitcher.rate;
  const threshold = hitNumber(batter.offensiveGrade, currentRate);
  const result = rollTwoDice(state.seed, "pitch", "Pitch roll");
  const classification = classifyPitch(result.roll.sherco, threshold);
  const directResult = classification === "PROBABLE_OUT" ? directPitchResult(result.roll.sherco, pitcher.walkStrikeout) : undefined;
  const adjustedRate = classification === "SPECIAL_EVENT" ? specialEventPitcherRate(currentRate) : undefined;
  const explanation = adjustedRate
    ? `${currentRate} pitcher has no Special Event; rate changes immediately to ${adjustedRate} and the pitcher pitches again`
    : directResult === "WALK"
    ? `${result.roll.sherco} is within ${pitcher.walkStrikeout}: base on balls`
    : directResult === "STRIKEOUT"
      ? `${result.roll.sherco} is within ${pitcher.walkStrikeout}: strikeout`
      : classification === "SPECIAL_EVENT"
    ? "66 — consult the base-state Special Event chart"
    : `${result.roll.sherco} ${classification === "PROBABLE_HIT" ? "meets or exceeds" : "is below"} hit number ${threshold}`;
  const resultLabel = adjustedRate ? `${currentRate} → ${adjustedRate}` : directResult === "WALK" ? "Walk" : directResult === "STRIKEOUT" ? "Strikeout" : pitchResultLabel(classification);
  const roll = {
    ...result.roll,
    explanation,
    resultLabel,
    resultTone: adjustedRate ? "event" as const : directResult === "WALK" ? "hit" as const : directResult === "STRIKEOUT" ? "out" as const : classification === "PROBABLE_HIT" ? "hit" as const : classification === "SPECIAL_EVENT" ? "event" as const : "out" as const,
  };
  const baseState = baseStateFromRunners(state.runners);
  const resolution: PlateAppearanceResolution = adjustedRate
    ? { phase: "PITCH", baseState, description: `Pitcher rate changed from ${currentRate} to ${adjustedRate}; pitch again.`, source: "1980 rulebook Special Events note" }
    : directResult
    ? { phase: "DIRECT_RESULT", baseState, terminalOutcome: directResult, description: directResult === "WALK" ? "Base on balls." : "Strikeout.", source: "1980 rulebook Rule 5h" }
    : classification === "SPECIAL_EVENT"
      ? { phase: "SPECIAL_EVENT", baseState, chartFamily: "SPECIAL_EVENT", description: `Roll one die on the ${baseState === "EMPTY" ? "Bases Empty" : baseState.replace("_", " & ")} Special Events Chart.`, source: "1980 rulebook Rule 5n" }
      : { phase: "BATTED_BALL_CHART", baseState, chartFamily: classification, description: `Roll on the ${baseState === "EMPTY" ? "Bases Empty" : baseState.replace("_", " & ")} ${pitchResultLabel(classification)} chart.`, source: "1980 rulebook base-state charts" };
  const officialText = adjustedRate
    ? `${pitcher.name}'s rate changes from ${currentRate} to ${adjustedRate}; pitch again.`
    : directResult === "WALK"
    ? `${batter.name} walks.`
    : directResult === "STRIKEOUT"
      ? `${batter.name} strikes out.`
      : classification === "SPECIAL_EVENT"
    ? `${batter.name} at bat; special event pending.`
    : `${batter.name} faces ${pitcher.name}.`;
  const event: PlayEvent = {
    id: `event-${state.events.length + 1}`,
    inning: state.inning,
    half: state.half,
    outsBefore: state.outs,
    officialText,
    auditText: `${roll.label}: ${roll.dice[0]} and ${roll.dice[1]} → ${roll.sherco}. ${explanation}.`,
    roll,
  };
  return {
    ...state,
    seed: result.state,
    pitchCount: state.pitchCount + 1,
    activePitcherRate: adjustedRate ?? state.activePitcherRate,
    resolution,
    ballAt: undefined,
    lastRoll: roll,
    events: [event, ...state.events].slice(0, 100),
  };
}

function appendRollEvent(state: GameState, roll: DiceRoll, officialText: string, resolution: PlateAppearanceResolution, seed: number): GameState {
  const event: PlayEvent = {
    id: `event-${state.events.length + 1}`,
    inning: state.inning,
    half: state.half,
    outsBefore: state.outs,
    officialText,
    auditText: `${roll.label}: ${roll.dice.join(" and ")} → ${roll.sherco}. ${roll.explanation}.`,
    roll,
  };
  return {
    ...state,
    seed,
    resolution,
    ballAt: resolution.ballAt,
    lastRoll: roll,
    events: [event, ...state.events].slice(0, 100),
  };
}

export function rollResolution(state: GameState, batter: Batter, pitcher: Pitcher, park: Park, defensiveTeam?: Team): GameState {
  const { phase, chartFamily } = state.resolution;
  if (phase === "BATTED_BALL_CHART" && (chartFamily === "PROBABLE_HIT" || chartFamily === "PROBABLE_OUT")) {
    const result = rollTwoDice(state.seed, "chart", `${chartFamily === "PROBABLE_HIT" ? "Probable Hit" : "Probable Out"} chart roll`);
    const baseState = baseStateFromRunners(state.runners);
    let resolution = isOccupiedBaseState(baseState)
      ? resolveOccupiedBattedBall(baseState, chartFamily, result.roll.sherco, batter, pitcher, park, state.rulesProfileId === "brien")
      : resolveBasesEmptyBattedBall(chartFamily, result.roll.sherco, batter, pitcher, park, state.outs, state.rulesProfileId === "brien");
    const currentRate = state.activePitcherRate ?? pitcher.rate;
    const adjustedRate = resolution.phase === "SPECIAL_EVENT" ? specialEventPitcherRate(currentRate) : undefined;
    if (adjustedRate) {
      resolution = { phase: "PITCH", baseState, description: `No Special Event: pitcher rate changed from ${currentRate} to ${adjustedRate}; pitch again.`, source: "1980 rulebook Special Events note" };
    }
    const roll: DiceRoll = {
      ...result.roll,
      explanation: resolution.description ?? "Chart result",
      resultLabel: adjustedRate ? `${currentRate} → ${adjustedRate}` : resolution.terminalOutcome === "HOME_RUN" ? "Home Run" : resolution.phase === "BALL_IN_PLAY" ? "Ball in Play" : resolution.phase === "SPECIAL_EVENT" ? "Special Event" : resolution.phase.includes("ERROR_CHECK") ? "Error Check" : "Chart Result",
      resultTone: adjustedRate ? "event" : resolution.terminalOutcome === "HOME_RUN" ? "hit" : resolution.phase === "BALL_IN_PLAY" ? (chartFamily === "PROBABLE_HIT" ? "hit" : "out") : resolution.phase === "SPECIAL_EVENT" ? "event" : "error",
    };
    const next = appendRollEvent(state, roll, adjustedRate ? `${pitcher.name}'s rate changes; pitch again.` : `${batter.name} puts the ball in play; resolution pending.`, resolution, result.state);
    return adjustedRate ? { ...next, activePitcherRate: adjustedRate } : next;
  }

  if (phase === "SPECIAL_EVENT") {
    const result = rollOneDie(state.seed, "chart", "Special Event roll");
    const baseState = baseStateFromRunners(state.runners);
    const resolution = isOccupiedBaseState(baseState)
      ? resolveOccupiedOneDie(baseState, "SPECIAL_EVENT", result.roll.sherco as 1 | 2 | 3 | 4 | 5 | 6)
      : resolveBasesEmptySpecialEvent(result.roll.sherco as 1 | 2 | 3 | 4 | 5 | 6, batter, pitcher, park);
    const roll: DiceRoll = {
      ...result.roll,
      explanation: resolution.description ?? "Special Event",
      resultLabel: "Special Event",
      resultTone: "event",
    };
    return appendRollEvent(state, roll, resolution.description ?? "Special Event.", resolution, result.state);
  }

  if (phase === "HIT_ERROR_CHECK") {
    const result = rollOneDie(state.seed, "chart", "Probable Hit error check");
    const maximumErrorRoll = state.outs === 0 ? 3 : state.outs === 1 ? 2 : 1;
    const isError = result.roll.sherco <= maximumErrorRoll;
    const resolution: PlateAppearanceResolution = isError
      ? { phase: "ERROR_CHART", baseState: "EMPTY", chartFamily: "HIT_ERROR", description: `Error confirmed (${result.roll.sherco} is within 1-${maximumErrorRoll}); roll on the error chart.`, source: "1980 rulebook p.24" }
      : { phase: "BATTED_BALL_CHART", baseState: "EMPTY", chartFamily: "PROBABLE_HIT", description: `No error (${result.roll.sherco} is above ${maximumErrorRoll}); reroll the Probable Hit chart.`, source: "1980 rulebook p.24" };
    const roll: DiceRoll = { ...result.roll, explanation: resolution.description!, resultLabel: isError ? "Error" : "No Error", resultTone: isError ? "error" : "hit" };
    return appendRollEvent(state, roll, resolution.description!, resolution, result.state);
  }

  if (phase === "PITCHER_ERROR_CHECK") {
    const result = rollOneDie(state.seed, "fielding", "Pitcher error check");
    const isError = result.roll.sherco === 1;
    const resolution: PlateAppearanceResolution = isError
      ? { phase: "DIRECT_RESULT", baseState: "EMPTY", chartFamily: "OUT_ERROR", terminalOutcome: "ERROR", awardedBase: "FIRST", description: "Pitcher error; batter safe at first.", source: "1980 rulebook p.25" }
      : { phase: "BALL_IN_PLAY", baseState: "EMPTY", chartFamily: "PROBABLE_OUT", description: "No pitcher error; field the grounder at 6-6.", source: "1980 rulebook p.25", battedBallType: "ground", ballAt: state.resolution.ballAt };
    const roll: DiceRoll = { ...result.roll, explanation: resolution.description!, resultLabel: isError ? "Error" : "No Error", resultTone: isError ? "error" : "out" };
    return appendRollEvent(state, roll, resolution.description!, resolution, result.state);
  }

  if (phase === "ERROR_CHART" && (chartFamily === "HIT_ERROR" || chartFamily === "OUT_ERROR")) {
    const result = rollOneDie(state.seed, "chart", `${chartFamily === "HIT_ERROR" ? "Probable Hit" : "Probable Out"} error roll`);
    const errorRoll = result.roll.sherco as 1 | 2 | 3 | 4 | 5 | 6;
    const baseState = baseStateFromRunners(state.runners);
    if (isOccupiedBaseState(baseState)) {
      const resolution = resolveOccupiedOneDie(baseState, chartFamily, errorRoll);
      const roll: DiceRoll = {
        ...result.roll,
        explanation: resolution.description!,
        resultLabel: "Error chart",
        resultTone: "error",
      };
      return appendRollEvent(state, roll, resolution.description!, resolution, result.state);
    }
    const errorFielderPosition = basesEmptyErrorFielder(chartFamily, errorRoll, batter, pitcher);
    const superior = errorFielderPosition === "P"
      ? Boolean(pitcher.defense.superior)
      : Boolean(defensiveTeam?.lineup.find((fielder) => fielder.position === errorFielderPosition)?.defense.superior);
    const resolution = resolveBasesEmptyError(chartFamily, errorRoll, superior, errorFielderPosition);
    const roll: DiceRoll = {
      ...result.roll,
      explanation: resolution.description!,
      resultLabel: resolution.phase === "SUPERIOR_ERROR_CHECK" ? "Superior check" : "Error",
      resultTone: resolution.phase === "SUPERIOR_ERROR_CHECK" ? "event" : "error",
    };
    return appendRollEvent(state, roll, resolution.description!, resolution, result.state);
  }

  if (phase === "SUPERIOR_ERROR_CHECK") {
    const result = rollOneDie(state.seed, "fielding", "Superior fielder error check");
    const resolution = resolveBasesEmptySuperiorError(state.resolution, result.roll.sherco as 1 | 2 | 3 | 4 | 5 | 6);
    const noError = result.roll.sherco <= 3;
    const roll: DiceRoll = {
      ...result.roll,
      explanation: resolution.description!,
      resultLabel: noError ? "No error" : "Error stands",
      resultTone: noError ? resolution.terminalOutcome === "SINGLE" ? "hit" : "out" : "error",
    };
    return appendRollEvent(state, roll, resolution.description!, resolution, result.state);
  }

  if (phase === "BALL_CHECK") {
    const result = rollOneDie(state.seed, "chart", "Special Event ball check");
    const isWalk = result.roll.sherco === 6;
    const resolution: PlateAppearanceResolution = {
      phase: isWalk ? "DIRECT_RESULT" : "COUNT_PENDING",
      baseState: "EMPTY",
      chartFamily: "SPECIAL_EVENT",
      terminalOutcome: isWalk ? "WALK" : undefined,
      description: isWalk ? "Ball four; batter walks." : `Ball ${result.roll.sherco}; count continuation will be connected with the count engine.`,
      source: "1980 rulebook p.25",
    };
    const roll: DiceRoll = { ...result.roll, explanation: resolution.description!, resultLabel: isWalk ? "Walk" : "Ball", resultTone: isWalk ? "hit" : "event" };
    return appendRollEvent(state, roll, resolution.description!, resolution, result.state);
  }

  return state;
}

function baseStateFromRunners(runners: BaseRunners): BaseState {
  const first = Boolean(runners.first);
  const second = Boolean(runners.second);
  const third = Boolean(runners.third);
  if (first && second && third) return "LOADED";
  if (first && second) return "FIRST_SECOND";
  if (first && third) return "FIRST_THIRD";
  if (second && third) return "SECOND_THIRD";
  if (first) return "FIRST";
  if (second) return "SECOND";
  if (third) return "THIRD";
  return "EMPTY";
}

/** Public because every chart family and persistence boundary must agree on base occupancy. */
export function currentBaseState(runners: BaseRunners): BaseState {
  return baseStateFromRunners(runners);
}

function updateLine(line: ScoreLine, inning: number, changes: Partial<Pick<ScoreLine, "runs" | "hits" | "errors">>): ScoreLine {
  const innings = [...line.innings];
  while (innings.length < inning) innings.push(0);
  if (changes.runs) innings[inning - 1] += changes.runs;
  return {
    innings,
    runs: line.runs + (changes.runs ?? 0),
    hits: line.hits + (changes.hits ?? 0),
    errors: line.errors + (changes.errors ?? 0),
  };
}

function withBattingLine(state: GameState, changes: Partial<Pick<ScoreLine, "runs" | "hits">>): GameState {
  return state.half === "top"
    ? { ...state, away: updateLine(state.away, state.inning, changes) }
    : { ...state, home: updateLine(state.home, state.inning, changes) };
}

function withFieldingError(state: GameState): GameState {
  return state.half === "top"
    ? { ...state, home: updateLine(state.home, state.inning, { errors: 1 }) }
    : { ...state, away: updateLine(state.away, state.inning, { errors: 1 }) };
}

function advanceBattingOrder(state: GameState, awayLineupSize: number, homeLineupSize: number): GameState {
  return state.half === "top"
    ? { ...state, awayBatterIndex: (state.awayBatterIndex + 1) % awayLineupSize }
    : { ...state, homeBatterIndex: (state.homeBatterIndex + 1) % homeLineupSize };
}

function appendPlayEvent(state: GameState, officialText: string, auditText: string, roll?: DiceRoll): GameState {
  const event: PlayEvent = {
    id: `event-${state.events.length + 1}`,
    inning: state.inning,
    half: state.half,
    outsBefore: state.outs,
    officialText,
    auditText,
    roll,
  };
  return { ...state, events: [event, ...state.events].slice(0, 100), lastRoll: roll ?? state.lastRoll };
}

function finishPlateAppearance(
  state: GameState,
  batter: Batter,
  awayLineupSize: number,
  homeLineupSize: number,
  result: "OUT" | "SINGLE" | "DOUBLE" | "TRIPLE" | "WALK" | "HIT_BY_PITCH" | "ERROR" | "HOME_RUN",
  officialText: string,
  auditText: string,
  roll?: DiceRoll,
  errorAward?: { base: "FIRST" | "SECOND" | "THIRD"; creditedHit: boolean },
): GameState {
  let next = state;
  let runners = { ...state.runners };
  let outs = state.outs;
  let half = state.half;
  let inning = state.inning;
  let activePitcherRate = state.activePitcherRate;

  if (result === "OUT") {
    outs += 1;
  } else if (result === "HOME_RUN") {
    const runs = 1 + Number(Boolean(runners.first)) + Number(Boolean(runners.second)) + Number(Boolean(runners.third));
    runners = {};
    next = withBattingLine(next, { hits: 1, runs });
  } else {
    if (result === "WALK" || result === "HIT_BY_PITCH") {
      let forcedRuns = 0;
      if (runners.first) {
        if (runners.second) {
          if (runners.third) forcedRuns += 1;
          runners.third = runners.second;
        }
        runners.second = runners.first;
      }
      runners.first = batter.id;
      if (forcedRuns) next = withBattingLine(next, { runs: forcedRuns });
    } else if (result === "DOUBLE" || (result === "ERROR" && errorAward?.base === "SECOND")) runners.second = batter.id;
    else if (result === "TRIPLE" || (result === "ERROR" && errorAward?.base === "THIRD")) runners.third = batter.id;
    else runners.first = batter.id;
    if (result === "SINGLE" || result === "DOUBLE" || result === "TRIPLE") next = withBattingLine(next, { hits: 1 });
    if (result === "ERROR") {
      if (errorAward?.creditedHit) next = withBattingLine(next, { hits: 1 });
      next = withFieldingError(next);
    }
  }

  next = advanceBattingOrder(next, awayLineupSize, homeLineupSize);
  next = appendPlayEvent(next, officialText, auditText, roll);

  if (outs === 3) {
    runners = {};
    outs = 0;
    if (half === "top") {
      half = "bottom";
    } else {
      half = "top";
      inning += 1;
      next = {
        ...next,
        away: updateLine(next.away, inning, {}),
        home: updateLine(next.home, inning, {}),
      };
    }
    activePitcherRate = undefined;
  }

  const baseState = baseStateFromRunners(runners);
  return {
    ...next,
    inning,
    half,
    outs,
    activePitcherRate,
    runners,
    lastFielding: state.pendingFielding ?? state.lastFielding,
    pendingFielding: undefined,
    pendingRunnerPlay: undefined,
    ballAt: next.ballAt,
    resolution: {
      phase: "PLAY_COMPLETE",
      baseState,
      terminalOutcome: result,
      description: officialText,
      source: "1980 Rule 6 fielding and scoring sequence",
    },
  };
}

type HitBase = "FIRST" | "SECOND" | "THIRD";

const BASE_WORD: Record<BaseName, string> = {
  HOME: "home",
  FIRST: "first",
  SECOND: "second",
  THIRD: "third",
};

const HIT_OUTCOME: Record<HitBase, Extract<TerminalOutcome, "SINGLE" | "DOUBLE" | "TRIPLE">> = {
  FIRST: "SINGLE",
  SECOND: "DOUBLE",
  THIRD: "TRIPLE",
};

function batterBase(runners: BaseRunners, batterId: string): HitBase | undefined {
  if (runners.first === batterId) return "FIRST";
  if (runners.second === batterId) return "SECOND";
  if (runners.third === batterId) return "THIRD";
  return undefined;
}

function moveBatterRunner(runners: BaseRunners, batterId: string, base?: HitBase): BaseRunners {
  const next = { ...runners };
  if (next.first === batterId) delete next.first;
  if (next.second === batterId) delete next.second;
  if (next.third === batterId) delete next.third;
  if (base === "FIRST") next.first = batterId;
  if (base === "SECOND") next.second = batterId;
  if (base === "THIRD") next.third = batterId;
  return next;
}

/**
 * Completes a bases-empty hit after all mandatory stop-action advancement has
 * ended. A batter put out trying for an extra base is still credited with the
 * last base he reached safely.
 */
function finishBatterRun(
  state: GameState,
  batter: Batter,
  awayLineupSize: number,
  homeLineupSize: number,
  lastSafeBase: HitBase | "HOME",
  outAt: BaseName | undefined,
  officialText: string,
  auditText: string,
  roll?: DiceRoll,
): GameState {
  let next = withBattingLine(state, { hits: 1, runs: lastSafeBase === "HOME" ? 1 : 0 });
  let runners = moveBatterRunner(state.runners, batter.id, (outAt || lastSafeBase === "HOME") ? undefined : lastSafeBase);
  let outs = state.outs + (outAt ? 1 : 0);
  let half = state.half;
  let inning = state.inning;
  let activePitcherRate = state.activePitcherRate;

  next = advanceBattingOrder(next, awayLineupSize, homeLineupSize);
  next = appendPlayEvent(next, officialText, auditText, roll);

  if (outs === 3) {
    runners = {};
    outs = 0;
    if (half === "top") {
      half = "bottom";
    } else {
      half = "top";
      inning += 1;
      next = {
        ...next,
        away: updateLine(next.away, inning, {}),
        home: updateLine(next.home, inning, {}),
      };
    }
    activePitcherRate = undefined;
  }

  const outcome: TerminalOutcome = outAt ? "OUT" : lastSafeBase === "HOME" ? "HOME_RUN" : HIT_OUTCOME[lastSafeBase];
  return {
    ...next,
    inning,
    half,
    outs,
    activePitcherRate,
    runners,
    lastFielding: state.pendingFielding ?? state.lastFielding,
    pendingFielding: undefined,
    pendingRunnerPlay: undefined,
    resolution: {
      phase: "PLAY_COMPLETE",
      baseState: baseStateFromRunners(runners),
      terminalOutcome: outcome,
      awardedBase: lastSafeBase === "HOME" ? undefined : lastSafeBase,
      creditedHit: true,
      description: officialText,
      source: "1980 Rule 6 stop-action fielding; Brien mandatory advancement",
    },
  };
}

function continuationAttempt(attempt: FieldingAttempt, ballAt: FieldingAttempt["ballAt"], targetBase: BaseName): FieldingAttempt {
  return {
    ...attempt,
    ballAt,
    fielderAt: ballAt,
    fieldingDistance: 0,
    targetBase,
    targetDistance: distanceToBase(ballAt, targetBase),
    throwingAllowance: undefined,
    throwingRemainder: undefined,
    fieldingPath: [],
    actionPath: attempt.actionPath ?? attempt.fieldingPath ?? [],
    ricochet: undefined,
  };
}

function continueOrFinishBatterRun(
  state: GameState,
  batter: Batter,
  achievedBase: HitBase | "HOME",
  attempt: FieldingAttempt,
  awayLineupSize: number,
  homeLineupSize: number,
): GameState {
  if (achievedBase === "HOME") {
    return finishBatterRun(
      { ...state, runners: moveBatterRunner(state.runners, batter.id) },
      batter,
      awayLineupSize,
      homeLineupSize,
      "HOME",
      undefined,
      `${batter.name} circles the bases for an inside-the-park home run.`,
      `${batter.name} reached home safely after the defense's final throw.`,
    );
  }

  const runners = moveBatterRunner(state.runners, batter.id, achievedBase);
  const advance = runnerDistance(state.ballAt ?? attempt.ballAt, achievedBase, attempt.arm);
  if (!advance.mustAdvance) {
    const outcome = HIT_OUTCOME[achievedBase].toLowerCase();
    return finishBatterRun(
      { ...state, runners },
      batter,
      awayLineupSize,
      homeLineupSize,
      achievedBase,
      undefined,
      `${batter.name} reaches ${BASE_WORD[achievedBase]} safely for a ${outcome}.`,
      `The ball is ${advance.distance} square${advance.distance === 1 ? "" : "s"} from ${BASE_WORD[advance.to]}; against an ${attempt.arm} arm, ${batter.name} holds at ${BASE_WORD[achievedBase]}.`,
    );
  }

  const relay = continuationAttempt(attempt, state.ballAt ?? attempt.ballAt, advance.to);
  return {
    ...state,
    runners,
    pendingFielding: relay,
    lastFielding: attempt,
    resolution: {
      phase: "RUNNER_ADVANCE",
      baseState: baseStateFromRunners(runners),
      battedBallType: state.resolution.battedBallType ?? attempt.battedBallType,
      ballAt: relay.ballAt,
      description: `${batter.name} is safe at ${BASE_WORD[achievedBase]}. The ball is ${advance.distance} from ${BASE_WORD[advance.to]}; against an ${attempt.arm} arm, he must try for ${BASE_WORD[advance.to]}.`,
      source: "Brien's Rules: mandatory extra base at 8+ vs arm 8 or 10+ vs arm 9",
    },
  };
}

function runnerName(runnerId: string, batter: Batter, offensiveTeam?: Team): string {
  if (runnerId === batter.id) return batter.name;
  return offensiveTeam?.lineup.find((player) => player.id === runnerId)?.name ?? runnerId;
}

function initialHitMovements(
  state: GameState,
  batter: Batter,
  attempt: FieldingAttempt,
  offensiveTeam?: Team,
): RunnerMovement[] {
  const oneBaseOnly = state.resolution.description?.toLowerCase().includes("one base only") ?? false;
  const twoOutAdvance = state.outs === 2 && !oneBaseOnly;
  const specifications = [
    state.runners.third ? { runnerId: state.runners.third, from: "THIRD" as const, to: "HOME" as const } : undefined,
    state.runners.second ? { runnerId: state.runners.second, from: "SECOND" as const, to: twoOutAdvance ? "HOME" as const : "THIRD" as const } : undefined,
    state.runners.first ? { runnerId: state.runners.first, from: "FIRST" as const, to: twoOutAdvance ? "THIRD" as const : "SECOND" as const } : undefined,
    { runnerId: batter.id, from: "HOME" as const, to: "FIRST" as const },
  ].filter(Boolean) as Array<{ runnerId: string; from: BaseName; to: BaseName }>;

  return specifications.map(({ runnerId, from, to }) => ({
    runnerId,
    runnerName: runnerName(runnerId, batter, offensiveTeam),
    from,
    to,
    isBatter: runnerId === batter.id,
    routeDistance: attempt.fieldingDistance + distanceToBase(attempt.ballAt, to),
  }));
}

function removeRunner(runners: BaseRunners, runnerId: string): void {
  if (runners.first === runnerId) delete runners.first;
  if (runners.second === runnerId) delete runners.second;
  if (runners.third === runnerId) delete runners.third;
}

function applyRunnerMovements(runners: BaseRunners, movements: RunnerMovement[], outRunnerId?: string): { runners: BaseRunners; scored: string[] } {
  const next = { ...runners };
  const scored: string[] = [];
  for (const movement of movements) removeRunner(next, movement.runnerId);
  for (const movement of movements) {
    if (movement.runnerId === outRunnerId) continue;
    if (movement.to === "HOME") scored.push(movement.runnerId);
    if (movement.to === "FIRST") next.first = movement.runnerId;
    if (movement.to === "SECOND") next.second = movement.runnerId;
    if (movement.to === "THIRD") next.third = movement.runnerId;
  }
  return { runners: next, scored };
}

function targetOptions(movements: RunnerMovement[]): DefenseTargetOption[] {
  return movements
    .filter((movement) => movement.routeDistance <= 12)
    .map(({ runnerId, runnerName: name, to, routeDistance }) => ({ runnerId, runnerName: name, targetBase: to, routeDistance }));
}

function automaticTarget(options: DefenseTargetOption[]): DefenseTargetOption | undefined {
  if (options.length === 1) return options[0];
  if (options.length > 1 && options.every((option) => option.routeDistance === options[0].routeDistance)) return options[0];
  return undefined;
}

function fieldingWithTarget(attempt: FieldingAttempt, targetBase: BaseName): FieldingAttempt {
  return {
    ...attempt,
    targetBase,
    targetDistance: distanceToBase(attempt.ballAt, targetBase),
    throwingAllowance: undefined,
    throwingRemainder: undefined,
  };
}

function finalizeOccupiedHit(
  state: GameState,
  batter: Batter,
  awayLineupSize: number,
  homeLineupSize: number,
  play: PendingRunnerPlay,
): GameState {
  const scored = play.scored;
  let next = withBattingLine(state, { hits: 1, runs: scored.length });
  let runners = { ...state.runners };
  let outs = state.outs;
  let half = state.half;
  let inning = state.inning;
  let activePitcherRate = state.activePitcherRate;
  const batterAt = batterBase(runners, batter.id);
  const batterScored = scored.includes(batter.id);
  const outcome: TerminalOutcome = batterScored ? "HOME_RUN" : batterAt ? HIT_OUTCOME[batterAt] : "OUT";
  const reached = batterScored ? "home" : batterAt ? BASE_WORD[batterAt] : "no base";
  const officialText = `${batter.name} reaches ${reached}${scored.length ? `; ${scored.length} run${scored.length === 1 ? "" : "s"} score` : ""}.`;

  next = advanceBattingOrder(next, awayLineupSize, homeLineupSize);
  next = appendPlayEvent(next, officialText, `Occupied-base hit sequence completed with ${scored.length} runner${scored.length === 1 ? "" : "s"} scoring.`);

  if (outs >= 3) {
    runners = {};
    outs = 0;
    if (half === "top") half = "bottom";
    else {
      half = "top";
      inning += 1;
      next = { ...next, away: updateLine(next.away, inning, {}), home: updateLine(next.home, inning, {}) };
    }
    activePitcherRate = undefined;
  }

  return {
    ...next,
    inning,
    half,
    outs,
    activePitcherRate,
    runners,
    lastFielding: state.pendingFielding ?? state.lastFielding,
    pendingFielding: undefined,
    pendingRunnerPlay: undefined,
    resolution: {
      phase: "PLAY_COMPLETE",
      baseState: baseStateFromRunners(runners),
      terminalOutcome: outcome,
      creditedHit: true,
      description: officialText,
      source: "1980 occupied-base hit; Brien stop-action advancement",
    },
  };
}

function prepareFurtherHitAdvance(
  state: GameState,
  batter: Batter,
  attempt: FieldingAttempt,
  awayLineupSize: number,
  homeLineupSize: number,
  play: PendingRunnerPlay,
  offensiveTeam?: Team,
): GameState {
  if (!play.allowExtraBases || state.outs >= 3) return finalizeOccupiedHit(state, batter, awayLineupSize, homeLineupSize, play);
  const decisions = leadRunnerDecisions(attempt.ballAt, state.runners, attempt.arm);
  const movements = decisions
    .filter((decision) => decision.status === "GO")
    .map((decision): RunnerMovement => ({
      runnerId: decision.runnerId,
      runnerName: runnerName(decision.runnerId, batter, offensiveTeam),
      from: decision.from,
      to: decision.to,
      isBatter: decision.runnerId === batter.id,
      routeDistance: decision.distance,
    }));
  if (movements.length === 0) return finalizeOccupiedHit(state, batter, awayLineupSize, homeLineupSize, play);
  const relay = continuationAttempt(attempt, attempt.ballAt, movements[0].to);
  return prepareRunnerThrow(state, batter, relay, awayLineupSize, homeLineupSize, { ...play, movements, initialThrow: false }, offensiveTeam);
}

function prepareRunnerThrow(
  state: GameState,
  batter: Batter,
  attempt: FieldingAttempt,
  awayLineupSize: number,
  homeLineupSize: number,
  play: PendingRunnerPlay,
  offensiveTeam?: Team,
): GameState {
  const options = targetOptions(play.movements);
  if (options.length === 0) {
    const advanced = applyRunnerMovements(state.runners, play.movements);
    const nextPlay = { ...play, scored: [...play.scored, ...advanced.scored] };
    return prepareFurtherHitAdvance({ ...state, runners: advanced.runners }, batter, attempt, awayLineupSize, homeLineupSize, nextPlay, offensiveTeam);
  }

  const selected = automaticTarget(options);
  if (!selected) {
    return {
      ...state,
      pendingFielding: attempt,
      pendingRunnerPlay: { ...play, targetRunnerId: undefined },
      resolution: {
        ...state.resolution,
        phase: "DEFENSE_CHOICE",
        defensiveOptions: options,
        description: `Choose the defensive target. Initial routes include ${attempt.fieldingDistance} square${attempt.fieldingDistance === 1 ? "" : "s"} for ${attempt.fielderName} to reach the ball; subsequent routes begin with the ball already controlled.`,
      },
    };
  }

  const targetedAttempt = fieldingWithTarget(attempt, selected.targetBase);
  const equalRoute = options.length > 1;
  return {
    ...state,
    pendingFielding: targetedAttempt,
    pendingRunnerPlay: { ...play, targetRunnerId: selected.runnerId },
    resolution: {
      ...state.resolution,
      phase: "RUNNER_ADVANCE",
      defensiveOptions: undefined,
      ballAt: targetedAttempt.ballAt,
      description: `${play.movements.map((movement) => `${movement.runnerName} to ${BASE_WORD[movement.to]} (${movement.routeDistance})`).join("; ")}. ${equalRoute ? `Equal routes—defense targets lead runner ${selected.runnerName}` : `Defense targets ${selected.runnerName}`} at ${BASE_WORD[selected.targetBase]}.`,
      source: "1980 Rule 6 stop-action fielding; lead runner breaks equal defensive routes",
    },
  };
}

export function selectDefensiveTarget(state: GameState, runnerId: string): GameState {
  if (state.resolution.phase !== "DEFENSE_CHOICE" || !state.pendingRunnerPlay || !state.pendingFielding) return state;
  const option = state.resolution.defensiveOptions?.find((candidate) => candidate.runnerId === runnerId);
  if (!option) return state;
  return {
    ...state,
    pendingFielding: fieldingWithTarget(state.pendingFielding, option.targetBase),
    pendingRunnerPlay: { ...state.pendingRunnerPlay, targetRunnerId: runnerId },
    resolution: {
      ...state.resolution,
      phase: "RUNNER_ADVANCE",
      defensiveOptions: undefined,
      description: `Defense chooses ${option.runnerName} at ${BASE_WORD[option.targetBase]} (${option.routeDistance}-square route).`,
    },
  };
}

function completeOccupiedRunnerThrow(
  state: GameState,
  batter: Batter,
  attempt: FieldingAttempt,
  call: "OUT" | "SAFE",
  awayLineupSize: number,
  homeLineupSize: number,
  offensiveTeam?: Team,
): GameState {
  const play = state.pendingRunnerPlay!;
  const targetRunnerId = play.targetRunnerId!;
  const advanced = applyRunnerMovements(state.runners, play.movements, call === "OUT" ? targetRunnerId : undefined);
  const nextPlay: PendingRunnerPlay = {
    ...play,
    scored: [...play.scored, ...advanced.scored],
    targetRunnerId: undefined,
  };
  const next = {
    ...state,
    outs: state.outs + (call === "OUT" ? 1 : 0),
    runners: advanced.runners,
    pendingRunnerPlay: nextPlay,
    pendingFielding: attempt,
    ballAt: attempt.ballAt,
  };
  return prepareFurtherHitAdvance(next, batter, attempt, awayLineupSize, homeLineupSize, nextPlay, offensiveTeam);
}

export function resolveFielding(
  state: GameState,
  batter: Batter,
  pitcher: Pitcher,
  park: Park,
  defensiveTeam: Team,
  awayLineupSize: number,
  homeLineupSize: number,
  offensiveTeam?: Team,
): GameState {
  if (state.resolution.phase === "UMPIRE_CHECK" && state.pendingFielding && state.pendingRunnerPlay?.targetRunnerId) {
    const targetRunner = offensiveTeam?.lineup.find((player) => player.id === state.pendingRunnerPlay?.targetRunnerId) ?? batter;
    const result = rollTwoDice(state.seed, "umpire", "Automatic umpire roll");
    const call = automaticUmpireCall(result.roll.sherco, state.pendingFielding.arm, targetRunner.speed);
    const roll: DiceRoll = {
      ...result.roll,
      explanation: `${state.pendingFielding.arm}${state.pendingFielding.range} defense versus ${targetRunner.speed === "REGULAR" ? "regular" : targetRunner.speed} speed: ${call.toLowerCase()}.`,
      resultLabel: call,
      resultTone: call === "OUT" ? "out" : "hit",
    };
    const seeded = appendPlayEvent(
      { ...state, seed: result.state, lastRoll: roll },
      `${targetRunner.name} is ${call.toLowerCase()} at ${BASE_WORD[state.pendingFielding.targetBase]}.`,
      `Exact-count throw. Automatic Umpire: ${roll.dice.join(" and ")} → ${roll.sherco}, ${call}.`,
      roll,
    );
    return completeOccupiedRunnerThrow(seeded, batter, state.pendingFielding, call, awayLineupSize, homeLineupSize, offensiveTeam);
  }

  if (state.resolution.phase === "RUNNER_ADVANCE" && state.pendingFielding && state.pendingRunnerPlay?.targetRunnerId) {
    const attempt = state.pendingFielding;
    const play = state.pendingRunnerPlay;
    const target = play.movements.find((movement) => movement.runnerId === play.targetRunnerId)!;
    const result = rollTwoDice(state.seed, play.initialThrow ? "fielding" : "throw", `${attempt.fielderPosition} throw to ${BASE_WORD[attempt.targetBase]}`);
    const thrown = resolveThrow(attempt, result.roll.total);
    const updatedAttempt: FieldingAttempt = {
      ...attempt,
      ballAt: thrown.ballAt,
      fielderAt: thrown.ballAt,
      fieldingDistance: 0,
      throwingAllowance: thrown.allowance,
      throwingRemainder: thrown.remaining,
      actionPath: [...(attempt.actionPath ?? attempt.fieldingPath ?? []), ...thrown.path],
    };
    const movementText = play.initialThrow
      ? `${attempt.fieldingDistance} to field, then ${attempt.targetDistance} to ${BASE_WORD[attempt.targetBase]} (${attempt.fieldingDistance + attempt.targetDistance} total)`
      : `ball already controlled; ${attempt.targetDistance} to ${BASE_WORD[attempt.targetBase]}`;
    const roll: DiceRoll = {
      ...result.roll,
      displayValue: result.roll.total,
      explanation: `${attempt.fielderName}: max of arm ${attempt.arm} or dice total ${result.roll.total} = ${thrown.allowance}; ${movementText}.`,
      resultLabel: thrown.result === "TIE" ? `Tie at ${BASE_WORD[attempt.targetBase]}` : thrown.result,
      resultTone: thrown.result === "OUT" ? "out" : thrown.result === "SAFE" ? "hit" : "event",
    };
    const seeded = appendPlayEvent(
      { ...state, seed: result.state, ballAt: thrown.ballAt, pendingFielding: updatedAttempt },
      `${attempt.fielderName} throws for ${target.runnerName} at ${BASE_WORD[attempt.targetBase]}.`,
      `${roll.label}: ${roll.dice.join(" plus ")} = ${roll.total}. ${roll.explanation}`,
      roll,
    );
    if (thrown.result === "TIE") {
      return {
        ...seeded,
        resolution: {
          ...state.resolution,
          phase: "UMPIRE_CHECK",
          ballAt: thrown.ballAt,
          description: `The throw reaches ${BASE_WORD[attempt.targetBase]} by exact count. Consult the Automatic Umpire for ${target.runnerName}.`,
          source: "1980 Rule 6c(13) and Rule 16",
        },
      };
    }
    return completeOccupiedRunnerThrow(seeded, batter, updatedAttempt, thrown.result, awayLineupSize, homeLineupSize, offensiveTeam);
  }

  if (state.resolution.phase === "UMPIRE_CHECK" && state.pendingFielding) {
    const result = rollTwoDice(state.seed, "umpire", "Automatic umpire roll");
    const call = automaticUmpireCall(result.roll.sherco, state.pendingFielding.arm, batter.speed);
    const roll: DiceRoll = {
      ...result.roll,
      explanation: `${state.pendingFielding.arm}${state.pendingFielding.range} defense versus ${batter.speed === "REGULAR" ? "regular" : batter.speed} speed: ${call.toLowerCase()}.`,
      resultLabel: call,
      resultTone: call === "OUT" ? "out" : "hit",
    };
    const seeded = { ...state, seed: result.state, lastRoll: roll };
    const currentBase = batterBase(state.runners, batter.id);
    const targetBase = state.pendingFielding.targetBase;
    if (!currentBase) {
      if (call === "OUT") {
        return finishPlateAppearance(
          seeded,
          batter,
          awayLineupSize,
          homeLineupSize,
          "OUT",
          `${batter.name} is out at first on a close play, ${state.pendingFielding.fielderName} making the throw.`,
          `The throw reached first by exact count. Automatic Umpire: ${roll.dice.join(" and ")} → ${roll.sherco}, ${call}.`,
          roll,
        );
      }
      const safeSeeded = appendPlayEvent(
        seeded,
        `${batter.name} is safe at first on the Automatic Umpire call.`,
        `The throw reached first by exact count. Automatic Umpire: ${roll.dice.join(" and ")} → ${roll.sherco}, SAFE.`,
        roll,
      );
      return continueOrFinishBatterRun(safeSeeded, batter, "FIRST", state.pendingFielding, awayLineupSize, homeLineupSize);
    }

    if (call === "OUT") {
      const credited = HIT_OUTCOME[currentBase].toLowerCase();
      return finishBatterRun(
        seeded,
        batter,
        awayLineupSize,
        homeLineupSize,
        currentBase,
        targetBase,
        `${batter.name} is credited with a ${credited} and is out trying for ${BASE_WORD[targetBase]}.`,
        `Exact-count throw to ${BASE_WORD[targetBase]}. Automatic Umpire: ${roll.dice.join(" and ")} → ${roll.sherco}, OUT.`,
        roll,
      );
    }
    const safeSeeded = appendPlayEvent(
      seeded,
      `${batter.name} is safe at ${BASE_WORD[targetBase]} on the Automatic Umpire call.`,
      `Exact-count throw to ${BASE_WORD[targetBase]}. Automatic Umpire: ${roll.dice.join(" and ")} → ${roll.sherco}, SAFE.`,
      roll,
    );
    return continueOrFinishBatterRun(safeSeeded, batter, targetBase as HitBase | "HOME", state.pendingFielding, awayLineupSize, homeLineupSize);
  }

  if (state.resolution.phase === "RUNNER_ADVANCE" && state.pendingFielding) {
    const currentBase = batterBase(state.runners, batter.id);
    if (!currentBase) return state;
    const attempt = state.pendingFielding;
    const targetBase = attempt.targetBase;
    const result = rollTwoDice(state.seed, "throw", `${attempt.fielderPosition} throw to ${BASE_WORD[targetBase]}`);
    const thrown = resolveThrow(attempt, result.roll.total);
    const updatedAttempt: FieldingAttempt = {
      ...attempt,
      throwingAllowance: thrown.allowance,
      throwingRemainder: thrown.remaining,
      actionPath: thrown.path,
    };
    const roll: DiceRoll = {
      ...result.roll,
      displayValue: result.roll.total,
      explanation: `${attempt.fielderName}: max of arm ${attempt.arm} or dice total ${result.roll.total} = ${thrown.allowance}; ball is already controlled, so all ${thrown.remaining} points go toward ${BASE_WORD[targetBase]} (${attempt.targetDistance} squares).`,
      resultLabel: thrown.result === "TIE" ? `Tie at ${BASE_WORD[targetBase]}` : thrown.result,
      resultTone: thrown.result === "OUT" ? "out" : thrown.result === "SAFE" ? "hit" : "event",
    };
    const seeded = appendPlayEvent(
      { ...state, seed: result.state, ballAt: thrown.ballAt, pendingFielding: updatedAttempt },
      `${attempt.fielderName} throws to ${BASE_WORD[targetBase]}.`,
      `${roll.label}: ${roll.dice.join(" plus ")} = ${roll.total}. ${roll.explanation}`,
      roll,
    );

    if (thrown.result === "TIE") {
      return {
        ...seeded,
        resolution: {
          phase: "UMPIRE_CHECK",
          baseState: baseStateFromRunners(state.runners),
          battedBallType: attempt.battedBallType,
          ballAt: thrown.ballAt,
          description: `The throw reaches ${BASE_WORD[targetBase]} by exact count. Consult the Automatic Umpire (${attempt.arm}${attempt.range} DEF vs ${batter.speed === "REGULAR" ? "regular" : batter.speed} runner).`,
          source: "1980 Rule 6c(13) and Rule 16",
        },
      };
    }

    if (thrown.result === "OUT") {
      const credited = HIT_OUTCOME[currentBase].toLowerCase();
      return finishBatterRun(
        seeded,
        batter,
        awayLineupSize,
        homeLineupSize,
        currentBase,
        targetBase,
        `${batter.name} is credited with a ${credited} and is out trying for ${BASE_WORD[targetBase]}.`,
        `${attempt.fielderName}'s throw beats ${batter.name} to ${BASE_WORD[targetBase]}.`,
      );
    }

    return continueOrFinishBatterRun(seeded, batter, targetBase as HitBase | "HOME", updatedAttempt, awayLineupSize, homeLineupSize);
  }

  if (state.resolution.phase !== "BALL_IN_PLAY" || !state.resolution.ballAt || !state.resolution.battedBallType) return state;
  const defense = buildRatedDefense(defensiveTeam, pitcher, park);
  const catchAttempt = createFieldingAttempt(batter, park, defense, state.resolution.ballAt, state.resolution.battedBallType);

  if (isAirborneCatch(catchAttempt)) {
    const verb = catchAttempt.battedBallType === "pop" ? "pops out" : catchAttempt.battedBallType === "line" ? "lines out" : "flies out";
    return finishPlateAppearance(
      { ...state, pendingFielding: catchAttempt },
      batter,
      awayLineupSize,
      homeLineupSize,
      "OUT",
      `${batter.name} ${verb} to ${catchAttempt.fielderName}.`,
      `${catchAttempt.fielderName} (${catchAttempt.range} range) is ${catchAttempt.fieldingDistance} square${catchAttempt.fieldingDistance === 1 ? "" : "s"} from the ball and makes the catch.`,
    );
  }

  // Once an airborne ball drops, Rule 6 treats it as a grounder; arm breaks any fielding-distance tie.
  const attempt = state.resolution.battedBallType === "ground"
    ? catchAttempt
    : { ...createFieldingAttempt(batter, park, defense, state.resolution.ballAt, "ground"), battedBallType: state.resolution.battedBallType };

  if (state.resolution.baseState !== "EMPTY") {
    if (state.resolution.chartFamily === "PROBABLE_HIT") {
      const movements = initialHitMovements(state, batter, attempt, offensiveTeam);
      const play: PendingRunnerPlay = {
        kind: "HIT_ADVANCE",
        movements,
        initialThrow: true,
        scored: [],
        allowExtraBases: !(state.resolution.description?.toLowerCase().includes("one base only") ?? false),
      };
      return prepareRunnerThrow(state, batter, attempt, awayLineupSize, homeLineupSize, play, offensiveTeam);
    }

    // Probable Out grounders still need their force/DP target graph. Preserve
    // the chart result rather than falling into the bases-empty first-base path.
    return {
      ...state,
      ballAt: attempt.ballAt,
      pendingFielding: attempt,
      resolution: {
        ...state.resolution,
        phase: "CHART_RESULT_PENDING",
        ballAt: attempt.ballAt,
        description: `${state.resolution.description ?? "Occupied-base ball in play"} ${attempt.fielderName} is the nearest fielder, ${attempt.fieldingDistance} square${attempt.fieldingDistance === 1 ? "" : "s"} from the ball. Defensive target and chart-locked runner sequence are queued for the occupied-play resolver.`,
        source: `${state.resolution.source ?? "1980 base-state chart"}; protected occupied-play boundary`,
      },
    };
  }

  const result = rollTwoDice(state.seed, "fielding", `${attempt.fielderPosition} fielding throw`);
  const thrown = resolveThrow(attempt, result.roll.total);
  const updatedAttempt = {
    ...attempt,
    throwingAllowance: thrown.allowance,
    throwingRemainder: thrown.remaining,
    actionPath: [...(attempt.fieldingPath ?? []), ...thrown.path],
  };
  const ricochetText = attempt.ricochet
    ? ` Ground ball plotted at ${attempt.ricochet.originalLandingAt.row}-${attempt.ricochet.originalLandingAt.column} ricochets ${attempt.ricochet.depth} back from the wall at ${attempt.ricochet.fenceAt.row}-${attempt.ricochet.fenceAt.column} to ${attempt.ballAt.row}-${attempt.ballAt.column}.`
    : "";
  const roll: DiceRoll = {
    ...result.roll,
    displayValue: result.roll.total,
    explanation: `${attempt.fielderName}: max of arm ${attempt.arm} or dice total ${result.roll.total} = ${thrown.allowance}; ${attempt.fieldingDistance} to field${attempt.ricochet ? " via the fence" : ""}, ${thrown.remaining} left for a ${attempt.targetDistance}-square throw to first.${ricochetText}`,
    resultLabel: thrown.result === "TIE" ? "Tie at first" : thrown.result,
    resultTone: thrown.result === "OUT" ? "out" : thrown.result === "SAFE" ? "hit" : "event",
  };
  const seeded = appendPlayEvent(
    { ...state, seed: result.state, ballAt: thrown.ballAt, pendingFielding: updatedAttempt },
    `${attempt.fielderName} fields the ball and throws to first.`,
    `${roll.label}: ${roll.dice.join(" plus ")} = ${roll.total}. ${roll.explanation}`,
    roll,
  );

  if (thrown.result === "TIE") {
    return {
      ...seeded,
      resolution: {
        phase: "UMPIRE_CHECK",
        baseState: "EMPTY",
        description: `The throw reaches first by exact count. Consult the Automatic Umpire (${attempt.arm}${attempt.range} DEF vs ${batter.speed === "REGULAR" ? "regular" : batter.speed} runner).`,
        source: "1980 Rule 6c(13) and Rule 16",
      },
    };
  }

  if (thrown.result === "OUT") {
    return finishPlateAppearance(
      seeded,
      batter,
      awayLineupSize,
      homeLineupSize,
      "OUT",
      `${batter.name} grounds out, ${positionName(attempt.fielderPosition)} to first.`,
      `${attempt.fielderName} had ${thrown.remaining} square${thrown.remaining === 1 ? "" : "s"} after fielding${attempt.ricochet ? " by way of the fence" : ""}; first base was ${attempt.targetDistance} away.${ricochetText}`,
    );
  }

  return continueOrFinishBatterRun(seeded, batter, "FIRST", updatedAttempt, awayLineupSize, homeLineupSize);
}

export function scoreDirectResult(
  state: GameState,
  batter: Batter,
  awayLineupSize: number,
  homeLineupSize: number,
): GameState {
  if (state.resolution.phase !== "DIRECT_RESULT" || !state.resolution.terminalOutcome) return state;
  const outcome = state.resolution.terminalOutcome;
  const result = outcome === "STRIKEOUT" || outcome === "OUT" ? "OUT" : outcome;
  const errorBase = state.resolution.awardedBase ?? "FIRST";
  const errorBaseLabel = errorBase === "FIRST" ? "first" : errorBase === "SECOND" ? "second" : "third";
  const officialText = outcome === "STRIKEOUT" ? `${batter.name} strikes out.`
    : outcome === "OUT" ? `${batter.name} is out.`
    : outcome === "SINGLE" ? `${batter.name} singles.`
    : outcome === "DOUBLE" ? `${batter.name} doubles.`
    : outcome === "TRIPLE" ? `${batter.name} triples.`
    : outcome === "WALK" ? `${batter.name} walks.`
      : outcome === "HIT_BY_PITCH" ? `${batter.name} is hit by a pitch.`
        : outcome === "HOME_RUN" ? `${batter.name} hits a home run.`
          : state.resolution.creditedHit
            ? `${batter.name} singles and reaches ${errorBaseLabel} on an error.`
            : `${batter.name} reaches ${errorBaseLabel} on an error.`;
  return finishPlateAppearance(
    state,
    batter,
    awayLineupSize,
    homeLineupSize,
    result,
    officialText,
    state.resolution.description ?? officialText,
    undefined,
    outcome === "ERROR" ? { base: errorBase, creditedHit: Boolean(state.resolution.creditedHit) } : undefined,
  );
}

export function canStartNextPlateAppearance(state: GameState): boolean {
  return state.resolution.phase === "PLAY_COMPLETE";
}

export function startNextPlateAppearance(state: GameState): GameState {
  if (!canStartNextPlateAppearance(state)) return state;
  const runners = state.runners;
  return {
    ...state,
    runners,
    ballAt: undefined,
    lastFielding: undefined,
    pendingFielding: undefined,
    pendingRunnerPlay: undefined,
    pitchCount: 0,
    lastRoll: undefined,
    resolution: {
      phase: "PITCH",
      baseState: baseStateFromRunners(runners),
    },
  };
}

const TEST_BATTER_BOUNDARIES = new Set<GameState["resolution"]["phase"]>(["COUNT_PENDING", "TRIPLE_DECISION"]);

export function canAdvanceTestBatter(state: GameState): boolean {
  return TEST_BATTER_BOUNDARIES.has(state.resolution.phase);
}

/** Temporary validation loop: advances the lineup without scoring the unresolved play. */
export function advanceTestBatter(state: GameState, awayLineupSize: number, homeLineupSize: number): GameState {
  if (!canAdvanceTestBatter(state)) return state;
  const awayBatterIndex = state.half === "top" && awayLineupSize > 0 ? (state.awayBatterIndex + 1) % awayLineupSize : state.awayBatterIndex;
  const homeBatterIndex = state.half === "bottom" && homeLineupSize > 0 ? (state.homeBatterIndex + 1) % homeLineupSize : state.homeBatterIndex;
  return {
    ...state,
    awayBatterIndex,
    homeBatterIndex,
    resolution: {
      phase: "PITCH",
      baseState: "EMPTY",
      description: "Test mode: the previous result was not scored. Roll for the next batter.",
      source: "Temporary 0.2.1 chart-validation loop",
    },
    ballAt: undefined,
    lastRoll: undefined,
  };
}

export function toggleRulesProfile(state: GameState): GameState {
  return { ...state, rulesProfileId: state.rulesProfileId === "brien" ? "official-1980" : "brien" };
}

export function selectPark(state: GameState, parkId: string): GameState {
  return { ...state, selectedParkId: parkId };
}

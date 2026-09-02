import { rollOneDie, rollTwoDice } from "./dice";
import { directPitchResult, resolveBasesEmptyBattedBall, resolveBasesEmptyError, resolveBasesEmptySpecialEvent, specialEventPitcherRate } from "./chartResolution";
import { classifyPitch, hitNumber, pitchResultLabel } from "./pitching";
import { automaticUmpireCall, buildRatedDefense, createFieldingAttempt, isAirborneCatch, positionName, resolveThrow } from "./fielding";
import type { BaseRunners, BaseState, Batter, DiceRoll, GameState, Park, Pitcher, PlateAppearanceResolution, PlayEvent, ScoreLine, Team } from "./types";

export function createInitialGame(selectedParkId: string, seed = 198010210): GameState {
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
  const resolution: PlateAppearanceResolution = adjustedRate
    ? { phase: "PITCH", baseState: "EMPTY", description: `Pitcher rate changed from ${currentRate} to ${adjustedRate}; pitch again.`, source: "1980 rulebook p.25 Special Events note" }
    : directResult
    ? { phase: "DIRECT_RESULT", baseState: "EMPTY", terminalOutcome: directResult, description: directResult === "WALK" ? "Base on balls." : "Strikeout.", source: "1980 rulebook Rule 5h" }
    : classification === "SPECIAL_EVENT"
      ? { phase: "SPECIAL_EVENT", baseState: "EMPTY", chartFamily: "SPECIAL_EVENT", description: "Roll one die on the Bases Empty Special Events Chart.", source: "1980 rulebook Rule 5n and p.25" }
      : { phase: "BATTED_BALL_CHART", baseState: "EMPTY", chartFamily: classification, description: `Roll on the Bases Empty ${pitchResultLabel(classification)} chart.`, source: classification === "PROBABLE_HIT" ? "1980 rulebook p.24" : "1980 rulebook p.25" };
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

export function rollResolution(state: GameState, batter: Batter, pitcher: Pitcher, park: Park): GameState {
  const { phase, chartFamily } = state.resolution;
  if (phase === "BATTED_BALL_CHART" && (chartFamily === "PROBABLE_HIT" || chartFamily === "PROBABLE_OUT")) {
    const result = rollTwoDice(state.seed, "chart", `${chartFamily === "PROBABLE_HIT" ? "Probable Hit" : "Probable Out"} chart roll`);
    let resolution = resolveBasesEmptyBattedBall(chartFamily, result.roll.sherco, batter, pitcher, park, state.outs, state.rulesProfileId === "brien");
    const currentRate = state.activePitcherRate ?? pitcher.rate;
    const adjustedRate = resolution.phase === "SPECIAL_EVENT" ? specialEventPitcherRate(currentRate) : undefined;
    if (adjustedRate) {
      resolution = { phase: "PITCH", baseState: "EMPTY", description: `No Special Event: pitcher rate changed from ${currentRate} to ${adjustedRate}; pitch again.`, source: "1980 rulebook p.25 Special Events note" };
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
    const resolution = resolveBasesEmptySpecialEvent(result.roll.sherco as 1 | 2 | 3 | 4 | 5 | 6, batter, pitcher, park);
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
    const resolution = resolveBasesEmptyError(chartFamily, result.roll.sherco as 1 | 2 | 3 | 4 | 5 | 6);
    const roll: DiceRoll = { ...result.roll, explanation: resolution.description!, resultLabel: "Error", resultTone: "error" };
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
  result: "OUT" | "SINGLE" | "WALK" | "HIT_BY_PITCH" | "ERROR" | "HOME_RUN",
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
    next = withBattingLine(next, { hits: 1, runs: 1 });
  } else {
    if (result === "ERROR" && errorAward?.base === "SECOND") runners.second = batter.id;
    else if (result === "ERROR" && errorAward?.base === "THIRD") runners.third = batter.id;
    else runners.first = batter.id;
    if (result === "SINGLE") next = withBattingLine(next, { hits: 1 });
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
    ballAt: next.ballAt,
    resolution: {
      phase: "PLAY_COMPLETE",
      baseState,
      terminalOutcome: result === "HOME_RUN" ? "HOME_RUN" : result === "WALK" ? "WALK" : result === "HIT_BY_PITCH" ? "HIT_BY_PITCH" : result === "ERROR" ? "ERROR" : undefined,
      description: officialText,
      source: "1980 Rule 6 fielding and scoring sequence",
    },
  };
}

export function resolveFielding(
  state: GameState,
  batter: Batter,
  pitcher: Pitcher,
  park: Park,
  defensiveTeam: Team,
  awayLineupSize: number,
  homeLineupSize: number,
): GameState {
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
    return finishPlateAppearance(
      seeded,
      batter,
      awayLineupSize,
      homeLineupSize,
      call === "OUT" ? "OUT" : "SINGLE",
      call === "OUT"
        ? `${batter.name} is out at first on a close play, ${state.pendingFielding.fielderName} making the throw.`
        : `${batter.name} beats the throw by ${state.pendingFielding.fielderName} for a single.`,
      `The throw reached first by exact count. Automatic Umpire: ${roll.dice.join(" and ")} → ${roll.sherco}, ${call}.`,
      roll,
    );
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

  const result = rollTwoDice(state.seed, "fielding", `${attempt.fielderPosition} fielding throw`);
  const thrown = resolveThrow(attempt, result.roll.total);
  const updatedAttempt = { ...attempt, throwingAllowance: thrown.allowance, throwingRemainder: thrown.remaining };
  const roll: DiceRoll = {
    ...result.roll,
    displayValue: result.roll.total,
    explanation: `${attempt.fielderName}: max of arm ${attempt.arm} or dice total ${result.roll.total} = ${thrown.allowance}; ${attempt.fieldingDistance} to field, ${thrown.remaining} left for a ${attempt.targetDistance}-square throw to first.`,
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

  return finishPlateAppearance(
    seeded,
    batter,
    awayLineupSize,
    homeLineupSize,
    thrown.result === "OUT" ? "OUT" : "SINGLE",
    thrown.result === "OUT"
      ? `${batter.name} grounds out, ${positionName(attempt.fielderPosition)} to first.`
      : `${batter.name} beats the throw by ${attempt.fielderName} for a single.`,
    `${attempt.fielderName} had ${thrown.remaining} square${thrown.remaining === 1 ? "" : "s"} after fielding; first base was ${attempt.targetDistance} away.`,
  );
}

export function scoreDirectResult(
  state: GameState,
  batter: Batter,
  awayLineupSize: number,
  homeLineupSize: number,
): GameState {
  if (state.resolution.phase !== "DIRECT_RESULT" || !state.resolution.terminalOutcome) return state;
  const outcome = state.resolution.terminalOutcome;
  const result = outcome === "STRIKEOUT" ? "OUT" : outcome;
  const errorBase = state.resolution.awardedBase ?? "FIRST";
  const errorBaseLabel = errorBase === "FIRST" ? "first" : errorBase === "SECOND" ? "second" : "third";
  const officialText = outcome === "STRIKEOUT" ? `${batter.name} strikes out.`
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

export function startNextPlateAppearance(state: GameState, clearBasesForTesting = false): GameState {
  if (!canStartNextPlateAppearance(state)) return state;
  const runners = clearBasesForTesting ? {} : state.runners;
  return {
    ...state,
    runners,
    ballAt: undefined,
    lastFielding: undefined,
    pendingFielding: undefined,
    pitchCount: 0,
    lastRoll: undefined,
    resolution: {
      phase: "PITCH",
      baseState: baseStateFromRunners(runners),
      description: clearBasesForTesting ? "Bases cleared for continued bases-empty testing." : undefined,
      source: clearBasesForTesting ? "Temporary bases-empty validation loop" : undefined,
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

import { rollOneDie, rollTwoDice } from "./dice";
import { directPitchResult, resolveBasesEmptyBattedBall, resolveBasesEmptyError, resolveBasesEmptySpecialEvent, specialEventPitcherRate } from "./chartResolution";
import { classifyPitch, hitNumber, pitchResultLabel } from "./pitching";
import type { Batter, DiceRoll, GameState, Park, Pitcher, PlateAppearanceResolution, PlayEvent } from "./types";

export function createInitialGame(selectedParkId: string, seed = 198010210): GameState {
  return {
    schemaVersion: 2,
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
    events: [],
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
    ? { phase: "DIRECT_RESULT", baseState: "EMPTY", description: directResult === "WALK" ? "Base on balls." : "Strikeout.", source: "1980 rulebook Rule 5h" }
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
    let resolution = resolveBasesEmptyBattedBall(chartFamily, result.roll.sherco, batter, pitcher, park, state.outs);
    const currentRate = state.activePitcherRate ?? pitcher.rate;
    const adjustedRate = resolution.phase === "SPECIAL_EVENT" ? specialEventPitcherRate(currentRate) : undefined;
    if (adjustedRate) {
      resolution = { phase: "PITCH", baseState: "EMPTY", description: `No Special Event: pitcher rate changed from ${currentRate} to ${adjustedRate}; pitch again.`, source: "1980 rulebook p.25 Special Events note" };
    }
    const roll: DiceRoll = {
      ...result.roll,
      explanation: resolution.description ?? "Chart result",
      resultLabel: adjustedRate ? `${currentRate} → ${adjustedRate}` : resolution.phase === "BALL_IN_PLAY" ? "Ball in Play" : resolution.phase === "SPECIAL_EVENT" ? "Special Event" : resolution.phase.includes("ERROR_CHECK") ? "Error Check" : "Chart Result",
      resultTone: adjustedRate ? "event" : resolution.phase === "BALL_IN_PLAY" ? (chartFamily === "PROBABLE_HIT" ? "hit" : "out") : resolution.phase === "SPECIAL_EVENT" ? "event" : "error",
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
      ? { phase: "DIRECT_RESULT", baseState: "EMPTY", chartFamily: "OUT_ERROR", description: "Pitcher error; batter safe at first.", source: "1980 rulebook p.25" }
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
      description: isWalk ? "Ball four; batter walks." : `Ball ${result.roll.sherco}; count continuation will be connected with the count engine.`,
      source: "1980 rulebook p.25",
    };
    const roll: DiceRoll = { ...result.roll, explanation: resolution.description!, resultLabel: isWalk ? "Walk" : "Ball", resultTone: isWalk ? "hit" : "event" };
    return appendRollEvent(state, roll, resolution.description!, resolution, result.state);
  }

  return state;
}

export function toggleRulesProfile(state: GameState): GameState {
  return { ...state, rulesProfileId: state.rulesProfileId === "brien" ? "official-1980" : "brien" };
}

export function selectPark(state: GameState, parkId: string): GameState {
  return { ...state, selectedParkId: parkId };
}

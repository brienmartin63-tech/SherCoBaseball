import { rollTwoDice } from "./dice";
import { classifyPitch, hitNumber, pitchResultLabel } from "./pitching";
import type { Batter, GameState, Pitcher, PlayEvent } from "./types";

export function createInitialGame(selectedParkId: string, seed = 19801021): GameState {
  return {
    seed,
    inning: 1,
    half: "top",
    outs: 0,
    away: { innings: [0], runs: 0, hits: 0, errors: 0 },
    home: { innings: [0], runs: 0, hits: 0, errors: 0 },
    awayBatterIndex: 0,
    homeBatterIndex: 0,
    pitchCount: 0,
    selectedParkId,
    rulesProfileId: "brien",
    events: [],
  };
}

export function rollPitch(state: GameState, batter: Batter, pitcher: Pitcher): GameState {
  const threshold = hitNumber(batter.offensiveGrade, pitcher.rate);
  const result = rollTwoDice(state.seed, "pitch", "Pitch roll");
  const classification = classifyPitch(result.roll.sherco, threshold);
  const explanation = classification === "SPECIAL_EVENT"
    ? "66 — consult the base-state Special Event chart"
    : `${result.roll.sherco} ${classification === "PROBABLE_HIT" ? "meets or exceeds" : "is below"} hit number ${threshold}`;
  const roll = {
    ...result.roll,
    explanation,
    resultLabel: pitchResultLabel(classification),
    resultTone: classification === "PROBABLE_HIT" ? "hit" as const : classification === "SPECIAL_EVENT" ? "event" as const : "out" as const,
  };
  const officialText = classification === "SPECIAL_EVENT"
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
    lastRoll: roll,
    events: [event, ...state.events].slice(0, 100),
  };
}

export function toggleRulesProfile(state: GameState): GameState {
  return { ...state, rulesProfileId: state.rulesProfileId === "brien" ? "official-1980" : "brien" };
}

export function selectPark(state: GameState, parkId: string): GameState {
  return { ...state, selectedParkId: parkId };
}

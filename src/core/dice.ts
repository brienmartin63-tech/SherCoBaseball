import { randomDie } from "./rng";
import type { DiceKind, DiceRoll } from "./types";

export interface RollResult {
  state: number;
  roll: DiceRoll;
}

export function shercoNumber(dice: [number, number]): number {
  const [low, high] = [...dice].sort((a, b) => a - b);
  return low * 10 + high;
}

export function rollTwoDice(state: number, kind: DiceKind, label: string, explanation = ""): RollResult {
  const first = randomDie(state);
  const second = randomDie(first.state);
  const dice: [number, number] = [first.die, second.die];
  const sherco = shercoNumber(dice);
  return {
    state: second.state,
    roll: {
      id: `${kind}-${second.state.toString(16)}`,
      kind,
      dice,
      sherco,
      total: first.die + second.die,
      label,
      explanation,
    },
  };
}

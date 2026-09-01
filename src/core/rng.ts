/** Small deterministic PRNG. State is stored with the game for exact replay. */
export function nextRandom(state: number): { state: number; value: number } {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return { state: unsigned || 0x6d2b79f5, value: unsigned / 0x1_0000_0000 };
}

export function randomDie(state: number): { state: number; die: number } {
  const roll = nextRandom(state);
  return { state: roll.state, die: Math.floor(roll.value * 6) + 1 };
}

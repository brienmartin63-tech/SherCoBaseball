const NONZERO_FALLBACK_SEED = 0x6d2b79f5;

function environmentSeed(): number {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0];
  }
  return ((Date.now() >>> 0) ^ Math.floor(Math.random() * 0x1_0000_0000)) >>> 0;
}

/** A fresh starting point for a new game; an injected source keeps this testable. */
export function createRandomSeed(source: () => number = environmentSeed): number {
  return source() >>> 0 || NONZERO_FALLBACK_SEED;
}

/** Small deterministic PRNG. State is stored with the game for exact replay. */
export function nextRandom(state: number): { state: number; value: number } {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return { state: unsigned || NONZERO_FALLBACK_SEED, value: unsigned / 0x1_0000_0000 };
}

export function randomDie(state: number): { state: number; die: number } {
  const roll = nextRandom(state);
  return { state: roll.state, die: Math.floor(roll.value * 6) + 1 };
}

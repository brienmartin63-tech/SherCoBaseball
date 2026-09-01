/** The tenth inning is always available as X; later innings extend the scrollable line. */
export function scoreboardInnings(currentInning: number): number[] {
  return Array.from({ length: Math.max(10, currentInning) }, (_, index) => index + 1);
}

export function inningLabel(inning: number): string {
  return inning === 10 ? "X" : String(inning);
}

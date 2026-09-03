# Project Checkpoint 0.5.2 — Randomized, Auditable Dice

New games must not repeat one canned sequence of rolls. At the same time, rules debugging requires every disputed result to remain inspectable and reproducible.

## New-game randomization

Creating or resetting a game now requests a fresh unsigned 32-bit seed from the browser's cryptographic random generator. A clock-and-random fallback is available for an environment without the browser API, and a nonzero fallback protects the dice generator from an unusable state.

This changes only the starting point. The existing deterministic pseudo-random generator still advances the stored game state after every die. Saved games therefore resume from the correct next roll, and tests can inject a known seed to replay an exact sequence permanently.

## Roll audit

Every roll continues to record:

- its purpose, such as pitch, chart, fielding, throw, steal, or Automatic Umpire;
- each physical die value;
- the SherCo low-die-first number where applicable;
- the conventional dice total where applicable;
- the rules explanation;
- and the result passed to the next engine phase.

Randomized does not mean opaque. The visible roll and its rules-engine consequence remain separable and checkable.

## Chart routing protection

The chart tables already require all 21 legal SherCo results in both Bases Empty Probable Hit and Probable Out families. Version 0.5.2 adds an end-to-end routing regression:

- known random seed `2722` generates dice `2` and `6`;
- the dice are read as SherCo `26`;
- the engine selects Bases Empty Probable Hit entry `26`;
- for a right-handed batter, it produces the printed grounder to `14-19`.

This test protects the connection between the dice display and the actual chart lookup. Later occupied-base chart families must add equivalent routing checks as they become executable.

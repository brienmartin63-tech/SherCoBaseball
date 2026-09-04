# Project Checkpoint 0.6.0 — Occupied-Base Chart Book

This checkpoint removes the bases-empty testing loop and establishes the complete 1980 occupied-base chart book as executable program data.

## Source inventory

The seven occupied situations are `FIRST`, `SECOND`, `THIRD`, `FIRST_SECOND`, `FIRST_THIRD`, `SECOND_THIRD`, and `LOADED`. Each contains:

- 21 Probable Hit results;
- 6 Probable Hit Error results;
- 21 Probable Out results;
- 6 Probable Out Error results; and
- 6 Special Event results.

That is 60 entries per state and 420 total. The extraction tool reads the rendered 1980 rulebook and rejects any missing roll. It distinguishes true one-die rows from nested ranges such as `1-3 = ejected`.

## Compiled placement contract

Every non-error PH and PO entry is compiled before the program runs. A placement contains a batted-ball type plus one of:

- a literal row-column coordinate;
- a named fixed fielder;
- a straight-lane distance in front of or behind a fixed fielder; or
- a park-dependent wall row for the printed `3-?` result.

HR alternatives and opposite-field instructions are separate fields. Display prose is retained for the audit, but never parsed during a game.

## Persistence and direct scoring

- Actual runner occupancy selects every pitch, PH, PO, error, and Special Event table.
- No transition clears the bases.
- A walk or hit batter advances only forced runners; a bases-loaded award scores one run.
- A home run scores the batter and every occupied runner, clears the bases, adds one hit, and advances the batting order once.
- The first pitch after a completed play belongs to the hitter already shown on screen.

## Protected boundary

The earlier fielding slice assumed bases empty and always targeted first. Build 0.6.0 forbids that code path when a runner is aboard. An occupied grounder or uncaught ball pauses with the authoritative chart text, plotted ball, nearest fielder, fielding distance, and runner-distance board intact.

The next integration step will supply defense-selected targets, simultaneous runner movement, continuous throws, force plays, and chart-locked error branches. Until then, the engine stops visibly instead of corrupting runner state.

## Regression gate

Build 0.6.0 has 72 deterministic tests covering all previous behavior plus chart completeness, compiled placements, occupied routing, error-family routing, runner persistence, forced awards, all-runner home runs, and protection from the obsolete throw-to-first assumption.

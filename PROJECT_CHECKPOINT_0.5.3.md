# Project Checkpoint 0.5.3 — Single-Step Batting Rotation

The rules engine already advanced the batting-order index when a plate appearance became complete. The interface then presented a separate **Next batter** action that only changed the phase from `PLAY_COMPLETE` to `PITCH`; it did not and should not advance the index again.

Because the newly selected batter was visible both before and after that phase-only click, the interface made it appear that some players were batting twice.

## Correct transition

The completed-play state continues to preserve the previous play's resolution, fielding route, and audit information. The upcoming batter is already highlighted and shown in the matchup.

The next button now says **Roll pitch**. One click:

1. clears the completed-play presentation;
2. opens the visible batter's plate appearance;
3. resets the plate-appearance pitch counter;
4. rolls that batter's first pitch;
5. leaves the batting-order index unchanged until that plate appearance is completed.

At the temporary occupied-base testing boundary, the label is **Clear bases & roll pitch**. This preserves the existing warning that the runners will be removed until occupied-base charts are connected.

## Batting-order contract

- A completed plate appearance advances the proper team's batting index exactly once.
- Starting the next plate appearance does not advance the index.
- Rolling pitches and intermediate charts does not advance the index.
- Completing a multi-throw fielding play advances the index exactly once.
- Recording the third out advances the completed batting side's index, changes halves, and selects the other team's currently due hitter.

## Regression protection

Version 0.5.3 tests the complete-to-next-pitch sequence for:

- outs;
- singles;
- doubles;
- triples;
- walks;
- hit batters;
- errors;
- home runs;
- and Darrell Porter's multi-throw triple.

For every result, the batting index changes once at completion and remains fixed while the next hitter's first pitch is rolled.

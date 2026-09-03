# Project Checkpoint 0.5.0 — Stop-Action Fielding

This checkpoint preserves the fielding and baserunning rules confirmed directly by Brien on September 3, 2026. These rules are engine contracts. Later occupied-base charts and interface work must call them rather than duplicate or reinterpret them.

## Coordinate and distance contract

- Coordinates are always read row-column.
- Home is `3-3`, first is `8-3`, second is `8-8`, and third is `3-8`.
- SherCo distance is the greater of the row difference or column difference; diagonal and straight movement each consume one square per step.
- The four-number distance values measure the ball to each base. They do not include the fielder's trip to the ball.
- A complete initial defensive route is fielder-to-ball plus ball-to-target.

## Ground-ball fielding

- The nearest fielder must handle the ground ball.
- A ground-ball distance tie goes to the fielder with the 9 arm.
- The first fielding allowance is the greater of the conventional two-dice total or the initial fielder's arm/minimum.
- Movement to the ball is charged first. Only the remaining allowance moves the ball.
- A ball reaching the target with allowance remaining produces an out. Exact count invokes the Automatic Umpire. A ball that does not arrive produces a safe runner.

## Continuous double and triple plays

- Double and triple plays are one continuous action on one dice roll.
- Pivot movement is not counted.
- Only the initial fielder's arm establishes the normal allowance.
- Every leg is measured in order: initial fielder to ball, ball to the first base, and each subsequent base.

### Permanent 7-9 example

With a runner on first, fewer than two outs, and a right-handed batter:

1. Grounder `7-9` is on the shortstop side.
2. The shortstop at `7-10` moves one square to the ball.
3. The throw travels one square to second.
4. The relay travels five squares from second to first.
5. Total route: seven.

Without a Pivot Rule penalty, an allowance of eight leaves one point and completes the `6-4-3` double play. With two outs, the force at second ends the inning and no relay is needed.

## Brien's adopted Pivot Rule

Although absent from the 1980 edition, the current-edition Pivot Rule is active under Brien's Rules:

> If the pivot man's arm is lower than the arm of the fielder who starts the play, reduce the complete available allowance by one.

Therefore, if the normal minimum eight is reduced to seven in the `7-9` example, the force at second is completed but the throw reaches first by exact count. The Automatic Umpire decides the batter-runner. A higher dice roll can still provide enough allowance to complete the double play.

## Ricochet Rule

- Ricochets apply only to ground balls plotted beyond the fence.
- Trace the ground ball's straight line and locate the exact wall-crossing edge.
- Count the squares by which the plotted landing point penetrates beyond the fence.
- Return the ball the same number of squares into the playing field on that straight line.
- Select the nearest fielder to the final ricochet square.
- That fielder cannot travel directly to the returned ball. His mandatory route is his position to the in-play square at the wall crossing, then from the wall to the returned ball.
- The mandatory two-leg movement is charged before any throw.

## Lead-runner control

Existing runners are evaluated from home backward: third, second, then first.

- Against a 9 arm, an optional extra-base attempt is mandatory only when the ball is at least ten squares from the destination.
- Against an 8 arm, it is mandatory when the ball is at least eight squares from the destination.
- If the lead runner holds, all trailing runners are blocked.
- If the lead runner goes, the next trailing runner is evaluated against his own destination distance. He goes only when his threshold is also met.

At a ball distance of nine, McBride holds against a 9 arm and blocks Schmidt. Against an 8 arm, McBride goes; Schmidt also goes when his own distance is at least eight.

## Two-out pre-throw advancement

With two outs, existing runners receive the two-base head start before the first defensive throw. The batter-runner still moves one base at a time.

In the confirmed loaded-base example:

- Rose, beginning on third, scores.
- McBride, beginning on second, scores.
- Schmidt moves from first to third.
- Luzinski begins at first.
- The first defensive throw then begins.

If Schmidt must try to score, the human defensive manager receives the choice:

- `CUT THROW`: concede Schmidt's run and hold Luzinski at first.
- `THROW HOME`: make the play on Schmidt and allow Luzinski to take second.

Brien controls both defenses. The program presents the choices and performs the arithmetic; it does not select a defensive strategy for him.

## Regression protection

Version 0.5.0 adds deterministic tests for:

- Ricochet depth, final square, nearest-fielder selection, and mandatory wall route.
- The exact `7-9` continuous double-play route.
- Pivot penalty and Automatic Umpire boundary.
- Lead-runner blocking at the 8- and 9-arm thresholds.
- Loaded two-out pre-throw placement.
- Cut-versus-throw-home decision data.

The seven occupied-base batting charts are not yet executable. Their future resolution code must consume these tested fielding and baserunning functions.

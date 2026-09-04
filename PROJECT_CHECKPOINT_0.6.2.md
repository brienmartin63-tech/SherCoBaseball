# Project Checkpoint 0.6.2 — Defensive Throws on Automatic-Safe Advances

Build 0.6.1 incorrectly treated a runner route longer than 12 as requiring no defensive action. Although the runner cannot be retired on that leg, the fielder must still throw. The throw changes the ball's location and therefore changes every subsequent extra-base decision.

## Corrected sequence

1. Every runner required to move is listed as a potential defensive target.
2. The initial route includes fielder-to-ball movement plus ball-to-base distance.
3. The defense selects a target even when the route exceeds 12 and the runner is automatically safe.
4. The throw uses the greater of the fielder's arm or the conventional two-dice total.
5. Fielder movement is deducted, and the ball travels the remaining squares toward the selected base.
6. All required runners complete that leg; the runner-distance board is recalculated from the ball's new location.
7. Subsequent throws begin with the ball controlled and do not repeat the original fielding cost.

## Willie Wilson regression

With runners at first and third, Willie Wilson's PH `16` is a grounder to `4-21`. Wilson has no HR `16`, so the alternative fly to `4-28` does not apply.

The program must retain the ground-ball placement, calculate all three required runner routes, and present defensive targets. It may not leave the ball at `4-21` while repeatedly granting automatic extra bases, and it may not record a three-run home run without completing the defensive throws.

## Release consistency gate

`npm run check` now verifies that the following all identify the same release:

- `package.json`;
- both version fields in `package-lock.json`;
- the application's runtime release constant;
- the README current-build heading;
- the chart-status current-build heading; and
- the release checkpoint filename.

This check runs before the regression suite and production build, preventing another ZIP with stale active-version metadata.

Build 0.6.2 passes 77 deterministic tests, including the exact Wilson placement, all three first-throw routes, and the transition from defensive choice into a real throw.

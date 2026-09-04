# Project Checkpoint 0.6.1 — Occupied-Hit First Throws

This checkpoint replaces the temporary occupied Probable Hit lock with the first executable multi-runner throw sequence.

## Confirmed first-throw arithmetic

On the first throw, the route is:

`nearest fielder to ball + ball to selected base`

Movement to field the ball must therefore be included for every runner who can be targeted. Once the ball is controlled and a throw has been made, later routes begin at the ball's new square and do not charge the original fielder movement again.

## Required movement

A batter and any runner required to advance by the batted-ball result run regardless of ball distance. Brien's 8-arm and 9-arm thresholds govern attempts beyond the required advancement; they do not cancel a force or the batter's run to first.

## Defensive targeting

- If only one runner is reachable, that runner is selected.
- If multiple reachable runners have the same route, the lead runner is selected automatically.
- If reachable routes differ, the game presents buttons and Brien chooses the defensive target.
- Exact-count throws use the targeted runner's speed—not automatically the batter's speed—on the Automatic Umpire chart.

## Permanent Hurdle–Porter regression

Clint Hurdle bats left-handed, so printed `6-18` is literal `18-6`. Bake McBride in right field is two squares from the ball. The ball is ten from second and ten from first:

- Porter: first to second, `2 + 10 = 12`;
- Hurdle: home to first, `2 + 10 = 12`.

Both runners must go. Because their chances are equal, the defense targets Porter at second. An allowance of 12 is an exact-count play and invokes the Automatic Umpire using Porter's runner rating. On a safe call, Porter occupies second, Hurdle occupies first, Kansas City receives the hit, and the batting order advances from Hurdle to Washington exactly once.

## Saved-game recovery

A 0.6.0 game paused at the protected occupied-hit boundary is reopened as a live ball in play. The selected park, runners, batter, inning, score, and deterministic dice seed are retained, allowing the play to continue without resetting the game.

## Regression gate

Build 0.6.1 has 75 passing deterministic tests, including the complete Hurdle–Porter throw, unequal-route defensive target selection, and recovery of the exact saved-state boundary introduced in 0.6.0.

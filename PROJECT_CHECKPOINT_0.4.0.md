# SherCo Grand Slam Baseball — Project Checkpoint 0.4.0

This checkpoint preserves the game-screen and baserunning decisions confirmed after the 0.3.3 scorer-console build. It supplements, rather than replaces, the 0.1.7 project checkpoint.

## Game-day screen

- Permanent lineup space belongs only to the batting team. The defensive batting order is irrelevant during that half-inning and is removed from view.
- The opposing current pitcher appears beneath the batting lineup with `IP H R ER BB SO` game columns.
- Clicking the current pitcher opens that team's bullpen. Selecting a reliever requires an explicit confirmation before the pitching change is committed.
- The active batter-pitcher matchup remains visible beneath the lineup/resolution area with the complete SherCo ratings and hit number.
- The playing field remains visible at the right. The ball's plotted square is itself part of the explanation for an experienced SherCo player.

## Runner-distance display

The runner display reports only the ball's present distance from the base the runner is trying to reach. Fielder-to-ball travel is not added to this value; that travel remains part of the fielding/throw calculation.

Distance colors are fixed:

- red: 0–8 squares;
- yellow: 9–12 squares;
- green: 13 or more squares.

Green means the runner reaches that destination safely before a throw can retire him. The color is a raw distance band; Brien's arm rule controls whether the runner must attempt another base.

## Brien's mandatory advancement rule

Every runner, including the batter-runner after he reaches a base, is independently checked after every throw:

- against an 8 arm, he must advance when the ball is 8 or more squares from his next base;
- against a 9 arm, he must advance when the ball is 10 or more squares from his next base.

These are mandatory attempts, not managerial permissions. When multiple runners qualify, the defense chooses which runner and base to challenge. After the throw, the program moves the ball and recalculates every runner against his next base. The cycle continues until nobody qualifies or the play ends.

Example from RF `19-8` in row-column notation:

- batter heading to first: ball is 11 away, yellow;
- runner on second heading to third: ball is 16 away, green and safe;
- after a nine-square throw leaves the ball at `10-8`, a runner on first is 2 from second and a runner on third is 7 from home; both hold against a 9 arm.

## Two-out hit-and-run

On a two-out hit-and-run, every runner occupying a base receives a two-base head start before the defense makes its first throw:

- first to third;
- second to home;
- third scores.

The batter-runner is not awarded two bases. He advances one base at a time and is subject to the same arm/distance rule after reaching each base.

Thus, with runners on first and second, both existing runners advance two bases before the first throw. The batter reaches first. If the ball remains far enough from second, the batter must continue; if it is only seven squares away, he stops unless a defensive throw elsewhere moves the ball far enough away to trigger another attempt.

## Competing defensive plays

The offense's mandatory movement creates the choice for the defense. If a runner is trying to score while the batter must try second, the interface must offer the legal throw targets and their consequences rather than automatically choosing the lead runner.

Confirmed example against an 8-armed RF when challenging the batter at second:

- out: 10/36;
- automatic-umpire decision: 5/36;
- safe: 21/36.

A grounder hit directly to RF can also produce an out at first: a throw of 12 retires the batter without help, while 11 requires the Automatic Umpire.

## SherCo Shortcuts

The stop-action sequence remains authoritative underneath the program, but experienced play does not require meaningless rolls. The program may automatically resolve a play only when every possible roll produces the same result.

Example: with the bases empty, a grounder to `7-9` is displayed on the field and resolved as a routine groundout without rolling unnecessary fielding dice. The exact calculation remains available as optional audit detail.

Likely results are not shortcuts. Totals of 27–35 may suggest a triple and 36+ may create an inside-the-park home-run possibility, but required rolls and decisions remain whenever they can change the outcome.

## 0.4.0 implementation boundary

Build 0.4.0 implements the active-offense layout, clickable bullpen with confirmed pitching changes, version-four persistence, runner-distance presentation, and tested baserunning primitives. The seven occupied-base chart families and the full multi-runner throw state machine remain the next rules-engine phase; this build does not pretend those plays are complete.

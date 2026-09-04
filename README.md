# SherCo Grand Slam Baseball

A browser-based implementation of the 1980 SherCo Grand Slam Baseball rules, designed for GitHub Pages and long-running SLOBS leagues.

The durable design decisions, confirmed house rules, scoring requirements, stadium-import conventions, and development priorities are preserved in [Project Checkpoint 0.1.7](docs/PROJECT_CHECKPOINT_0.1.7.md).

## Rules-engine build 0.6.2

This checkpoint intentionally separates rules, game state, imported data, persistence, and the interface so later requirements can extend working code instead of replacing it.

### 0.6.2 automatic-safe advances still produce a throw

- Corrects occupied hits on which every initial route exceeds the maximum allowance of 12. The runners are safe on that leg, but the defense still selects a target, rolls, and moves the ball toward the chosen base.
- Prevents the stationary-ball loop that incorrectly let runners circle the bases without any defensive throws.
- Adds the exact runners-at-first-and-third Willie Wilson PH `16` regression: the non-HR grounder stays at `4-21` and opens defensive target selection instead of becoming a three-run home run.
- Introduces an automated release-metadata gate. A build now fails if `package.json`, `package-lock.json`, the runtime version, README heading, chart-status heading, or checkpoint filename disagree.
- See [Project Checkpoint 0.6.2](docs/PROJECT_CHECKPOINT_0.6.2.md).

### 0.6.1 occupied-hit first throws

- Replaces the protected occupied Probable Hit boundary with a real simultaneous runner-and-fielder sequence.
- Every initial route is `fielder to ball + ball to destination`; subsequent throws begin with the controlled ball and use only its current distance to the destination.
- Required initial advancement ignores Brien's optional-extra-base threshold: every affected runner runs, even when the throw can produce an out or double play.
- When reachable runners have equal routes, the defense automatically targets the lead runner. Unequal routes produce explicit defensive target buttons.
- Permanently tests Hurdle's left-handed `6-18` result as literal `18-6`: Bake McBride moves two to field it, both Porter-to-second and Hurdle-to-first are 10 more, and the program selects Porter on the equal 12-square routes.
- An exact 12 reaches second and uses Porter's speed on the Automatic Umpire chart; a safe call leaves Porter on second and Hurdle on first and advances the lineup exactly once.
- Saved 0.6.0 occupied hits paused at the protected boundary reopen automatically in the new resolver. See [Project Checkpoint 0.6.1](docs/PROJECT_CHECKPOINT_0.6.1.md).

### 0.6.0 occupied-base chart book and persistent runners

- Transcribes all 420 entries in the seven occupied-base situations: Probable Hit, Hit Error, Probable Out, Out Error, and Special Events.
- Compiles all 280 non-error batted-ball placements into explicit coordinates, named-fielder offsets, handedness rules, and HR alternatives; the browser never interprets display prose to place a ball.
- Routes every pitch and subsequent chart roll from actual base occupancy instead of stamping the play as bases empty.
- Removes the temporary clear-bases transition. Runners persist into the next hitter and the button simply reads **Roll pitch**.
- Scores all occupied runners on a home run and performs correct forced advancement on walks and hit batters, including a bases-loaded run.
- Prevents unfinished occupied ground-ball sequences from falling into the old batter-only throw-to-first path. The exact chart result, ball, nearest fielder, movement, and runner distances remain visible at a protected integration boundary until defense-selected targets and chart-locked advances are connected.
- Adds completeness, placement, routing, persistence, force-advance, grand-slam, and fallback-protection regressions. See [Project Checkpoint 0.6.0](docs/PROJECT_CHECKPOINT_0.6.0.md).

### 0.5.3 single-step batting rotation

- Removes the redundant **Next batter** transition. A completed play has already advanced the lineup and displays the proper upcoming hitter.
- The next action now reads **Roll pitch** and opens that visible hitter's plate appearance while rolling immediately.
- The occupied-base clear operation was removed in 0.6.0; runners now persist into the next plate appearance.
- Adds a lineup regression across outs, singles, doubles, triples, walks, hit batters, errors, and home runs. Completion advances exactly once; preparing and rolling the next pitch do not advance again.
- Extends the Porter multi-throw regression to verify that his completed triple advances Kansas City's batting index from Porter to Hurdle exactly once.
- The batting-rotation contract is recorded in [Project Checkpoint 0.5.3](docs/PROJECT_CHECKPOINT_0.5.3.md).

### 0.5.2 randomized, auditable dice

- Every new game and **Reset demo** now begins from a fresh browser-generated random seed instead of replaying the same fixed sequence.
- Once generated, the seed advances through the existing deterministic dice engine. Saved games therefore continue their exact sequence, while explicit seeds remain available for permanent regression replays.
- Every roll retains its type, individual dice, SherCo number or conventional total, explanation, and resulting chart action in the audit log.
- Adds a routing regression proving that a generated SherCo `26` selects entry `26` from the Bases Empty Probable Hit chart and produces its printed `14-19` grounder.
- The randomization and audit contract is recorded in [Project Checkpoint 0.5.2](docs/PROJECT_CHECKPOINT_0.5.2.md).

### 0.5.1 continuous bases-empty running

- A safe first throw no longer ends a live ground-ball play. The batter-runner is placed on the base reached, the ball is remeasured to the next base, and Brien's arm threshold is applied again.
- Every required extra base receives a fresh conventional two-dice throw, with the fielder's arm as the minimum. The ball is already controlled, so subsequent throws spend their full allowance toward the new target.
- Exact-count throws to any base—not just first—use the Automatic Umpire before the play continues or ends.
- A batter put out stretching a hit retains the correct single, double, or triple credit and adds the baserunning out.
- Permanently tests Darrell Porter's left-handed `9-26` grounder at Phoenix: it lands one square beyond the wall, ricochets to `25-9`, costs Bake McBride six squares to field, and can continue through separate throws to a triple.
- The durable example and its regression checks are recorded in [Project Checkpoint 0.5.1](docs/PROJECT_CHECKPOINT_0.5.1.md).

### 0.5.0 stop-action fielding contract

- Adds a continuous-action throw resolver for double and triple plays. It charges the initial fielder's movement, follows every base in order, ignores pivot movement, and uses one roll with the initial fielder's arm.
- Adopts the current-edition Pivot Rule under Brien's Rules: when the pivot man's arm is lower than the initial fielder's arm, the complete allowance is reduced by one.
- Permanently tests the `7-9` RHB grounder with the shortstop on `7-10`: one to the ball, one to second, five to first. The seven-square route is a double play with an ordinary allowance of eight, but a weaker pivot reduces that allowance to seven and sends the play at first to the Automatic Umpire.
- Implements ground-ball ricochets. A ball plotted beyond the fence returns into play by the same number of squares along its original straight line. The nearest fielder is selected from the final ball square, but must travel to the wall-crossing square and then to the ball.
- Runner decisions are now evaluated lead runner first. A lead runner who holds blocks every trailing runner; a lead runner who goes allows the next runner to be evaluated against the same arm threshold.
- Encodes the loaded two-out pre-throw example: Rose and McBride score, Schmidt moves from first to third, and Luzinski begins at first before the first defensive throw.
- Encodes the defensive choice when Schmidt must try home: cut the throw and hold Luzinski at first, or throw home and allow Luzinski to take second.
- The stadium can display a numbered defensive action route. Ricochet previews and runner distances use the returned in-play ball square.
- The occupied-base chart transcriptions remain the next integration boundary; they will call these tested mechanics rather than recreate them.
- The durable rule contract is recorded in [Project Checkpoint 0.5.0](docs/PROJECT_CHECKPOINT_0.5.0.md).

### 0.4.2 Brien error-chart sequence

- Under Brien's Rules, a Probable Hit `66` goes directly to the applicable error chart; the printed outs-based preliminary error-frequency check is not used.
- The first one-die roll therefore selects the error-chart result. Only when the responsible fielder has an `S` rating is another die rolled: `1–3` uses the chart's no-error branch and `4–6` uses the printed error branch.
- Runner placement and advancement stated by an error-chart result are authoritative and cannot be replaced by ordinary optional or mandatory baserunning logic.
- Adds a deterministic end-to-end replay of George Brett's PH `66`, error-chart `5`, and Bake McBride's non-Superior RF rating: single plus E9, Brett on second.
- Preserves the preliminary outs-based check when the Official 1980 profile is selected.
- The permanent rule contract is recorded in [Project Checkpoint 0.4.2](docs/PROJECT_CHECKPOINT_0.4.2.md).

### 0.4.1 Superior-fielding and scoreboard correction

- Corrects Bases Empty Probable Hit Error result 5: a non-Superior RF produces a single plus E9 with the batter on second; the play never returns to the Probable Hit chart.
- Implements the Rule 19 Superior check for every Bases Empty Probable Hit error result. Only the responsible `S` fielder rolls again: `1–3` uses the chart's no-error branch and `4–6` preserves the error.
- On result 5, a Superior RF's `1–3` is a clean single with the batter on first; `4–6` remains a single plus E9 with the batter on second.
- Displays `–` for a team's inning until that team has actually come to bat. The visiting first-inning cell begins at `0`; the home first-inning cell remains `–` throughout the top half.

### 0.4.0 game-day workspace and running foundation

- Reorganizes the game screen around the active half-inning: only the batting lineup and the opposing pitcher occupy permanent lineup space.
- Moves the stadium to the right, embeds the scorer console and runner-distance board in the middle, and places the batter-pitcher matchup beneath the active lineup and resolution area.
- The current pitcher is clickable. A modern bullpen drawer shows each reliever's complete printed rating and requires confirmation before changing pitchers.
- Pitching changes are stored by team in version-four saved-game state and immediately drive subsequent matchup and rules calculations.
- Adds a runner-distance board using the confirmed red `0–8`, yellow `9–12`, and green `13+` bands. The calculation is strictly ball-to-destination; fielder movement remains a separate fielding calculation.
- Encodes Brien's mandatory extra-base thresholds for every runner: `8+` against an 8 arm and `10+` against a 9 arm.
- Encodes the two-out hit-and-run head start: runners already on base advance two bases before the first throw, while the batter-runner continues one base at a time.
- Preserves these clarifications and the SherCo Shortcuts design in [Project Checkpoint 0.4.0](docs/PROJECT_CHECKPOINT_0.4.0.md).

### 0.3.3 resolution console

- Recasts the wide-screen resolution wing as a modern dark scorer's console based on Brien's grid sketch.
- The large call and description sit above a structured fielding board showing the roll, fielder, DEF, movement, base distance, total route, allowance, remainder, and target.
- The completed fielding calculation remains available until the next batter begins.

### 0.3.2 side resolution wing

- On wide screens, play resolution appears in a large wing left of the visitors while they bat and right of the home lineup while it bats.
- The wing enlarges the dice result, resolution call, and play description without widening the central stadium and controls.
- On narrower screens, the existing compact center resolution remains visible as the fallback.

### 0.3.1 fixed base anchors

- Corrects the transposed first- and third-base references from 0.3.0.
- Permanently locks first base to row-column `8-3`, second to `8-8`, third to `3-8`, and home to `3-3`.
- Runner markers, throws, base-distance calculations, and future advancement logic all consume the same tested constants.

### 0.3.0 bases-empty fielding and running

- The four values in Brien's distance workbook use permanent row-column anchors: first `8-3`, second `8-8`, third `3-8`, and home `3-3`.
- Fielder movement is charged separately before any throw. A ball 23 squares from a base and five squares from the nearest fielder requires 28 squares of total movement and throw.
- The Phillies and Royals demo defenders now carry their printed 1980 arm, range, and Superior ratings.
- Airborne balls resolve against fielding range; an uncaught airborne ball becomes a ground-ball fielding play under Rule 6.
- Ground-ball fielding rolls use the conventional dice total, the greater of that total or the fielder's arm, and then subtract the fielder-to-ball movement before measuring the throw.
- Exact-count plays at first route through the correct 84/85 or 94/95 Automatic Umpire table and the batter-runner's printed speed.
- Completed outs, singles, walks, hit batters, home runs, and errors update the score line, base state, batting order, outs, and half-inning state.
- A runner reaching first appears as a gray square and persists into the next plate appearance.

### 0.2.5 neutral triple placement

- Triple-rule relocation is independent of batting hand and spray direction; a batter can produce a triple to any part of the park.
- The program first maximizes SherCo square-distance from home, then radial distance among equally distant squares, and finally uses stable row-column order only when coordinates remain exactly tied.

### 0.2.4 gopher-ball and triple rules

- A `+` gopher-ball pitcher advances every batter's HR rating one SherCo number, creating HR `11` for a batter without one, and advances an existing triple number one step as well.
- The matchup shows the effective adjusted power rating against a `+` pitcher while the lineup continues to show the printed rating.
- A fly sent beyond the selected park's fence by an adjusted HR result now resolves as **Home Run** rather than stopping for fielding.
- On an exact effective triple number, Brien's Rules automatically invokes the Rule 21 relocation option and selects a legal in-play square at maximum SherCo distance from home.
- Equal-distance triple targets use greatest radial distance without regard to the batter's pull field. Official 1980 mode stops for the manager's triple-rule choice instead.

### 0.2.3 fixed defense and chart conversion

- The fixed defense is LF `8-19`, CF `18-18`, and RF `19-8` on the program grid.
- A chart coordinate is written for a right-handed batter and mirrors for a left-handed batter: chart `8-19` goes to LF for a righty and becomes `19-8`, to RF, for a lefty.
- A result naming a fielder uses that fielder's fixed position and does not mirror. Therefore, one square in front of RF `19-8` is `18-8`.

### 0.2.2 straight field lanes

- “In front of” moves directly toward home on the fielder's field lane; “behind” moves directly away on that same line.
- Straight lanes change the column in the `8-19` field lane, the row in the `19-8` field lane, and both coordinates in the center-field lane.
- From CF `18-18`, two squares in front is `16-16`, and five squares behind is `23-23`.
- Fixed fielder labels are treated separately from handedness-mirrored chart coordinates.

### 0.2.1 multi-at-bat validation loop

- A temporary **Next test batter** button appears after a direct result, a ball in play, or an unimplemented count continuation.
- It cycles through the batting order while preserving the evolving deterministic dice seed, pitcher-rate adjustments, and complete roll audit.
- It deliberately does not change outs, runners, hits, errors, runs, or official statistics; the interface identifies that the unresolved result was not scored.
- The control will be retired when fielding and official plate-appearance completion can advance the lineup normally.

Implemented:

- deterministic, replayable SherCo low-high dice;
- complete 1980 batter-grade/pitcher-rate pitching matrix;
- versioned game state and typed event/audit records;
- row-column geometry, handedness mirroring, nearest-fielder calculation, and Brien tie-breakers;
- Brien's current profile for wind, injuries/ejections, pickoffs, switch hitters, steals, and extra-base attempts;
- 1980 season-rating normalization (`***` becomes `**`; `[HP]` and `[WP]` are ignored but retained in source data);
- five imported USBL test parks with their exact 28×28 terrain and fixed defensive positions;
- modern game dashboard with score, lineups, bullpen, matchup, live dice audit, official play-by-play view, box-score shell, stats/splits shell, and SLOBS workspace;
- automatic device-local saves through IndexedDB and portable JSON game exports;
- automated regression tests for the confirmed rules above.

### 0.2.0 first executable chart sequence

- A plate appearance now advances one visible, audited roll at a time from the pitching matrix into the correct Bases Empty chart.
- Probable Outs apply the pitcher's printed BB/K range before any batted-ball chart roll.
- The complete Bases Empty Probable Hit, Probable Out, Special Event, Probable Hit Error, and Probable Out Error charts are typed game data rather than interface text.
- Coordinate results mirror for the batter's effective batting hand; switch hitters bat opposite the pitcher's throwing hand while retaining their printed offensive grade.
- Resolved batted balls appear as a white ball square on the stadium grid.
- Saved 0.1.x games migrate safely into the version-two plate-appearance state model.
- The official logo has a white backing, stadium information has moved into the header, and the matchup area is shorter and more compact.
- The executable chart inventory and remaining transcription work are maintained in [Chart Transcription Status](docs/CHART_TRANSCRIPTION_STATUS.md).

### 0.1.1 display refinement

Pitch rolls now present the decisive result prominently as `33 — Probable Out`, `56 — Probable Hit`, or `66 — Special Event`. Individual dice and the pitching-chart threshold remain available as secondary SherCo audit detail.

### 0.1.2 field and scoreboard geometry

- Home plate and both foul lines now meet at the vertex between `3-3` and `2-2`.
- The stadium is constrained between the two lineup panels, bringing the matchup and results closer to the top of the game screen.
- The compact scoreboard groups `1-2-3`, `4-5-6`, and `7-8-9`, labels the tenth inning `X`, keeps R-H-E visible, and begins horizontal inning scrolling with the 11th.

### 0.1.3 classic scoreboard and readability

- True blank gutters separate each three-inning scoreboard group and the ninth from extra innings; box-score lines remain continuous.
- Lineup names and ratings are modestly larger and easier to scan.
- Probable Hit uses a brighter green result treatment.
- Error results are standardized as white lettering on a red background.

### 0.1.4 complete on-screen ratings

- Batter displays now include clutch (`#`), offensive grade, home-run number, triple number, and baserunning stars exactly where applicable.
- Starting-pitcher and bullpen displays now show the complete printed rating: prefix, pitching rate, innings of effectiveness, fatigued rate, and BB/K range.
- Probable Hit and its dice-log entry use a brighter green background for faster recognition.

### 0.1.5 home-park scoreboard labels

- A permanent gutter separates the team-name column from the first inning.
- A second permanent gutter separates the inning line from the R-H-E totals.
- The visiting club is identified by its full city name; the home club is identified by its full nickname.

### 0.1.6 official program branding

- The supplied 2026 SherCo Grand Slam Baseball Game logo now occupies the upper-left program header.
- The logo retains its original proportions and transparent background without increasing the header height.

### 0.1.7 compact statistical lineups

- Each lineup entry now occupies one line: order, player and position, batting hand, complete SherCo rating, AVG, HR, and RBI.
- The supplied Rose, McBride, and Schmidt statistical examples are retained as regression-tested demo values.
- Wider lineup panels and a 480-pixel stadium reduce vertical scrolling while preserving the full three-column game workspace.

Not yet implemented after 0.6.2:

- defense-selected occupied-base throw targets, simultaneous runner movement, chart-locked error advancement, and complete double/triple-play integration;
- substitutions and complete official scoring;
- live derived season/career statistics and all split accumulators;
- roster/lineup imports and the six final USBL parks;
- Rest Chart, full/limited re-rate qualification, initial player creation, rookie pool, and season-to-season SLOBS processing;
- the remaining solo-manager decision charts.

## Run locally

```bash
npm install
npm run dev
```

## Regression gate

```bash
npm run check
```

Every rules change should add or update a test before the existing behavior is altered. The deterministic seed stored with each game makes a reported sequence exactly replayable.

## GitHub Pages

The production build uses relative asset paths, so the `dist` directory can be published at either a repository root or a project subpath.

```bash
npm run build
```

The included GitHub Actions workflow runs the regression suite, builds the app, and deploys `dist` whenever the `main` branch is updated. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Park import

The included converter reads the workbook after it has been saved as `.xlsx`:

```bash
python tools/import_usbl_parks.py parks.xlsx src/data/parks.json
```

Worksheet cell `A1` becomes SherCo coordinate `28-28`; cell `AB28` becomes `1-1`. This is covered by regression tests against Brien's fixed defense.

# SherCo Grand Slam Baseball

A browser-based implementation of the 1980 SherCo Grand Slam Baseball rules, designed for GitHub Pages and long-running SLOBS leagues.

The durable design decisions, confirmed house rules, scoring requirements, stadium-import conventions, and development priorities are preserved in [Project Checkpoint 0.1.7](docs/PROJECT_CHECKPOINT_0.1.7.md).

## Rules-engine build 0.3.2

This checkpoint intentionally separates rules, game state, imported data, persistence, and the interface so later requirements can extend working code instead of replacing it.

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
- A runner reaching first appears as a gray square. Until the occupied-base charts are executable, **Clear bases & continue test** explicitly returns the program to bases-empty validation.

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

Not yet implemented after 0.2.0:

- executable outcome tables for the seven occupied-base states;
- occupied-base ball movement, throws beyond the first bases-empty phase, substitutions, and complete official scoring;
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

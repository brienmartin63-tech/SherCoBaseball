# SherCo Grand Slam Baseball

A browser-based implementation of the 1980 SherCo Grand Slam Baseball rules, designed for GitHub Pages and long-running SLOBS leagues.

## Foundation build 0.1.4

This checkpoint intentionally separates rules, game state, imported data, persistence, and the interface so later requirements can extend working code instead of replacing it.

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

Not yet implemented:

- transcription and executable resolution of all 32 base-state outcome tables;
- complete ball movement, fielding, throws, baserunner advancement, substitutions, and official scoring;
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

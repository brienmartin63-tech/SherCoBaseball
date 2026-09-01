# SherCo Grand Slam Baseball

A browser-based implementation of the 1980 SherCo Grand Slam Baseball rules, designed for GitHub Pages and long-running SLOBS leagues.

## Foundation build 0.1.0

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

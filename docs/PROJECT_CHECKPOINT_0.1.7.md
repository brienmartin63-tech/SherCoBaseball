# SherCo Grand Slam Baseball — Project Checkpoint 0.1.7

**Checkpoint date:** September 1, 2026  
**Checkpoint commit:** `86a9a07`  
**Rules foundation:** 1980 SherCo Grand Slam Baseball  
**League framework:** SherCo Leagues of Baseball Simulation (SLOBS)

## Why this document exists

This is the durable project memory at the first meaningful interactive milestone. It records the decisions already confirmed by Brien Martin so later development extends the working foundation instead of replacing it, silently changing it, or requiring the original conversation to be reconstructed.

The governing principle is simple: **new features must not discard or break previously working behavior.** Every rules change should be represented in structured data or isolated logic and protected by regression tests.

## Product vision

The finished program is a browser-based implementation of SherCo Grand Slam Baseball in which the human player manages both teams and makes the baseball decisions. The computer performs the mechanical and recordkeeping work:

- roll and identify every die roll;
- resolve the pitching and supplemental charts;
- place and move the ball, fielders, and baserunners;
- resolve catches, grounders, throws, advances, outs, errors, and runs;
- maintain the inning, score, lineups, bullpen, substitutions, and fatigue;
- produce official play-by-play and an MLB-style box score;
- keep complete batting, pitching, fielding, team, league, split, season, and career statistics;
- determine earned and unearned runs correctly without scorer intervention;
- support SLOBS rosters, Rest Charts, qualification, re-rating, player creation, rookie pools, drafts, and season progression.

The ideal division of labor is: **Brien manages; the program rolls, resolves, moves, scores, and records.**

## Authoritative game choices

### Base rules

- Use the 1980 rules because that is Brien's preferred and nostalgic edition.
- Results printed on the game charts remain authoritative. A chart-directed exception occurs even when an automatic-manager rule would not ordinarily choose it. For example, “runner on third steals home” still happens.
- Coordinates are always read **row-column**.
- The 1980 game has no `***` baserunners. A later-edition `***` rating is normalized to `**`.
- Ignore `[HP]` and `[WP]` ratings because they did not exist in the 1980 version.
- Do not use the `mw`, `pw`, `mk`, or `pk` rules.
- Switch hitters always use their printed batting letter grade; they never move up or down because of the pitcher's handedness.
- Wind Factor is not used.
- Injuries and ejections are currently ignored. They may eventually become an optional setting once substitutions are easy to perform.

### Brien's Rules profile

Brien expects to play most games with this profile, while the official profile remains available for occasional use.

- Fielders remain at their assigned positions rather than being moved manually during play.
- The fixed defensive positions printed on each supplied park diagram are authoritative.
- If two fielders are tied for distance to a ground ball, use the fielder with the `9` arm.
- If two fielders are tied for distance to a fly ball, use the fielder with the `5` range.
- A grounder to `3-10` goes to third base or first base according to batter handedness. The field is mirrored correctly for the batter's pull side.
- When an offensive-manager option exists, choose the first option that sends the ball toward the hitter's pull field.

### Automatic stealing

- With fewer than two outs, a `**` runner attempts to steal an unoccupied second base, including after a two-strike count pickup.
- With no outs, a `*` runner attempts to steal an unoccupied second base on any pickup except a two-strike count pickup.
- Only second base may be stolen by these automatic-manager rules.
- Pitchers do not make pickoff attempts.
- Chart-directed steals remain valid, including steals of home.

### Automatic extra-base attempts

- Against an outfielder with a `9` arm, attempt the extra base only when the ball is at least 10 squares from the next base.
- Against an outfielder with an `8` arm, attempt the extra base only when the ball is at least 8 squares from the next base.
- These rules are intended to create the proper opportunity for extra doubles and outfield assists; they do not cancel explicit chart instructions.

## Stadium model

- The first league release will contain six USBL parks and must allow additional stadia to be added later without code redesign.
- Each park is a 28-by-28 SherCo row-column grid.
- Stadium colors and unusual features are park-specific. A nonstandard color always has an intentional rule or physical meaning and must never be assigned a universal meaning merely from its hue.
- The final six park workbooks will contain their own bases, home-plate geometry, foul lines, and thick black outfield-wall boundary.
- The program should not redraw those permanent park elements once the final artwork is imported.
- Program overlays are reserved for the changing game state: blue fielders, gray baserunners, and a white ball square.
- The field display does not need visible coordinates during ordinary play; row-column coordinates remain available as a debugging aid.

### Phoenix workbook convention

The enhanced Phoenix workbook establishes the import convention:

- green/yellow and special surfaces are cell fills;
- the outfield wall is a thick black cell border;
- foul lines are thick white cell borders;
- first, second, and third base are separate white drawing objects positioned around `8-3`, `8-8`, and `3-8`;
- fielder labels identify the park's fixed defensive alignment.

The final park importer must therefore preserve **fills, borders, drawings, and fielder positions**, not just convert fill colors.

## Scoring and statistical integrity

The structured play-event ledger is the single source of truth. Display text must never be the source from which statistics are inferred.

Each resolved play must retain enough information to reproduce:

- the actual inning state before and after the play;
- batter, pitcher, responsible pitcher, fielders, and all runners involved;
- base origins and destinations;
- outs made and their sequence;
- hit, walk, strikeout, error, sacrifice, fielder's choice, double play, stolen base, caught stealing, and advancement decisions;
- runs, RBI, earned-run responsibility, inherited runners, and inherited runners scored;
- every random roll and chart reference used to reach the result.

### Earned runs

Earned runs cannot be determined by simply declaring every run that scores on an error unearned. The scorer must reconstruct the inning without errors and passed balls, including the theoretical third out, while preserving pitcher responsibility and inherited-runner ownership.

Confirmed example: a batter doubles and scores on a single plus a left-field error. After two subsequent outs, the next batter homers. The earlier run can remain earned because the runner would have scored on the later home run in the reconstructed inning. The program must make this kind of determination correctly and automatically.

SherCo helps because errors are chart-defined and multiple errors on one play are extremely rare, but the scoring model must still represent the full logic rather than rely on shortcuts.

### Statistical destination

The eventual statistics package should be extensive and accessible at three levels:

- league totals and league leaders;
- team totals and team comparisons;
- individual team/player records.

Confirmed splits include batting versus right- and left-handed pitching, batting versus each team, batting versus starters and relievers, and pitching versus each team. Traditional batting, pitching, and fielding totals are required. Game logs, streaks, standings, career history, and additional useful splits can grow from the same event ledger.

The long-term presentation goal is a complete, polished **season statistics guide in PDF** containing everything a league player or publisher would reasonably want. That report follows the working game and scoring engine; it does not precede them.

## SLOBS framework

- SLOBS does not change how an individual SherCo game is played. It controls the league and end-of-season player-development workflow.
- A league roster contains 20 players: 12 batters, four starting pitchers, and four relief pitchers.
- Brien's Rest Chart sets each team's starting lineup for every game.
- The Rest Chart is designed so regular starters qualify for full/regular re-rates and reserves qualify for limited re-rates.
- Future automation should create initial players and ratings, build rookie draft pools, administer the draft, determine qualification, perform re-ratings, and eliminate manual league processing wherever the rules allow.

## Interface decisions through 0.1.7

- The program is browser-based and deployed through GitHub Pages.
- Visitors appear on the left; the home team appears on the right.
- The official 2026 SherCo logo occupies the upper-left header position.
- The next major build should place the transparent logo on a white panel so the baseball remains visible against the navy header.
- The compact park scoreboard uses old-fashioned three-inning groups: `1-2-3`, `4-5-6`, `7-8-9`, then `X`, followed by `R H E`.
- Blank gutters separate the team name, each three-inning group, extra innings, and the R-H-E totals.
- The tenth inning is displayed as `X`; numeric extra-inning columns begin with the 11th and scroll horizontally while R-H-E remains visible.
- The visiting team is identified by full city name; the home team is identified by full nickname.
- Each lineup entry occupies one compact row: order, player and position, batting hand, complete SherCo rating, AVG, HR, and RBI.
- Complete batter ratings include clutch `#`, grade, HR number, triple number in parentheses, and baserunning stars.
- Complete pitcher ratings include prefix, rate, innings of effectiveness, fatigued rate, and BB/K range.
- Probable Hit uses a bright green result treatment. Errors use white lettering on a red background.
- Official play-by-play should follow the clean style of Baseball-Reference or MLB reports; dice details belong in a separate SherCo audit display.
- Box scores should follow the MLB.com standard.

### Agreed next interface compression

- Move stadium name/location into the status header between game details and the park selector, allowing the field to move upward.
- Reduce matchup typography by roughly two or three points and tighten the spacing around ratings and totals.
- At each new plate appearance, slide a batter game-stat tile to the left and a pitcher game-stat tile to the right, pause about five seconds, then retract them behind the matchup display.
- Clicking a player name should reopen the associated tile.
- Batter game tile: AB, R, H, HR, RBI, BB, and K.
- Pitcher game tile: IP, H, R, ER, BB, K, and other immediately useful game totals.
- Trigger the animation when the batter changes, not after each dice roll; respect reduced-motion browser settings.

## Engineering foundation at 0.1.7

Implemented and protected:

- deterministic, replayable SherCo dice using a stored game seed;
- the complete 1980 batter-grade/pitcher-rate pitching matrix;
- typed, versioned game state and event/audit records;
- row-column geometry, handedness mirroring, nearest-fielder calculation, and Brien tie-breakers;
- the confirmed Brien rules profile;
- normalization of later-edition ratings for 1980 play;
- five imported USBL test parks with exact terrain and fixed defense;
- device-local IndexedDB saves and portable JSON game export;
- the modern dashboard, classic scoreboard, compact lineups, complete displayed ratings, official logo, play-by-play shell, box-score shell, statistics shell, and SLOBS workspace;
- 18 passing regression tests and a successful production build.

Not yet implemented:

- executable resolution of all 32 base-state outcome tables;
- complete ball movement, fielding, throws, catches, runner advancement, outs, and run scoring;
- substitutions, pitcher effectiveness/fatigue transitions, and roster enforcement;
- the official-scoring and earned-run reconstruction engine;
- live box-score lines, cumulative statistics, and split accumulators;
- the six final USBL parks and full park-art import;
- Rest Chart, qualification, re-rating, player generation, rookie pool, and season transition;
- the remaining solo-manager decision charts.

## Development order after this checkpoint

1. Transcribe and test the remaining authoritative charts and all base/out state tables.
2. Build the plate-appearance and play-resolution state machine.
3. Implement ball placement, fielding selection, throws, runner decisions, outs, and scoring.
4. Implement substitutions, pitcher effectiveness, and bullpen operation.
5. Complete the event ledger, official scorer, earned-run reconstruction, play-by-play, and box score.
6. Accumulate live individual, team, league, split, season, and career statistics.
7. Add the SLOBS season-management workflow.
8. Generate the complete season statistics guide and other exportable reports.

## Definition of success

The project succeeds when Brien can play both sides, make every managerial decision he wants to make, and never have to roll dice, move pieces, consult repetitive charts, calculate advances, keep a scorebook, total statistics, or manually decide earned runs—and when the resulting game remains recognizably and faithfully **1980 SherCo Grand Slam Baseball**.

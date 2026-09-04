# 1980 Chart Transcription Status

This inventory is the source-of-truth boundary between chart material that the program can execute and chart material that has only been supplied for later work. A chart is marked **executable** only when its entries are structured data, connected to game state, and covered by regression tests.

## Current executable coverage in build 0.6.2

| Rules material | Source | Coverage |
| --- | --- | --- |
| Batter-grade/pitcher-rate pitching matrix | 1980 rulebook, Rule 5 and pitching chart | Complete matrix; deterministic tests |
| Pitch classification | 1980 rulebook, Rule 5 | Probable Out, Probable Hit, and 66 Special Event |
| Pitcher BB/K range | 1980 rulebook, Rule 5h | Checked only after a Probable Out; open-ended `n-11` notation supported |
| Bases Empty Probable Hit | 1980 rulebook, p. 24 | All 21 low-high rolls (`11` through `66`) |
| Bases Empty Probable Out | 1980 rulebook, p. 25 | All 21 low-high rolls (`11` through `66`) |
| Bases Empty Special Event | 1980 rulebook, p. 25 | All six one-die results |
| Bases Empty Probable Hit Error | 1980 rulebook, p. 24 | Error check and all six error results |
| Bases Empty Probable Out Error | 1980 rulebook, p. 25 | All six error results |
| Coordinate handedness | 1980 rulebook, Rule 2b | Row-column coordinates mirror by effective batting hand |
| Gopher-ball pitchers | 1980 rulebook, Rule 23 | `+` advances HR and triple ratings one SherCo number |
| Triple-number option | 1980 rulebook, Rule 21 | Brien profile automatically selects a farthest legal square; official profile exposes a decision boundary |
| Beyond-fence HR result | 1980 rulebook, Rules 5k and 5q | Fly target is checked against the selected park terrain |
| Seven occupied-base chart sets | 1980 rulebook, pp. 26–41 | 420 entries: PH, Hit Error, PO, Out Error, and Special Events for every base state |
| Occupied PH/PO ball placement | 1980 rulebook, pp. 26–40 | All 280 non-error rolls have compiled ball rules; no runtime prose parsing |
| Occupied pitch/chart routing | 1980 rulebook base-state charts | Current runners select the chart and remain on base for the next hitter |

The current vertical slice resolves occupied home runs, walks, hit batters, catchable airborne balls, and the initial simultaneous throw on occupied Probable Hits. First throws include fielder movement; later throws do not. Equal routes select the lead runner automatically, while unequal routes expose defensive target buttons. Occupied Probable Out force/DP graphs and chart-locked error advances still stop at an explicit boundary.

## Confirmed coordinate semantics

- Coordinates are always read **row-column**.
- “In front of” and “behind” follow the straight field lane through the named fielder; they are not automatically diagonal movements.
- LF occupies `8-19`: one square in front is `8-18`, and one square behind is `8-20`.
- CF occupies `18-18`: two squares in front is `16-16`, and five squares behind is `23-23`.
- RF occupies `19-8`: one square in front is `18-8`, and one square behind is `20-8`.
- Chart coordinates are written for right-handed batters and mirror across the row-column diagonal for left-handed batters. Thus chart `8-19` is a ball toward LF for a righty and becomes `19-8`, toward RF, for a lefty.
- Results that name a fielder use the fixed defensive position above and do not undergo handedness mirroring.
- Brien triple placement maximizes SherCo square-distance from home (`3-3`), excludes `beyondFence` terrain, and then maximizes radial distance among equal SherCo distances. Batting hand and pull field do not affect placement; stable row-column order resolves an otherwise exact tie.

## Supplied but not yet executable

| Area | Remaining work |
| --- | --- |
| Occupied Probable Out resolver | Force targets, continuous double/triple plays, and Pivot Rule integration |
| Occupied error branches | Superior checks and hard-coded movement for every Hit Error and Out Error result |
| Baserunning | Apply the already-tested lead-runner and arm-threshold rules to occupied chart plays; chart-mandated steals |
| Stealing and count pick-up | 1980 stealing rules plus Brien's automatic attempt profile; no `***` runner tier |
| Bunts and special offense | Sacrifice, squeeze, and other manager-called plays |
| Umpire and unusual events | Connect chart results while honoring the current ignore-injury/ejection setting |
| Official scoring | Hits, errors, RBI, earned-run reconstruction, pitcher responsibility, and complete play ledgers |
| Solo manager | Supplied solo charts and user-controlled decision handoffs |
| SLOBS | Rest Chart, re-rates, player creation, rookie draft pool, schedules, standings, and season processing |

## Verification rule

Every newly executable chart must include:

1. one structured entry for every possible roll;
2. a completeness test that rejects a missing or duplicate roll;
3. representative deterministic play-sequence tests;
4. a source label retained in the plate-appearance audit trail; and
5. an explicit stop whenever the next required subsystem is not yet implemented.

This protects previously working rules as the complete game is added in layers.

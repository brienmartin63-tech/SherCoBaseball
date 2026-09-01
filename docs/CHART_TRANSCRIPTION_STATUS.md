# 1980 Chart Transcription Status

This inventory is the source-of-truth boundary between chart material that the program can execute and chart material that has only been supplied for later work. A chart is marked **executable** only when its entries are structured data, connected to game state, and covered by regression tests.

## Executable in build 0.2.0

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

The current vertical slice intentionally stops when a chart result requires fielding, runner movement, a count continuation, or another subsystem that has not yet been implemented. The interface labels that boundary instead of silently inventing a result.

## Confirmed coordinate semantics

- Coordinates are always read **row-column**.
- “In front of” and “behind” follow the straight field lane through the named fielder; they are not automatically diagonal movements.
- LF occupies `8-19`: one square in front is `8-18`, and one square behind is `8-20`.
- CF occupies `18-18`: two squares in front is `16-16`, and five squares behind is `23-23`.
- RF occupies `19-8`: one square in front is `18-8`, and one square behind is `20-8`.
- Chart coordinates are written for right-handed batters and mirror across the row-column diagonal for left-handed batters. Thus chart `8-19` is a ball toward LF for a righty and becomes `19-8`, toward RF, for a lefty.
- Results that name a fielder use the fixed defensive position above and do not undergo handedness mirroring.

## Supplied but not yet executable

| Area | Remaining work |
| --- | --- |
| Occupied-base batting tables | Transcribe and test Probable Hit, Probable Out, Error, and Special Event results for each of the seven occupied-base states |
| Fielding | Fly-ball range, ground-ball pickup, throws, assists, cutoffs, double plays, and Brien's tied-fielder rules |
| Baserunning | Forced movement, optional extra bases, Brien's arm-distance thresholds, and chart-mandated steals |
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

# SherCo Grand Slam Baseball — Project Checkpoint 0.4.2

This checkpoint records Brien's authoritative error-chart sequence and supplements the earlier project checkpoints.

## Brien's Rules error sequence

When a Probable Hit chart result routes to an error chart, Brien's Rules do not make the preliminary outs-based error-frequency roll. The next one-die roll selects the numbered error-chart result directly.

The sequence is:

1. Roll the applicable error chart.
2. Identify the fielder responsible for that numbered result.
3. If that fielder is not Superior, apply the printed error result immediately.
4. If that fielder has an `S` rating, roll one additional die under Rule 19: `1–3` applies the chart's no-error branch; `4–6` applies its error branch.

Example: with George Brett batting and Bake McBride in right field, Bases Empty Probable Hit error result `5` is a single plus E9, with Brett reaching second. McBride does not have an `S`, so no additional die is rolled and the play cannot return to the Probable Hit chart.

The Official 1980 profile retains the printed preliminary error-frequency check. This distinction is controlled by the selected rules profile and is covered by regression tests.

## Chart-directed runner movement

Any runner placement or advancement explicitly stated by an error-chart result is final for that part of the play. It cannot be overridden by normal baserunning thresholds, managerial choices, two-out advancement, or another generic runner rule. Normal stop-action baserunning resumes only after all chart-mandated movement has been applied and only where the chart leaves further advancement available.

The rules engine marks these results as chart-locked so future occupied-base error charts and the multi-runner state machine can preserve this precedence.

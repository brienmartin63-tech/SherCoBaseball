# Project Checkpoint 0.5.1 — Continuous Bases-Empty Running

This checkpoint closes the first live-play integration gap in the bases-empty engine. A safe throw to first does not automatically end a play when Brien's mandatory advancement rule sends the batter-runner onward.

## Darrell Porter regression play

Darrell Porter bats left-handed and produces the chart's `9-26` grounder in right field at Phoenix. The engine mirrors the chart coordinate to literal row-column `26-9`.

The plotted square is one square beyond the fence. Under the Ricochet Rule:

- the ball crosses at `25-9`;
- it ricochets one square back to `25-9`;
- Bake McBride begins at `19-8` and spends six squares reaching the ball;
- with a minimum arm allowance of eight, two squares remain for the first throw;
- the ball finishes that throw at `23-7`, while Porter reaches first safely.

The ball is then 15 squares from second. Because McBride has an 8 arm, Porter must try for second. Each later throw is a new conventional two-dice roll with eight as the minimum. Fielder-to-ball movement is not charged again because McBride already controls the ball.

After every safe base, the engine measures the ball from the next destination and repeats the same decision. The play can therefore end with Porter holding a double or triple, being retired while stretching, or—when the geometry and throws permit—scoring an inside-the-park home run.

## Exact-count throws

An exact-count throw to second, third, or home is handled exactly like an exact-count throw to first: the Automatic Umpire resolves the runner using the responsible fielder's defense and the runner's speed. A safe call resumes the advancement sequence; an out call ends the play at that base.

## Scoring contract

The hit is not finalized until the live advancement sequence ends.

- Holding at first, second, or third records a single, double, or triple.
- Reaching home records an inside-the-park home run and a run.
- A batter put out trying for the next base is credited with the last base reached safely and is also charged as the play's out.

## Regression protection

The deterministic Porter replay verifies:

- the original `26-9` landing square;
- the one-square ricochet and final `25-9` ball square;
- McBride's six-square route to the ball;
- two throwing points remaining from an allowance of eight;
- the ball at `23-7` after the first throw;
- mandatory throws to second and third;
- a completed triple path;
- and an exact-count throw to third followed by a safe Automatic Umpire call.

Occupied-base charts and multi-runner defensive choices remain a later integration boundary. They must reuse the same throw, runner-distance, lead-runner, and scoring contracts rather than replacing them.

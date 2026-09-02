import { runnerDistance } from "../core/baserunning";
import type { BaseName, Batter, BaseRunners, Coordinate } from "../core/types";

interface Props {
  batter: Batter;
  ballAt?: Coordinate;
  runners: BaseRunners;
  arm?: 8 | 9;
}

const baseLabel: Record<BaseName, string> = {
  HOME: "Home",
  FIRST: "1B",
  SECOND: "2B",
  THIRD: "3B",
};

export function BaserunningPanel({ batter, ballAt, runners, arm }: Props) {
  const candidates = ballAt ? [
    { id: batter.id, name: batter.name, from: "HOME" as const },
    ...(runners.third ? [{ id: runners.third, name: "Runner on third", from: "THIRD" as const }] : []),
    ...(runners.second ? [{ id: runners.second, name: "Runner on second", from: "SECOND" as const }] : []),
    ...(runners.first ? [{ id: runners.first, name: "Runner on first", from: "FIRST" as const }] : []),
  ] : [];

  return (
    <section className="baserunning-card" aria-live="polite">
      <header>
        <div><p className="eyebrow">Stop-action running</p><h2>Runner distances</h2></div>
        {ballAt && <span>{arm ? `vs ARM ${arm}` : "Arm pending"}</span>}
      </header>
      {candidates.length === 0 ? (
        <div className="baserunning-empty">Runner distances appear when the ball enters play.</div>
      ) : (
        <div className="runner-distance-list">
          {candidates.map((candidate) => {
            const status = runnerDistance(ballAt!, candidate.from, arm ?? 9);
            return (
              <div className={`runner-distance tone-${status.tone}`} key={`${candidate.id}-${candidate.from}`}>
                <div><strong>{candidate.name}</strong><small>{baseLabel[status.from]} → {baseLabel[status.to]}</small></div>
                <b>{status.distance}</b>
                <span>{status.safeBeforeThrow ? "SAFE" : candidate.from === "HOME" ? "RUN" : arm ? status.mustAdvance ? "GO" : "HOLD" : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
      <footer>Distance is ball to destination only; fielder movement is not added.</footer>
    </section>
  );
}

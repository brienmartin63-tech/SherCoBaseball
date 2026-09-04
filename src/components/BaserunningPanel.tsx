import { leadRunnerDecisions, runnerDistance, runnerDistanceTone } from "../core/baserunning";
import type { BaseName, Batter, BaseRunners, Coordinate } from "../core/types";

interface Props {
  batter: Batter;
  ballAt?: Coordinate;
  runners: BaseRunners;
  arm?: 8 | 9;
  initialFieldingDistance?: number;
  forcedInitialAdvance?: boolean;
}

const baseLabel: Record<BaseName, string> = {
  HOME: "Home",
  FIRST: "1B",
  SECOND: "2B",
  THIRD: "3B",
};

export function BaserunningPanel({ batter, ballAt, runners, arm, initialFieldingDistance = 0, forcedInitialAdvance = false }: Props) {
  const runnerDecisions = ballAt && arm ? leadRunnerDecisions(ballAt, runners, arm) : [];
  const batterIsRunner = Object.values(runners).includes(batter.id);
  const candidates = ballAt ? [
    ...runnerDecisions.map((decision) => ({
      id: decision.runnerId,
      name: decision.runnerId === batter.id ? batter.name : `Runner on ${baseLabel[decision.from]}`,
      from: decision.from,
      decision,
    })),
    ...(batterIsRunner ? [] : [{ id: batter.id, name: batter.name, from: "HOME" as const, decision: undefined }]),
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
            const status = candidate.decision ?? runnerDistance(ballAt!, candidate.from, arm ?? 9);
            const displayedDistance = status.distance + initialFieldingDistance;
            const displayedTone = runnerDistanceTone(displayedDistance);
            const call = candidate.decision?.status === "BLOCKED"
              ? "BLOCK"
              : forcedInitialAdvance ? "RUN"
                : candidate.decision?.status ?? (status.safeBeforeThrow ? "SAFE" : candidate.from === "HOME" ? "RUN" : arm ? status.mustAdvance ? "GO" : "HOLD" : "—");
            return (
              <div className={`runner-distance tone-${displayedTone}`} key={`${candidate.id}-${candidate.from}`}>
                <div><strong>{candidate.name}</strong><small>{baseLabel[status.from]} → {baseLabel[status.to]}</small></div>
                <b>{displayedDistance}</b>
                <span>{call}</span>
              </div>
            );
          })}
        </div>
      )}
      <footer>{initialFieldingDistance > 0 ? `Initial throw includes ${initialFieldingDistance} to field the ball. ` : "Ball-to-destination only. "}Existing runners are read lead first; a HOLD blocks everyone behind him.</footer>
    </section>
  );
}

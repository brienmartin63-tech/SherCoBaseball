import type { GameState, Team } from "../core/types";

interface Props {
  game: GameState;
  away: Team;
  home: Team;
}

function headline(game: GameState): string {
  if (game.resolution.phase === "PLAY_COMPLETE") {
    if (game.resolution.terminalOutcome === "HOME_RUN") return "Home Run";
    if (game.resolution.terminalOutcome === "WALK") return "Walk";
    if (game.resolution.terminalOutcome === "HIT_BY_PITCH") return "Hit By Pitch";
    if (game.resolution.terminalOutcome === "ERROR") return "Error";
    return game.resolution.baseState === "EMPTY" ? "Out" : "Safe";
  }
  return game.lastRoll?.resultLabel ?? game.resolution.phase.replaceAll("_", " ");
}

function tone(game: GameState): NonNullable<GameState["lastRoll"]>["resultTone"] {
  if (game.resolution.phase === "PLAY_COMPLETE") {
    if (game.resolution.terminalOutcome === "ERROR") return "error";
    if (game.resolution.terminalOutcome === "HOME_RUN" || game.resolution.terminalOutcome === "WALK" || game.resolution.terminalOutcome === "HIT_BY_PITCH") return "hit";
    return game.resolution.baseState === "EMPTY" ? "out" : "hit";
  }
  return game.lastRoll?.resultTone ?? "neutral";
}

export function PlayResolutionWing({ game, away, home }: Props) {
  const completedEvent = game.resolution.phase === "PLAY_COMPLETE" ? game.events[0] : undefined;
  const displayHalf = completedEvent?.half ?? game.half;
  const displayInning = completedEvent?.inning ?? game.inning;
  const battingTeam = displayHalf === "top" ? away.city : home.nickname;
  const rollValue = game.lastRoll?.displayValue ?? game.lastRoll?.sherco;
  const showRoll = game.resolution.phase !== "PLAY_COMPLETE" && rollValue !== undefined;
  const fielding = game.pendingFielding ?? game.lastFielding;
  const totalRoute = fielding ? fielding.fieldingDistance + fielding.targetDistance : undefined;
  const diceText = game.lastRoll?.dice.join(game.lastRoll.kind === "fielding" ? " + " : " · ") ?? "—";
  return (
    <aside
      className={`play-resolution-wing side-${displayHalf === "top" ? "away" : "home"} tone-${tone(game)}`}
      aria-live="polite"
    >
      <header className="wing-header">
        <span>Play resolution</span>
        <b>{displayHalf === "top" ? "▲" : "▼"} {displayInning} · {battingTeam}</b>
      </header>
      <div className="wing-hero">
        <div className="wing-call">
          {showRoll && <strong>{rollValue}</strong>}
          <h2>{headline(game)}</h2>
        </div>
        <div className="wing-description">
          {game.resolution.description ?? "Ready for the next pitch."}
        </div>
      </div>
      <div className="wing-board">
        <div className="wing-cell span-2"><span>Roll type</span><b>{game.lastRoll?.label ?? "Awaiting pitch"}</b></div>
        <div className="wing-cell"><span>Dice</span><b>{diceText}</b></div>
        <div className="wing-cell span-2"><span>Fielder</span><b>{fielding ? `${fielding.fielderName} · ${fielding.fielderPosition}` : "—"}</b></div>
        <div className="wing-cell"><span>DEF</span><b>{fielding ? `${fielding.arm}${fielding.range}` : "—"}</b></div>
        <div className="wing-cell"><span>{fielding?.ricochet ? "To ball via wall" : "To ball"}</span><b>{fielding?.fieldingDistance ?? "—"}</b></div>
        <div className="wing-cell"><span>Ball to base</span><b>{fielding?.targetDistance ?? "—"}</b></div>
        <div className="wing-cell"><span>Total route</span><b>{totalRoute ?? "—"}</b></div>
        <div className="wing-cell"><span>Allowance</span><b>{fielding?.throwingAllowance !== undefined ? `${fielding.throwingAllowance}${fielding.pivotPenalty ? ` (−${fielding.pivotPenalty})` : ""}` : "—"}</b></div>
        <div className="wing-cell"><span>After fielding</span><b>{fielding?.throwingRemainder ?? "—"}</b></div>
        <div className="wing-cell"><span>{fielding?.ricochet ? `Wall ${fielding.ricochet.fenceAt.row}-${fielding.ricochet.fenceAt.column}` : "Target"}</span><b>{fielding?.ricochet ? `${fielding.ricochet.depth} back` : fielding?.targetBase ?? "—"}</b></div>
      </div>
      <footer className="wing-source">{game.resolution.source ?? "SherCo 1980 rules engine"}</footer>
    </aside>
  );
}

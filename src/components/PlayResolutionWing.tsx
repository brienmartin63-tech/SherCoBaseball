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
  return (
    <aside
      className={`play-resolution-wing side-${displayHalf === "top" ? "away" : "home"} tone-${tone(game)}`}
      aria-live="polite"
    >
      <p>{displayHalf === "top" ? "▲" : "▼"} {displayInning} · {battingTeam} batting</p>
      <div className="wing-call">
        {showRoll && <strong>{rollValue}</strong>}
        <h2>{headline(game)}</h2>
      </div>
      <div className="wing-description">
        {game.resolution.description ?? "Ready for the next pitch."}
      </div>
      {game.resolution.source && <small>{game.resolution.source}</small>}
    </aside>
  );
}

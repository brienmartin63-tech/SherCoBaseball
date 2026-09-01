import type { GameState, Team } from "../core/types";

interface Props {
  game: GameState;
  away: Team;
  home: Team;
}

export function Scoreboard({ game, away, home }: Props) {
  const innings = Array.from({ length: Math.max(9, game.inning) }, (_, index) => index + 1);
  const line = (team: Team, score: GameState["away"], isBatting: boolean) => (
    <tr>
      <th scope="row">
        <span className={isBatting ? "at-bat-dot active" : "at-bat-dot"} />
        {team.abbreviation}
      </th>
      {innings.map((inning) => <td key={inning}>{score.innings[inning - 1] ?? "–"}</td>)}
      <td className="total">{score.runs}</td>
      <td className="total">{score.hits}</td>
      <td className="total">{score.errors}</td>
    </tr>
  );

  return (
    <div className="scoreboard-shell">
      <div className="scoreboard-context">
        <span className="inning-chip">{game.half === "top" ? "▲" : "▼"} {game.inning}</span>
        <span>{game.outs} {game.outs === 1 ? "out" : "outs"}</span>
      </div>
      <div className="scoreboard-scroll">
        <table className="scoreboard" aria-label="Inning by inning score">
          <thead>
            <tr>
              <th>Team</th>
              {innings.map((inning) => <th key={inning}>{inning}</th>)}
              <th>R</th><th>H</th><th>E</th>
            </tr>
          </thead>
          <tbody>
            {line(away, game.away, game.half === "top")}
            {line(home, game.home, game.half === "bottom")}
          </tbody>
        </table>
      </div>
    </div>
  );
}

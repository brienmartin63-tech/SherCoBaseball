import { useEffect, useRef } from "react";
import { hasScoreboardSpacerAfter, inningLabel, scoreboardInnings } from "../core/scoreboard";
import type { GameState, Team } from "../core/types";

interface Props {
  game: GameState;
  away: Team;
  home: Team;
}

export function Scoreboard({ game, away, home }: Props) {
  const innings = scoreboardInnings(game.inning);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (game.inning >= 11 && scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" });
    }
  }, [game.inning]);

  const inningCells = (score?: GameState["away"]) => innings.flatMap((inning) => [
    score
      ? <td className="inning-cell" key={`inning-${inning}`}>{score.innings[inning - 1] ?? "–"}</td>
      : <th className="inning-cell" key={`inning-${inning}`}>{inningLabel(inning)}</th>,
    ...(hasScoreboardSpacerAfter(inning)
      ? [score
        ? <td className="inning-spacer" aria-hidden="true" key={`spacer-${inning}`} />
        : <th className="inning-spacer" aria-hidden="true" key={`spacer-${inning}`} />]
      : []),
  ]);
  const line = (team: Team, score: GameState["away"], isBatting: boolean) => (
    <tr>
      <th scope="row" className="team-column">
        <span className={isBatting ? "at-bat-dot active" : "at-bat-dot"} />
        {team.abbreviation}
      </th>
      {inningCells(score)}
      <td className="total total-runs">{score.runs}</td>
      <td className="total total-hits">{score.hits}</td>
      <td className="total total-errors">{score.errors}</td>
    </tr>
  );

  return (
    <div className="scoreboard-shell">
      <div className="scoreboard-context">
        <span className="inning-chip">{game.half === "top" ? "▲" : "▼"} {game.inning}</span>
        <span>{game.outs} {game.outs === 1 ? "out" : "outs"}</span>
      </div>
      <div className="scoreboard-scroll" ref={scrollRef}>
        <table className="scoreboard" aria-label="Inning by inning score">
          <thead>
            <tr>
              <th className="team-column">Team</th>
              {inningCells()}
              <th className="total total-runs">R</th><th className="total total-hits">H</th><th className="total total-errors">E</th>
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

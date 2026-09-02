import { useEffect, useRef } from "react";
import { hasScoreboardSpacerAfter, inningLabel, scoreboardInnings, scoreboardInningValue, scoreboardTeamName } from "../core/scoreboard";
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

  const inningCells = (score?: GameState["away"], side?: "away" | "home") => innings.flatMap((inning) => [
    score
      ? <td className="inning-cell" key={`inning-${inning}`}>{scoreboardInningValue(score, side!, inning, game.inning, game.half)}</td>
      : <th className="inning-cell" key={`inning-${inning}`}>{inningLabel(inning)}</th>,
    ...(hasScoreboardSpacerAfter(inning)
      ? [score
        ? <td className="inning-spacer" aria-hidden="true" key={`spacer-${inning}`} />
        : <th className="inning-spacer" aria-hidden="true" key={`spacer-${inning}`} />]
      : []),
  ]);
  const line = (team: Team, side: "away" | "home", score: GameState["away"], isBatting: boolean) => (
    <tr>
      <th scope="row" className="team-column">
        <span className={isBatting ? "at-bat-dot active" : "at-bat-dot"} />
        {scoreboardTeamName(team, side)}
      </th>
      <td className="team-spacer" aria-hidden="true" />
      {inningCells(score, side)}
      <td className="totals-spacer" aria-hidden="true" />
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
              <th className="team-spacer" aria-hidden="true" />
              {inningCells()}
              <th className="totals-spacer" aria-hidden="true" />
              <th className="total total-runs">R</th><th className="total total-hits">H</th><th className="total total-errors">E</th>
            </tr>
          </thead>
          <tbody>
            {line(away, "away", game.away, game.half === "top")}
            {line(home, "home", game.home, game.half === "bottom")}
          </tbody>
        </table>
      </div>
    </div>
  );
}

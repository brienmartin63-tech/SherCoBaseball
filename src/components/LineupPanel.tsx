import type { Team } from "../core/types";
import { formatBatterRating, formatPitcherRating } from "../core/ratings";

interface Props {
  team: Team;
  activeIndex: number;
  side: "away" | "home";
}

export function LineupPanel({ team, activeIndex, side }: Props) {
  return (
    <aside className={`lineup-panel ${side}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{side === "away" ? "Visitors" : "Home"}</p>
          <h2>{team.city}</h2>
        </div>
        <span className="team-mark">{team.abbreviation}</span>
      </div>
      <div className="lineup-column-headings" aria-hidden="true">
        <span /><span /><span>B</span><span>Rating</span><span>AVG</span><span>HR</span><span>RBI</span>
      </div>
      <ol className="lineup-list">
        {team.lineup.map((player, index) => (
          <li key={player.id} className={index === activeIndex ? "active" : ""}>
            <span className="order">{index + 1} -</span>
            <span className="player-identity">
              <strong>{player.name}</strong>
              <small>, {player.position.toLowerCase()}</small>
            </span>
            <span className="lineup-hand" title="Bats">{player.bats}</span>
            <span className="lineup-rating" title="SherCo batting rating">{formatBatterRating(player)}</span>
            <span className="compact-stat" title="Batting average">{player.average.toFixed(3).replace(/^0/, "")}</span>
            <span className="compact-stat" title="Home runs">{player.homeRuns}</span>
            <span className="compact-stat" title="Runs batted in">{player.runsBattedIn}</span>
          </li>
        ))}
      </ol>
      <div className="bullpen">
        <p className="eyebrow">Available bullpen</p>
        {team.bullpen.map((pitcher) => (
          <div className="bullpen-row" key={pitcher.id}>
            <span><b>{pitcher.name}</b><small>{pitcher.throws}HP · {formatPitcherRating(pitcher)}</small></span>
            <strong>{pitcher.era.toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

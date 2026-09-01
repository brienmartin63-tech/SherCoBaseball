import type { Team } from "../core/types";

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
      <ol className="lineup-list">
        {team.lineup.map((player, index) => (
          <li key={player.id} className={index === activeIndex ? "active" : ""}>
            <span className="order">{index + 1}</span>
            <span className="player-name">
              <strong>{player.name}</strong>
              <small>{player.bats} · {player.offensiveGrade}{player.speed === "REGULAR" ? "" : player.speed}</small>
            </span>
            <span className="position">{player.position}</span>
            <span className="compact-stat">{player.average.toFixed(3).replace(/^0/, "")}</span>
          </li>
        ))}
      </ol>
      <div className="bullpen">
        <p className="eyebrow">Available bullpen</p>
        {team.bullpen.map((pitcher) => (
          <div className="bullpen-row" key={pitcher.id}>
            <span><b>{pitcher.name}</b><small>{pitcher.throws}HP · {pitcher.rate} · {pitcher.walkStrikeout}</small></span>
            <strong>{pitcher.era.toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

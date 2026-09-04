import type { Pitcher, Team } from "../core/types";
import { formatBatterRating, formatPitcherRating } from "../core/ratings";

interface Props {
  team: Team;
  activeIndex: number;
  displayName: string;
  pitcher: Pitcher;
  pitchingTeam: Team;
  onPitcherClick: () => void;
}

export function LineupPanel({ team, activeIndex, displayName, pitcher, pitchingTeam, onPitcherClick }: Props) {
  return (
    <aside className="lineup-panel active-offense">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Batting team</p>
          <h2>{displayName}</h2>
        </div>
        <span className="team-mark">{team.abbreviation}</span>
      </div>
      <div className="game-lineup-headings" aria-hidden="true">
        <span>Batters</span><span>AB</span><span>R</span><span>H</span><span>RBI</span>
      </div>
      <ol className="game-lineup-list">
        {team.lineup.map((player, index) => (
          <li key={player.id} className={index === activeIndex ? "active" : ""} title={`${player.bats}HB · ${formatBatterRating(player)}`}>
            <span className="order">{index + 1} -</span>
            <span className="player-identity"><strong>{player.name}</strong><small>, {player.position.toLowerCase()}</small></span>
            <span>0</span><span>0</span><span>0</span><span>0</span>
          </li>
        ))}
      </ol>
      <div className="pitching-line-heading">
        <span>{pitchingTeam.nickname} pitching</span><span>IP</span><span>H</span><span>R</span><span>ER</span><span>BB</span><span>SO</span>
      </div>
      <button className="active-pitcher-row" onClick={onPitcherClick} title={`Open the ${pitchingTeam.nickname} bullpen`}>
        <span><strong>{pitcher.name}</strong><small>{pitcher.throws}HP · {formatPitcherRating(pitcher)}</small></span>
        <b>0.0</b><b>0</b><b>0</b><b>0</b><b>0</b><b>0</b>
      </button>
      <p className="pitcher-click-note">Select the pitcher to open the bullpen.</p>
    </aside>
  );
}

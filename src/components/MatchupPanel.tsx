import { Dices, RotateCcw } from "lucide-react";
import { hitNumber } from "../core/pitching";
import { formatBatterRating, formatPitcherRating } from "../core/ratings";
import type { Batter, GameState, Pitcher } from "../core/types";

interface Props {
  batter: Batter;
  pitcher: Pitcher;
  game: GameState;
  onRoll: () => void;
  onReset: () => void;
}

export function MatchupPanel({ batter, pitcher, game, onRoll, onReset }: Props) {
  const threshold = hitNumber(batter.offensiveGrade, pitcher.rate);
  return (
    <section className="matchup-card">
      <div className="matchup-grid">
        <div className="matchup-person batter">
          <p className="eyebrow">At bat</p>
          <h3>{batter.name}</h3>
          <div className="rating-row">
            <span className="rating-badge full-rating">{formatBatterRating(batter)}</span>
            <span>{batter.bats}HB</span>
            <span>AVG <b>{batter.average.toFixed(3).replace(/^0/, "")}</b></span>
            <span>OPS <b>{batter.ops.toFixed(3).replace(/^0/, "")}</b></span>
          </div>
        </div>
        <div className="matchup-number">
          <span>Hit no.</span>
          <strong>{threshold}</strong>
          <small>{game.pitchCount} pitch {game.pitchCount === 1 ? "roll" : "rolls"}</small>
        </div>
        <div className="matchup-person pitcher">
          <p className="eyebrow">On the mound</p>
          <h3>{pitcher.name}</h3>
          <div className="rating-row">
            <span className="rating-badge full-rating">{formatPitcherRating(pitcher)}</span>
            <span>{pitcher.throws}HP</span>
            <span>ERA <b>{pitcher.era.toFixed(2)}</b></span>
          </div>
        </div>
      </div>
      <div className="matchup-actions">
        <button className="button primary" onClick={onRoll}><Dices size={18} /> Roll pitch</button>
        <button className="button ghost" onClick={onReset}><RotateCcw size={16} /> Reset demo</button>
        {game.lastRoll ? (
          <div className={`pitch-result tone-${game.lastRoll.resultTone ?? "neutral"}`} aria-live="polite">
            <strong>{game.lastRoll.sherco}</strong>
            <span>{game.lastRoll.resultLabel}</span>
            <small>{game.lastRoll.explanation}</small>
          </div>
        ) : <p className="ready-message">Ready for the first pitch.</p>}
      </div>
    </section>
  );
}

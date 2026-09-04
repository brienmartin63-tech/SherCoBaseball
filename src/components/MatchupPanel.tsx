import { Dices, RotateCcw, SkipForward } from "lucide-react";
import { canAdvanceTestBatter } from "../core/game";
import { effectivePowerRatings } from "../core/chartResolution";
import { hitNumber } from "../core/pitching";
import { formatBatterRating, formatPitcherRating } from "../core/ratings";
import type { Batter, GameState, Pitcher } from "../core/types";

interface Props {
  batter: Batter;
  pitcher: Pitcher;
  game: GameState;
  onAdvance: () => void;
  onNextTestBatter: () => void;
  onReset: () => void;
}

function nextAction(game: GameState): { label: string; disabled: boolean } {
  switch (game.resolution.phase) {
    case "PITCH": return { label: "Roll pitch", disabled: false };
    case "BATTED_BALL_CHART": return { label: `Roll ${game.resolution.chartFamily === "PROBABLE_HIT" ? "hit" : "out"} chart`, disabled: false };
    case "SPECIAL_EVENT": return { label: "Roll special event", disabled: false };
    case "HIT_ERROR_CHECK": return { label: "Roll error check", disabled: false };
    case "PITCHER_ERROR_CHECK": return { label: "Roll pitcher error", disabled: false };
    case "ERROR_CHART": return { label: "Roll error chart", disabled: false };
    case "SUPERIOR_ERROR_CHECK": return { label: "Roll Superior check", disabled: false };
    case "BALL_CHECK": return { label: "Roll ball check", disabled: false };
    case "COUNT_PENDING": return { label: "Count continuation pending", disabled: true };
    case "TRIPLE_DECISION": return { label: "Triple choice pending", disabled: true };
    case "CHART_RESULT_PENDING": return { label: "Chart-locked runner resolution pending", disabled: true };
    case "BALL_IN_PLAY": return { label: "Resolve fielding", disabled: false };
    case "RUNNER_ADVANCE": return { label: `Throw to ${game.pendingFielding?.targetBase.toLowerCase() ?? "next base"}`, disabled: false };
    case "UMPIRE_CHECK": return { label: "Roll automatic umpire", disabled: false };
    case "DIRECT_RESULT": return { label: "Score play", disabled: false };
    case "PLAY_COMPLETE": return { label: "Roll pitch", disabled: false };
  }
}

export function MatchupPanel({ batter, pitcher, game, onAdvance, onNextTestBatter, onReset }: Props) {
  const currentRate = game.activePitcherRate ?? pitcher.rate;
  const threshold = hitNumber(batter.offensiveGrade, currentRate);
  const powerRatings = effectivePowerRatings(batter, pitcher);
  const matchupBatter = powerRatings.gopherAdjusted ? { ...batter, homeRun: powerRatings.homeRun, triple: powerRatings.triple } : batter;
  const action = nextAction(game);
  const canTestAdvance = canAdvanceTestBatter(game);
  return (
    <section className="matchup-card">
      <div className="matchup-grid">
        <div className="matchup-person batter">
          <p className="eyebrow">At bat</p>
          <h3>{batter.name}</h3>
          <div className="rating-row">
            <span className="rating-badge full-rating" title={powerRatings.gopherAdjusted ? `Printed ${formatBatterRating(batter)}; adjusted for + pitcher` : undefined}>{formatBatterRating(matchupBatter)}</span>
            {powerRatings.gopherAdjusted && <span className="power-adjustment">vs +</span>}
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
            {currentRate !== pitcher.rate && <span className="rating-badge">Current {currentRate}</span>}
            <span>{pitcher.throws}HP</span>
            <span>ERA <b>{pitcher.era.toFixed(2)}</b></span>
          </div>
        </div>
      </div>
      <div className="matchup-actions">
        {canTestAdvance
          ? <button className="button test-next" onClick={onNextTestBatter} title="Advance without scoring the unresolved play"><SkipForward size={16} /> Next test batter</button>
          : <button className="button primary" onClick={onAdvance} disabled={action.disabled}><Dices size={18} /> {action.label}</button>}
        <button className="button ghost" onClick={onReset}><RotateCcw size={16} /> Reset demo</button>
        {game.lastRoll ? (
          <div className={`pitch-result tone-${game.lastRoll.resultTone ?? "neutral"}`} aria-live="polite">
            <strong>{game.lastRoll.displayValue ?? game.lastRoll.sherco}</strong>
            <span>{game.lastRoll.resultLabel}</span>
            <small>{game.lastRoll.explanation}</small>
          </div>
        ) : <p className="ready-message">Ready for the first pitch.</p>}
      </div>
      {game.resolution.description && (
        <div className={`resolution-strip phase-${game.resolution.phase.toLowerCase()}`} aria-live="polite">
          <div><b>{game.resolution.phase.replaceAll("_", " ")}</b><span>{game.resolution.description}</span></div>
          {game.resolution.source && <small>{game.resolution.source}</small>}
        </div>
      )}
    </section>
  );
}

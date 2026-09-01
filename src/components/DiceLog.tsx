import type { GameState } from "../core/types";

export function DiceLog({ game }: { game: GameState }) {
  return (
    <section className="dice-card">
      <div className="panel-heading compact">
        <div><p className="eyebrow">SherCo audit</p><h2>Dice & resolution</h2></div>
        <span className="live-badge"><i /> Live</span>
      </div>
      {game.events.length === 0 ? (
        <div className="empty-log"><span>—</span><p>Every pitch, chart roll, fielding check and throw will appear here.</p></div>
      ) : (
        <ol className="dice-log">
          {game.events.slice(0, 5).map((event) => (
            <li key={event.id}>
              <div className="dice-pair">
                <b>{event.roll?.dice[0]}</b><b>{event.roll?.dice[1]}</b>
              </div>
              <div><strong>{event.roll?.label}</strong><p>{event.auditText}</p></div>
              <span className="roll-result">{event.roll?.sherco}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

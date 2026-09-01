import type { GameState } from "../core/types";

export function DiceLog({ game }: { game: GameState }) {
  const rolledEvents = game.events.filter((event) => event.roll);
  return (
    <section className="dice-card">
      <div className="panel-heading compact">
        <div><p className="eyebrow">SherCo audit</p><h2>Dice & resolution</h2></div>
        <span className="live-badge"><i /> Live</span>
      </div>
      {rolledEvents.length === 0 ? (
        <div className="empty-log"><span>—</span><p>Every pitch, chart roll, fielding check and throw will appear here.</p></div>
      ) : (
        <ol className="dice-log">
          {rolledEvents.slice(0, 5).map((event) => (
            <li key={event.id}>
              <div className="dice-pair">
                {event.roll?.dice.map((die, index) => <b key={`${event.roll?.id}-${index}`}>{die}</b>)}
              </div>
              <div><strong>{event.roll?.label}</strong><p>{event.auditText}</p></div>
              <span className={`roll-result tone-${event.roll?.resultTone ?? "neutral"}`}>
                <b>{event.roll?.displayValue ?? event.roll?.sherco}</b>
                <em>{event.roll?.resultLabel}</em>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

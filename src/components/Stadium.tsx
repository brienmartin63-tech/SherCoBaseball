import type { Coordinate, Park } from "../core/types";

interface Props {
  park: Park;
  ballAt?: Coordinate;
  showCoordinates: boolean;
}

export function Stadium({ park, ballAt, showCoordinates }: Props) {
  const fielderByCoordinate = new Map(park.fielders.map((fielder) => [
    `${fielder.at.row}-${fielder.at.column}`,
    fielder.position,
  ]));

  return (
    <section className="stadium-card" aria-label={`${park.name} playing field`}>
      <div className="stadium-title">
        <div>
          <p className="eyebrow">Current park</p>
          <h2>{park.name}</h2>
        </div>
        <span>{park.location}</span>
      </div>
      <div className="stadium-frame">
        <div className="stadium-grid">
          {park.cells.flatMap((row, visualRow) => row.map((terrain, visualColumn) => {
            const coordinate = { row: 28 - visualRow, column: 28 - visualColumn };
            const key = `${coordinate.row}-${coordinate.column}`;
            const fielder = fielderByCoordinate.get(key);
            const hasBall = ballAt?.row === coordinate.row && ballAt?.column === coordinate.column;
            return (
              <div
                key={key}
                className={`field-cell terrain-${terrain} ${fielder ? "fielder-cell" : ""} ${hasBall ? "ball-cell" : ""}`}
                title={showCoordinates ? `${key}${fielder ? ` · ${fielder}` : ""}` : undefined}
              >
                {fielder && <span className="fielder-label">{fielder}</span>}
                {hasBall && <span className="ball-marker" aria-label="Ball" />}
                {showCoordinates && <span className="coordinate-label">{key}</span>}
              </div>
            );
          }))}
        </div>
        <div className="foul-line foul-line-first" />
        <div className="foul-line foul-line-third" />
        <div className="home-plate" />
      </div>
      <div className="stadium-legend">
        <span><i className="legend-swatch fielder" /> Fielder</span>
        <span><i className="legend-swatch runner" /> Runner</span>
        <span><i className="legend-swatch ball" /> Ball</span>
        <span className="park-team">Home of the {park.team}</span>
      </div>
    </section>
  );
}

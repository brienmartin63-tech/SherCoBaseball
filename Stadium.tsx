import { BASE_REFERENCE_SQUARES } from "../core/geometry";
import type { BaseRunners, Coordinate, Park } from "../core/types";

interface Props {
  park: Park;
  ballAt?: Coordinate;
  runners: BaseRunners;
  showCoordinates: boolean;
  actionPath?: Coordinate[];
}

export function Stadium({ park, ballAt, runners, showCoordinates, actionPath = [] }: Props) {
  const fielderByCoordinate = new Map(park.fielders.map((fielder) => [
    `${fielder.at.row}-${fielder.at.column}`,
    fielder.position,
  ]));
  const runnerByCoordinate = new Map([
    runners.first ? [`${BASE_REFERENCE_SQUARES.FIRST.row}-${BASE_REFERENCE_SQUARES.FIRST.column}`, "1B"] : undefined,
    runners.second ? [`${BASE_REFERENCE_SQUARES.SECOND.row}-${BASE_REFERENCE_SQUARES.SECOND.column}`, "2B"] : undefined,
    runners.third ? [`${BASE_REFERENCE_SQUARES.THIRD.row}-${BASE_REFERENCE_SQUARES.THIRD.column}`, "3B"] : undefined,
  ].filter(Boolean) as [string, string][]);
  const routeByCoordinate = new Map(actionPath.map((square, index) => [
    `${square.row}-${square.column}`,
    index + 1,
  ]));

  return (
    <section className="stadium-card" aria-label={`${park.name} playing field`}>
      <div className="stadium-frame">
        <div className="stadium-grid">
          {park.cells.flatMap((row, visualRow) => row.map((terrain, visualColumn) => {
            const coordinate = { row: 28 - visualRow, column: 28 - visualColumn };
            const key = `${coordinate.row}-${coordinate.column}`;
            const fielder = fielderByCoordinate.get(key);
            const runner = runnerByCoordinate.get(key);
            const hasBall = ballAt?.row === coordinate.row && ballAt?.column === coordinate.column;
            const routeNumber = routeByCoordinate.get(key);
            return (
              <div
                key={key}
                className={`field-cell terrain-${terrain} ${fielder ? "fielder-cell" : ""} ${runner ? "runner-cell" : ""} ${routeNumber ? "action-route-cell" : ""} ${hasBall ? "ball-cell" : ""}`}
                title={showCoordinates ? `${key}${fielder ? ` · ${fielder}` : ""}${runner ? ` · runner ${runner}` : ""}` : undefined}
              >
                {fielder && <span className="fielder-label">{fielder}</span>}
                {runner && <span className="runner-label">R</span>}
                {routeNumber && <span className="route-label">{routeNumber}</span>}
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
        <span><i className="legend-swatch route" /> Route</span>
        <span className="park-team">Home of the {park.team}</span>
      </div>
    </section>
  );
}

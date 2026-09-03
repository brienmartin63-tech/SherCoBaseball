import { useEffect, useMemo, useState } from "react";
import { Archive, BarChart3, BookOpenText, Bug, Download, Gamepad2, Printer, Settings2, ShieldCheck } from "lucide-react";
import { BaserunningPanel } from "./components/BaserunningPanel";
import { BullpenDrawer } from "./components/BullpenDrawer";
import { DiceLog } from "./components/DiceLog";
import { LineupPanel } from "./components/LineupPanel";
import { MatchupPanel } from "./components/MatchupPanel";
import { PlayResolutionWing } from "./components/PlayResolutionWing";
import { Scoreboard } from "./components/Scoreboard";
import { Stadium } from "./components/Stadium";
import { advanceTestBatter, createInitialGame, resolveFielding, rollPitch, rollResolution, scoreDirectResult, selectPark, selectPitcher, startNextPlateAppearance, toggleRulesProfile } from "./core/game";
import { buildRatedDefense, createFieldingAttempt } from "./core/fielding";
import { loadGame, saveGame } from "./core/storage";
import type { Park } from "./core/types";
import { demoGame } from "./data/demo";
import rawParks from "./data/parks.json";
import shercoLogo from "./assets/sherco-logo-2026.png";

type View = "game" | "box" | "pbp" | "stats" | "league";
const parks = rawParks as unknown as Park[];

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [game, setGame] = useState(() => createInitialGame(parks[1]?.id ?? parks[0].id));
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("game");
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [bullpenOpen, setBullpenOpen] = useState(false);
  const park = parks.find((candidate) => candidate.id === game.selectedParkId) ?? parks[0];
  const battingSide = game.half === "top" ? "away" : "home";
  const pitchingSide = game.half === "top" ? "home" : "away";
  const battingTeam = demoGame[battingSide];
  const pitchingTeam = demoGame[pitchingSide];
  const batterIndex = battingSide === "away" ? game.awayBatterIndex : game.homeBatterIndex;
  const batter = battingTeam.lineup[batterIndex];
  const activePitcherId = game.activePitchers[pitchingSide];
  const pitcher = [pitchingTeam.starter, ...pitchingTeam.bullpen].find((candidate) => candidate.id === activePitcherId) ?? pitchingTeam.starter;
  const previewFielding = useMemo(() => {
    if (!game.ballAt || !game.resolution.battedBallType || game.resolution.phase !== "BALL_IN_PLAY") return undefined;
    try {
      const defense = buildRatedDefense(pitchingTeam, pitcher, park);
      return createFieldingAttempt(batter, park, defense, game.ballAt, game.resolution.battedBallType);
    } catch {
      return undefined;
    }
  }, [batter, game.ballAt, game.resolution.battedBallType, game.resolution.phase, park, pitcher, pitchingTeam]);
  const displayBallAt = game.resolution.phase === "BALL_IN_PLAY" ? previewFielding?.ballAt ?? game.ballAt : game.ballAt;
  const runnerBallAt = game.resolution.phase === "BALL_IN_PLAY" || game.resolution.phase === "RUNNER_ADVANCE" || game.resolution.phase === "UMPIRE_CHECK" ? displayBallAt : undefined;
  const fieldingArm = game.pendingFielding?.arm ?? previewFielding?.arm ?? game.lastFielding?.arm;
  const profileName = game.rulesProfileId === "brien" ? "Brien's Rules" : "Official 1980";

  useEffect(() => {
    loadGame().then((saved) => {
      if (saved && parks.some((candidate) => candidate.id === saved.selectedParkId)) setGame(saved);
    }).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) void saveGame(game);
  }, [game, hydrated]);

  const nav = useMemo(() => [
    { id: "game" as const, label: "Game", icon: Gamepad2 },
    { id: "box" as const, label: "Box score", icon: BookOpenText },
    { id: "pbp" as const, label: "Play-by-play", icon: Archive },
    { id: "stats" as const, label: "Statistics", icon: BarChart3 },
    { id: "league" as const, label: "SLOBS league", icon: ShieldCheck },
  ], []);

  function resetDemo() {
    setBullpenOpen(false);
    setGame(createInitialGame(game.selectedParkId));
  }

  function confirmPitchingChange(replacement: typeof pitcher) {
    setGame((current) => selectPitcher(current, pitchingSide, replacement.id));
    setBullpenOpen(false);
  }

  function advanceResolution() {
    setGame((current) => {
      const activeBatter = current.half === "top"
        ? demoGame.away.lineup[current.awayBatterIndex]
        : demoGame.home.lineup[current.homeBatterIndex];
      const currentPitchingSide = current.half === "top" ? "home" : "away";
      const defensiveTeam = demoGame[currentPitchingSide];
      const currentPitcherId = current.activePitchers[currentPitchingSide];
      const activePitcher = [defensiveTeam.starter, ...defensiveTeam.bullpen].find((candidate) => candidate.id === currentPitcherId) ?? defensiveTeam.starter;
      if (current.resolution.phase === "PITCH") return rollPitch(current, activeBatter, activePitcher);
      if (current.resolution.phase === "BALL_IN_PLAY" || current.resolution.phase === "RUNNER_ADVANCE" || current.resolution.phase === "UMPIRE_CHECK") {
        return resolveFielding(current, activeBatter, activePitcher, park, defensiveTeam, demoGame.away.lineup.length, demoGame.home.lineup.length);
      }
      if (current.resolution.phase === "DIRECT_RESULT") {
        return scoreDirectResult(current, activeBatter, demoGame.away.lineup.length, demoGame.home.lineup.length);
      }
      if (current.resolution.phase === "PLAY_COMPLETE") {
        const started = startNextPlateAppearance(current, current.resolution.baseState !== "EMPTY");
        return rollPitch(started, activeBatter, activePitcher);
      }
      return rollResolution(current, activeBatter, activePitcher, park, defensiveTeam);
    });
  }

  function moveToNextTestBatter() {
    setGame((current) => advanceTestBatter(current, demoGame.away.lineup.length, demoGame.home.lineup.length));
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img className="brand-logo" src={shercoLogo} alt="SherCo Grand Slam Baseball Game — Since 1968, The Most Fun To Play" />
        </div>
        <nav className="primary-nav" aria-label="Application sections">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" title="Export current game" onClick={() => downloadJson("sherco-game.json", game)}><Download size={18} /></button>
          <button className="icon-button" title="Print" onClick={() => window.print()}><Printer size={18} /></button>
        </div>
      </header>

      <div className="status-bar">
        <div className="game-title"><b>{demoGame.away.city}</b><span>at</span><b>{demoGame.home.city}</b><em>October 21, 1980 · Exhibition build</em></div>
        <div className="park-context">
          <span>Current park</span><b>{park.name}</b><small>{park.location}</small>
        </div>
        <div className="game-settings">
          <label>
            <span>Park</span>
            <select value={game.selectedParkId} onChange={(event) => setGame((current) => selectPark(current, event.target.value))}>
              {parks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button className={`rules-toggle ${game.rulesProfileId === "brien" ? "on" : ""}`} onClick={() => setGame(toggleRulesProfile)}>
            <span className="switch"><i /></span>{profileName}
          </button>
          <button className={`debug-toggle ${showCoordinates ? "on" : ""}`} onClick={() => setShowCoordinates((value) => !value)} title="Show row-column coordinates">
            <Bug size={15} /> Debug grid
          </button>
        </div>
      </div>

      <main>
        <Scoreboard game={game} away={demoGame.away} home={demoGame.home} />
        {view === "game" && (
          <>
            <div className="game-stage">
              <div className="game-workspace">
                <LineupPanel
                  team={battingTeam}
                  activeIndex={batterIndex}
                  displayName={battingSide === "away" ? battingTeam.city : battingTeam.nickname}
                  pitcher={pitcher}
                  pitchingTeam={pitchingTeam}
                  onPitcherClick={() => setBullpenOpen(true)}
                />
                <div className="resolution-column">
                  <PlayResolutionWing game={game} away={demoGame.away} home={demoGame.home} />
                  <BaserunningPanel batter={batter} ballAt={runnerBallAt} runners={game.runners} arm={fieldingArm} />
                </div>
                <Stadium
                  park={park}
                  ballAt={displayBallAt}
                  runners={game.runners}
                  showCoordinates={showCoordinates}
                  actionPath={(game.pendingFielding ?? game.lastFielding)?.actionPath ?? previewFielding?.fieldingPath}
                />
                <div className="matchup-row">
                  <MatchupPanel batter={batter} pitcher={pitcher} game={game} onAdvance={advanceResolution} onNextTestBatter={moveToNextTestBatter} onReset={resetDemo} />
                </div>
                <div className="audit-row"><DiceLog game={game} /></div>
              </div>
            </div>
            <BullpenDrawer open={bullpenOpen} team={pitchingTeam} currentPitcher={pitcher} onClose={() => setBullpenOpen(false)} onConfirm={confirmPitchingChange} />
          </>
        )}
        {view === "box" && <BoxScoreView onPrint={() => window.print()} />}
        {view === "pbp" && <PlayByPlayView game={game} />}
        {view === "stats" && <StatisticsView />}
        {view === "league" && <LeagueView />}
      </main>
      <footer>
        <span><ShieldCheck size={15} /> Deterministic game seed: {game.seed}</span>
        <span>Rules-engine build 0.5.3 · Single-step batting rotation</span>
      </footer>
    </div>
  );
}

function BoxScoreView({ onPrint }: { onPrint: () => void }) {
  const hitters = demoGame.away.lineup;
  return (
    <section className="report-page">
      <div className="report-header"><div><p className="eyebrow">MLB-style report</p><h2>Philadelphia at Kansas City</h2><p>Exhibition · Game engine foundation</p></div><button className="button secondary" onClick={onPrint}><Printer size={17} /> Print box score</button></div>
      <h3>Philadelphia hitters</h3>
      <div className="table-scroll"><table className="report-table"><thead><tr><th>Batters</th><th>AB</th><th>R</th><th>H</th><th>RBI</th><th>BB</th><th>K</th><th>AVG</th><th>OPS</th></tr></thead><tbody>
        {hitters.map((player) => <tr key={player.id}><td><b>{player.name}</b>, {player.position}</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>{player.average.toFixed(3).replace(/^0/, "")}</td><td>{player.ops.toFixed(3).replace(/^0/, "")}</td></tr>)}
      </tbody></table></div>
      <h3>Pitching</h3>
      <div className="table-scroll"><table className="report-table"><thead><tr><th>Pitchers</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>K</th><th>HR</th><th>ERA</th></tr></thead><tbody>
        <tr><td><b>{demoGame.home.starter.name}</b></td><td>0.0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>{demoGame.home.starter.era.toFixed(2)}</td></tr>
      </tbody></table></div>
      <p className="report-note">The event ledger will populate batting, pitching, fielding, inherited-runner, and earned-run lines as plays are resolved.</p>
    </section>
  );
}

function PlayByPlayView({ game }: { game: ReturnType<typeof createInitialGame> }) {
  return (
    <section className="report-page narrow">
      <div className="report-header"><div><p className="eyebrow">Official record</p><h2>Play-by-play</h2><p>Clean baseball narration; dice stay in the separate SherCo audit.</p></div></div>
      {game.events.length === 0 ? <div className="report-empty">The game has not begun.</div> : game.events.slice().reverse().map((event) => (
        <article className="pbp-event" key={event.id}><span>{event.half === "top" ? "▲" : "▼"} {event.inning}</span><div><h3>{event.officialText}</h3><p>{event.outsBefore} out{event.outsBefore === 1 ? "" : "s"} before play</p></div></article>
      ))}
    </section>
  );
}

function StatisticsView() {
  const splits = ["vs RHP", "vs LHP", "vs Kansas City", "vs starters", "vs relievers"];
  return (
    <section className="report-page">
      <div className="report-header"><div><p className="eyebrow">Live season ledger</p><h2>Statistics & splits</h2><p>Traditional totals update from scored events, never from display text.</p></div><button className="button secondary" onClick={() => downloadJson("sherco-stat-export.json", { status: "schema-ready", splits })}><Download size={17} /> Download stats</button></div>
      <div className="stats-hero"><div><p className="eyebrow">Current batter</p><h3>Pete Rose</h3><strong>.282</strong><span>AVG</span></div><div><p className="eyebrow">Current pitcher</p><h3>Dennis Leonard</h3><strong>3.79</strong><span>ERA</span></div></div>
      <div className="split-grid">{splits.map((split) => <div className="split-card" key={split}><span>{split}</span><strong>—</strong><small>Awaiting scored plate appearances</small></div>)}</div>
    </section>
  );
}

function LeagueView() {
  return (
    <section className="report-page">
      <div className="report-header"><div><p className="eyebrow">SherCo Leagues of Baseball Simulation</p><h2>SLOBS league office</h2><p>The data model is being built around the twenty-man roster and re-rating workflow.</p></div><button className="button secondary"><Settings2 size={17} /> League settings</button></div>
      <div className="league-grid">
        <div className="league-card"><span>Roster construction</span><strong>12</strong><p>batters</p></div>
        <div className="league-card"><span>Starting rotation</span><strong>4</strong><p>starting pitchers</p></div>
        <div className="league-card"><span>Bullpen</span><strong>4</strong><p>relief pitchers</p></div>
        <div className="league-card highlighted"><span>Rest chart</span><strong>Pending</strong><p>starter / reserve qualification inputs</p></div>
      </div>
      <div className="workflow-list"><h3>Planned automation</h3><p><i>01</i> Set each game’s starting lineup from the Rest Chart.</p><p><i>02</i> Track full and limited re-rate qualification automatically.</p><p><i>03</i> Create initial players and the rookie draft pool from SLOBS rules.</p><p><i>04</i> Re-rate players from authoritative season statistics.</p></div>
    </section>
  );
}

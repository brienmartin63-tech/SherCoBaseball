import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPitcherRating } from "../core/ratings";
import type { Pitcher, Team } from "../core/types";

interface Props {
  open: boolean;
  team: Team;
  currentPitcher: Pitcher;
  onClose: () => void;
  onConfirm: (pitcher: Pitcher) => void;
}

export function BullpenDrawer({ open, team, currentPitcher, onClose, onConfirm }: Props) {
  const [candidate, setCandidate] = useState<Pitcher>();

  useEffect(() => {
    if (!open) setCandidate(undefined);
  }, [open]);

  if (!open) return null;

  return (
    <div className="bullpen-scrim" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <aside className="bullpen-drawer" role="dialog" aria-modal="true" aria-label={`${team.nickname} bullpen`}>
        <header>
          <div><p className="eyebrow">Pitching change</p><h2>{team.nickname} bullpen</h2></div>
          <button className="drawer-close" onClick={onClose} aria-label="Close bullpen"><X size={19} /></button>
        </header>
        <div className="current-pitcher-card">
          <span>On the mound</span>
          <strong>{currentPitcher.name}</strong>
          <b>{currentPitcher.throws}HP · {formatPitcherRating(currentPitcher)}</b>
        </div>
        <div className="bullpen-options">
          {team.bullpen.map((pitcher) => (
            <button key={pitcher.id} className={candidate?.id === pitcher.id ? "selected" : ""} onClick={() => setCandidate(pitcher)}>
              <span><strong>{pitcher.name}</strong><small>{pitcher.throws}HP · {formatPitcherRating(pitcher)}</small></span>
              <b>{pitcher.era.toFixed(2)}</b>
            </button>
          ))}
        </div>
        {candidate ? (
          <div className="pitch-change-confirm">
            <p>Bring in <b>{candidate.name}</b> to replace {currentPitcher.name}?</p>
            <div>
              <button className="button ghost" onClick={() => setCandidate(undefined)}>Not yet</button>
              <button className="button primary" onClick={() => onConfirm(candidate)}><Check size={16} /> Confirm change</button>
            </div>
          </div>
        ) : (
          <p className="drawer-note">Select a reliever to review the change.</p>
        )}
      </aside>
    </div>
  );
}

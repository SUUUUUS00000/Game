import type { RoundStats } from "../game/game";
import type { ScoreEntry } from "../game/highscores";
import { WEAPON_MAP } from "../game/weapons";
import { ScoreTable } from "./ScoreTable";

export function GameOverScreen({
  stats,
  scores,
  rank,
  name,
  onNameChange,
  onRedeploy,
  onMenu,
}: {
  stats: RoundStats;
  scores: ScoreEntry[];
  rank: number;
  name: string;
  onNameChange: (n: string) => void;
  onRedeploy: () => void;
  onMenu: () => void;
}) {
  const isRecord = rank === 0;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-[rgba(7,8,10,0.55)] backdrop-blur-[4px]">
      <div className="relative w-full max-w-md flex flex-col gap-4 py-4">
        <div className="panel px-8 py-7 flex flex-col items-center gap-3">
          <div className="text-[11px] tracking-[0.4em] text-[var(--dim)] uppercase">Round complete</div>
          <div
            className={`font-display font-bold text-[46px] leading-none ${
              isRecord ? "title-glow" : "text-[var(--text)]"
            }`}
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.7)" }}
          >
            {stats.score.toLocaleString()}
          </div>
          {isRecord && (
            <div className="font-display text-[13px] tracking-[0.3em] text-[#ffd24a] pulse-glow">
              ★ NEW HIGH SCORE ★
            </div>
          )}

          {/* stats */}
          <div className="grid grid-cols-4 gap-2 w-full mt-1">
            {[
              ["KILLS", stats.kills],
              ["HEADSHOT", stats.headshots],
              ["ACCURACY", `${stats.accuracy}%`],
              ["BEST COMBO", `×${Math.max(1, stats.bestCombo)}`],
            ].map(([l, v]) => (
              <div key={l} className="bg-[rgba(255,255,255,0.04)] border border-[var(--line)] rounded-lg py-2 text-center">
                <div className="font-display font-bold text-[20px] leading-none text-[var(--sand)]">{v}</div>
                <div className="text-[9px] tracking-[0.2em] text-[var(--dim)] mt-1 uppercase">{l}</div>
              </div>
            ))}
          </div>
          <div className="text-[12px] text-[var(--dim)]">
            Loadout: <b className="text-[var(--accent-2)]">{WEAPON_MAP[stats.weapon].name}</b>
          </div>

          {/* name */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] tracking-[0.25em] text-[var(--dim)] uppercase">Callsign</span>
            <input
              className="initials"
              value={name}
              maxLength={3}
              onChange={(e) => onNameChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
          </div>

          <button className="btn btn-primary w-full text-[18px]" onClick={onRedeploy}>
            ↻ Redeploy instantly
          </button>
          <button className="btn btn-ghost w-full" onClick={onMenu}>
            ⌂ Main menu
          </button>
        </div>

        <div className="panel p-4">
          <div className="font-display text-[12px] tracking-[0.3em] text-[var(--accent)] mb-2">
            TOP OPERATORS
          </div>
          <ScoreTable scores={scores} highlightRank={rank} />
        </div>
      </div>
    </div>
  );
}

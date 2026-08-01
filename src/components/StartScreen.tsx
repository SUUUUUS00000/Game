import { WEAPONS, type WeaponDef, type WeaponId } from "../game/weapons";
import type { ScoreEntry } from "../game/highscores";
import { ScoreTable } from "./ScoreTable";

function GunSilhouette({ id }: { id: WeaponId }) {
  const c = "#ffb35c";
  if (id === "glock") {
    return (
      <svg viewBox="0 0 120 60" className="w-full h-14">
        <rect x="8" y="18" width="78" height="14" rx="3" fill={c} />
        <rect x="8" y="16" width="20" height="18" rx="2" fill={c} />
        <rect x="76" y="30" width="12" height="6" rx="1" fill={c} />
        <polygon points="80,34 92,34 85,54 76,54" fill={c} />
        <polygon points="66,34 76,34 74,42 62,42" fill={c} />
        <rect x="30" y="20" width="8" height="4" fill="#0b0d10" />
      </svg>
    );
  }
  if (id === "ak") {
    return (
      <svg viewBox="0 0 200 60" className="w-full h-14">
        <rect x="6" y="24" width="96" height="7" rx="2" fill={c} />
        <rect x="6" y="20" width="10" height="15" rx="2" fill={c} />
        <polygon points="92,22 138,20 140,34 120,34 118,42 104,42 98,32" fill={c} />
        <polygon points="108,34 122,34 116,54 104,54" fill={c} />
        <polygon points="112,34 122,34 128,52 120,52" fill={c} />
        <rect x="134" y="22" width="44" height="10" rx="2" fill={c} />
        <polygon points="160,30 174,30 168,44 158,44" fill={c} />
        <rect x="30" y="27" width="10" height="3" fill="#0b0d10" />
        <rect x="112" y="24" width="6" height="3" fill="#0b0d10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 60" className="w-full h-14">
      <rect x="4" y="26" width="120" height="7" rx="2" fill={c} />
      <polygon points="116,22 160,20 162,36 146,36 142,44 130,44 124,34" fill={c} />
      <polygon points="138,36 150,36 146,52 134,52" fill={c} />
      <rect x="154" y="22" width="52" height="11" rx="2" fill={c} />
      <rect x="118" y="14" width="30" height="8" rx="3" fill={c} />
      <rect x="112" y="12" width="6" height="12" fill={c} />
      <rect x="148" y="12" width="6" height="12" fill={c} />
      <polygon points="178,31 190,31 184,44 174,44" fill={c} />
      <rect x="34" y="28" width="12" height="3" fill="#0b0d10" />
    </svg>
  );
}

function StatBar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] tracking-widest text-[var(--dim)] uppercase">
        <span>{label}</span>
      </div>
      <div className="statbar mt-[2px]">
        <div style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}

export function StartScreen({
  scores,
  selected,
  onSelect,
  onDeploy,
  muted,
  onToggleMute,
  isTouch,
}: {
  scores: ScoreEntry[];
  selected: WeaponId;
  onSelect: (w: WeaponId) => void;
  onDeploy: () => void;
  muted: boolean;
  onToggleMute: () => void;
  isTouch: boolean;
}) {
  const stats = (w: WeaponDef) => ({
    dmg: w.id === "awp" ? 1 : w.id === "ak" ? 0.78 : 0.62,
    rate: Math.min(1, w.rpm / 600),
    acc: 1 - Math.min(1, (w.baseSpread + w.moveSpread) / 0.045),
  });
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(20,16,8,0.25) 0%, rgba(8,9,11,0.82) 100%)",
        }}
      />
      <div className="relative w-full max-w-3xl flex flex-col items-center gap-4 py-6">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.5em] text-[var(--sand)] uppercase mb-1">
            Tactical FPS · Warm-up Range
          </div>
          <h1 className="title-glow font-display font-bold text-[52px] leading-[0.95] sm:text-[68px] tracking-[0.04em]">
            DESERT STRIKE
          </h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="h-[2px] w-10 bg-[var(--accent)]" />
            <span className="font-display tracking-[0.4em] text-[15px] text-[var(--accent-2)]">
              WARM-UP MODE
            </span>
            <span className="h-[2px] w-10 bg-[var(--accent)]" />
          </div>
        </div>

        {/* weapon select */}
        <div className="w-full grid grid-cols-3 gap-3">
          {WEAPONS.map((w) => {
            const s = stats(w);
            const sel = selected === w.id;
            return (
              <button
                key={w.id}
                className={`wcard p-3 flex flex-col gap-2 ${sel ? "selected" : ""}`}
                onClick={() => onSelect(w.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[15px] tracking-wide">{w.short}</span>
                  <span className="text-[10px] text-[var(--dim)]">{w.magSize} rnd</span>
                </div>
                <GunSilhouette id={w.id} />
                <div className="flex flex-col gap-1.5 mt-1">
                  <StatBar label="Damage" v={s.dmg} />
                  <StatBar label="Fire rate" v={s.rate} />
                  <StatBar label="Accuracy" v={s.acc} />
                </div>
              </button>
            );
          })}
        </div>

        <button className="btn btn-primary text-[20px] px-16 py-4" onClick={onDeploy}>
          ▶ Deploy
        </button>

        <div className="w-full grid sm:grid-cols-2 gap-3">
          <div className="panel p-4">
            <div className="font-display text-[12px] tracking-[0.3em] text-[var(--accent)] mb-2">
              OPERATIONS
            </div>
            <ScoreTable scores={scores} />
          </div>
          <div className="panel p-4 text-[13px] text-[var(--dim)] leading-relaxed">
            <div className="font-display text-[12px] tracking-[0.3em] text-[var(--accent)] mb-2">
              FIELD MANUAL
            </div>
            {isTouch ? (
              <ul className="space-y-1.5">
                <li>🕹️ <b className="text-[var(--text)]">Left thumb</b> — move</li>
                <li>👆 <b className="text-[var(--text)]">Right thumb</b> — look around</li>
                <li>🔫 <b className="text-[var(--text)]">Fire button</b> — hold to shoot</li>
                <li>🔄 <b className="text-[var(--text)]">Reload</b> — or auto when empty</li>
                <li>🎯 Headshots ×2.5 — chain kills for combo ×5</li>
              </ul>
            ) : (
              <ul className="space-y-1.5">
                <li><span className="key-cap">W</span> <span className="key-cap">A</span> <span className="key-cap">S</span> <span className="key-cap">D</span> move · <span className="key-cap">SHIFT</span> walk</li>
                <li><b className="text-[var(--text)]">Mouse</b> — look · <b className="text-[var(--text)]">LMB</b> — fire</li>
                <li><span className="key-cap">1</span> <span className="key-cap">2</span> <span className="key-cap">3</span> weapons · <span className="key-cap">R</span> reload</li>
                <li><span className="key-cap">ESC</span> pause · 🎯 Headshots ×2.5 · combo ×5</li>
              </ul>
            )}
          </div>
        </div>

        <button className="btn btn-ghost btn-square absolute top-3 right-3" onClick={onToggleMute}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </div>
  );
}

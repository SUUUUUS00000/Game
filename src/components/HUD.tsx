import type { HudState } from "../game/game";
import { WEAPONS, type WeaponId } from "../game/weapons";

export interface Banner {
  key: number;
  text: string;
  sub?: string;
  gold?: boolean;
}

export function HUD({
  hud,
  isTouch,
  hitKey,
  hitHead,
  banner,
  onPause,
  onToggleMute,
  onFireDown,
  onFireUp,
  onReload,
  onSwitch,
  showHint,
}: {
  hud: HudState;
  isTouch: boolean;
  hitKey: number;
  hitHead: boolean;
  banner: Banner | null;
  onPause: () => void;
  onToggleMute: () => void;
  onFireDown: () => void;
  onFireUp: () => void;
  onReload: () => void;
  onSwitch: (w: WeaponId) => void;
  showHint: boolean;
}) {
  const low = hud.timeLeft <= 10;
  const gap = 10 + hud.spreadNorm * 20;
  const active = WEAPONS.find((w) => w.id === hud.weapon)!;
  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none">
      {/* crosshair */}
      <div id="crosshair" style={{ ["--g" as string]: `${gap}px` }}>
        <div className="ch-line ch-l" />
        <div className="ch-line ch-r" />
        <div className="ch-line ch-t" />
        <div className="ch-line ch-b" />
        <div className="ch-line ch-dot" />
        <div key={hitKey} className={`hitmarker ${hitKey > 0 ? "anim" : ""}`}>
          <span className={`hm-arm hm-tl ${hitHead ? "head" : ""}`} />
          <span className={`hm-arm hm-tr ${hitHead ? "head" : ""}`} />
          <span className={`hm-arm hm-bl ${hitHead ? "head" : ""}`} />
          <span className={`hm-arm hm-br ${hitHead ? "head" : ""}`} />
        </div>
      </div>

      {/* banner */}
      {banner && (
        <div
          key={banner.key}
          className="banner-anim absolute left-1/2 top-[26%] text-center"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div
            className={`font-display font-bold text-[44px] leading-none tracking-[0.08em] ${
              banner.gold ? "text-[#ffb35c]" : "text-[#fff2dc]"
            }`}
            style={{ textShadow: "0 0 24px rgba(255,140,20,0.8), 0 3px 0 rgba(0,0,0,0.6)" }}
          >
            {banner.text}
          </div>
          {banner.sub && (
            <div className="font-display text-[20px] text-[var(--sand)] mt-1 tracking-[0.2em]">
              {banner.sub}
            </div>
          )}
        </div>
      )}

      {/* top-left: score */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <div className="panel px-4 py-2">
          <div className="text-[10px] tracking-[0.3em] text-[var(--dim)] uppercase">Score</div>
          <div className="font-display font-bold text-[30px] leading-none text-[var(--sand)]">
            {hud.score.toLocaleString()}
          </div>
        </div>
        <div className="panel px-3 py-1.5 flex items-center gap-3 text-[12px]">
          <span>💀 <b className="font-display text-[var(--text)]">{hud.kills}</b></span>
          <span>🎯 <b className="font-display text-[#ffb35c]">{hud.headshots}</b></span>
        </div>
        {hud.combo > 1 && (
          <div key={hud.combo} className="panel px-3 py-1.5 combo-anim" style={{ borderColor: "rgba(255,138,30,0.5)" }}>
            <span className="font-display font-bold text-[16px] text-[#ffb35c]">×{hud.comboMult}</span>
            <span className="text-[11px] tracking-widest text-[var(--dim)] ml-1.5 uppercase">combo</span>
            <div className="h-[3px] w-24 bg-[#1d222b] rounded mt-1 overflow-hidden">
              <div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${hud.comboT * 100}%`, transition: "width 0.1s linear" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* top-center: timer */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center">
        <div className="text-[10px] tracking-[0.4em] text-[var(--dim)] uppercase">Warm-up</div>
        <div
          className={`font-display font-bold text-[44px] leading-none ${
            low ? "text-[#ff5c5c] pulse-glow" : "text-[var(--text)]"
          }`}
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}
        >
          {hud.timeLeft}
          <span className="text-[18px] text-[var(--dim)]">s</span>
        </div>
      </div>

      {/* top-right: buttons */}
      <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
        <button className="btn btn-ghost btn-square" onClick={onToggleMute}>
          {hud.muted ? "🔇" : "🔊"}
        </button>
        <button className="btn btn-ghost btn-square" onClick={onPause}>
          ⏸
        </button>
      </div>

      {/* bottom-right: ammo + fire */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2 pointer-events-none">
        <div className="panel px-4 py-2 text-right">
          <div className="text-[11px] tracking-[0.25em] text-[var(--dim)] uppercase">
            {active.name}
          </div>
          <div className="font-display font-bold text-[36px] leading-none">
            <span className={hud.mag === 0 ? "text-[#ff5c5c]" : "text-[var(--text)]"}>{hud.mag}</span>
            <span className="text-[16px] text-[var(--dim)]"> / {hud.reserve}</span>
          </div>
          {hud.reloading && (
            <div className="mt-1 h-[5px] w-32 bg-[#1d222b] rounded overflow-hidden">
              <div
                className="reload-fill h-full bg-[var(--accent)]"
                style={{ width: `${hud.reloadProgress * 100}%` }}
              />
            </div>
          )}
        </div>
        {isTouch ? (
          <div className="flex items-end gap-3 pointer-events-auto">
            <button className="btn btn-ghost w-[54px] h-[54px] rounded-full text-[20px]" onPointerDown={onReload}>
              🔄
            </button>
            <button
              className="fire-btn"
              onPointerDown={(e) => {
                e.preventDefault();
                onFireDown();
              }}
              onPointerUp={onFireUp}
              onPointerLeave={onFireUp}
              onPointerCancel={onFireUp}
            >
              🔫
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-[var(--dim)] tracking-widest uppercase pr-1">
            <span className="key-cap">R</span> reload
          </div>
        )}
      </div>

      {/* bottom-left: weapons (mobile) */}
      {isTouch ? (
        <div className="absolute bottom-3 left-3 flex gap-2 pointer-events-auto">
          {WEAPONS.map((w) => (
            <button
              key={w.id}
              className={`btn px-3 py-2 text-[12px] font-display ${
                hud.weapon === w.id
                  ? "bg-[var(--accent)] text-[#1a0f02] border-[var(--accent)]"
                  : "btn-ghost"
              }`}
              onPointerDown={() => onSwitch(w.id)}
            >
              {w.short}
              <span className="ml-1 opacity-70">{hud.weapon === w.id ? hud.mag : w.magSize}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 text-[11px] text-[var(--dim)] tracking-widest uppercase panel px-3 py-1.5">
          <span className="key-cap">1</span><span className="key-cap">2</span><span className="key-cap">3</span> weapons
          &nbsp;·&nbsp;<span className="key-cap">SHIFT</span> walk
        </div>
      )}

      {/* hint */}
      {showHint && (
        <div className="hint-anim absolute bottom-[22%] left-1/2 -translate-x-1/2 text-center">
          <div className="panel px-5 py-2.5 font-display text-[15px] tracking-[0.15em] text-[var(--sand)]">
            🎯 TAKE DOWN THE MANNEQUINS — HEADSHOTS PAY ×2.5
          </div>
        </div>
      )}
    </div>
  );
}

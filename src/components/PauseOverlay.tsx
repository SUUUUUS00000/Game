export function PauseOverlay({
  onResume,
  onRestart,
  onMenu,
  muted,
  onToggleMute,
  isTouch,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  muted: boolean;
  onToggleMute: () => void;
  isTouch: boolean;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(7,8,10,0.6)] backdrop-blur-[6px]">
      <div className="panel px-10 py-8 flex flex-col items-center gap-4 w-[min(92vw,380px)]">
        <div className="text-[11px] tracking-[0.4em] text-[var(--dim)] uppercase">Stand down</div>
        <div className="font-display font-bold text-[40px] leading-none title-glow tracking-[0.1em]">
          PAUSED
        </div>
        <div className="w-full h-[1px] bg-[var(--line)] my-1" />
        <button className="btn btn-primary w-full" onClick={onResume}>
          ▶ Resume
        </button>
        <button className="btn btn-ghost w-full" onClick={onRestart}>
          ↻ Restart round
        </button>
        <button className="btn btn-ghost w-full" onClick={onMenu}>
          ⌂ Main menu
        </button>
        <button className="btn btn-ghost w-full" onClick={onToggleMute}>
          {muted ? "🔇 Sound: OFF" : "🔊 Sound: ON"}
        </button>
        {!isTouch && (
          <div className="text-[11px] text-[var(--dim)] tracking-widest uppercase mt-1">
            <span className="key-cap">ESC</span> to resume
          </div>
        )}
      </div>
    </div>
  );
}

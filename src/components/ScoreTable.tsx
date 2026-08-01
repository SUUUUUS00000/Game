import type { ScoreEntry } from "../game/highscores";

export function ScoreTable({
  scores,
  highlightRank = -1,
}: {
  scores: ScoreEntry[];
  highlightRank?: number;
}) {
  if (scores.length === 0) {
    return (
      <div className="text-center text-[13px] text-[var(--dim)] py-3 tracking-widest uppercase">
        No records yet — be the first operator
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[3px]">
      {scores.map((s, i) => (
        <div key={`${s.date}-${i}`} className={`srow ${i === highlightRank ? "hl" : ""}`}>
          <span className="font-display font-bold text-[var(--accent)] text-right">
            {i === 0 ? "★" : i + 1}
          </span>
          <span className="font-display font-bold tracking-[0.15em]">{s.name}</span>
          <span className="text-right font-display font-bold text-[var(--sand)]">
            {s.score.toLocaleString()}
          </span>
          <span className="text-right text-[11px] text-[var(--dim)]">
            {s.kills}K · {s.accuracy}%
          </span>
        </div>
      ))}
    </div>
  );
}

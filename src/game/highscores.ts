export interface ScoreEntry {
  name: string;
  score: number;
  kills: number;
  headshots: number;
  accuracy: number; // 0-100
  date: number;
}

const KEY = "desert-strike-scores-v1";
const NAME_KEY = "desert-strike-name";

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e.score === "number")
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function saveScores(entries: ScoreEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 5)));
  } catch {
    /* storage unavailable */
  }
}

export function addScore(entry: ScoreEntry): { entries: ScoreEntry[]; rank: number } {
  const entries = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, 5);
  saveScores(entries);
  const rank = entries.indexOf(entry);
  return { entries, rank };
}

export function loadName(): string {
  try {
    return (localStorage.getItem(NAME_KEY) || "ACE").slice(0, 3).toUpperCase();
  } catch {
    return "ACE";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.slice(0, 3).toUpperCase());
  } catch {
    /* noop */
  }
}

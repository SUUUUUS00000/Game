import { useEffect, useRef, useState } from "react";
import { Game, type GameEvent, type HudState, type RoundStats } from "./game/game";
import type { WeaponId } from "./game/weapons";
import {
  addScore,
  loadName,
  loadScores,
  saveName,
  saveScores,
  type ScoreEntry,
} from "./game/highscores";
import { StartScreen } from "./components/StartScreen";
import { HUD, type Banner } from "./components/HUD";
import { PauseOverlay } from "./components/PauseOverlay";
import { GameOverScreen } from "./components/GameOverScreen";

type Screen = "menu" | "playing" | "paused" | "gameover";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [selected, setSelected] = useState<WeaponId>("ak");
  const [hud, setHud] = useState<HudState | null>(null);
  const [hitKey, setHitKey] = useState(0);
  const [hitHead, setHitHead] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [lastStats, setLastStats] = useState<RoundStats | null>(null);
  const [rank, setRank] = useState(-1);
  const [name, setName] = useState(() => loadName());
  const [muted, setMuted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const game = new Game(el, (e: GameEvent) => {
      switch (e.type) {
        case "hud":
          setHud(e.hud);
          setMuted(e.hud.muted);
          break;
        case "hitmarker":
          setHitHead(e.head);
          setHitKey((k) => k + 1);
          break;
        case "banner":
          setBanner({ key: Date.now() + Math.random(), text: e.text, sub: e.sub, gold: e.gold });
          break;
        case "pause":
          setScreen(e.paused ? "paused" : "playing");
          break;
        case "gameover": {
          setLastStats(e.stats);
          const { entries, rank: r } = addScore({
            name: loadName(),
            score: e.stats.score,
            kills: e.stats.kills,
            headshots: e.stats.headshots,
            accuracy: e.stats.accuracy,
            date: Date.now(),
          });
          setScores(entries);
          setRank(r);
          setScreen("gameover");
          break;
        }
      }
    });
    gameRef.current = game;
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const deploy = (w: WeaponId) => {
    if (!gameRef.current) return;
    gameRef.current.beginRound(w);
    setScreen("playing");
    setShowHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setShowHint(false), 6000);
  };

  const toggleMute = () => {
    const g = gameRef.current;
    if (!g) return;
    g.setMuted(!muted);
    setMuted(!muted);
  };

  const onNameChange = (n: string) => {
    setName(n);
    saveName(n);
    if (rank >= 0) {
      const next = [...scores];
      if (next[rank]) {
        next[rank] = { ...next[rank], name: n || "???" };
        setScores(next);
        saveScores(next);
      }
    }
  };

  const inRound = screen === "playing" || screen === "paused";

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--bg)]">
      <div id="game-root" ref={containerRef} />

      {/* post fx */}
      <div className="vignette" />
      <div className="scanline" />

      {inRound && hud && (
        <HUD
          hud={hud}
          isTouch={"ontouchstart" in window || navigator.maxTouchPoints > 0}
          hitKey={hitKey}
          hitHead={hitHead}
          banner={banner}
          onPause={() => gameRef.current?.togglePause()}
          onToggleMute={toggleMute}
          onFireDown={() => gameRef.current?.setFiring(true)}
          onFireUp={() => gameRef.current?.setFiring(false)}
          onReload={() => gameRef.current?.reload()}
          onSwitch={(w) => gameRef.current?.switchWeapon(w)}
          showHint={showHint && screen === "playing"}
        />
      )}

      {screen === "menu" && (
        <StartScreen
          scores={scores}
          selected={selected}
          onSelect={setSelected}
          onDeploy={() => deploy(selected)}
          muted={muted}
          onToggleMute={toggleMute}
          isTouch={"ontouchstart" in window || navigator.maxTouchPoints > 0}
        />
      )}

      {screen === "paused" && (
        <PauseOverlay
          onResume={() => gameRef.current?.togglePause()}
          onRestart={() => deploy(selected)}
          onMenu={() => {
            gameRef.current?.toMenu();
            setScreen("menu");
          }}
          muted={muted}
          onToggleMute={toggleMute}
          isTouch={"ontouchstart" in window || navigator.maxTouchPoints > 0}
        />
      )}

      {screen === "gameover" && lastStats && (
        <GameOverScreen
          stats={lastStats}
          scores={scores}
          rank={rank}
          name={name}
          onNameChange={onNameChange}
          onRedeploy={() => deploy(selected)}
          onMenu={() => {
            gameRef.current?.toMenu();
            setScreen("menu");
          }}
        />
      )}
    </div>
  );
}

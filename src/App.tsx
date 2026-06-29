import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, GameSettings, GameStats, DEFAULT_SETTINGS, DEFAULT_STATS } from "./types";
import { loadSettings, loadStats, saveStats } from "./utils/storage";
import { TitleScreen } from "./components/TitleScreen";
import { GameCanvas } from "./components/GameCanvas";
import { EndingCutscene } from "./components/EndingCutscene";
import { OptionsDialog } from "./components/OptionsDialog";
import { Heart, Trophy, Settings, ShieldAlert, Play, RotateCcw, Home, Skull } from "lucide-react";

export default function App() {
  // Game states
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);

  // Active playing values
  const [hp, setHp] = useState(5);
  const [kills, setKills] = useState(0);
  const [bossActive, setBossActive] = useState(false);
  const [bossHp, setBossHp] = useState(10);
  const [bossMaxHp, setBossMaxHp] = useState(10);

  // Playtime tracking
  const [playTimeThisSession, setPlayTimeThisSession] = useState(0);
  const playTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Settings Modal Toggle
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Load configuration and play stats on mount
  useEffect(() => {
    setSettings(loadSettings());
    setStats(loadStats());
  }, []);

  // Update total statistics helper
  const handleStatsUpdate = useCallback((updated: Partial<GameStats>) => {
    setStats((prev) => {
      const merged = { ...prev, ...updated };
      saveStats(merged);
      return merged;
    });
  }, []);

  // Start playtime tracking
  const startPlayTimeTracker = () => {
    setPlayTimeThisSession(0);
    if (playTimeIntervalRef.current) clearInterval(playTimeIntervalRef.current);
    playTimeIntervalRef.current = setInterval(() => {
      setPlayTimeThisSession((prev) => prev + 1);
    }, 1000);
  };

  // Stop playtime tracking & accumulate to stats
  const stopPlayTimeTracker = useCallback(() => {
    if (playTimeIntervalRef.current) {
      clearInterval(playTimeIntervalRef.current);
      playTimeIntervalRef.current = null;
    }
    // Update play time statistics
    setPlayTimeThisSession((sessionTime) => {
      if (sessionTime > 0) {
        handleStatsUpdate({
          totalPlayTime: stats.totalPlayTime + sessionTime,
        });
      }
      return 0;
    });
  }, [stats.totalPlayTime, handleStatsUpdate]);

  // Handle start game action
  const handleStartGame = () => {
    setHp(5);
    setKills(0);
    setBossActive(false);
    setBossHp(10);
    setBossMaxHp(10);
    setGameState(GameState.PLAYING);

    // Save statistics increment
    handleStatsUpdate({
      totalGamesPlayed: stats.totalGamesPlayed + 1,
    });

    startPlayTimeTracker();
  };

  // Handle Game Over
  const handleGameOver = () => {
    stopPlayTimeTracker();
    setGameState(GameState.GAMEOVER);
  };

  // Handle Warp gate entry - Transition to Dialogue cutscene
  const handleVictory = () => {
    stopPlayTimeTracker();
    setGameState(GameState.ENDING);
  };

  // Handle Dialogue Cutscene finished - back to Title
  const handleEndingFinished = () => {
    setGameState(GameState.TITLE);
  };

  // Ensure timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (playTimeIntervalRef.current) clearInterval(playTimeIntervalRef.current);
    };
  }, []);

  // Format playtime
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="w-full min-h-screen bg-[#07070e] text-slate-100 font-sans antialiased relative overflow-hidden">
      {/* 1. TITLE VIEW */}
      {gameState === GameState.TITLE && (
        <TitleScreen
          settings={settings}
          stats={stats}
          onStartGame={handleStartGame}
          onOpenOptions={() => setIsOptionsOpen(true)}
        />
      )}

      {/* 2. PLAYING / GAME RUNTIME VIEW */}
      {gameState === GameState.PLAYING && (
        <div className="absolute inset-0 flex flex-col w-full h-full select-none">
          {/* Main Three.JS Canvas */}
          <div className="flex-1 w-full h-full relative">
            <GameCanvas
              settings={settings}
              stats={stats}
              onStatsUpdate={handleStatsUpdate}
              onHpChange={setHp}
              onKillsChange={setKills}
              onBossActiveChange={setBossActive}
              onBossHpChange={(curr, max) => {
                setBossHp(curr);
                setBossMaxHp(max);
              }}
              onGameOver={handleGameOver}
              onVictory={handleVictory}
            />

            {/* Top HUD HUD overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none select-none">
              {/* Left HUD: HP & Kills */}
              <div className="flex flex-col gap-2.5 bg-slate-950/85 border border-slate-800 p-3.5 rounded-2xl shadow-xl pointer-events-auto backdrop-blur-sm">
                {/* Hearts meter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-slate-400 mr-1 uppercase">HP:</span>
                  {[...Array(5)].map((_, i) => (
                    <Heart
                      key={i}
                      id={`hud-hp-${i}`}
                      size={18}
                      className={`${
                        i < hp
                          ? "fill-red-500 text-red-500 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                          : "text-slate-700 fill-transparent"
                      } transition-all duration-300`}
                    />
                  ))}
                </div>

                {/* Score Kills count */}
                <div className="flex items-center justify-between gap-6 font-mono border-t border-slate-900 pt-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Skull size={14} className="text-red-400" />
                    <span>SLAIN (กำจัด):</span>
                  </div>
                  <span className="text-sm font-bold text-red-400">
                    {kills} <span className="text-slate-600">/ 10</span>
                  </span>
                </div>
              </div>

              {/* Right HUD: Session Playtime & Target indicator */}
              <div className="flex flex-col items-end gap-1 font-mono text-xs bg-slate-950/85 border border-slate-800 px-3.5 py-2.5 rounded-2xl shadow-xl pointer-events-auto backdrop-blur-sm">
                <div className="text-slate-500 text-[10px] tracking-wider uppercase">TIMER</div>
                <div className="text-sm font-bold text-slate-200">{formatTime(playTimeThisSession)}</div>
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>
                    {bossActive ? "BOSS BATTLE ACTIVE!" : `GOAL: ${10 - kills} MORE KILLS`}
                  </span>
                </div>
              </div>
            </div>

            {/* Boss Health Bar Overlay (Top Middle) */}
            {bossActive && bossHp > 0 && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-none select-none">
                <div className="bg-slate-950/90 border border-red-500/40 p-3 rounded-2xl shadow-2xl flex flex-col items-center backdrop-blur-md">
                  <span className="text-xs font-mono font-extrabold text-red-400 tracking-wider mb-1 uppercase flex items-center gap-1.5">
                    👹 BEHOLDER DEMON LORD (BOSS)
                  </span>
                  
                  {/* Outer Bar */}
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    {/* Inner HP Fill */}
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-150 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                      style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">
                    HP: {bossHp} / {bossMaxHp}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. GAME OVER MODAL/VIEW */}
      {gameState === GameState.GAMEOVER && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/95 backdrop-blur-md p-6 select-none animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center flex flex-col items-center">
            <ShieldAlert size={56} className="text-red-500 animate-bounce mb-4" />

            <h1 className="text-3xl font-extrabold text-red-500 tracking-wider font-sans uppercase mb-1">
              GAME OVER
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              ฮีโร่พ่ายแพ้! พลังชีวิตหมดลงแล้ว (Hero was defeated!)
            </p>

            {/* Summary statistics */}
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 text-left space-y-2.5 font-mono text-xs text-slate-300">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">เวลาการต่อสู้ (Battle Time):</span>
                <span className="text-white font-bold">{formatTime(playTimeThisSession)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">กำจัดศัตรูได้ (Slain):</span>
                <span className="text-red-400 font-bold">{kills} ตัว</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-slate-500">เป้าหมายกำจัด (Goal Target):</span>
                <span className="text-slate-400">10 ตัว ({bossActive ? "บอสปรากฏตัวแล้ว!" : "ยังไม่พบบอส"})</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col w-full gap-2.5">
              <button
                onClick={handleStartGame}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold font-sans transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <RotateCcw size={16} />
                <span>PLAY AGAIN (สู้ใหม่อีกครั้ง)</span>
              </button>

              <button
                onClick={() => setGameState(GameState.TITLE)}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold font-sans transition flex items-center justify-center gap-2 border border-slate-800 cursor-pointer"
              >
                <Home size={16} />
                <span>RETURN TO TITLE (กลับหน้าหลัก)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ENDING SCREEN / DIALOGUE CUTSCENE */}
      {gameState === GameState.ENDING && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/95 p-6 select-none animate-fade-in">
          <EndingCutscene onFinish={handleEndingFinished} />
        </div>
      )}

      {/* 5. OPTIONS DIALOG */}
      {isOptionsOpen && (
        <OptionsDialog
          settings={settings}
          onSettingsUpdate={setSettings}
          stats={stats}
          onStatsReset={setStats}
          onClose={() => setIsOptionsOpen(false)}
        />
      )}
    </div>
  );
}

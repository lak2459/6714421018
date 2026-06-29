import React, { useState } from "react";
import { GameSettings, GameStats } from "../types";

interface TitleScreenProps {
  settings: GameSettings;
  stats: GameStats;
  onStartGame: () => void;
  onOpenOptions: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  settings,
  stats,
  onStartGame,
  onOpenOptions,
}) => {
  const [showAchievements, setShowAchievements] = useState(false);

  // Parse total play time to readable text
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${totalSeconds} วินาที (sec)`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins} นาที ${secs} วินาที (min ${secs}s)`;
  };

  const getFriendlyKeyName = (code: string) => {
    if (code.startsWith("Key")) return code.replace("Key", "");
    if (code.startsWith("Digit")) return code.replace("Digit", "");
    if (code.startsWith("Arrow")) return code.replace("Arrow", "");
    return code;
  };

  return (
    <div className="w-full min-h-screen bg-[#06060c] text-slate-100 flex flex-col items-center justify-center p-6 select-none relative overflow-y-auto">
      {/* Absolute star effects for background depth */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e113a_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      <div className="w-full max-w-xl flex flex-col items-center z-10 animate-fade-in py-8">
        {/* Game Logo with network fallback */}
        <div className="relative w-full flex justify-center mb-6">
          <img
            src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png"
            alt="Retro RPG Logo"
            onError={(e) => {
              // Procedural text fallback if image load fails
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const textFallback = document.createElement("div");
                textFallback.className = "text-center py-4 text-3xl font-extrabold font-sans text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 drop-shadow-[0_4px_12px_rgba(167,139,250,0.5)] tracking-wider";
                textFallback.innerText = "2.5D RETRO RPG ARENA";
                parent.appendChild(textFallback);
              }
            }}
            className="w-full max-w-md h-auto drop-shadow-[0_8px_24px_rgba(139,92,246,0.35)] object-contain transition-transform hover:scale-[1.02]"
          />
        </div>

        {/* Game Subtitle */}
        <p className="text-sm md:text-base text-violet-300/80 font-mono text-center mb-8 tracking-wider">
          ⚔️ CLASSIC 2.5D ACTION EXPERIENCE ⚔️
        </p>

        {/* Achievements / Stats HUD */}
        {showAchievements ? (
          <div className="w-full bg-slate-900/90 border border-violet-500/40 rounded-2xl p-5 mb-6 shadow-2xl animate-slide-up">
            <h3 className="text-md font-bold text-center text-amber-400 font-sans tracking-wide mb-4 uppercase">
              🏆 HERO ACHIEVEMENTS (ทำเนียบฮีโร่)
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm font-mono text-slate-300">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">เล่นทั้งหมด (Games Played)</span>
                <span className="text-white font-bold text-base">{stats.totalGamesPlayed} ครั้ง</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">ปราบจอมอสูร (Wins)</span>
                <span className="text-emerald-400 font-bold text-base">{stats.totalWins} ครั้ง</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">ศัตรูที่กำจัด (Slain)</span>
                <span className="text-red-400 font-bold text-base">{stats.totalEnemiesDefeated} ตัว</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">ยาเก็บสะสม (Potions Taken)</span>
                <span className="text-cyan-400 font-bold text-base">{stats.totalItemsCollected} ขวด</span>
              </div>
              <div className="col-span-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">เวลาเร็วที่สุดในการปราบบอส (Fastest Boss Kill)</span>
                <span className="text-amber-300 font-bold">
                  {stats.fastestBossKillTime > 0 ? formatTime(stats.fastestBossKillTime) : "ยังไม่เคยปราบสำเร็จ (None)"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowAchievements(false)}
              className="w-full py-1.5 mt-4 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg font-mono text-xs transition border border-slate-800"
            >
              ➔ BACK TO MENU
            </button>
          </div>
        ) : (
          /* Main menu options */
          <div className="w-full max-w-sm flex flex-col gap-3.5 mb-8">
            <button
              onClick={onStartGame}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold tracking-wide transition shadow-lg hover:shadow-violet-600/20 active:scale-[0.98] cursor-pointer"
            >
              🎮 START GAME (เริ่มสู้)
            </button>

            <button
              onClick={onOpenOptions}
              className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm transition active:scale-[0.98] cursor-pointer"
            >
              ⚙️ OPTIONS & CONTROLS (ปุ่มควบคุม)
            </button>

            <button
              onClick={() => setShowAchievements(true)}
              className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold text-sm transition active:scale-[0.98] cursor-pointer"
            >
              🏆 HERO ACHIEVEMENTS (สถิติรวม)
            </button>
          </div>
        )}

        {/* Gameplay Guide Grid */}
        <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs md:text-sm">
          <h4 className="font-bold text-violet-400 mb-2 font-sans flex items-center gap-1.5">
            📜 วิธีบังคับตัวละคร (How to Play)
          </h4>
          <div className="space-y-1.5 text-slate-400 font-mono">
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span>ขยับตัว (Move 8-Directions):</span>
              <span className="text-white">
                {getFriendlyKeyName(settings.keyUp)}
                {getFriendlyKeyName(settings.keyLeft)}
                {getFriendlyKeyName(settings.keyDown)}
                {getFriendlyKeyName(settings.keyRight)} / ARROW KEYS
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span>ต่อยโจมตี (Attack):</span>
              <span className="text-yellow-400 font-bold">กดปุ่ม {getFriendlyKeyName(settings.keyAttack)} (Hit Box เร็วขึ้น)</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span>ระเบิดพลังวงแหวน (Burst Skill):</span>
              <span className="text-violet-400 font-bold">กดปุ่ม {getFriendlyKeyName(settings.keySkill)} (พลังผลักศัตรู)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 mt-2 font-sans text-center">
              สุ่มเก็บ <span className="text-cyan-400">Potion</span> บนพื้นเพื่อเพิ่มเลือด (พลังจำกัด 5 ครั้ง)<br />
              กำจัดศัตรูครบ 10 ตัว จะเกิด <span className="text-red-400 font-bold">BOSS</span> ปราบแล้วเข้าประตูวาร์ปเพื่อจบเกม!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

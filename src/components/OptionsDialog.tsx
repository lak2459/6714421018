import React, { useState, useEffect } from "react";
import { GameSettings, GameStats } from "../types";
import { saveSettings, resetStats } from "../utils/storage";

interface OptionsDialogProps {
  settings: GameSettings;
  onSettingsUpdate: (settings: GameSettings) => void;
  stats: GameStats;
  onStatsReset: (reset: GameStats) => void;
  onClose: () => void;
}

export const OptionsDialog: React.FC<OptionsDialogProps> = ({
  settings,
  onSettingsUpdate,
  stats,
  onStatsReset,
  onClose,
}) => {
  const [activeRebindKey, setActiveRebindKey] = useState<keyof GameSettings | null>(null);

  // Rebinding listener
  useEffect(() => {
    if (!activeRebindKey) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ensure we do not map to vital browser override buttons like Escape or F12
      if (e.code === "Escape" || e.code === "F12") {
        setActiveRebindKey(null);
        return;
      }

      const updatedSettings = {
        ...settings,
        [activeRebindKey]: e.code,
      };

      onSettingsUpdate(updatedSettings);
      saveSettings(updatedSettings);
      setActiveRebindKey(null);
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [activeRebindKey, settings, onSettingsUpdate]);

  const handleClearStats = () => {
    if (confirm("ต้องการรีเซ็ตข้อมูลสถิติและการบันทึกทั้งหมดหรือไม่? (Are you sure you want to reset all play statistics?)")) {
      const reset = resetStats();
      onStatsReset(reset);
      alert("รีเซ็ตสถิติการเล่นสำเร็จแล้ว!");
    }
  };

  const getFriendlyKeyName = (code: string) => {
    if (code.startsWith("Key")) return code.replace("Key", "");
    if (code.startsWith("Digit")) return code.replace("Digit", "");
    if (code.startsWith("Arrow")) return code.replace("Arrow", "Arrow ");
    return code;
  };

  const keysToRebind: { label: string; key: keyof GameSettings }[] = [
    { label: "เดินขึ้น (Move Up)", key: "keyUp" },
    { label: "เดินลง (Move Down)", key: "keyDown" },
    { label: "เดินซ้าย (Move Left)", key: "keyLeft" },
    { label: "เดินขวา (Move Right)", key: "keyRight" },
    { label: "โจมตี/ต่อย (Attack - Punch)", key: "keyAttack" },
    { label: "ระเบิดพลังวงแหวน (Burst Skill)", key: "keySkill" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-violet-500/50 rounded-2xl p-6 shadow-2xl relative">
        {/* Title */}
        <h2 className="text-xl md:text-2xl font-bold font-sans text-center text-violet-400 mb-4 tracking-wider">
          ⚙️ OPTIONS & CONTROLS
        </h2>

        {/* Bindings list */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <p className="text-xs text-slate-400 text-center mb-3">
            คลิกที่ปุ่มเพื่อแก้ไขปุ่มบังคับของคุณ (Click a button to rebind controls)
          </p>

          {keysToRebind.map(({ label, key }) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-violet-500/30 transition"
            >
              <span className="text-sm font-sans text-slate-300 font-medium">{label}</span>

              <button
                onClick={() => setActiveRebindKey(key)}
                className={`min-w-28 px-4 py-1.5 rounded-md font-mono text-xs font-bold transition ${
                  activeRebindKey === key
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white"
                }`}
              >
                {activeRebindKey === key ? "PRESS KEY..." : getFriendlyKeyName(settings[key])}
              </button>
            </div>
          ))}

          {/* Tips for default arrow bindings */}
          <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/40 text-center text-[11px] font-mono text-slate-500">
            * ปุ่ม Arrow Keys บังคับทิศทางได้เป็นค่าหลักเสมอ
          </div>
        </div>

        {/* Stats and actions */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleClearStats}
            className="flex-1 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white font-mono text-xs font-bold transition"
          >
            🗑️ รีเซ็ตข้อมูลบันทึก (Reset Stats)
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-sans text-xs font-bold transition shadow-lg"
          >
            DONE (บันทึกเสร็จสิ้น)
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { DialogueLine } from "../types";

interface EndingCutsceneProps {
  onFinish: () => void;
}

export const EndingCutscene: React.FC<EndingCutsceneProps> = ({ onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [cutsceneComplete, setCutsceneComplete] = useState(false);
  const [npcWalkInPercent, setNpcWalkInPercent] = useState(0); // 0 to 1

  const dialogue: DialogueLine[] = [
    {
      speaker: "npc",
      text: "โอ้โห! ข้าไม่เชื่อสายตาตัวเองเลย! เจ้าล้มจอมอสูรตนนั้นได้จริงๆ!",
    },
    {
      speaker: "player",
      text: "มันไม่ใช่เรื่องง่ายเลย แต่ด้วยความมุ่งมั่น ข้าทำสำเร็จแล้ว!",
    },
    {
      speaker: "npc",
      text: "พลังดาบและระเบิดเวทย์วงแหวนของเจ้านั้นช่างทรงอานุภาพเหลือเกิน ทั่วทั้งดินแดนกำลังแซ่ซ้องสรรเสริญชื่อของเจ้า!",
    },
    {
      speaker: "player",
      text: "ข้าดีใจที่ปกป้องดินแดนนี้และช่วยเหลือผู้คนทุกคนได้",
    },
    {
      speaker: "npc",
      text: "เจ้าคือวีรบุรุษที่แท้จริงในตำนาน! ข้าขอมอบถ้วยรางวัลอันทรงเกียรตินี้ให้แก่เจ้า",
    },
    {
      speaker: "player",
      text: "ขอบคุณมาก ข้าจะใช้พลังนี้เพื่อพิทักษ์ความยุติธรรมตลอดไป",
    },
    {
      speaker: "npc",
      text: "จากนี้ไป ดินแดนของเราจะพบพานแต่ความสงบสุข... ขอบคุณเจ้าอีกครั้งนะ วีรบุรุษ!",
    },
    {
      speaker: "player",
      text: "ด้วยความยินดี! การผจญภัยครั้งนี้จะถูกจารึกไว้ในใจข้าตลอดไป!",
    },
  ];

  // Load and animate sprites on 2D canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    // Load images
    const playerImg = new Image();
    playerImg.crossOrigin = "anonymous";
    playerImg.src = "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png";

    const npcImg = new Image();
    npcImg.crossOrigin = "anonymous";
    npcImg.src = "https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png";

    // Setup positions
    const playerX = 150;
    let npcX = 600; // Walk in target is 400
    const finalNpcX = 350;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Draw beautiful green grass background with stone pathways
      ctx.fillStyle = "#1e3f20";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#162f18";
      for (let i = 0; i < canvas.width; i += 32) {
        ctx.fillRect(i, 0, 1, canvas.height);
      }
      for (let j = 0; j < canvas.height; j += 32) {
        ctx.fillRect(0, j, canvas.width, 1);
      }

      // Stone path in the center
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, 240, canvas.width, 40);
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 240, canvas.width, 3);
      ctx.fillRect(0, 277, canvas.width, 3);

      // Animate NPC walking in from the right edge
      if (npcX > finalNpcX) {
        npcX -= 1.8;
        const progress = (600 - npcX) / (600 - finalNpcX);
        setNpcWalkInPercent(progress);
      } else {
        setCutsceneComplete(true);
      }

      // Draw Player: Row index 0 (Idle), col index based on frame
      const playerFrameWidth = 256;
      const playerFrameHeight = 256;
      const playerCol = Math.floor(frame / 10) % 4;
      const playerRow = 0; // Idle

      ctx.save();
      // Face right
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 15;

      if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.drawImage(
          playerImg,
          playerCol * playerFrameWidth,
          playerRow * playerFrameHeight,
          playerFrameWidth,
          playerFrameHeight,
          playerX - 60,
          100,
          120,
          120
        );
      } else {
        // Fallback Player box
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(playerX - 25, 140, 50, 80);
        ctx.fillStyle = "#000";
        ctx.fillRect(playerX + 10, 155, 6, 6);
      }
      ctx.restore();

      // Draw NPC
      const npcCol = Math.floor(frame / 10) % 4;
      const npcRow = npcX > finalNpcX ? 1 : 0; // Row 1 is walk, Row 0 is Idle

      ctx.save();
      // Face left to face the player
      ctx.translate(npcX, 0);
      ctx.scale(-1, 1); // Flip horizontally so NPC looks left
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 15;

      if (npcImg.complete && npcImg.naturalWidth > 0) {
        ctx.drawImage(
          npcImg,
          npcCol * playerFrameWidth,
          npcRow * playerFrameHeight,
          playerFrameWidth,
          playerFrameHeight,
          -60, // center on flipped transform
          100,
          120,
          120
        );
      } else {
        // Fallback NPC box
        ctx.fillStyle = "#10b981";
        ctx.fillRect(-25, 140, 50, 80);
        ctx.fillStyle = "#000";
        ctx.fillRect(-15, 155, 6, 6);
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const currentLine = dialogue[currentDialogueIndex];

  const handleNext = () => {
    if (!cutsceneComplete) return; // wait for NPC to walk in
    if (currentDialogueIndex < dialogue.length - 1) {
      setCurrentDialogueIndex(currentDialogueIndex + 1);
    } else {
      onFinish();
    }
  };

  return (
    <div className="w-full max-w-2xl bg-slate-900 border border-violet-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col items-center">
      <h2 className="text-violet-400 font-bold text-center text-xl tracking-wide mb-3 font-sans">
        EPILOGUE: THE LAND OF PEACE
      </h2>

      {/* Cinematic Viewport Canvas */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={500}
          height={281}
          className="w-full h-full block select-none"
        />

        {/* Intro Walk In prompt */}
        {!cutsceneComplete && (
          <div className="absolute top-4 left-4 right-4 bg-slate-950/80 border border-slate-700 p-2 rounded text-center text-xs font-mono text-emerald-400">
            NPC กำลังเดินทางเข้ามาหาฮีโร่... (NPC is walking in...)
          </div>
        )}
      </div>

      {/* RPG Dialogue overlay */}
      <div className="w-full mt-5 bg-slate-950 border border-slate-800 rounded-xl p-5 relative flex flex-col">
        {/* Speaker Name label */}
        <div className="absolute -top-3 left-4 bg-violet-600 px-3 py-0.5 rounded text-white font-mono text-xs font-semibold uppercase tracking-wider shadow">
          {currentLine.speaker === "player" ? "HERO (PLAYER)" : "ELDEN (NPC)"}
        </div>

        {/* Dialogue text box */}
        <div className="min-h-16 flex items-center mt-2">
          <p
            className={`text-sm md:text-base leading-relaxed leading-6 ${
              currentLine.speaker === "player" ? "text-cyan-300 font-medium" : "text-emerald-300"
            }`}
          >
            "{currentLine.text}"
          </p>
        </div>

        {/* Dialogue index track & Next button */}
        <div className="flex items-center justify-between mt-4 border-t border-slate-900 pt-3">
          <span className="text-xs font-mono text-slate-500">
            Dialogue: {currentDialogueIndex + 1} / {dialogue.length}
          </span>

          <button
            onClick={handleNext}
            disabled={!cutsceneComplete}
            className={`px-5 py-1.5 rounded-lg font-mono text-xs font-bold transition shadow ${
              cutsceneComplete
                ? "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            }`}
          >
            {currentDialogueIndex === dialogue.length - 1 ? "FINISH (จบการคุย)" : "NEXT (คุยต่อ) ➔"}
          </button>
        </div>
      </div>
    </div>
  );
};

import * as THREE from "three";

/**
 * Loads a texture from a URL with crossOrigin anonymous.
 * If loading fails, it creates a high-quality procedural fallback texture using HTML Canvas.
 */
export function loadTextureWithFallback(
  url: string,
  drawFallback: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  width = 256,
  height = 256
): THREE.Texture {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  // Create canvas for fallback
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Create fallback texture
  const fallbackTexture = new THREE.CanvasTexture(canvas);
  fallbackTexture.colorSpace = THREE.SRGBColorSpace;
  fallbackTexture.minFilter = THREE.NearestFilter;
  fallbackTexture.magFilter = THREE.NearestFilter;

  // Attempt to load the real image
  loader.load(
    url,
    (loadedTexture) => {
      // Success! Update parameters and copy to fallbackTexture's image
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.minFilter = THREE.NearestFilter;
      loadedTexture.magFilter = THREE.NearestFilter;
      
      // Swap properties
      fallbackTexture.image = loadedTexture.image as any;
      fallbackTexture.needsUpdate = true;
      console.log(`Successfully loaded asset: ${url}`);
    },
    undefined,
    (err) => {
      console.warn(`Failed to load asset: ${url}, rendering procedural fallback. Error:`, err);
      if (ctx) {
        drawFallback(ctx, width, height);
        fallbackTexture.needsUpdate = true;
      }
    }
  );

  // Draw initial fallback immediately so there's no blank texture while loading
  if (ctx) {
    drawFallback(ctx, width, height);
    fallbackTexture.needsUpdate = true;
  }

  return fallbackTexture;
}

// Procedural helpers
export function drawProceduralGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Draw a lovely retro grass patch with tiled details
  ctx.fillStyle = "#1e3f20";
  ctx.fillRect(0, 0, w, h);

  // Add grid lines
  ctx.strokeStyle = "#162f18";
  ctx.lineWidth = 2;
  const tileSize = 32;
  for (let x = 0; x < w; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw little grass tufts
  ctx.fillStyle = "#2d5a30";
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    ctx.fillRect(rx, ry, 6, 2);
    ctx.fillRect(rx + 2, ry - 3, 2, 5);
  }

  // Draw little flowers/stones
  ctx.fillStyle = "#4a6b4c";
  for (let i = 0; i < 15; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    ctx.beginPath();
    ctx.arc(rx, ry, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawProceduralPlayer(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sprite sheet for player: 4 columns, 4 rows (each frame 256x256, total sheet 1024x1024)
  const frameW = 256;
  const frameH = 256;

  ctx.clearRect(0, 0, w, h);

  // Rows: 0 = Idle, 1 = Walk, 2 = Attack, 3 = Dance
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * frameW;
      const y = row * frameH;
      const cx = x + frameW / 2;
      const cy = y + frameH / 2;

      // Draw a cute retro adventurer (knight/wizard)
      // Base body color: Blue/Cyan
      const bodyColor = "#3b82f6";
      const helmetColor = "#94a3b8";
      const faceColor = "#fed7aa";
      const accentColor = "#ef4444";

      // Animation offsets
      let bounce = 0;
      let walkCycle = 0;
      let punchOut = 0;
      let spinAngle = 0;

      if (row === 0) { // Idle
        bounce = Math.sin((col / 4) * Math.PI * 2) * 5;
      } else if (row === 1) { // Walk
        bounce = Math.abs(Math.sin((col / 4) * Math.PI * 2)) * 8;
        walkCycle = Math.sin((col / 4) * Math.PI * 2) * 6;
      } else if (row === 2) { // Attack
        punchOut = col === 1 || col === 2 ? 15 : 0;
      } else if (row === 3) { // Dance
        bounce = Math.sin((col / 4) * Math.PI * 2) * 15;
        spinAngle = (col / 4) * Math.PI * 0.4;
      }

      ctx.save();
      ctx.translate(cx, cy);
      if (spinAngle !== 0) ctx.rotate(spinAngle);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 60, 35, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (Legs / Cloak)
      ctx.fillStyle = bodyColor;
      if (row === 1) { // walking legs
        ctx.fillRect(-15 + walkCycle, 15 - bounce, 10, 30);
        ctx.fillRect(5 - walkCycle, 15 - bounce, 10, 30);
      } else {
        ctx.fillRect(-15, 15 - bounce, 30, 35);
      }

      // Torso / Cloak
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, -10 - bounce, 32, 0, Math.PI, false);
      ctx.fill();
      ctx.fillRect(-32, -10 - bounce, 64, 35);

      // Face / Eyes
      ctx.fillStyle = faceColor;
      ctx.beginPath();
      ctx.arc(0, -30 - bounce, 20, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#000";
      ctx.fillRect(-8, -34 - bounce, 4, 6);
      ctx.fillRect(4, -34 - bounce, 4, 6);

      // Helmet / Hair
      ctx.fillStyle = helmetColor;
      ctx.beginPath();
      ctx.arc(0, -36 - bounce, 22, Math.PI, 0);
      ctx.fill();
      // Horn/Plume
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(0, -58 - bounce);
      ctx.lineTo(-12, -44 - bounce);
      ctx.lineTo(12, -44 - bounce);
      ctx.fill();

      // Arms / Shield / Sword (based on action)
      ctx.fillStyle = helmetColor;
      if (punchOut > 0) {
        // Attack punch forward (right side)
        ctx.fillRect(15, -15 - bounce, punchOut + 20, 10);
        // Yellow sword tip
        ctx.fillStyle = "#eab308";
        ctx.fillRect(15 + punchOut + 20, -20 - bounce, 15, 18);
      } else {
        // Shield
        ctx.fillStyle = "#64748b";
        ctx.fillRect(-28, -5 - bounce, 10, 20);
        // Sword resting
        ctx.fillStyle = "#eab308";
        ctx.fillRect(18, -15 - bounce, 8, 25);
      }

      ctx.restore();
    }
  }
}

export function drawProceduralEnemy(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sprite sheet for enemy: 4 columns, 2 rows (each frame 256x256, total sheet 1024x512)
  const frameW = 256;
  const frameH = 256;

  ctx.clearRect(0, 0, w, h);

  // Rows: 0 = Idle, 1 = Walk
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * frameW;
      const y = row * frameH;
      const cx = x + frameW / 2;
      const cy = y + frameH / 2;

      // Draw a cute red orc / goblin
      const bodyColor = "#ef4444";
      const earColor = "#dc2626";
      const eyeColor = "#facc15";

      let bounce = 0;
      let limbOffset = 0;

      if (row === 0) { // Idle
        bounce = Math.sin((col / 4) * Math.PI * 2) * 4;
      } else { // Walk
        bounce = Math.abs(Math.sin((col / 4) * Math.PI * 2)) * 7;
        limbOffset = Math.sin((col / 4) * Math.PI * 2) * 8;
      }

      ctx.save();
      ctx.translate(cx, cy);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 50, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Horns / Ears
      ctx.fillStyle = earColor;
      ctx.beginPath();
      ctx.moveTo(-25, -25 - bounce);
      ctx.lineTo(-40, -45 - bounce);
      ctx.lineTo(-15, -35 - bounce);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(25, -25 - bounce);
      ctx.lineTo(40, -45 - bounce);
      ctx.lineTo(15, -35 - bounce);
      ctx.fill();

      // Legs
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(-12 + limbOffset, 15 - bounce, 8, 20);
      ctx.fillRect(4 - limbOffset, 15 - bounce, 8, 20);

      // Body (round blob)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, -5 - bounce, 28, 0, Math.PI * 2);
      ctx.fill();

      // Angry Eyes
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(-10, -12 - bounce, 6, 0, Math.PI * 2);
      ctx.arc(10, -12 - bounce, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-9, -12 - bounce, 2, 0, Math.PI * 2);
      ctx.arc(11, -12 - bounce, 2, 0, Math.PI * 2);
      ctx.fill();

      // Angry brows
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, -18 - bounce);
      ctx.lineTo(-4, -13 - bounce);
      ctx.moveTo(16, -18 - bounce);
      ctx.lineTo(4, -13 - bounce);
      ctx.stroke();

      // Fangs
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(-10, 4 - bounce);
      ctx.lineTo(-7, 12 - bounce);
      ctx.lineTo(-4, 4 - bounce);
      ctx.moveTo(10, 4 - bounce);
      ctx.lineTo(7, 12 - bounce);
      ctx.lineTo(4, 4 - bounce);
      ctx.fill();

      ctx.restore();
    }
  }
}

export function drawProceduralBoss(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sprite sheet for boss: 4 columns, 2 rows (each frame 256x256, total sheet 1024x512)
  const frameW = 256;
  const frameH = 256;

  ctx.clearRect(0, 0, w, h);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * frameW;
      const y = row * frameH;
      const cx = x + frameW / 2;
      const cy = y + frameH / 2;

      // Draw a giant purple flying demon with wings
      const mainColor = "#7c3aed";
      const wingColor = "#4c1d95";
      const bellyColor = "#c084fc";
      const hornColor = "#f59e0b";

      let floatOffset = Math.sin((col / 4) * Math.PI * 2) * 12;
      let wingFlap = Math.sin((col / 4) * Math.PI * 2) * 0.4;

      ctx.save();
      ctx.translate(cx, cy + floatOffset);

      // Ground Shadow (smaller based on floating height)
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.ellipse(0, 65 - floatOffset, 45, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings (Left & Right)
      ctx.fillStyle = wingColor;
      ctx.save();
      ctx.translate(-25, -15);
      ctx.rotate(-wingFlap);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-65, -35);
      ctx.lineTo(-45, 25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(25, -15);
      ctx.rotate(wingFlap);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(65, -35);
      ctx.lineTo(45, 25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Horns
      ctx.fillStyle = hornColor;
      ctx.beginPath();
      ctx.moveTo(-30, -35);
      ctx.lineTo(-50, -65);
      ctx.lineTo(-10, -45);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(30, -35);
      ctx.lineTo(50, -65);
      ctx.lineTo(10, -45);
      ctx.fill();

      // Tail
      ctx.strokeStyle = wingColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.quadraticCurveTo(30, 60, 15, 75);
      ctx.stroke();
      // Arrow head of tail
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(15, 75);
      ctx.lineTo(5, 75);
      ctx.lineTo(15, 85);
      ctx.lineTo(25, 75);
      ctx.fill();

      // Main body
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(0, -10, 42, 0, Math.PI * 2);
      ctx.fill();

      // Belly
      ctx.fillStyle = bellyColor;
      ctx.beginPath();
      ctx.arc(0, 10, 26, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Eyes
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(-15, -18, 9, 0, Math.PI * 2);
      ctx.arc(15, -18, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.fillRect(-16, -19, 4, 4);
      ctx.fillRect(14, -19, 4, 4);

      // Sharp Teeth / Mouth
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(-15, 2, 30, 4);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(-12, 2);
      ctx.lineTo(-9, 8);
      ctx.lineTo(-6, 2);
      ctx.moveTo(12, 2);
      ctx.lineTo(9, 8);
      ctx.lineTo(6, 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

export function drawProceduralPotion(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 40, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw bottle cork
  ctx.fillStyle = "#d97706";
  ctx.fillRect(-8, -35, 16, 8);

  // Draw bottle neck
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(-12, -27, 24, 15);

  // Draw glass bulb
  const gradient = ctx.createRadialGradient(-5, 0, 5, 0, 0, 35);
  gradient.addColorStop(0, "#f87171"); // bright red potion
  gradient.addColorStop(0.7, "#dc2626"); // darker red
  gradient.addColorStop(1, "rgba(226, 232, 240, 0.8)"); // glass rim

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 10, 32, 0, Math.PI * 2);
  ctx.fill();

  // Glass shine/highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(-14, -5, 8, 0, Math.PI * 2);
  ctx.fill();

  // Heart logo on potion
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-6, 6, -10, 10, -10, 14);
  ctx.bezierCurveTo(-10, 18, -6, 22, 0, 25);
  ctx.bezierCurveTo(6, 22, 10, 18, 10, 14);
  ctx.bezierCurveTo(10, 10, 6, 6, 0, 12);
  ctx.fill();

  ctx.restore();
}

export function drawProceduralNPC(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sprite sheet for NPC: 4 columns, 2 rows (each frame 256x256, total sheet 1024x512)
  const frameW = 256;
  const frameH = 256;

  ctx.clearRect(0, 0, w, h);

  // Friendly green robed wizard/monk
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * frameW;
      const y = row * frameH;
      const cx = x + frameW / 2;
      const cy = y + frameH / 2;

      const bodyColor = "#10b981"; // green
      const hoodColor = "#059669";
      const beardColor = "#f1f5f9"; // white beard

      let bounce = Math.sin((col / 4) * Math.PI * 2) * 5;
      let walkCycle = row === 1 ? Math.sin((col / 4) * Math.PI * 2) * 6 : 0;

      ctx.save();
      ctx.translate(cx, cy);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.ellipse(0, 52, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Robe
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-18, 12 - bounce, 36, 32);

      // Beard
      ctx.fillStyle = beardColor;
      ctx.beginPath();
      ctx.moveTo(-16, -10 - bounce);
      ctx.lineTo(16, -10 - bounce);
      ctx.lineTo(0, 20 - bounce);
      ctx.closePath();
      ctx.fill();

      // Face
      ctx.fillStyle = "#fbcfe8";
      ctx.beginPath();
      ctx.arc(0, -16 - bounce, 16, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (friendly curves)
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-6, -18 - bounce, 3, Math.PI, 0);
      ctx.arc(6, -18 - bounce, 3, Math.PI, 0);
      ctx.stroke();

      // Green Hood
      ctx.fillStyle = hoodColor;
      ctx.beginPath();
      ctx.arc(0, -22 - bounce, 18, Math.PI, 0);
      ctx.fill();

      // Pointy wizard hat tip!
      ctx.beginPath();
      ctx.moveTo(-18, -22 - bounce);
      ctx.lineTo(0, -52 - bounce);
      ctx.lineTo(18, -22 - bounce);
      ctx.fill();

      ctx.restore();
    }
  }
}

export function drawProceduralLogo(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // A beautiful logo screen fallback
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#1e1b4b");
  grad.addColorStop(0.5, "#311042");
  grad.addColorStop(1, "#180828");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Logo text
  ctx.shadowColor = "#f43f5e";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("2.5D RETRO ARENA", w / 2, h / 2 - 10);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#a78bfa";
  ctx.font = "italic 11px 'JetBrains Mono', monospace";
  ctx.fillText("PROTOTYPE VER 1.0", w / 2, h / 2 + 20);
}

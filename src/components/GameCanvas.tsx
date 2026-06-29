import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GameSettings, GameStats } from "../types";
import {
  loadTextureWithFallback,
  drawProceduralGround,
  drawProceduralPlayer,
  drawProceduralEnemy,
  drawProceduralBoss,
  drawProceduralPotion,
} from "./TextureHelper";

interface GameCanvasProps {
  settings: GameSettings;
  stats: GameStats;
  onStatsUpdate: (updated: Partial<GameStats>) => void;
  onHpChange: (hp: number) => void;
  onKillsChange: (kills: number) => void;
  onBossHpChange: (hp: number, max: number) => void;
  onBossActiveChange: (active: boolean) => void;
  onGameOver: () => void;
  onVictory: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  settings,
  stats,
  onStatsUpdate,
  onHpChange,
  onKillsChange,
  onBossHpChange,
  onBossActiveChange,
  onGameOver,
  onVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stats / Cooldown overlays
  const [skillCooldown, setSkillCooldown] = useState(0); // 0 to 1 ratio

  // Use refs to pass values into the Three.js loop without re-triggering useEffect
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!mountRef.current || !canvasRef.current) return;

    // --- GAME CONSTANTS ---
    const MAP_SIZE = 50;
    const MAX_HP = 5;
    const BOSS_REQUIRED_KILLS = 10;
    const PLAYER_SPEED = 7;
    const ENEMY_SPEED = 2.8;
    const POTION_HEAL = 1;

    // --- STATE VARIABLES ---
    let playerHp = MAX_HP;
    let normalKills = 0;
    let isGameOver = false;
    let isVic = false;

    // Timer stats
    const startTime = Date.now();
    let totalItemsCollectedThisGame = 0;

    // Key input states
    const activeKeys: { [key: string]: boolean } = {};

    // Cooldowns
    let skillTimer = 0; // cooldown in seconds
    const SKILL_COOLDOWN_TIME = 6; // 6 seconds
    let invulnerabilityTimer = 0; // invulnerable after hit

    // Player stats
    const playerPos = new THREE.Vector3(0, 0.75, 0);
    const playerFacing = new THREE.Vector2(1, 0); // facing right by default
    let isMoving = false;
    let isPunching = false;
    let punchTimer = 0;
    const PUNCH_DURATION = 0.35; // seconds
    let punchAnimSpeedup = false;

    // Ring Skill states
    let ringSkillActive = false;
    let ringSkillRadius = 0;
    const RING_SKILL_MAX_RADIUS = 6.0;
    const RING_SKILL_DURATION = 0.6; // seconds
    let ringSkillTimer = 0;

    // Entities Arrays
    interface EnemyEntity {
      id: number;
      sprite: THREE.Sprite;
      texture: THREE.Texture;
      pos: THREE.Vector3;
      hp: number;
      maxHp: number;
      speed: number;
      state: "WALK" | "KNOCKBACK" | "FLYAWAY";
      knockbackDir: THREE.Vector3;
      knockbackTimer: number;
      flyAwayTimer: number;
      animTimer: number;
      animFrame: number;
      flashWhiteTimer: number;
      attackCooldown: number;
    }

    interface PotionEntity {
      sprite: THREE.Sprite;
      pos: THREE.Vector3;
    }

    interface FireballEntity {
      mesh: THREE.Mesh;
      pos: THREE.Vector3;
      targetPos: THREE.Vector3;
      velocity: THREE.Vector3;
      life: number;
    }

    interface WarningAreaEntity {
      mesh: THREE.Mesh;
      pos: THREE.Vector3;
      timer: number;
      maxTime: number;
    }

    interface ParticleEntity {
      mesh: THREE.Points;
      positions: Float32Array;
      velocities: number[];
      life: number;
      maxLife: number;
      color: THREE.Color;
    }

    let enemies: EnemyEntity[] = [];
    let potions: PotionEntity[] = [];
    let fireballs: FireballEntity[] = [];
    let warnings: WarningAreaEntity[] = [];
    let particles: ParticleEntity[] = [];
    let enemyIdCounter = 0;

    // Boss State
    let bossActive = false;
    let bossHp = 10;
    const BOSS_MAX_HP = 10;
    let bossPos = new THREE.Vector3(0, 1.8, -15);
    let bossSprite: THREE.Sprite | null = null;
    let bossTexture: THREE.Texture | null = null;
    let bossState: "IDLE" | "DASH" | "SQUASH" | "FIRE" = "IDLE";
    let bossTimer = 0;
    let bossPatternTimer = 0;
    let bossAnimFrame = 0;
    let bossAnimTimer = 0;
    let bossFlashTimer = 0;
    let bossScaleX = 4;
    let bossScaleY = 4;
    let bossDashTarget = new THREE.Vector3(0, 1.8, -15);

    // Warp Gate State
    let warpGateActive = false;
    let warpGateMesh: THREE.Mesh | null = null;

    // --- THREEJS SETUP ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#09090c", 0.015);

    const camera = new THREE.PerspectiveCamera(
      45,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor("#09090c");

    // Lights
    const ambientLight = new THREE.AmbientLight("#ffffff", 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#a78bfa", 0.4);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // --- TEXTURES LOADING ---
    const groundTex = loadTextureWithFallback(
      "https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png",
      drawProceduralGround,
      256,
      256
    );
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(20, 20); // Small tiling as requested!

    const playerBaseTex = loadTextureWithFallback(
      "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png",
      drawProceduralPlayer,
      1024,
      1024
    );

    const enemyBaseTex = loadTextureWithFallback(
      "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png",
      drawProceduralEnemy,
      1024,
      512
    );

    const bossBaseTex = loadTextureWithFallback(
      "https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png",
      drawProceduralBoss,
      1024,
      512
    );

    const potionTex = loadTextureWithFallback(
      "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png",
      drawProceduralPotion,
      256,
      256
    );

    // --- WORLD OBJECTS ---

    // 1. Ground Plane
    const groundGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTex,
      side: THREE.DoubleSide,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    scene.add(groundMesh);

    // Ground boundary fence helper lines (so player can see edge)
    const boundaryGeo = new THREE.RingGeometry(MAP_SIZE / 2, (MAP_SIZE / 2) + 0.5, 4);
    const boundaryMat = new THREE.MeshBasicMaterial({ color: "#ef4444", transparent: true, opacity: 0.15 });
    const boundaryMesh = new THREE.Mesh(boundaryGeo, boundaryMat);
    boundaryMesh.rotation.x = -Math.PI / 2;
    boundaryMesh.position.y = 0.01;
    scene.add(boundaryMesh);

    // 2. Player Sprite
    const playerTex = playerBaseTex.clone();
    playerTex.repeat.set(1 / 4, 1 / 4);
    playerTex.needsUpdate = true;

    const playerMat = new THREE.SpriteMaterial({
      map: playerTex,
      transparent: true,
    });
    const playerSprite = new THREE.Sprite(playerMat);
    playerSprite.scale.set(1.5, 1.5, 1);
    playerSprite.position.copy(playerPos);
    scene.add(playerSprite);

    // 3. Shockwave Ring Skill mesh
    const ringGeo = new THREE.RingGeometry(0, 1, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: "#a78bfa",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.05;
    scene.add(ringMesh);

    // --- GAME FUNCTIONS ---

    // Spawn Particles
    const spawnExplosion = (pos: THREE.Vector3, colorHex: string, count = 12) => {
      const pColor = new THREE.Color(colorHex);
      const geom = new THREE.BufferGeometry();
      const posArray = new Float32Array(count * 3);
      const vels: number[] = [];

      for (let i = 0; i < count; i++) {
        posArray[i * 3] = pos.x;
        posArray[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.5;
        posArray[i * 3 + 2] = pos.z;

        // random velocity direction
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        vels.push(Math.cos(angle) * speed, (Math.random() * 6) + 2, Math.sin(angle) * speed);
      }

      geom.setAttribute("position", new THREE.BufferAttribute(posArray, 3));

      const mat = new THREE.PointsMaterial({
        color: pColor,
        size: 0.28,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });

      const pSystem = new THREE.Points(geom, mat);
      scene.add(pSystem);

      particles.push({
        mesh: pSystem,
        positions: posArray,
        velocities: vels,
        life: 0,
        maxLife: 0.5, // 0.5 seconds
        color: pColor,
      });
    };

    // Spawn Potions
    const spawnPotion = (x: number, z: number) => {
      const mat = new THREE.SpriteMaterial({ map: potionTex, transparent: true });
      const pSprite = new THREE.Sprite(mat);
      pSprite.scale.set(1.1, 1.1, 1);
      pSprite.position.set(x, 0.5, z);
      scene.add(pSprite);
      potions.push({ sprite: pSprite, pos: pSprite.position });
    };

    // Initial Spawns of Potions
    for (let i = 0; i < 4; i++) {
      spawnPotion(
        (Math.random() - 0.5) * (MAP_SIZE - 10),
        (Math.random() - 0.5) * (MAP_SIZE - 10)
      );
    }

    // Spawn Enemies
    const spawnEnemy = () => {
      if (isGameOver || isVic || bossActive) return;

      // Spawn from perimeter of camera view
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 7;
      const ex = playerPos.x + Math.cos(angle) * dist;
      const ez = playerPos.z + Math.sin(angle) * dist;

      // Bound to map size
      const boundX = Math.max(-MAP_SIZE / 2 + 2, Math.min(MAP_SIZE / 2 - 2, ex));
      const boundZ = Math.max(-MAP_SIZE / 2 + 2, Math.min(MAP_SIZE / 2 - 2, ez));

      const eTex = enemyBaseTex.clone();
      eTex.repeat.set(1 / 4, 1 / 2);
      eTex.needsUpdate = true;

      const eMat = new THREE.SpriteMaterial({ map: eTex, transparent: true });
      const eSprite = new THREE.Sprite(eMat);
      eSprite.scale.set(1.4, 1.4, 1);
      eSprite.position.set(boundX, 0.7, boundZ);
      scene.add(eSprite);

      enemies.push({
        id: enemyIdCounter++,
        sprite: eSprite,
        texture: eTex,
        pos: eSprite.position,
        hp: 2,
        maxHp: 2,
        speed: ENEMY_SPEED + (Math.random() - 0.5) * 0.5,
        state: "WALK",
        knockbackDir: new THREE.Vector3(),
        knockbackTimer: 0,
        flyAwayTimer: 0,
        animTimer: 0,
        animFrame: 0,
        flashWhiteTimer: 0,
        attackCooldown: 0,
      });
    };

    // Spawn initial wave of enemies
    for (let i = 0; i < 3; i++) {
      setTimeout(spawnEnemy, i * 400);
    }

    // Spawn Enemy loop (every 1-3 seconds)
    let enemySpawnTimer = 0;

    // Boss Activation
    const activateBoss = () => {
      bossActive = true;
      onBossActiveChange(true);
      onBossHpChange(bossHp, BOSS_MAX_HP);

      // Remove current enemies
      enemies.forEach((e) => {
        scene.remove(e.sprite);
      });
      enemies = [];

      // Load boss sprite
      bossTexture = bossBaseTex.clone();
      bossTexture.repeat.set(1 / 4, 1 / 2);
      bossTexture.needsUpdate = true;

      const bossMat = new THREE.SpriteMaterial({ map: bossTexture, transparent: true });
      bossSprite = new THREE.Sprite(bossMat);
      bossSprite.scale.set(4, 4, 1);
      bossPos.set(playerPos.x, 2.0, playerPos.z - 12); // Position relative to player
      bossSprite.position.copy(bossPos);
      scene.add(bossSprite);

      spawnExplosion(bossPos, "#a78bfa", 35);
    };

    // Keyboard controls listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys[e.code] = true;

      const currentSettings = settingsRef.current;

      // Punch Key Press (P)
      if (e.code === currentSettings.keyAttack) {
        if (!isPunching && !isGameOver && !isVic) {
          isPunching = true;
          punchTimer = PUNCH_DURATION;
          punchAnimSpeedup = true; // Speed up animation as requested!

          // Spark particle at fist range
          const fistOffset = new THREE.Vector3(playerFacing.x, 0, playerFacing.y).normalize().multiplyScalar(1.2);
          const punchPos = playerPos.clone().add(fistOffset);
          spawnExplosion(punchPos, "#eab308", 4);

          // Attack calculation
          checkAttackHit();
        }
      }

      // Skill Key Press (O)
      if (e.code === currentSettings.keySkill) {
        if (skillTimer <= 0 && !isGameOver && !isVic) {
          triggerShockwaveSkill();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Attack punch calculation
    const checkAttackHit = () => {
      // Hit hitbox is a cylinder of radius 2.2 in front of player
      const dir = new THREE.Vector3(playerFacing.x, 0, playerFacing.y).normalize();
      const hitCenter = playerPos.clone().add(dir.multiplyScalar(1.2));

      // 1. Hit normal enemies
      enemies.forEach((enemy) => {
        if (enemy.state === "FLYAWAY") return;

        const dist = hitCenter.distanceTo(enemy.pos);
        if (dist <= 2.2) {
          damageEnemy(enemy, dir);
        }
      });

      // 2. Hit Boss
      if (bossActive && bossSprite && bossHp > 0) {
        const dist = hitCenter.distanceTo(bossPos);
        if (dist <= 3.2) {
          damageBoss(1);
        }
      }
    };

    // Damage enemy logic
    const damageEnemy = (enemy: EnemyEntity, dir: THREE.Vector3) => {
      enemy.hp -= 1;
      spawnExplosion(enemy.pos, "#ffffff", 8);

      if (enemy.hp === 1) {
        // First hit: Knock back backwards from direction of player's attack
        enemy.state = "KNOCKBACK";
        enemy.knockbackTimer = 0.25; // 0.25 seconds stun
        enemy.knockbackDir.copy(dir).normalize().multiplyScalar(12); // Speed of knockback
        enemy.flashWhiteTimer = 0.25;
      } else if (enemy.hp <= 0) {
        // Second hit: Flash white rapidly and fly out of screen
        enemy.state = "FLYAWAY";
        enemy.flyAwayTimer = 1.0; // 1 second fly out animation
        enemy.flashWhiteTimer = 1.0;
        enemy.knockbackDir.copy(dir).normalize().multiplyScalar(10);
        enemy.knockbackDir.y = 15; // Shoot high in sky

        // Defeat increments
        normalKills += 1;
        onKillsChange(normalKills);
        onStatsUpdate({ totalEnemiesDefeated: stats.totalEnemiesDefeated + 1 });

        // Trigger boss activation if target met
        if (normalKills === BOSS_REQUIRED_KILLS && !bossActive) {
          activateBoss();
        }

        // Spawn a replacement enemy if boss not active
        if (!bossActive) {
          setTimeout(spawnEnemy, 1500);
        }
      }
    };

    // Damage boss logic
    const damageBoss = (damage: number) => {
      bossHp = Math.max(0, bossHp - damage);
      bossFlashTimer = 0.3;
      onBossHpChange(bossHp, BOSS_MAX_HP);

      spawnExplosion(bossPos, "#ef4444", 15);

      if (bossHp <= 0) {
        // Destroy boss, spawn warp gate
        spawnExplosion(bossPos, "#a78bfa", 40);
        scene.remove(bossSprite!);
        bossSprite = null;

        // Save stat
        const durationSec = Math.floor((Date.now() - startTime) / 1000);
        const record = stats.fastestBossKillTime;
        const newRecord = record === 0 ? durationSec : Math.min(record, durationSec);

        onStatsUpdate({
          totalWins: stats.totalWins + 1,
          fastestBossKillTime: newRecord,
        });

        // Spawn Warp Gate
        spawnWarpGate(bossPos.x, bossPos.z);
      }
    };

    // Trigger Ring Skill (O)
    const triggerShockwaveSkill = () => {
      skillTimer = SKILL_COOLDOWN_TIME;
      ringSkillActive = true;
      ringSkillRadius = 0;
      ringSkillTimer = RING_SKILL_DURATION;

      ringMesh.position.copy(playerPos);
      ringMesh.position.y = 0.05;
      ringMat.opacity = 0.95;

      // Shockwave particles
      spawnExplosion(playerPos, "#a78bfa", 25);
    };

    // Spawn Warp gate
    const spawnWarpGate = (x: number, z: number) => {
      warpGateActive = true;

      const portalGeo = new THREE.TorusGeometry(1.5, 0.2, 8, 32);
      const portalMat = new THREE.MeshBasicMaterial({
        color: "#10b981",
        wireframe: true,
      });
      warpGateMesh = new THREE.Mesh(portalGeo, portalMat);
      warpGateMesh.position.set(x, 1.8, z);
      scene.add(warpGateMesh);

      // Swirling entry circle underneath
      const circleGeo = new THREE.RingGeometry(0, 1.8, 32);
      const circleMat = new THREE.MeshBasicMaterial({
        color: "#047857",
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const circleMesh = new THREE.Mesh(circleGeo, circleMat);
      circleMesh.rotation.x = -Math.PI / 2;
      circleMesh.position.y = 0.05;
      warpGateMesh.add(circleMesh);
    };

    // --- MAIN GAME LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
      if (isGameOver || isVic) return;

      requestAnimationFrame(animate);

      const delta = clock.getDelta();

      // Handle Game Timers
      if (skillTimer > 0) {
        skillTimer = Math.max(0, skillTimer - delta);
        setSkillCooldown(skillTimer / SKILL_COOLDOWN_TIME);
      } else {
        setSkillCooldown(0);
      }

      if (invulnerabilityTimer > 0) {
        invulnerabilityTimer = Math.max(0, invulnerabilityTimer - delta);
        // Toggle player visibility to flash
        playerSprite.visible = Math.floor(invulnerabilityTimer * 12) % 2 === 0;
      } else {
        playerSprite.visible = true;
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += delta;

        if (p.life >= p.maxLife) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        } else {
          // Update positions by velocities
          const posAttr = p.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;

          for (let j = 0; j < posAttr.count; j++) {
            // Apply gravity to Y
            p.velocities[j * 3 + 1] -= 9.8 * delta;

            arr[j * 3] += p.velocities[j * 3] * delta;
            arr[j * 3 + 1] += p.velocities[j * 3 + 1] * delta;
            arr[j * 3 + 2] += p.velocities[j * 3 + 2] * delta;
          }
          posAttr.needsUpdate = true;

          // Fade out
          (p.mesh.material as THREE.PointsMaterial).opacity = 1.0 - p.life / p.maxLife;
        }
      }

      // --- PLAYER PHYSICS & MOVEMENT ---
      const currentSettings = settingsRef.current;
      let moveX = 0;
      let moveZ = 0;

      if (activeKeys[currentSettings.keyUp] || activeKeys["ArrowUp"]) moveZ -= 1;
      if (activeKeys[currentSettings.keyDown] || activeKeys["ArrowDown"]) moveZ += 1;
      if (activeKeys[currentSettings.keyLeft] || activeKeys["ArrowLeft"]) moveX -= 1;
      if (activeKeys[currentSettings.keyRight] || activeKeys["ArrowRight"]) moveX += 1;

      isMoving = moveX !== 0 || moveZ !== 0;

      if (isMoving && !isPunching) {
        const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize();
        playerPos.add(moveVec.multiplyScalar(PLAYER_SPEED * delta));

        // Update facing vector
        playerFacing.set(moveVec.x, moveVec.z);

        // Clamp inside map boundaries
        playerPos.x = Math.max(-MAP_SIZE / 2 + 1, Math.min(MAP_SIZE / 2 - 1, playerPos.x));
        playerPos.z = Math.max(-MAP_SIZE / 2 + 1, Math.min(MAP_SIZE / 2 - 1, playerPos.z));

        playerSprite.position.copy(playerPos);
      }

      // Flip Sprite horizontally based on facing direction
      if (playerFacing.x < 0) {
        playerSprite.scale.x = -1.5; // Flip left
      } else if (playerFacing.x > 0) {
        playerSprite.scale.x = 1.5; // Normal right
      }

      // --- PUNCH MECHANIC ANIMATION TIMER ---
      if (isPunching) {
        punchTimer -= delta;
        if (punchTimer <= 0) {
          isPunching = false;
        }
      }

      // --- EXPANDING RING SKILL ANIMATION ---
      if (ringSkillActive) {
        ringSkillTimer -= delta;
        const progress = 1.0 - ringSkillTimer / RING_SKILL_DURATION;
        ringSkillRadius = progress * RING_SKILL_MAX_RADIUS;

        ringMesh.scale.set(ringSkillRadius, ringSkillRadius, 1);
        ringMesh.position.copy(playerPos);
        ringMesh.position.y = 0.05;
        (ringMesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress) * 0.9;

        // Hit scan enemies within ring current radius
        enemies.forEach((enemy) => {
          if (enemy.state === "FLYAWAY") return;
          const dist = playerPos.distanceTo(enemy.pos);
          if (dist <= ringSkillRadius && dist >= ringSkillRadius - 1.5) {
            // Push away direction
            const pushDir = enemy.pos.clone().sub(playerPos).setY(0).normalize();
            damageEnemy(enemy, pushDir.multiplyScalar(1.5));
          }
        });

        // Damage boss if hit
        if (bossActive && bossSprite) {
          const dist = playerPos.distanceTo(bossPos);
          if (dist <= ringSkillRadius && dist >= ringSkillRadius - 2.0) {
            damageBoss(2); // Skill deals double damage!
          }
        }

        if (ringSkillTimer <= 0) {
          ringSkillActive = false;
          (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }

      // --- CAMERA TRACKING ---
      camera.position.set(playerPos.x, playerPos.y + 11, playerPos.z + 10);
      camera.lookAt(playerPos.x, playerPos.y, playerPos.z);

      // --- ANIMATION FRAME SELECTOR ---
      // Row 0 = Idle, 1 = Walk, 2 = Attack, 3 = Dance
      let currentRow = 0;
      let animFrameCount = 4;
      let animSpeed = 0.15; // Time in seconds per frame

      if (isPunching) {
        currentRow = 2; // Row 3 in atlas (0-indexed 2)
        animSpeed = punchAnimSpeedup ? 0.06 : 0.12; // Animate faster!
      } else if (isMoving) {
        currentRow = 1; // Row 2 in atlas (0-indexed 1)
        animSpeed = 0.11;
      } else {
        currentRow = 0; // Idle
        animSpeed = 0.18;
      }

      // Update texture coordinates
      const timeMs = Date.now();
      const frameIndex = Math.floor(timeMs / (animSpeed * 1000)) % animFrameCount;

      playerTex.offset.set(frameIndex / 4, (4 - 1 - currentRow) / 4);

      // --- ENEMIES SYSTEM UPDATE ---
      enemySpawnTimer += delta;
      if (enemySpawnTimer >= (1.5 + Math.random() * 1.5)) {
        spawnEnemy();
        enemySpawnTimer = 0;
      }

      enemies.forEach((enemy, index) => {
        // Flash White update
        if (enemy.flashWhiteTimer > 0) {
          enemy.flashWhiteTimer -= delta;
          if (Math.floor(enemy.flashWhiteTimer * 15) % 2 === 0) {
            (enemy.sprite.material as THREE.SpriteMaterial).color.set("#ff8888"); // red tint for hit
          } else {
            (enemy.sprite.material as THREE.SpriteMaterial).color.set("#ffffff");
          }
        } else {
          (enemy.sprite.material as THREE.SpriteMaterial).color.set("#ffffff");
        }

        // Handle states
        if (enemy.state === "FLYAWAY") {
          // Knockback / Flying away
          enemy.pos.add(enemy.knockbackDir.clone().multiplyScalar(delta));
          // Subtract gravity from Y
          enemy.knockbackDir.y -= 25 * delta;

          // Rotation/Spin representation
          enemy.sprite.material.rotation += 10 * delta;

          // Scale down
          const progress = Math.max(0, enemy.flyAwayTimer);
          enemy.sprite.scale.set(progress * 1.4, progress * 1.4, 1);

          enemy.flyAwayTimer -= delta;
          if (enemy.flyAwayTimer <= 0) {
            scene.remove(enemy.sprite);
            enemies.splice(index, 1);
          }
        } else if (enemy.state === "KNOCKBACK") {
          enemy.pos.add(enemy.knockbackDir.clone().multiplyScalar(delta));
          // Apply friction
          enemy.knockbackDir.multiplyScalar(0.85);

          enemy.knockbackTimer -= delta;
          if (enemy.knockbackTimer <= 0) {
            enemy.state = "WALK";
          }
        } else {
          // State: WALK
          // Move towards player
          const toPlayer = playerPos.clone().sub(enemy.pos).setY(0);
          const dist = toPlayer.length();

          // Flip horizontal based on relative direction
          if (toPlayer.x < 0) {
            enemy.sprite.scale.x = -1.4; // Face left
          } else {
            enemy.sprite.scale.x = 1.4; // Face right (Default)
          }

          if (dist > 1.1) {
            // Walk towards player
            toPlayer.normalize();
            enemy.pos.add(toPlayer.multiplyScalar(enemy.speed * delta));

            // Walk animation
            enemy.animTimer += delta;
            if (enemy.animTimer >= 0.12) {
              enemy.animFrame = (enemy.animFrame + 1) % 4;
              enemy.animTimer = 0;
            }
            // Row 1 (Walk)
            enemy.texture.offset.set(enemy.animFrame / 4, (2 - 1 - 1) / 2);
          } else {
            // Attack distance reached: Stop and damage player
            enemy.animTimer += delta;
            if (enemy.animTimer >= 0.18) {
              enemy.animFrame = (enemy.animFrame + 1) % 4;
              enemy.animTimer = 0;
            }
            // Row 0 (Idle/Attack)
            enemy.texture.offset.set(enemy.animFrame / 4, (2 - 1 - 0) / 2);

            // Flashes red during attack
            if (Math.floor(Date.now() / 150) % 2 === 0) {
              (enemy.sprite.material as THREE.SpriteMaterial).color.set("#ff4444");
            } else {
              (enemy.sprite.material as THREE.SpriteMaterial).color.set("#ffffff");
            }

            // Damage cooldown
            enemy.attackCooldown -= delta;
            if (enemy.attackCooldown <= 0 && invulnerabilityTimer <= 0) {
              playerHp = Math.max(0, playerHp - 1);
              onHpChange(playerHp);

              invulnerabilityTimer = 1.0; // 1 sec invulnerable
              enemy.attackCooldown = 1.5; // enemy can hit again in 1.5s

              spawnExplosion(playerPos, "#ef4444", 20);

              if (playerHp <= 0) {
                isGameOver = true;
                onGameOver();
              }
            }
          }
        }

        // Update sprite coordinate position
        enemy.sprite.position.copy(enemy.pos);
      });

      // --- POTIONS FLOATING & PICKUP ---
      potions.forEach((pot, index) => {
        // Floating hover effect
        pot.sprite.position.y = 0.5 + Math.sin(Date.now() * 0.004 + index) * 0.12;

        // Spin
        pot.sprite.material.rotation = Math.sin(Date.now() * 0.001) * 0.15;

        // Pickup collision
        const dist = playerPos.distanceTo(pot.pos);
        if (dist < 1.1) {
          // Heal
          playerHp = Math.min(MAX_HP, playerHp + POTION_HEAL);
          onHpChange(playerHp);

          totalItemsCollectedThisGame += 1;
          onStatsUpdate({ totalItemsCollected: stats.totalItemsCollected + 1 });

          // Flash green sparks
          spawnExplosion(pot.pos, "#10b981", 15);

          // Remove
          scene.remove(pot.sprite);
          potions.splice(index, 1);

          // Re-spawn another potion in a random place after some delay
          setTimeout(() => {
            spawnPotion(
              (Math.random() - 0.5) * (MAP_SIZE - 10),
              (Math.random() - 0.5) * (MAP_SIZE - 10)
            );
          }, 6000);
        }
      });

      // --- BOSS AI SYSTEM ---
      if (bossActive && bossSprite && bossTexture && bossHp > 0) {
        bossTimer += delta;
        bossPatternTimer += delta;

        // Boss Flashing white on damage
        if (bossFlashTimer > 0) {
          bossFlashTimer -= delta;
          if (Math.floor(bossFlashTimer * 16) % 2 === 0) {
            (bossSprite.material as THREE.SpriteMaterial).color.set("#ffaaaa");
          } else {
            (bossSprite.material as THREE.SpriteMaterial).color.set("#ffffff");
          }
        } else {
          (bossSprite.material as THREE.SpriteMaterial).color.set("#ffffff");
        }

        // Animate Boss frame
        bossAnimTimer += delta;
        if (bossAnimTimer >= 0.15) {
          bossAnimFrame = (bossAnimFrame + 1) % 4;
          bossAnimTimer = 0;
        }

        // Row select (0 = Idle hover, 1 = Move/Active)
        const bossRow = bossState === "IDLE" ? 0 : 1;
        bossTexture.offset.set(bossAnimFrame / 4, (2 - 1 - bossRow) / 2);

        // Pattern States: IDLE, DASH, SQUASH, FIRE
        if (bossState === "IDLE") {
          // Slow floating around
          const hoverY = 2.0 + Math.sin(Date.now() * 0.003) * 0.35;
          bossPos.y = hoverY;

          // Face player
          if (playerPos.x < bossPos.x) {
            bossSprite.scale.x = -Math.abs(bossScaleX);
          } else {
            bossSprite.scale.x = Math.abs(bossScaleX);
          }

          if (bossPatternTimer >= 3.0) {
            // Pick next state: DASH towards player or SQUASH-WARNING to launch fireballs
            const roll = Math.random();
            if (roll < 0.45) {
              bossState = "DASH";
              // Dash to a spot close to player
              const angle = Math.random() * Math.PI * 2;
              const range = 4 + Math.random() * 5;
              bossDashTarget.set(
                playerPos.x + Math.cos(angle) * range,
                2.0,
                playerPos.z + Math.sin(angle) * range
              );
            } else {
              bossState = "SQUASH";
            }
            bossPatternTimer = 0;
          }
        } else if (bossState === "DASH") {
          // Rapid movement to target
          const toTarget = bossDashTarget.clone().sub(bossPos);
          const distance = toTarget.length();

          if (distance > 0.5) {
            toTarget.normalize();
            bossPos.add(toTarget.multiplyScalar(15 * delta));
          } else {
            bossState = "IDLE";
            bossPatternTimer = 0;
          }
        } else if (bossState === "SQUASH") {
          // Animate squash-and-stretch step warning before throwing fireballs!
          // Rapidly scale width and height
          const wave = Math.sin(Date.now() * 0.03); // Fast wave
          bossScaleX = 4 + wave * 0.9;
          bossScaleY = 4 - wave * 0.9;
          bossSprite.scale.set(bossScaleX, bossScaleY, 1);

          if (bossPatternTimer >= 1.6) {
            // Restore scale, shoot fireballs, transition to FIRE
            bossScaleX = 4;
            bossScaleY = 4;
            bossSprite.scale.set(4, 4, 1);

            bossState = "FIRE";
            bossPatternTimer = 0;

            // Trigger fireball barrage!
            shootBossFireballs();
          }
        } else if (bossState === "FIRE") {
          // Just flying backwards or floating during fireball fall
          bossState = "IDLE";
          bossPatternTimer = 0;
        }

        bossSprite.position.copy(bossPos);
      }

      // Shoot Fireballs helper
      function shootBossFireballs() {
        // Spawn 3 warnings and fireballs
        for (let i = 0; i < 3; i++) {
          // Target 1: player pos, Target 2-3: random spots close to player
          let target = playerPos.clone();
          if (i > 0) {
            target.x += (Math.random() - 0.5) * 12;
            target.z += (Math.random() - 0.5) * 12;
          }
          target.y = 0.05; // Ground level

          // 1. Create Ground Warning Area (Red Ring)
          const warnGeo = new THREE.RingGeometry(0, 2.2, 32);
          const warnMat = new THREE.MeshBasicMaterial({
            color: "#ef4444",
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.45,
          });
          const warnMesh = new THREE.Mesh(warnGeo, warnMat);
          warnMesh.rotation.x = -Math.PI / 2;
          warnMesh.position.copy(target);
          scene.add(warnMesh);

          warnings.push({
            mesh: warnMesh,
            pos: target,
            timer: 0,
            maxTime: 1.5, // 1.5s warning before falling!
          });

          // 2. Create Fireball falling from sky
          const skyPos = target.clone();
          skyPos.y = 15; // spawn high in sky
          skyPos.x += (Math.random() - 0.5) * 4; // slight diagonal offset

          const fireGeo = new THREE.SphereGeometry(0.55, 8, 8);
          const fireMat = new THREE.MeshBasicMaterial({ color: "#f97316" }); // orange sphere
          const fireMesh = new THREE.Mesh(fireGeo, fireMat);
          fireMesh.position.copy(skyPos);
          scene.add(fireMesh);

          // Calculate velocity to hit target in 1.5s
          const velocity = target.clone().sub(skyPos).divideScalar(1.5);

          fireballs.push({
            mesh: fireMesh,
            pos: skyPos,
            targetPos: target,
            velocity: velocity,
            life: 0,
          });
        }
      };

      // --- FIREBALLS & WARNINGS PHYSYCS LOOP ---
      // 1. Warnings ring scale/blink pulsing
      warnings.forEach((warn, index) => {
        warn.timer += delta;
        const scaleVal = 0.5 + Math.sin(warn.timer * 20) * 0.2; // pulse
        warn.mesh.scale.set(1 + scaleVal * 0.15, 1 + scaleVal * 0.15, 1);

        if (warn.timer >= warn.maxTime) {
          scene.remove(warn.mesh);
          warnings.splice(index, 1);
        }
      });

      // 2. Falling fireballs
      fireballs.forEach((fb, index) => {
        fb.pos.add(fb.velocity.clone().multiplyScalar(delta));
        fb.mesh.position.copy(fb.pos);
        fb.life += delta;

        // Spin fireball representation
        fb.mesh.rotation.x += 5 * delta;
        fb.mesh.rotation.y += 5 * delta;

        // Spark trial particles
        if (Math.random() < 0.4) {
          spawnExplosion(fb.pos, "#facc15", 2);
        }

        // Check impact
        if (fb.life >= 1.5) {
          // IMPACT!
          spawnExplosion(fb.targetPos, "#ef4444", 25);

          // Check damage to player (if player is within radius of 2.2 from fireball target)
          const dist = playerPos.distanceTo(fb.targetPos);
          if (dist <= 2.2 && invulnerabilityTimer <= 0) {
            playerHp = Math.max(0, playerHp - 1);
            onHpChange(playerHp);
            invulnerabilityTimer = 1.0;

            spawnExplosion(playerPos, "#ef4444", 20);

            if (playerHp <= 0) {
              isGameOver = true;
              onGameOver();
            }
          }

          // Clean up fireball
          scene.remove(fb.mesh);
          fireballs.splice(index, 1);
        }
      });

      // --- WARP GATE ROTATION AND COLLISION ---
      if (warpGateActive && warpGateMesh) {
        warpGateMesh.rotation.z += 1.5 * delta;

        // Spawning portal sparkles
        if (Math.random() < 0.3) {
          spawnExplosion(warpGateMesh.position, "#10b981", 3);
        }

        // Player collision
        const warpGatePos = new THREE.Vector3().copy(warpGateMesh.position).setY(0.75);
        const dist = playerPos.distanceTo(warpGatePos);
        if (dist <= 1.4) {
          isVic = true;
          onVictory();
        }
      }

      // Render Scene
      renderer.render(scene, camera);
    };

    // Trigger animate
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(mountRef.current);

    // --- CLEAN UP ---
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      resizeObserver.disconnect();

      // Clean up Three.js objects
      scene.remove(groundMesh);
      scene.remove(playerSprite);
      scene.remove(boundaryMesh);
      scene.remove(ringMesh);

      enemies.forEach((e) => scene.remove(e.sprite));
      potions.forEach((p) => scene.remove(p.sprite));
      fireballs.forEach((f) => scene.remove(f.mesh));
      warnings.forEach((w) => scene.remove(w.mesh));
      particles.forEach((p) => scene.remove(p.mesh));

      if (bossSprite) scene.remove(bossSprite);
      if (warpGateMesh) scene.remove(warpGateMesh);

      groundTex.dispose();
      playerBaseTex.dispose();
      playerTex.dispose();
      enemyBaseTex.dispose();
      bossBaseTex.dispose();
      potionTex.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div id="game-container" className="relative w-full h-full select-none" ref={mountRef}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />

      {/* Burst energy skill Cooldown Overlay HUD inside canvas view */}
      <div className="absolute bottom-4 right-4 flex flex-col items-center">
        <div className="relative w-14 h-14 rounded-full border border-violet-500 bg-slate-950/80 flex items-center justify-center shadow-lg overflow-hidden">
          {/* Circular progress fill */}
          {skillCooldown > 0 && (
            <div
              className="absolute inset-0 bg-violet-600/50"
              style={{
                clipPath: `inset(${100 - skillCooldown * 100}% 0px 0px 0px)`,
              }}
            />
          )}
          <span className="text-white font-bold text-lg font-mono relative z-10">O</span>
        </div>
        <span className="text-slate-400 text-xs mt-1 font-mono">
          {skillCooldown > 0 ? `${(skillCooldown * 6).toFixed(1)}s` : "READY"}
        </span>
      </div>
    </div>
  );
};

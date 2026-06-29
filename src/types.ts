export enum GameState {
  TITLE = "TITLE",
  PLAYING = "PLAYING",
  GAMEOVER = "GAMEOVER",
  ENDING = "ENDING"
}

export interface GameSettings {
  keyUp: string;
  keyDown: string;
  keyLeft: string;
  keyRight: string;
  keyAttack: string;
  keySkill: string;
}

export interface GameStats {
  totalPlayTime: number; // in seconds
  totalWins: number;
  totalEnemiesDefeated: number;
  fastestBossKillTime: number; // in seconds (0 means no record)
  totalItemsCollected: number;
  totalGamesPlayed: number;
  bestBossScore: number;
}

export interface DialogueLine {
  speaker: "player" | "npc";
  text: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  keyUp: "KeyW",
  keyDown: "KeyS",
  keyLeft: "KeyA",
  keyRight: "KeyD",
  keyAttack: "KeyP",
  keySkill: "KeyO"
};

export const DEFAULT_STATS: GameStats = {
  totalPlayTime: 0,
  totalWins: 0,
  totalEnemiesDefeated: 0,
  fastestBossKillTime: 0,
  totalItemsCollected: 0,
  totalGamesPlayed: 0,
  bestBossScore: 0
};

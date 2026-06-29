import { GameSettings, GameStats, DEFAULT_SETTINGS, DEFAULT_STATS } from "../types";

const STORAGE_KEY_SETTINGS = "rpg_arena_settings";
const STORAGE_KEY_STATS = "rpg_arena_stats";

/**
 * Safely loads settings from LocalStorage with fallback defaults.
 */
export function loadSettings(): GameSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure all keys exist
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    }
  } catch (err) {
    console.error("Failed to load settings from storage. Resetting to default.", err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Safely saves settings to LocalStorage.
 */
export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error("Failed to save settings to storage.", err);
  }
}

/**
 * Safely loads statistics from LocalStorage with fallback defaults.
 */
export function loadStats(): GameStats {
  try {
    const data = localStorage.getItem(STORAGE_KEY_STATS);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_STATS,
        ...parsed,
      };
    }
  } catch (err) {
    console.error("Failed to load stats from storage. Resetting to default.", err);
  }
  return DEFAULT_STATS;
}

/**
 * Safely saves statistics to LocalStorage.
 */
export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch (err) {
    console.error("Failed to save stats to storage.", err);
  }
}

/**
 * Resets all stats.
 */
export function resetStats(): GameStats {
  saveStats(DEFAULT_STATS);
  return DEFAULT_STATS;
}

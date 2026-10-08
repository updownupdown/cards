import { getAchievements } from "./achievements";
import { loadCampaignProgress } from "./campaign-progress";
import {
  loadEarnedAchievements,
  recordEarnedAchievements,
} from "./earned-achievements";
import { EMPTY_STATS, getGameSettings, loadGameSettingsMap } from "./game-menu";
import { isGameEnabled } from "./games-data";
import { GAMES_DATA } from "./games-registry";

/**
 * Works the achievements out from what is saved now and records any newly
 * earned. Run after a win, so they are kept even by a player who never opens
 * the Stats tab before the next update.
 */
export async function syncEarnedAchievements() {
  const [settingsMap, progress, earned] = await Promise.all([
    loadGameSettingsMap(),
    loadCampaignProgress(),
    loadEarnedAchievements(),
  ]);
  const stats = Object.entries(GAMES_DATA)
    .filter(([, gameInfo]) => isGameEnabled(gameInfo))
    .map(([path]) =>
      settingsMap[path]
        ? getGameSettings(settingsMap, path).stats
        : EMPTY_STATS,
    );
  const achieved = getAchievements({
    stats,
    collectedQuotes: progress.collectedQuoteIds.length,
    collectedTaoChapters: progress.collectedTaoIds.length,
    earned,
  })
    .filter((achievement) => achievement.achieved)
    .map((achievement) => achievement.key);
  return recordEarnedAchievements(achieved);
}

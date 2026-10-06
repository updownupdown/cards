import { QUOTE_COUNT, TAO_CHAPTER_COUNT } from "./collectibles";
import type { GameStats } from "./game-menu";

/**
 * Milestones worked out from what players already keep (game stats and
 * collectibles), so nothing new is saved and existing players see what they
 * have already done.
 */
export const ACHIEVEMENT_KEYS = [
  "wins50",
  "wins100",
  "wins500",
  "triedAll",
  "wonAll",
  "mastery",
  "allQuotes",
  "allTao",
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

export type Achievement = {
  key: AchievementKey;
  /** How far along it is, never past the target. */
  current: number;
  target: number;
  achieved: boolean;
};

/** Wins of a single game that make it mastered. */
export const MASTERY_WINS = 10;

export function getAchievements({
  stats,
  collectedQuotes,
  collectedTaoChapters,
}: {
  /** Every game that can be played, played or not. */
  stats: GameStats[];
  collectedQuotes: number;
  collectedTaoChapters: number;
}): Achievement[] {
  const totalWins = stats.reduce((sum, game) => sum + game.wins, 0);
  const played = stats.filter((game) => game.attempts > 0).length;
  const won = stats.filter((game) => game.wins > 0).length;
  const mostWins = Math.max(0, ...stats.map((game) => game.wins));

  const progress: Record<AchievementKey, [number, number]> = {
    wins50: [totalWins, 50],
    wins100: [totalWins, 100],
    wins500: [totalWins, 500],
    triedAll: [played, stats.length],
    wonAll: [won, stats.length],
    mastery: [mostWins, MASTERY_WINS],
    allQuotes: [collectedQuotes, QUOTE_COUNT],
    allTao: [collectedTaoChapters, TAO_CHAPTER_COUNT],
  };

  return ACHIEVEMENT_KEYS.map((key) => {
    const [current, target] = progress[key];
    return {
      key,
      current: Math.min(current, target),
      target,
      achieved: target > 0 && current >= target,
    };
  });
}

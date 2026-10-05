import { describe, expect, test } from "@jest/globals";
import { getAchievements, MASTERY_WINS } from "@/data/achievements";
import { QUOTE_COUNT, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { EMPTY_STATS, type GameStats } from "@/data/game-menu";
import { getLongestDailyStreak } from "@/data/game-of-the-day";

const game = (attempts: number, wins: number): GameStats => ({
  ...EMPTY_STATS,
  attempts,
  wins,
  losses: attempts - wins,
});

const byKey = (stats: GameStats[], quotes = 0, tao = 0) =>
  Object.fromEntries(
    getAchievements({
      stats,
      collectedQuotes: quotes,
      collectedTaoChapters: tao,
    }).map((achievement) => [achievement.key, achievement]),
  );

describe("Achievements", () => {
  test("nothing is achieved before anything is played", () => {
    const all = Object.values(byKey([game(0, 0), game(0, 0)]));
    expect(all).toHaveLength(8);
    expect(all.every((achievement) => !achievement.achieved)).toBe(true);
  });

  test("total wins count across every game", () => {
    const result = byKey([game(80, 30), game(40, 25), game(0, 0)]);
    expect(result.wins50).toMatchObject({ achieved: true, current: 50 });
    expect(result.wins100).toMatchObject({
      achieved: false,
      current: 55,
      target: 100,
    });
    expect(result.wins500.achieved).toBe(false);
  });

  test("trying and winning every game", () => {
    const tried = byKey([game(3, 0), game(1, 1)]);
    expect(tried.triedAll.achieved).toBe(true);
    expect(tried.wonAll).toMatchObject({ achieved: false, current: 1 });

    const won = byKey([game(3, 1), game(1, 1)]);
    expect(won.wonAll.achieved).toBe(true);
  });

  test("mastery is one game won 10 times, not 10 wins spread out", () => {
    expect(byKey([game(9, 9), game(9, 9)]).mastery).toMatchObject({
      achieved: false,
      current: 9,
    });
    expect(byKey([game(12, MASTERY_WINS)]).mastery.achieved).toBe(true);
  });

  test("collecting every quote and every Tao chapter", () => {
    const result = byKey([], QUOTE_COUNT, TAO_CHAPTER_COUNT - 1);
    expect(result.allQuotes.achieved).toBe(true);
    expect(result.allTao).toMatchObject({
      achieved: false,
      current: TAO_CHAPTER_COUNT - 1,
      target: TAO_CHAPTER_COUNT,
    });
  });

  test("progress never shows past the target", () => {
    expect(byKey([game(900, 600)]).wins500.current).toBe(500);
  });
});

describe("Longest Game of the Day streak", () => {
  test("is the longest run of days in a row", () => {
    expect(getLongestDailyStreak(new Set())).toBe(0);
    expect(getLongestDailyStreak(new Set(["2026-9-1"]))).toBe(1);
    expect(
      getLongestDailyStreak(
        new Set(["2026-9-1", "2026-9-2", "2026-9-4", "2026-9-5", "2026-9-6"]),
      ),
    ).toBe(3);
  });

  test("runs on across the end of a month and a year", () => {
    expect(
      getLongestDailyStreak(
        new Set(["2025-12-30", "2025-12-31", "2026-1-1", "2026-1-2"]),
      ),
    ).toBe(4);
    expect(getLongestDailyStreak(new Set(["2026-2-28", "2026-3-1"]))).toBe(2);
  });

  test("ignores entries that aren't dates", () => {
    expect(getLongestDailyStreak(new Set(["junk", "2026-9-1"]))).toBe(1);
  });
});

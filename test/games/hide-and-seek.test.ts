import { createDeck, type PlayingCard } from "@/components/Cards/card-utils";
import {
  hideAndSeekRules,
  type HideAndSeekGameState,
} from "@/components/Games/HideAndSeek";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  id: string = `${rank}-${suit}`,
  faceUp = false,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(
  overrides: Partial<HideAndSeekGameState> = {},
): HideAndSeekGameState {
  return {
    playmates: [],
    guesses: Array.from({ length: 14 }, () => null),
    draw: [],
    discard: [],
    scorePile: [],
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

describe("Hide and Seek rules", () => {
  test("always deals J/Q/K columns with three distinct suits", () => {
    const faceCards = createDeck().filter(({ rank }) =>
      ["J", "Q", "K"].includes(rank),
    );

    for (let run = 0; run < 25; run += 1) {
      const playmates = hideAndSeekRules.dealPlaymates(faceCards);
      expect(playmates).toHaveLength(12);

      for (let column = 0; column < hideAndSeekRules.gridCols; column += 1) {
        const cards = [
          playmates[column],
          playmates[column + 4],
          playmates[column + 8],
        ];
        expect(new Set(cards.map(({ rank }) => rank))).toEqual(
          new Set(["J", "Q", "K"]),
        );
        expect(new Set(cards.map(({ suit }) => suit)).size).toBe(3);
      }
    }
  });

  test("rejects an incomplete face-card set", () => {
    expect(() => hideAndSeekRules.dealPlaymates([card("J", "spades")])).toThrow(
      "requires four Jacks, Queens, and Kings",
    );
  });

  test.each([
    [0, [0, 10, 13, 4]],
    [5, [1, 9, 12, 5]],
    [11, [3, 7, 11, 6]],
  ])("maps playmate %s to its four surrounding guesses", (index, expected) => {
    expect(hideAndSeekRules.getScoreIndexes(index)).toEqual(expected);
  });

  test("scores matching guesses and clears only those positions", () => {
    const guesses: (PlayingCard | null)[] = Array.from(
      { length: 14 },
      () => null,
    );
    guesses[0] = card("2", "hearts", "match-top", true);
    guesses[10] = card("3", "clubs", "miss-bottom", true);
    guesses[13] = card("4", "hearts", "match-left", true);
    const game = state({
      playmates: [card("J", "hearts")],
      guesses,
    });

    const next = hideAndSeekRules.resolvePlaymateReveal(game, 0);

    expect(next.scorePile.map(({ id }) => id)).toEqual([
      "match-top",
      "match-left",
    ]);
    expect(next.guesses[0]).toBeNull();
    expect(next.guesses[13]).toBeNull();
    expect(next.guesses[10]?.id).toBe("miss-bottom");
  });

  test.each([
    [19, false],
    [20, true],
  ])("ends the final reveal with score %s and won=%s", (score, won) => {
    const scorePile = Array.from({ length: score }, (_, index) =>
      card("2", "clubs", `score-${index}`),
    );
    const game = state({
      playmates: [card("J", "hearts")],
      scorePile,
    });

    const next = hideAndSeekRules.resolvePlaymateReveal(game, 0);

    expect(next).toMatchObject({
      ended: true,
      won,
      winLoseMessage: `You scored ${score} (20 to win)`,
    });
  });
});

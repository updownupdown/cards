import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  getTheBogeyHandSize,
  theBogeyRules,
  type TheBogeyGameState,
} from "@/components/Games/TheBogey";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function emptyColumns(): (PlayingCard[] | null)[] {
  return Array.from({ length: theBogeyRules.maxColumns }, () => null);
}

function state(overrides: Partial<TheBogeyGameState> = {}): TheBogeyGameState {
  return {
    hand: Array.from({ length: theBogeyRules.handSize }, () => null),
    columns: emptyColumns(),
    deck: [],
    discard: [],
    currentBogeyCard: null,
    awaitingBogeyPlacement: false,
    selectedHandCardId: null,
    playerTurnEnded: false,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("The Bogey rules", () => {
  test("uses the configured hand size for each difficulty", () => {
    expect(getTheBogeyHandSize("easy")).toBe(5);
    expect(getTheBogeyHandSize("hard")).toBe(4);
  });

  test("allows any empty column up to the twelve-column limit", () => {
    expect(theBogeyRules.canPlayCard(card("7"), emptyColumns())).toEqual(
      Array.from({ length: 12 }, (_, index) => index),
    );
  });

  test("builds downward in the same suit and may skip ranks", () => {
    const columns = emptyColumns();
    columns[0] = [card("K")];
    columns[1] = [card("8")];
    columns[2] = [card("K", "hearts")];
    for (let index = 3; index < columns.length; index += 1) {
      columns[index] = [card("A", "clubs", `occupied-${index}`)];
    }

    expect(theBogeyRules.canPlayCard(card("7"), columns)).toEqual([0, 1]);
    expect(theBogeyRules.canPlayCard(card("8"), columns)).toEqual([0]);
    expect(theBogeyRules.canPlayCard(card("A", "hearts"), columns)).toEqual([
      2,
    ]);
  });

  test("does not place equal, higher, or differently suited cards", () => {
    const columns = Array.from({ length: 12 }, (_, index) => [
      card("7", index === 0 ? "spades" : "clubs", `top-${index}`),
    ]);

    expect(theBogeyRules.canPlayCard(card("7"), columns)).toEqual([]);
    expect(theBogeyRules.canPlayCard(card("8"), columns)).toEqual([]);
    expect(theBogeyRules.canPlayCard(card("6", "hearts"), columns)).toEqual([]);
  });

  test.each([
    [12, "novice"],
    [11, "normal"],
    [10, "advanced"],
    [9, "legendary"],
    [8, "epic"],
  ] as const)("awards the %s-column %s tier", (count, tier) => {
    expect(theBogeyRules.getWinTier(count)).toBe(tier);
  });

  test("recognizes completion when every fixed hand slot is empty", () => {
    expect(theBogeyRules.allCardsPlaced(state())).toBe(true);
    expect(
      theBogeyRules.allCardsPlaced(
        state({ hand: [card("2"), null, null, null, null] }),
      ),
    ).toBe(false);
  });

  test("counts only occupied columns for the final tier", () => {
    const columns = emptyColumns();
    for (let index = 0; index < 9; index += 1) {
      columns[index] = [card("K", "spades", `column-${index}`)];
    }
    const game = state({ columns });

    theBogeyRules.finishCompletedGame(game);

    expect(theBogeyRules.usedColumnCount(game.columns)).toBe(9);
    expect(game).toMatchObject({
      ended: true,
      won: true,
      winLoseMessage: "9 columns used. LEGENDARY win.",
    });
  });
});

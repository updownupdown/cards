import { type PlayingCard } from "@/components/Cards/card-utils";
import { type ClockGameState, clockRules } from "@/components/Games/Clock";

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (component: unknown) => component,
  },
  useAnimatedProps: (factory: () => unknown) => factory(),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  useSharedValue: (value: unknown) => ({ value }),
  withTiming: (value: unknown) => value,
}));

function card(
  rank: PlayingCard["rank"],
  id: string = rank,
  faceUp = false,
): PlayingCard {
  return { id, rank, suit: "spades", faceUp };
}

function state(overrides: Partial<ClockGameState> = {}): ClockGameState {
  return {
    piles: Array.from({ length: 13 }, () => []),
    nextPileIndex: 0,
    prevPileIndex: undefined,
    revealedKings: 0,
    revealedCards: 0,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Clock rules", () => {
  test("reveals the center card and routes to its rank pile", () => {
    const game = state();
    game.piles[0] = [card("5", "five")];

    expect(clockRules.revealCardAtPileIndex(game, 0)).toBe(true);
    expect(game.piles[0][0].faceUp).toBe(true);
    expect(game.nextPileIndex).toBe(5);
    expect(game.prevPileIndex).toBe(0);
    expect(game.revealedCards).toBe(1);
  });

  test("moves the previous revealed card beneath the next pile", () => {
    const game = state({ nextPileIndex: 5, prevPileIndex: 0 });
    game.piles[0] = [card("5", "previous", true)];
    game.piles[5] = [card("2", "two")];

    clockRules.revealCardAtPileIndex(game, 5);

    expect(game.piles[0]).toEqual([]);
    expect(game.piles[5].map(({ id }) => id)).toEqual(["previous", "two"]);
    expect(game.piles[5][1].faceUp).toBe(true);
    expect(game.nextPileIndex).toBe(2);
  });

  test("routes Kings back to the center and loses on the fourth", () => {
    const game = state({
      nextPileIndex: 4,
      revealedKings: 3,
      revealedCards: 40,
    });
    game.piles[4] = [card("K", "fourth-king")];

    clockRules.revealCardAtPileIndex(game, 4);

    expect(game.nextPileIndex).toBe(0);
    expect(game.revealedKings).toBe(4);
    expect(game.ended).toBe(true);
    expect(game.won).toBe(false);
  });

  test("wins when the final card is revealed", () => {
    const game = state({ nextPileIndex: 8, revealedCards: 51 });
    game.piles[8] = [card("3", "final")];

    clockRules.revealCardAtPileIndex(game, 8);

    expect(game.revealedCards).toBe(52);
    expect(game.ended).toBe(true);
    expect(game.won).toBe(true);
  });

  test("does not change ended games or empty piles", () => {
    const ended = state({ ended: true });
    ended.piles[0] = [card("A")];
    const before = structuredClone(ended);

    expect(clockRules.revealCardAtPileIndex(ended, 0)).toBe(false);
    expect(ended).toEqual(before);
    expect(clockRules.revealCardAtPileIndex(state(), 0)).toBe(false);
  });
});

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  harness,
  mappedCards,
  outcome,
  pressCardId,
  renderGame,
  settle,
} from "../../../jest/game-harness";
import { createDeck, shuffle } from "@/components/Cards/card-utils";
import GoFish, {
  goFishRules,
  type GoFishGameState,
} from "@/components/Games/GoFish";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  HAND_SIZE,
  BOOKS_TO_WIN,
  rivalAsk,
  gather,
  deal,
  layBooks,
  playerAsks,
  playerRefills,
  rivalAsks,
  bookCount,
  bestRank,
} = goFishRules;

function baseState(overrides: Partial<GoFishGameState>): GoFishGameState {
  return {
    stock: [],
    hand: [],
    rival: [],
    playerBooks: [],
    rivalBooks: [],
    known: [],
    last: null,
    phase: "ask",
    ...overrides,
  };
}

function autoPlay(state: GoFishGameState) {
  for (let step = 0; step < 400; step += 1) {
    if (state.phase === "over") return;
    if (state.phase === "ask") {
      const rank = bestRank(state);
      if (rank) playerAsks(state, rank);
      else playerRefills(state);
    } else if (state.phase === "rival") {
      rivalAsks(state);
    }
  }
}

describe("Go Fish rules", () => {
  test("asking takes every card of the rank, and you ask again", () => {
    const state = baseState({
      hand: [card("9", "clubs"), card("2", "hearts")],
      rival: [
        card("9", "hearts", false),
        card("9", "spades", false),
        card("K", "clubs", false),
      ],
    });
    playerAsks(state, "9");
    expect(state.hand).toHaveLength(4);
    expect(state.hand.every((c) => c.faceUp)).toBe(true);
    expect(state.rival).toHaveLength(1);
    expect(state.phase).toBe("ask");
    expect(state.known).toEqual(["9"]);
    expect(state.last).toEqual({
      kind: "got",
      who: "player",
      rank: "9",
      count: 2,
    });
  });

  test("with none, you go fishing, and the turn passes unless you catch it", () => {
    const state = baseState({
      stock: [card("4", "clubs", false), card("5", "clubs", false)],
      hand: [card("5", "hearts")],
      rival: [card("K", "clubs", false)],
    });
    playerAsks(state, "5");
    expect(state.hand).toHaveLength(2);
    expect(state.phase).toBe("rival");
    state.phase = "ask";
    playerAsks(state, "5");
    expect(state.hand).toHaveLength(3);
    expect(state.phase).toBe("ask");
    expect(state.last).toMatchObject({ kind: "fished", lucky: true });
  });

  test("you can only ask for a rank you hold", () => {
    const state = baseState({
      hand: [card("5", "hearts")],
      rival: [card("K", "clubs", false)],
    });
    playerAsks(state, "K");
    expect(state.rival).toHaveLength(1);
    expect(state.phase).toBe("ask");
  });

  test("four of a rank is a book, laid down at once", () => {
    const state = baseState({
      hand: [
        card("J", "clubs"),
        card("J", "hearts"),
        card("J", "spades"),
        card("J", "diamonds"),
        card("2", "clubs"),
      ],
      known: ["J"],
    });
    layBooks(state);
    expect(state.hand).toHaveLength(1);
    expect(bookCount(state.playerBooks)).toBe(1);
    expect(state.known).toEqual([]);
  });

  test("the rival asks for what it knows you hold, else its biggest rank", () => {
    const rival = [
      card("3", "clubs", false),
      card("3", "hearts", false),
      card("Q", "clubs", false),
    ];
    expect(rivalAsk(rival, [])).toBe("3");
    expect(rivalAsk(rival, ["Q"])).toBe("Q");
    expect(rivalAsk([], ["Q"])).toBeNull();
  });

  test("the rival takes your cards when it asks for a rank you hold", () => {
    const state = baseState({
      hand: [card("Q", "hearts"), card("2", "clubs")],
      rival: [card("Q", "clubs", false)],
      known: ["Q"],
      phase: "rival",
    });
    rivalAsks(state);
    expect(state.rival).toHaveLength(2);
    expect(state.rival.every((c) => !c.faceUp)).toBe(true);
    expect(state.hand).toHaveLength(1);
    expect(state.known).toEqual([]);
    expect(state.phase).toBe("rival");
  });

  test("deals seven each and lays any books dealt", () => {
    const state = baseState({ stock: createDeck() });
    gather(state);
    deal(state);
    expect(state.hand.length + bookCount(state.playerBooks) * 4).toBe(
      HAND_SIZE,
    );
    expect(state.rival.length + bookCount(state.rivalBooks) * 4).toBe(
      HAND_SIZE,
    );
    expect(state.rival.every((c) => !c.faceUp)).toBe(true);
    expect(state.phase).toBe("ask");
  });

  test("playing by the hints wins a fair share of deals", () => {
    const random = seededRandom("gofish-auto");
    let wins = 0;
    const games = 80;
    for (let index = 0; index < games; index += 1) {
      const state = baseState({ stock: shuffle(createDeck(), random) });
      deal(state);
      autoPlay(state);
      expect(state.phase).toBe("over");
      expect(bookCount(state.playerBooks) + bookCount(state.rivalBooks)).toBe(
        13,
      );
      if (bookCount(state.playerBooks) >= BOOKS_TO_WIN) wins += 1;
    }
    if (process.env.GOFISH_DEBUG) console.log(`won ${wins} of ${games}`);
    expect(wins).toBeGreaterThan(games * 0.3);
    expect(wins).toBeLessThan(games * 0.9);
  });
});

describe("Go Fish screen", () => {
  test("asks by tapping a card, and the rival answers", async () => {
    await renderGame("/go-fish", GoFish);
    const game = () =>
      (harness.mapConfig as unknown as { game: GoFishGameState }).game;
    expect(mappedCards()).toHaveLength(52);
    const rank = bestRank(game())!;
    const before = game()
      .hand.map((c) => c.id)
      .sort();
    await pressCardId(game().hand.find((c) => c.rank === rank)!.id);
    expect(game().last).not.toBeNull();
    // The hand has changed, whatever the rival's turn did to it after (it can
    // take back the one card the player fished, leaving the count the same).
    expect(
      game()
        .hand.map((c) => c.id)
        .sort(),
    ).not.toEqual(before);
    await settle(12);
    expect(outcome()).toBe("playing");
  });
});

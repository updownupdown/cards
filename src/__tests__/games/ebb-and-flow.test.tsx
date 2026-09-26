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
  dropMove,
  harness,
  outcome,
  pressCardId,
  renderGame,
  selectedCardIds,
  setGameSettings,
  tapSource,
} from "../../../jest/game-harness";
import EbbAndFlow, {
  ebbAndFlowRules,
  type EbbAndFlowGameState,
} from "@/components/Games/EbbAndFlow";
import { RANK_VALUE, type PlayingCard } from "@/components/Cards/card-utils";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const { HAND_SIZES, canPlay } = ebbAndFlowRules;
const [RISING, , FALLING] = [0, 1, 2];

function state({
  hand = [] as PlayingCard[],
  piles = [[], [], [], []] as PlayingCard[][],
  stock = [] as PlayingCard[],
  played = 0,
  handSize = HAND_SIZES.normal,
} = {}): EbbAndFlowGameState {
  return { hand, piles, stock, played, handSize };
}

function pileCards(pile: number) {
  return harness.mapConfig?.zones.find((z) => z.id === `pile-${pile}`)?.cards;
}

describe("Ebb & Flow rules", () => {
  test("rising piles take the same rank or higher", () => {
    const pile = [card("8", "hearts")];
    expect(canPlay(card("8", "clubs"), pile, "up")).toBe(true);
    expect(canPlay(card("K", "spades"), pile, "up")).toBe(true);
    expect(canPlay(card("6", "hearts"), pile, "up")).toBe(false);
    expect(canPlay(card("7", "clubs"), pile, "up")).toBe(false);
  });

  test("falling piles take the same rank or lower", () => {
    const pile = [card("8", "spades")];
    expect(canPlay(card("8", "hearts"), pile, "down")).toBe(true);
    expect(canPlay(card("A", "clubs"), pile, "down")).toBe(true);
    expect(canPlay(card("10", "spades"), pile, "down")).toBe(false);
    expect(canPlay(card("9", "hearts"), pile, "down")).toBe(false);
  });

  test("one rank back in the same suit turns a pile back", () => {
    expect(canPlay(card("7", "hearts"), [card("8", "hearts")], "up")).toBe(
      true,
    );
    expect(canPlay(card("9", "spades"), [card("8", "spades")], "down")).toBe(
      true,
    );
  });

  test("any card starts an empty pile", () => {
    expect(canPlay(card("K", "clubs"), [], "up")).toBe(true);
    expect(canPlay(card("A", "clubs"), [], "down")).toBe(true);
  });

  test.each(Object.entries(HAND_SIZES))(
    "%s deals a sorted hand of %i from a full deck",
    (_, handSize) => {
      const dealt = ebbAndFlowRules.createInitialState(handSize);
      expect(dealt.hand).toHaveLength(handSize);
      expect(dealt.stock).toHaveLength(52 - handSize);
      expect(dealt.hand.every((c) => c.faceUp)).toBe(true);
      const values = dealt.hand.map((c) => RANK_VALUE[c.rank]);
      expect(values).toEqual([...values].sort((a, b) => a - b));
      // Every opening has moves: all four piles start empty.
      expect(ebbAndFlowRules.hasPlay(dealt)).toBe(true);
    },
  );

  test("the deck can be drawn only after two cards are played", () => {
    const stock = [card("2", "clubs", false), card("3", "clubs", false)];
    expect(ebbAndFlowRules.canDraw(state({ stock, played: 1 }))).toBe(false);
    expect(ebbAndFlowRules.canDraw(state({ stock, played: 2 }))).toBe(true);
    expect(ebbAndFlowRules.canDraw(state({ played: 2 }))).toBe(false);
  });

  test("drawing fills the hand, sorts it, and starts a new turn", () => {
    const next = state({
      hand: [card("9", "hearts")],
      stock: [card("4", "clubs", false), card("K", "spades", false)],
      played: 2,
      handSize: 3,
    });
    ebbAndFlowRules.drawHand(next);
    expect(next.hand.map((c) => c.rank)).toEqual(["4", "9", "K"]);
    expect(next.played).toBe(0);
  });

  test("the game is lost when a card is owed and none fits", () => {
    const piles = [
      [card("K", "hearts")],
      [card("K", "clubs")],
      [card("A", "spades")],
      [card("A", "diamonds")],
    ];
    const hand = [card("5", "hearts"), card("6", "hearts")];
    const stock = [card("2", "clubs", false)];
    expect(ebbAndFlowRules.isLost(state({ hand, piles, stock }))).toBe(true);
    // Once two are down, the deck is still there to draw from.
    expect(
      ebbAndFlowRules.isLost(state({ hand, piles, stock, played: 2 })),
    ).toBe(false);
    // With the deck gone, any stuck card loses.
    expect(ebbAndFlowRules.isLost(state({ hand, piles, played: 5 }))).toBe(
      true,
    );
  });
});

describe("Ebb & Flow game", () => {
  test("a card can be dragged onto a pile it fits", async () => {
    const seven = card("7", "hearts");
    await renderGame(
      "/ebb-and-flow",
      EbbAndFlow,
      state({
        hand: [seven, card("9", "clubs")],
        piles: [[card("8", "hearts")], [], [], []],
        stock: [card("2", "clubs", false), card("3", "clubs", false)],
      }),
    );

    expect(
      harness.dragOptions?.canDropOnTarget(
        { cardId: seven.id },
        { pile: FALLING },
      ),
    ).toBe(true);
    await dropMove({ cardId: seven.id }, { pile: RISING });
    expect(pileCards(RISING)?.at(-1)?.id).toBe(seven.id);
  });

  test("tapping a card selects it, and tapping a pile plays it", async () => {
    const nine = card("9", "clubs");
    await renderGame(
      "/ebb-and-flow",
      EbbAndFlow,
      state({
        hand: [card("2", "hearts"), nine],
        piles: [[card("8", "hearts")], [], [], []],
        stock: [card("2", "clubs", false)],
      }),
    );

    await tapSource({ cardId: nine.id });
    expect(selectedCardIds()).toContain(nine.id);
    await pressCardId(pileCards(RISING)![0].id);
    expect(pileCards(RISING)?.at(-1)?.id).toBe(nine.id);
    expect(selectedCardIds()).not.toContain(nine.id);
  });

  test("the deck draws once two cards are played", async () => {
    const [a, b] = [card("2", "hearts"), card("3", "hearts")];
    const stock = [card("J", "clubs", false), card("Q", "clubs", false)];
    await renderGame(
      "/ebb-and-flow",
      EbbAndFlow,
      state({
        hand: [a, b, card("4", "hearts")],
        stock,
        handSize: 3,
      }),
    );

    await dropMove({ cardId: a.id }, { pile: RISING });
    await pressCardId(stock[1].id);
    expect(
      harness.mapConfig?.zones.find((z) => z.name === "hand")?.cards,
    ).toHaveLength(2);

    await dropMove({ cardId: b.id }, { pile: RISING });
    await pressCardId(stock[1].id);
    const hand = harness.mapConfig?.zones.find((z) => z.name === "hand")?.cards;
    expect(hand?.map((c) => c.rank)).toEqual(["4", "J", "Q"]);
  });

  test("with nothing left to play, the hand refills by itself", async () => {
    const [a, b] = [card("2", "hearts"), card("3", "hearts")];
    await renderGame(
      "/ebb-and-flow",
      EbbAndFlow,
      state({
        hand: [a, b],
        stock: [card("J", "clubs", false), card("Q", "clubs", false)],
        handSize: 2,
      }),
    );

    await dropMove({ cardId: a.id }, { pile: RISING });
    await dropMove({ cardId: b.id }, { pile: RISING });
    const hand = harness.mapConfig?.zones.find((z) => z.name === "hand")?.cards;
    expect(hand?.map((c) => c.rank)).toEqual(["J", "Q"]);
    expect(outcome()).toBe("playing");
  });

  test("playing the last card wins", async () => {
    const last = card("K", "spades");
    await renderGame(
      "/ebb-and-flow",
      EbbAndFlow,
      state({ hand: [last], piles: [[card("Q", "hearts")], [], [], []] }),
    );

    await dropMove({ cardId: last.id }, { pile: RISING });
    expect(outcome()).toBe("won");
  });

  test("the game is lost when the hand is stuck", async () => {
    const king = card("K", "diamonds");
    await renderGame(
      "/ebb-and-flow",
      EbbAndFlow,
      state({
        hand: [king, card("5", "hearts")],
        piles: [
          [card("Q", "hearts")],
          [card("K", "clubs")],
          [card("A", "spades")],
          [card("A", "diamonds")],
        ],
      }),
    );
    expect(outcome()).toBe("playing");

    await dropMove({ cardId: king.id }, { pile: RISING });
    expect(outcome()).toBe("lost");
    expect(harness.wrapperProps?.winLoseMessage).toBe(
      "No card can be played. 1 card left.",
    );
  });

  test.each(Object.entries(HAND_SIZES))(
    "a new game on %s deals %i cards",
    async (difficulty, handSize) => {
      await setGameSettings("/ebb-and-flow", {
        ebbAndFlowDifficulty: difficulty as keyof typeof HAND_SIZES,
      });
      await renderGame("/ebb-and-flow", EbbAndFlow);

      const hand = harness.mapConfig?.zones.find((z) => z.name === "hand");
      expect(hand?.cards).toHaveLength(handSize);
      expect(outcome()).toBe("playing");
    },
  );
});

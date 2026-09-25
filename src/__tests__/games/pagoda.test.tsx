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
  outcome,
  pressCardId,
  renderGame,
  setGameSettings,
} from "../../../jest/game-harness";
import Pagoda, {
  pagodaRules,
  type PagodaGameState,
} from "@/components/Games/Pagoda";
import type { PlayingCard } from "@/components/Cards/card-utils";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const { SLOTS, COVERED_BY, TRAY_SIZES } = pagodaRules;

/** A position with only the given cards on the board, by slot index. */
function stateWithBoard(
  cards: Record<number, PlayingCard>,
  { tray = [] as PlayingCard[], traySize = TRAY_SIZES.normal } = {},
): PagodaGameState {
  return {
    board: SLOTS.map((_, index) => cards[index] ?? null),
    tray,
    shrine: [],
    traySize,
    deal: [],
  };
}

// Floor corners: nothing lies on top of them.
const [A, B, C] = [0, 4, 20];

describe("Pagoda rules", () => {
  test.each(Object.entries(TRAY_SIZES))(
    "%s deals 39 cards, three of each rank, with a %i-card tray",
    (_, traySize) => {
      const state = pagodaRules.createInitialState(traySize);
      const cards = state.board.filter((c): c is PlayingCard => c !== null);

      expect(state.traySize).toBe(traySize);
      expect(cards).toHaveLength(39);
      const perRank = new Map<string, number>();
      for (const c of cards)
        perRank.set(c.rank, (perRank.get(c.rank) ?? 0) + 1);
      expect([...perRank.values()]).toEqual(Array(13).fill(3));
      // Exactly the uncovered cards start face up.
      state.board.forEach((c, index) => {
        expect(c?.faceUp).toBe(pagodaRules.isFree(state.board, index));
      });
      expect(cards.filter((c) => c.faceUp)).toHaveLength(17);
    },
  );

  test("taking a card uncovers the face-down card beneath it", () => {
    const top = SLOTS.length - 1;
    const [below] = COVERED_BY.flatMap((coverers, index) =>
      coverers.length === 1 && coverers[0] === top ? [index] : [],
    );
    const state = stateWithBoard({
      [top]: card("5", "hearts"),
      [below]: card("9", "clubs", false),
    });

    expect(pagodaRules.isFree(state.board, below)).toBe(false);
    expect(pagodaRules.takeCard(state, below)).toBe(false);
    expect(pagodaRules.takeCard(state, top)).toBe(true);
    expect(state.board[below]).toMatchObject({ rank: "9", faceUp: true });
  });

  test("the tray keeps cards of a rank together", () => {
    const tray = [card("3", "hearts"), card("7", "clubs")];
    pagodaRules.addToTray(tray, card("3", "spades"));
    expect(tray.map((c) => c.rank)).toEqual(["3", "3", "7"]);
  });

  test("three of a rank leave the tray for the shrine", () => {
    const state = stateWithBoard(
      { [A]: card("Q", "hearts") },
      { tray: [card("Q", "clubs"), card("Q", "spades"), card("4", "clubs")] },
    );

    pagodaRules.takeCard(state, A);
    expect(pagodaRules.clearSet(state)).toBe(true);
    expect(state.tray.map((c) => c.rank)).toEqual(["4"]);
    expect(state.shrine).toHaveLength(3);
  });

  test("the game is lost when the tray fills without a set", () => {
    const tray = [
      card("A", "hearts"),
      card("2", "hearts"),
      card("3", "hearts"),
    ];
    const state = stateWithBoard(
      { [A]: card("4", "hearts") },
      { tray: [...tray, card("5", "hearts")], traySize: TRAY_SIZES.hard },
    );
    expect(pagodaRules.isLost(state)).toBe(false);

    pagodaRules.takeCard(state, A);
    expect(pagodaRules.isLost(state)).toBe(true);
    expect(pagodaRules.isLost({ ...state, traySize: TRAY_SIZES.normal })).toBe(
      false,
    );
  });

  test("a set that fills the tray is not a loss", () => {
    const state = stateWithBoard(
      { [A]: card("K", "hearts") },
      {
        tray: [
          card("2", "hearts"),
          card("3", "hearts"),
          card("K", "clubs"),
          card("K", "spades"),
        ],
        traySize: TRAY_SIZES.hard,
      },
    );

    pagodaRules.takeCard(state, A);
    expect(state.tray).toHaveLength(TRAY_SIZES.hard);
    expect(pagodaRules.isLost(state)).toBe(false);
  });
});

describe("Pagoda game", () => {
  test("clearing the last set wins", async () => {
    const cards = [
      card("8", "hearts"),
      card("8", "clubs"),
      card("8", "spades"),
    ];
    await renderGame(
      "/pagoda",
      Pagoda,
      stateWithBoard({ [A]: cards[0], [B]: cards[1], [C]: cards[2] }),
    );

    for (const c of cards) await pressCardId(c.id);

    expect(outcome()).toBe("won");
    const shrine = harness.mapConfig?.zones.find((z) => z.name === "shrine");
    expect(shrine?.cards).toHaveLength(3);
  });

  test("Hard loses on the fifth unmatched card", async () => {
    const last = card("5", "diamonds");
    await renderGame(
      "/pagoda",
      Pagoda,
      stateWithBoard(
        { [A]: card("J", "hearts"), [B]: last },
        {
          tray: [
            card("A", "hearts"),
            card("2", "hearts"),
            card("3", "hearts"),
            card("4", "hearts"),
          ],
          traySize: TRAY_SIZES.hard,
        },
      ),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(last.id);
    expect(outcome()).toBe("lost");
  });

  test.each(Object.entries(TRAY_SIZES))(
    "a new game on %s spreads the tray for %i cards",
    async (difficulty, traySize) => {
      await setGameSettings("/pagoda", {
        pagodaDifficulty: difficulty as keyof typeof TRAY_SIZES,
      });
      await renderGame("/pagoda", Pagoda);

      const tray = harness.mapConfig?.zones.find((z) => z.name === "tray");
      expect(tray?.fan?.offset).toBe(pagodaRules.trayOffset(traySize));
    },
  );
});

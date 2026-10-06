import { beforeEach, describe, expect, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlayingCard } from "@/components/Cards/card-utils";
import {
  bestClassicMove,
  findClassicHint,
  solveClassic,
  type ClassicBoard,
  type ClassicRules,
} from "@/hints/classic";
import { cardTarget, makeHint, zoneTarget, type Hint } from "@/hints/hint";
import {
  getActiveHint,
  hasHintFinder,
  requestHint,
  useHint,
} from "@/hints/hint-store";
import { locateHintTarget, visibleCardCenter } from "@/hints/locate";
import { bestLine } from "@/hints/lookahead";
import {
  getHintMode,
  loadHintMode,
  markHintIntroSeen,
  parseHintMode,
  saveHintMode,
} from "@/data/hint-mode";
import {
  HINT_BUTTON_STORAGE_KEY,
  HINT_INTRO_STORAGE_KEY,
} from "@/data/storage-keys";
import { isAutopilotSession, markAutopilotSession } from "@/hints/hint-store";
import { act, create } from "react-test-renderer";

let cardCount = 0;
function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  faceUp = true,
): PlayingCard {
  cardCount += 1;
  return { id: `${suit}-${rank}-${cardCount}`, rank, suit, faceUp };
}

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;
const value = (c: PlayingCard) => RANKS.indexOf(c.rank as never) + 1;
const red = (c: PlayingCard) => c.suit === "hearts" || c.suit === "diamonds";

// Klondike's rules, enough to judge moves with.
const klondike: ClassicRules = {
  toFoundation: (c, pile) => {
    const top = pile.at(-1);
    return top
      ? top.suit === c.suit && value(c) === value(top) + 1
      : c.rank === "A";
  },
  toTableau: (cards, pile) => {
    const top = pile.at(-1);
    if (!top) return cards[0].rank === "K";
    return red(cards[0]) !== red(top) && value(cards[0]) === value(top) - 1;
  },
  canLift: (pile, index) =>
    pile
      .slice(index)
      .every(
        (c, i, run) =>
          i === 0 ||
          (red(c) !== red(run[i - 1]) && value(c) === value(run[i - 1]) - 1),
      ),
};

const zones = {
  tableau: (pile: number) => `tableau-${pile}`,
  foundation: (pile: number) => `foundation-${pile}`,
};

describe("the hint store", () => {
  function Game({
    game,
    hint,
    enabled = true,
  }: {
    game: unknown;
    hint: () => Hint | null;
    enabled?: boolean;
  }) {
    useHint(hint, { game, enabled });
    return null;
  }

  test("there's no hint without a game that gives them", () => {
    expect(hasHintFinder()).toBe(false);
    expect(requestHint()).toBeNull();
  });

  test("a game's hint is shown, cleared by the next move, and gone with the game", async () => {
    const shown = makeHint("tapCard", zoneTarget("stock"));
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<Game game={1} hint={() => shown} />);
    });
    expect(hasHintFinder()).toBe(true);
    await act(async () => {
      expect(requestHint()).toEqual(shown);
    });
    expect(getActiveHint()?.hint).toEqual(shown);

    await act(async () => {
      renderer.update(<Game game={2} hint={() => shown} />);
    });
    expect(getActiveHint()).toBeNull();

    await act(async () => renderer.unmount());
    expect(hasHintFinder()).toBe(false);
  });

  test("no hint while the game says so, and a failing finder only gives none", async () => {
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <Game
          game={1}
          enabled={false}
          hint={() => makeHint("draw", zoneTarget("stock"))}
        />,
      );
    });
    expect(requestHint()).toBeNull();

    const original = console.warn;
    console.warn = () => {};
    await act(async () => {
      renderer.update(
        <Game
          game={1}
          hint={() => {
            throw new Error("bug");
          }}
        />,
      );
    });
    expect(requestHint()).toBeNull();
    console.warn = original;
    await act(async () => renderer.unmount());
  });
});

describe("where a hint is drawn", () => {
  const board = (cards: { x: number; y: number; zIndex: number }[]) => ({
    cards: cards.map((place, index) => ({
      ...place,
      card: { id: `c${index}` },
      zoneId: "pile",
    })),
    getZoneRect: (zoneId: string) =>
      zoneId === "slot" ? { x: 100, y: 0, width: 60, height: 90 } : null,
    cardWidth: 60,
    cardHeight: 90,
  });

  test("on a card's middle, or on the strip of it that shows in a fan", () => {
    const fanned = board([
      { x: 0, y: 0, zIndex: 1 },
      { x: 0, y: 20, zIndex: 2 },
    ]);
    expect(visibleCardCenter(fanned.cards[1], fanned)).toEqual({
      x: 30,
      y: 65,
    });
    const strip = visibleCardCenter(fanned.cards[0], fanned);
    expect(strip.y).toBeLessThan(20);
  });

  test("on a pile's top card, or an empty slot's middle", () => {
    const pile = board([
      { x: 0, y: 0, zIndex: 1 },
      { x: 0, y: 20, zIndex: 2 },
    ]);
    expect(locateHintTarget(zoneTarget("pile"), pile)).toEqual({
      x: 30,
      y: 65,
      size: 60,
    });
    expect(locateHintTarget(zoneTarget("slot"), pile)).toMatchObject({
      x: 130,
      y: 45,
    });
    expect(locateHintTarget(cardTarget("missing"), pile)).toBeNull();
  });
});

describe("hints for the classic patiences", () => {
  test("a safe foundation play comes first", () => {
    const ace = card("A", "spades");
    const board: ClassicBoard = {
      tableau: [[card("9", "hearts"), ace], [card("10", "spades")], []],
      foundations: [[], [], [], []],
    };
    expect(findClassicHint(board, klondike, zones)).toEqual(
      makeHint("toFoundation", cardTarget(ace), zoneTarget("foundation-0")),
    );
  });

  test("turning up a hidden card beats a plain build", () => {
    const eight = card("8", "spades");
    const board: ClassicBoard = {
      tableau: [
        [card("2", "clubs", false), eight],
        [card("9", "hearts")],
        [card("9", "diamonds")],
      ],
      foundations: [[], [], [], []],
      reserves: [[card("8", "clubs")]],
    };
    expect(bestClassicMove(board, klondike)?.move.cards[0]).toBe(eight);
  });

  test("the stock only when nothing on the table helps, and never pointless shuffles", () => {
    const board: ClassicBoard = {
      // The Queen already sits on a King: moving her to the other changes
      // nothing, and nor does moving a King to the empty column.
      tableau: [
        [card("K", "spades")],
        [],
        [card("K", "clubs"), card("Q", "hearts")],
      ],
      foundations: [[], [], [], []],
    };
    expect(
      findClassicHint(board, klondike, zones, {
        stock: { zone: "stock", message: "draw" },
      }),
    ).toEqual(makeHint("draw", zoneTarget("stock")));
  });

  test("with every card on view, a win is found and followed", () => {
    const board: ClassicBoard = {
      tableau: [
        [card("2", "hearts"), card("A", "spades")],
        [card("A", "hearts"), card("2", "spades")],
      ],
      foundations: [[], [], [], []],
    };
    const rules: ClassicRules = {
      ...klondike,
      toTableau: (cards, pile) =>
        pile.length === 0 ||
        klondike.toTableau(cards, pile, 0, board, {
          kind: "cell",
          cell: 0,
        }),
    };
    const { win } = solveClassic(board, rules);
    expect(win?.length).toBe(4);
  });
});

describe("looking ahead", () => {
  test("the line that goes furthest", () => {
    // From 0, steps of 1 or 2 towards 5: the longest line takes ones.
    const line = bestLine<number, number>(0, {
      moves: (at) => [1, 2].filter((step) => at + step <= 5),
      apply: (at, step) => at + step,
      score: (_, depth) => depth,
    });
    expect(line).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("the Help from Above setting", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("is Beacons unless the player chose otherwise, and remembered", async () => {
    expect(await loadHintMode()).toBe("beacons");
    await saveHintMode("autopilot");
    expect(getHintMode()).toBe("autopilot");
    expect(await AsyncStorage.getItem(HINT_BUTTON_STORAGE_KEY)).toBe(
      "autopilot",
    );
    expect(await loadHintMode()).toBe("autopilot");
    await saveHintMode("off");
    expect(await loadHintMode()).toBe("off");
  });

  test("reads the old Show hint button choice", async () => {
    expect(parseHintMode("0")).toBe("off");
    expect(parseHintMode("1")).toBe("beacons");
    expect(parseHintMode(null)).toBe("beacons");
    expect(parseHintMode("something else")).toBe("beacons");
    await AsyncStorage.setItem(HINT_BUTTON_STORAGE_KEY, "0");
    expect(await loadHintMode()).toBe("off");
  });

  test("remembers that the introduction was put away", async () => {
    await markHintIntroSeen();
    expect(await AsyncStorage.getItem(HINT_INTRO_STORAGE_KEY)).toBe("1");
  });
});

describe("Autopilot wins", () => {
  test("a deal Autopilot played in is remembered, others aren't", () => {
    expect(isAutopilotSession("deal-1")).toBe(false);
    markAutopilotSession("deal-1");
    expect(isAutopilotSession("deal-1")).toBe(true);
    expect(isAutopilotSession("deal-2")).toBe(false);
    expect(isAutopilotSession(undefined)).toBe(false);
  });
});

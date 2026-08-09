import { PlayingCard } from "@/components/Cards/card-utils";
import {
  JacksDreamGameState,
  jacksDreamRules,
} from "@/components/Games/JacksDream";

function card(
  rank: PlayingCard["rank"],
  id: string = rank,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit: "spades", faceUp };
}

function state(tableau: PlayingCard[][] = [[], [], [], [], []]) {
  return {
    tableau,
    hand: [card("J", "jack-1"), null, null, null],
    discard: [],
  } satisfies JacksDreamGameState;
}

describe("Jacks' Dream rules", () => {
  test("uses only Aces through eights and Jacks", () => {
    const game = jacksDreamRules.createInitialState();

    expect(game.discard).toHaveLength(36);
    expect(
      game.discard.every(
        (entry) =>
          ["A", "2", "3", "4", "5", "6", "7", "8", "J"].includes(entry.rank) &&
          !entry.faceUp,
      ),
    ).toBe(true);
  });

  test("deals five columns, two extras, and four Jacks in hand", () => {
    const dealt = jacksDreamRules.dealCards(
      jacksDreamRules.createInitialState().discard,
    );

    expect(dealt.tableau.map((pile) => pile.length)).toEqual([7, 6, 6, 6, 7]);
    expect(dealt.tableau.flat().every((entry) => entry.faceUp)).toBe(true);
    expect(dealt.hand.every((entry) => entry?.rank === "J")).toBe(true);
    expect(dealt.discard).toEqual([]);
  });

  test("moves a complete same-rank stack but rejects mixed stacks", () => {
    const game = state([
      [card("3", "3a"), card("3", "3b")],
      [card("3", "3c")],
      [],
      [],
      [],
    ]);

    expect(
      jacksDreamRules.canMove(
        { zone: "tableau", pileIndex: 0, cardIndex: 0 },
        1,
        game,
        false,
      ),
    ).toBe(true);

    game.tableau[0].push(card("4", "4a"));
    expect(
      jacksDreamRules.getSourceCards(
        { zone: "tableau", pileIndex: 0, cardIndex: 0 },
        game,
      ),
    ).toEqual([]);
  });

  test("turns four matching cards into one pillow and discards three", () => {
    const pile = [
      card("5", "5a"),
      card("5", "5b"),
      card("5", "5c"),
      card("5", "5d"),
    ];
    const discard: PlayingCard[] = [];

    expect(jacksDreamRules.collapseCompletedPile(pile, discard)).toBe(true);
    expect(pile).toHaveLength(1);
    expect(jacksDreamRules.isPillow(pile[0])).toBe(true);
    expect(discard).toHaveLength(3);
    expect(discard.every((entry) => !entry.faceUp)).toBe(true);
  });

  test("allows pillows only on empty columns or Jacks", () => {
    const pillow = card("6", "pillow", false);

    expect(jacksDreamRules.canMoveCardsToPile([pillow], [], false)).toBe(true);
    expect(
      jacksDreamRules.canMoveCardsToPile([pillow], [card("J")], false),
    ).toBe(true);
    expect(
      jacksDreamRules.canMoveCardsToPile([pillow], [card("6")], false),
    ).toBe(false);
    expect(
      jacksDreamRules.canMoveCardsToPile(
        [pillow],
        [card("7", "other-pillow", false)],
        false,
      ),
    ).toBe(false);
  });

  test("hard mode sees Jacks below pillows", () => {
    const destination = [card("J", "old-jack"), card("2", "pillow", false)];

    expect(jacksDreamRules.canPlaceJack(destination, false)).toBe(true);
    expect(jacksDreamRules.canPlaceJack(destination, true)).toBe(false);
  });

  test("recognizes only four pillow-Jack-pillow columns as a win", () => {
    const completedColumn = (index: number) => [
      card("2", `lower-${index}`, false),
      card("J", `jack-${index}`),
      card("3", `upper-${index}`, false),
    ];
    const game = state([
      completedColumn(0),
      completedColumn(1),
      completedColumn(2),
      completedColumn(3),
      [],
    ]);
    game.hand = [null, null, null, null];

    expect(jacksDreamRules.isWinningState(game)).toBe(true);
    game.tableau[4].push(card("4", "extra", false));
    expect(jacksDreamRules.isWinningState(game)).toBe(false);
  });
});

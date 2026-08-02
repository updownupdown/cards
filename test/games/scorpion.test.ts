import { type CardRank, type PlayingCard } from "@/components/Cards/card-utils";
import { scorpionRules } from "@/components/Games/Scorpion";

function card(
  rank: CardRank,
  suit: PlayingCard["suit"] = "spades",
  faceUp = true,
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function completeRun(
  suit: PlayingCard["suit"] = "spades",
  prefix: string = suit,
): PlayingCard[] {
  return scorpionRules.descendingRanks.map((rank, index) =>
    card(rank, suit, true, `${prefix}-${index}`),
  );
}

describe("Scorpion rules", () => {
  test("deals 49 tableau cards and three stock cards with the correct exposure", () => {
    const game = scorpionRules.createInitialState();
    const allCards = [...game.tableau.flat(), ...game.stock];

    expect(game.tableau.map((pile) => pile.length)).toEqual([
      7, 7, 7, 7, 7, 7, 7,
    ]);
    expect(game.stock).toHaveLength(3);
    expect(allCards).toHaveLength(52);
    expect(new Set(allCards.map(({ id }) => id)).size).toBe(52);
    expect(
      game.tableau
        .slice(0, 4)
        .every((pile) => pile.slice(0, 3).every(({ faceUp }) => !faceUp)),
    ).toBe(true);
    expect(
      game.tableau
        .slice(0, 4)
        .every((pile) => pile.slice(3).every(({ faceUp }) => faceUp)),
    ).toBe(true);
    expect(
      game.tableau
        .slice(4)
        .flat()
        .every(({ faceUp }) => faceUp),
    ).toBe(true);
  });

  test("allows only Kings on an empty tableau column", () => {
    expect(scorpionRules.canAttachToTableau(card("K"))).toBe(true);
    expect(scorpionRules.canAttachToTableau(card("Q"))).toBe(false);
  });

  test("attaches one rank down in the same suit to a face-up card", () => {
    expect(scorpionRules.canAttachToTableau(card("6"), card("7"))).toBe(true);
    expect(
      scorpionRules.canAttachToTableau(card("6", "hearts"), card("7")),
    ).toBe(false);
    expect(scorpionRules.canAttachToTableau(card("5"), card("7"))).toBe(false);
    expect(
      scorpionRules.canAttachToTableau(card("6"), card("7", "spades", false)),
    ).toBe(false);
  });

  test("flips a newly exposed tableau top without mutating the input", () => {
    const hidden = card("9", "clubs", false);
    const column = [hidden];
    const normalized = scorpionRules.normalizeColumn(column);

    expect(normalized[0].faceUp).toBe(true);
    expect(column[0].faceUp).toBe(false);
  });

  test("recognizes only a face-up same-suit King-to-Ace run", () => {
    expect(scorpionRules.isCompleteSuitRun(completeRun())).toBe(true);
    expect(
      scorpionRules.isCompleteSuitRun([
        ...completeRun().slice(0, 12),
        card("A", "hearts"),
      ]),
    ).toBe(false);
    expect(
      scorpionRules.isCompleteSuitRun(
        completeRun().map((candidate, index) =>
          index === 5 ? { ...candidate, faceUp: false } : candidate,
        ),
      ),
    ).toBe(false);
    expect(scorpionRules.isCompleteSuitRun(completeRun().slice(1))).toBe(false);
  });

  test("moves completed runs and reveals the newly exposed card", () => {
    const hidden = card("4", "hearts", false, "hidden");
    const tableau = [[hidden, ...completeRun()], [], [], [], [], [], []];
    const foundations: PlayingCard[][] = [[], [], [], []];

    scorpionRules.moveCompletedRunsToFoundations(tableau, foundations);

    expect(foundations[0]).toHaveLength(13);
    expect(scorpionRules.isCompleteSuitRun(foundations[0])).toBe(true);
    expect(tableau[0]).toEqual([{ ...hidden, faceUp: true }]);
  });

  test("cascades multiple completed runs from one column", () => {
    const tableau = [
      [...completeRun("hearts", "lower"), ...completeRun("clubs", "upper")],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    const foundations: PlayingCard[][] = [[], [], [], []];

    scorpionRules.moveCompletedRunsToFoundations(tableau, foundations);

    expect(tableau[0]).toEqual([]);
    expect(foundations.filter((pile) => pile.length === 13)).toHaveLength(2);
  });
});

import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type PyramidCard,
  type PyramidGameState,
  pyramidRules,
} from "@/components/Games/Pyramid";

function card(
  rank: PlayingCard["rank"],
  row: number,
  col: number,
  id: string = `${rank}-${row}-${col}`,
): PyramidCard {
  return { id, rank, suit: "hearts", faceUp: true, row, col };
}

function state(overrides: Partial<PyramidGameState> = {}): PyramidGameState {
  return {
    pyramid: [],
    waste: [],
    discard: [],
    stockCount: 0,
    ...overrides,
  };
}

describe("Pyramid rules", () => {
  test("defines a seven-row, 28-card pyramid", () => {
    expect(pyramidRules.pyramidRows).toBe(7);
    expect(pyramidRules.pyramidSize).toBe(28);
  });

  test("exposes base cards and cards whose two blockers are gone", () => {
    const target = card("7", 5, 2, "target");
    const leftBlocker = card("2", 6, 2, "left");
    const rightBlocker = card("3", 6, 3, "right");

    expect(
      pyramidRules.isCardExposed(target, [target, leftBlocker, rightBlocker]),
    ).toBe(false);
    expect(pyramidRules.isCardExposed(target, [target, null, null])).toBe(true);
    expect(
      pyramidRules.isCardExposed(leftBlocker, [leftBlocker, rightBlocker]),
    ).toBe(true);
  });

  test("allows a card covered only by the selected card in easy mode", () => {
    const covered = card("8", 5, 0, "covered");
    const selectedBlocker = card("5", 6, 0, "selected-blocker");

    expect(
      pyramidRules.isPyramidCardSelectable(
        covered,
        [covered, selectedBlocker, null],
        selectedBlocker,
        "easy",
      ),
    ).toBe(true);
    expect(
      pyramidRules.isPyramidCardSelectable(
        covered,
        [covered, selectedBlocker, null],
        selectedBlocker,
        "hard",
      ),
    ).toBe(false);
  });

  test("finds an exposed King in the pyramid or waste", () => {
    expect(
      pyramidRules.hasAvailableMove(
        state({ pyramid: [card("K", 6, 0, "king")] }),
      ),
    ).toBe(true);

    expect(
      pyramidRules.hasAvailableMove(
        state({ waste: [{ ...card("K", 0, 0, "waste-king") }] }),
      ),
    ).toBe(true);
  });

  test("finds exposed pairs totaling 13, including the waste top", () => {
    expect(
      pyramidRules.hasAvailableMove(
        state({
          pyramid: [card("5", 6, 0, "five"), card("8", 6, 1, "eight")],
        }),
      ),
    ).toBe(true);

    expect(
      pyramidRules.hasAvailableMove(
        state({
          pyramid: [card("6", 6, 0, "six")],
          waste: [card("2", 0, 0, "covered-waste"), card("7", 0, 0, "seven")],
        }),
      ),
    ).toBe(true);
  });

  test("rejects covered matches and non-matching exposed cards", () => {
    const covered = card("5", 5, 0, "covered-five");
    const blocker = card("2", 6, 0, "blocker");
    const otherBlocker = card("3", 6, 1, "other-blocker");

    expect(
      pyramidRules.hasAvailableMove(
        state({
          pyramid: [covered, blocker, otherBlocker],
          waste: [card("8", 0, 0, "eight")],
        }),
      ),
    ).toBe(false);
  });

  test("finds easy-mode pairs where the first card covers the second", () => {
    const coveredEight = card("8", 5, 0, "covered-eight");
    const exposedFive = card("5", 6, 0, "exposed-five");

    expect(
      pyramidRules.hasAvailableMove(
        state({ pyramid: [coveredEight, exposedFive, null] }),
        "hard",
      ),
    ).toBe(false);
    expect(
      pyramidRules.hasAvailableMove(
        state({ pyramid: [coveredEight, exposedFive, null] }),
        "easy",
      ),
    ).toBe(true);
  });
});

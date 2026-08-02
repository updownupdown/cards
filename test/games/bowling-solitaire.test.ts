import { type CardRank, type PlayingCard } from "@/components/Cards/card-utils";
import {
  bowlingSolitaireRules,
  type BowlingSolitaireFrame,
} from "@/components/Games/BowlingSolitaire";

function card(rank: CardRank, id: string = rank): PlayingCard {
  return { id, rank, suit: "hearts", faceUp: true };
}

function frame(
  overrides: Partial<BowlingSolitaireFrame> = {},
): BowlingSolitaireFrame {
  return {
    ball1Pins: null,
    ball1Type: null,
    ball2Pins: null,
    ball2Type: null,
    mark: null,
    score: null,
    ...overrides,
  };
}

function fullPins(): PlayingCard[] {
  return Array.from({ length: 10 }, (_, index) => card("5", `pin-${index}`));
}

describe("Bowling Solitaire rules", () => {
  test("reads pin values and counts knocked pins", () => {
    expect(bowlingSolitaireRules.getCardValue(card("10"))).toBe(10);
    expect(bowlingSolitaireRules.getCardValue(null)).toBe(0);
    expect(
      bowlingSolitaireRules.countKnockedPins([
        card("2"),
        null,
        card("3"),
        null,
      ]),
    ).toBe(2);
  });

  test.each([
    [[0], true],
    [[0, 1, 3], true],
    [[0, 5], false],
    [[6, 7, 8, 9], true],
  ])("checks whether pin selection %j is connected", (indices, expected) => {
    expect(bowlingSolitaireRules.isSelectionConnected(indices)).toBe(expected);
  });

  test("enforces first-turn pin restrictions", () => {
    const pins = fullPins();

    expect(
      bowlingSolitaireRules.isValidPinCombo({
        combo: [0],
        pins,
        isFirstTurnOfFrame: true,
      }),
    ).toBe(true);
    expect(
      bowlingSolitaireRules.isValidPinCombo({
        combo: [4],
        pins,
        isFirstTurnOfFrame: true,
      }),
    ).toBe(false);
    expect(
      bowlingSolitaireRules.isValidPinCombo({
        combo: [6],
        pins,
        isFirstTurnOfFrame: true,
      }),
    ).toBe(false);
  });

  test("requires later selections to touch a knocked pin", () => {
    const pins: (PlayingCard | null)[] = fullPins();
    pins[0] = null;

    expect(bowlingSolitaireRules.isAdjacentToEmptyPin(1, pins)).toBe(true);
    expect(
      bowlingSolitaireRules.isValidPinCombo({
        combo: [1],
        pins,
        isFirstTurnOfFrame: false,
      }),
    ).toBe(true);
    expect(
      bowlingSolitaireRules.isValidPinCombo({
        combo: [5],
        pins,
        isFirstTurnOfFrame: false,
      }),
    ).toBe(false);
  });

  test("limits incremental selections to three connected pins", () => {
    const pins = fullPins();

    expect(
      bowlingSolitaireRules.canAddPinToSelection({
        pinIdx: 3,
        selectedPins: [0, 1],
        pins,
        isFirstTurnOfFrame: true,
      }),
    ).toBe(true);
    expect(
      bowlingSolitaireRules.canAddPinToSelection({
        pinIdx: 5,
        selectedPins: [0, 1, 3],
        pins,
        isFirstTurnOfFrame: true,
      }),
    ).toBe(false);
    expect(
      bowlingSolitaireRules.canPinBeSelectedThisTurn({
        pinIdx: 6,
        pins,
        isFirstTurnOfFrame: true,
      }),
    ).toBe(false);
  });

  test("collects strike bonus values from later frames", () => {
    const frames = [
      frame({ ball1Pins: 10, ball1Type: "strike" }),
      frame({ ball1Pins: 10, ball1Type: "strike" }),
      frame({ ball1Pins: 4, ball1Type: "regular" }),
    ];

    expect(bowlingSolitaireRules.getNextBallValues(frames, 0, 2, [])).toEqual([
      10, 4,
    ]);
  });

  test("calculates cumulative strike, spare, and open-frame scores", () => {
    const frames = [
      frame({ ball1Pins: 10, ball1Type: "strike", mark: "strike" }),
      frame({
        ball1Pins: 4,
        ball1Type: "regular",
        ball2Pins: 6,
        ball2Type: "spare",
      }),
      frame({
        ball1Pins: 3,
        ball1Type: "regular",
        ball2Pins: 2,
        ball2Type: "regular",
      }),
    ];

    expect(bowlingSolitaireRules.recalculateScores(frames, [])).toBe(38);
    expect(frames.map((entry) => entry.score)).toEqual([20, 33, 38]);
  });

  test("scores a perfect game as 300", () => {
    const frames = Array.from({ length: 10 }, () =>
      frame({ ball1Pins: 10, ball1Type: "strike", mark: "strike" }),
    );

    expect(bowlingSolitaireRules.recalculateScores(frames, [10, 10])).toBe(300);
    expect(frames[9].score).toBe(300);
  });
});

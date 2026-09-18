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
  outcome,
  pressButton,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Bowling from "@/components/Games/Bowling";
import Canfield from "@/components/Games/Canfield";
import Klondike from "@/components/Games/Klondike";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// The last king goes up by hand; a face-down card elsewhere keeps
// auto-complete from finishing the game before the test moves.
function lastKingFoundations() {
  return [
    run("hearts"),
    run("clubs"),
    run("diamonds"),
    run("spades", "A", "Q"),
  ];
}

describe("Klondike (no lose condition)", () => {
  test("playing the last king to the foundations wins", async () => {
    const tableau = Array.from({ length: 7 }, () => [] as PlayingCard[]);
    tableau[0] = [card("K", "spades")];
    tableau[1] = [card("5", "clubs", false)];
    await renderGame("/klondike", Klondike, {
      tableau,
      stock: [],
      waste: [],
      foundations: lastKingFoundations(),
      drawCount: 1,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pileIndex: 0, cardIndex: 0 },
      { zone: "foundation", pileIndex: 3 },
    );

    expect(outcome()).toBe("won");
  });
});

describe("Canfield (no lose condition)", () => {
  test("playing the last king to the foundations wins", async () => {
    const tableau = Array.from({ length: 4 }, () => [] as PlayingCard[]);
    tableau[0] = [card("K", "spades")];
    tableau[1] = [card("5", "clubs")];
    await renderGame("/canfield", Canfield, {
      foundations: lastKingFoundations(),
      baseRank: "A",
      reserve: [],
      tableau,
      stock: [card("7", "hearts", false)],
      waste: [],
      drawCount: 1,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pileIndex: 0, cardIndex: 0 },
      { zone: "foundation", pileIndex: 3 },
    );

    expect(outcome()).toBe("won");
  });
});

describe("Bowling", () => {
  const openFrame = () => ({
    ball1Pins: 3,
    ball1Type: "regular",
    ball2Pins: 2,
    ball2Type: "regular",
    mark: null,
    score: null,
  });
  const strikeFrame = () => ({
    ball1Pins: 10,
    ball1Type: "strike",
    ball2Pins: null,
    ball2Type: null,
    mark: "strike",
    score: null,
  });

  // Ends ball 2 of frame 10 (3 + 2 pins); earlier frames set the score.
  async function finishTenthFrame(earlierFrame: () => object) {
    const frames: object[] = Array.from({ length: 9 }, earlierFrame);
    frames.push({ ...openFrame(), ball2Pins: null, ball2Type: null });

    const pins: (PlayingCard | null)[] = Array(10).fill(null);
    [6, 7, 8, 9].forEach((pinIdx, index) => {
      pins[pinIdx] = card(String(index + 2) as PlayingCard["rank"], "hearts");
    });

    const renderer = await renderGame("/bowling", Bowling, {
      pins,
      ballPiles: [
        [card("4", "clubs")],
        [card("6", "clubs")],
        [card("8", "clubs")],
      ],
      discard: [],
      frames,
      currentFrame: 9,
      currentBall: 2,
      phase: "ballSelect",
      selectedBallPile: null,
      selectedPins: [],
      ballStartKnockedCount: 3,
      isFirstTurnOfFrame: false,
      bonusBallsRemaining: 0,
      bonusRolls: [],
      totalScore: 0,
      winLoseMessage: "",
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "End Ball");
  }

  test("finishing with 120 or more wins", async () => {
    // Nine strikes then 3 + 2 score 253.
    await finishTenthFrame(strikeFrame);

    expect(outcome()).toBe("won");
  });

  test("finishing below 120 loses", async () => {
    // Ten open frames of 5 score 50.
    await finishTenthFrame(openFrame);

    expect(outcome()).toBe("lost");
  });
});

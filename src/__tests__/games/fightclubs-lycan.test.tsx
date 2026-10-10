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
  outcome,
  pressButton,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import FightClubs from "@/components/Games/FightClubs";
import Lycan from "@/components/Games/Lycan";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Fight Clubs", () => {
  async function matchWithLastClub(grid: (PlayingCard | null)[]) {
    const club = card("5", "clubs");
    const renderer = await renderGame("/fight-clubs", FightClubs, {
      clubsDeck: [],
      gridDeck: [],
      hand: [club],
      grid,
      discard: [],
      ended: false,
      won: false,
      winLoseMessage: "",
    });
    expect(outcome()).toBe("playing");

    await pressCardId(club.id);
    await pressButton(renderer, "Match");
  }

  test("clearing the grid wins", async () => {
    const grid: (PlayingCard | null)[] = Array(9).fill(null);
    grid[0] = card("5", "hearts");

    await matchWithLastClub(grid);

    expect(outcome()).toBe("won");
  });

  test("spending the last club with cards left loses", async () => {
    const grid: (PlayingCard | null)[] = Array(9).fill(null);
    grid[0] = card("5", "hearts");
    grid[1] = card("9", "diamonds");

    await matchWithLastClub(grid);

    expect(outcome()).toBe("lost");
  });
});

describe("Lycan", () => {
  const roundState = {
    discard: [],
    round: 4,
    roundOver: false,
    roundWon: false,
    roundPoints: 0,
    ended: false,
    won: false,
    mode: "medium",
  };

  test("reaching 100 points wins", async () => {
    // Matching the wolf's only card ends the round; 9 + the drawn 2 scores 11.
    const playerFive = card("5", "spades");
    const wolfFive = card("5", "hearts");
    const renderer = await renderGame("/lycan", Lycan, {
      ...roundState,
      deck: [card("2", "clubs", false)],
      player: [playerFive, card("9", "hearts")],
      wolf: [wolfFive],
      playerScore: 95,
      wolfScore: 20,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(playerFive.id);
    await pressCardId(wolfFive.id);
    await pressButton(renderer, "Perfect");

    expect(outcome()).toBe("won");
  });

  test("the wolf reaching 100 points loses", async () => {
    const renderer = await renderGame("/lycan", Lycan, {
      ...roundState,
      deck: [card("2", "clubs", false)],
      player: [card("3", "spades")],
      wolf: [card("9", "hearts")],
      playerScore: 20,
      wolfScore: 95,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Fold");

    expect(outcome()).toBe("lost");
  });

  test("emptying your hand folds by itself", async () => {
    // A lone 9 splits the Wolf's 4 and 5; the Wolf keeps its 3 and draws the
    // 2, scoring 5 to reach 100.
    const nine = card("9", "spades");
    const wolfFour = card("4", "hearts");
    const wolfFive = card("5", "clubs");
    const renderer = await renderGame("/lycan", Lycan, {
      ...roundState,
      deck: [card("2", "clubs", false)],
      player: [nine],
      wolf: [card("3", "diamonds"), wolfFour, wolfFive],
      playerScore: 20,
      wolfScore: 95,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(nine.id);
    await pressCardId(wolfFour.id);
    await pressCardId(wolfFive.id);
    await pressButton(renderer, "Split");

    expect(outcome()).toBe("lost");
  });
});

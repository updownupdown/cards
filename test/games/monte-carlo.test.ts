import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  monteCarloRules,
  type MonteCarloGameState,
} from "@/components/Games/MonteCarlo";
import {
  createSeededRandom,
  runSeededGames,
  type GameModel,
} from "../framework/game-model";

function card(
  rank: PlayingCard["rank"],
  id: string = rank,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit: "spades", faceUp };
}

function grid(entries: Record<number, PlayingCard> = {}) {
  const result: (PlayingCard | null)[] = Array(25).fill(null);
  for (const [index, entry] of Object.entries(entries)) {
    result[Number(index)] = entry;
  }
  return result;
}

function state(
  overrides: Partial<MonteCarloGameState> = {},
): MonteCarloGameState {
  return {
    grid: grid(),
    draw: [],
    trash: [],
    ended: false,
    won: false,
    ...overrides,
  };
}

type MonteCarloAction =
  | { type: "pair"; first: number; second: number }
  | { type: "consolidate" };

const monteCarloModel: GameModel<
  MonteCarloGameState,
  MonteCarloAction,
  "won" | "lost"
> = {
  getActions: (game) => [
    ...monteCarloRules.getPairActions(game.grid).map(([first, second]) => ({
      type: "pair" as const,
      first,
      second,
    })),
    ...(monteCarloRules.hasFaceDownCards(game.grid)
      ? [{ type: "consolidate" as const }]
      : []),
  ],
  applyAction: (game, action) => {
    const next = structuredClone(game);
    if (action.type === "pair") {
      monteCarloRules.flipPairAction(next, action.first, action.second);
    } else {
      monteCarloRules.consolidateAndDealAction(next);
    }
    return next;
  },
  getOutcome: (game) => (game.ended ? (game.won ? "won" : "lost") : null),
  getStateKey: (game) =>
    JSON.stringify({
      grid: game.grid.map((entry) => (entry ? [entry.id, entry.faceUp] : null)),
      draw: game.draw.map(({ id }) => id),
      trash: game.trash.map(({ id }) => id),
      ended: game.ended,
      won: game.won,
    }),
  assertInvariants: (game) => {
    const cards = [
      ...game.grid.filter((entry): entry is PlayingCard => entry !== null),
      ...game.draw,
      ...game.trash,
    ];
    expect(game.grid).toHaveLength(25);
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map(({ id }) => id)).size).toBe(52);
  },
};

describe("Monte Carlo rules", () => {
  test.each([
    [0, 1],
    [0, 5],
    [0, 6],
    [12, 18],
  ])("treats %i and %i as adjacent", (first, second) => {
    expect(monteCarloRules.isAdjacent(first, second)).toBe(true);
  });

  test.each([
    [0, 0],
    [4, 5],
    [0, 2],
    [0, 10],
  ])("does not treat %i and %i as adjacent", (first, second) => {
    expect(monteCarloRules.isAdjacent(first, second)).toBe(false);
  });

  test("finds only adjacent cards of matching rank", () => {
    expect(
      monteCarloRules.hasPair(
        grid({ 0: card("7", "first"), 6: card("7", "second") }),
      ),
    ).toBe(true);
    expect(
      monteCarloRules.hasPair(
        grid({ 0: card("7", "first"), 1: card("8", "second") }),
      ),
    ).toBe(false);
    expect(
      monteCarloRules.hasPair(
        grid({ 0: card("7", "first"), 2: card("7", "second") }),
      ),
    ).toBe(false);
  });

  test("counts face-up and face-down grid cards separately", () => {
    const cards = grid({
      0: card("4", "up"),
      1: card("5", "down", false),
    });

    expect(monteCarloRules.countCards(cards)).toBe(1);
    expect(monteCarloRules.countFaceDownCardsInGrid(cards)).toBe(1);
    expect(monteCarloRules.hasFaceDownCards(cards)).toBe(true);
  });

  test.each([
    [state(), { ended: true, won: true }],
    [
      state({ grid: grid({ 0: card("3", "only") }) }),
      { ended: true, won: false },
    ],
    [
      state({
        grid: grid({ 0: card("9", "first"), 1: card("9", "second") }),
      }),
      { ended: false, won: false },
    ],
  ])("evaluates terminal and ongoing boards", (game, expected) => {
    expect(monteCarloRules.evaluateEnd(game)).toEqual(expected);
  });

  test("flips a legal pair and atomically consolidates and deals", () => {
    const game = state({
      grid: grid({
        0: card("7", "first"),
        1: card("7", "second"),
        2: card("9", "kept"),
      }),
      draw: [card("K", "drawn", false)],
    });

    expect(monteCarloRules.flipPairAction(game, 0, 1)).toBe(true);
    expect(monteCarloRules.consolidateAndDealAction(game)).toBe(true);
    expect(game.trash.map(({ id }) => id)).toEqual(["first", "second"]);
    expect(game.grid[0]?.id).toBe("kept");
    expect(game.grid[1]).toMatchObject({ id: "drawn", faceUp: true });
    expect(game.draw).toEqual([]);
  });

  test("marks an initial deal with no adjacent pair as lost", () => {
    const cards = Array.from({ length: 25 }, (_, index) =>
      card(String((index % 13) + 1) as PlayingCard["rank"], `card-${index}`),
    );
    const deadGrid = grid(
      Object.fromEntries(cards.map((entry, index) => [index, entry])),
    );
    const game = state({ grid: deadGrid });

    expect(monteCarloRules.evaluateEnd(game)).toEqual({
      ended: true,
      won: false,
    });
  });

  test("runs reproducible seeded full-game campaigns without dead ends", () => {
    const runCampaign = () =>
      runSeededGames(
        (_seed, random) => ({
          model: monteCarloModel,
          initialState: monteCarloRules.createGame(undefined, random),
        }),
        { runs: 100, startSeed: 1, maxSteps: 200, checkMutations: true },
      );

    const first = runCampaign();
    const second = runCampaign();

    expect(first.every(({ status }) => status === "terminal")).toBe(true);
    expect(
      first.map(({ seed, outcome, actions }) => ({ seed, outcome, actions })),
    ).toEqual(
      second.map(({ seed, outcome, actions }) => ({ seed, outcome, actions })),
    );
    expect(createSeededRandom(1)()).toBe(createSeededRandom(1)());
  });
});

import {
  createSeededRandom,
  enumerateCombinations,
  exploreGame,
  runSeededGames,
  simulateGame,
  type GameModel,
} from "./game-model";

type CountState = { count: number };
type CountOutcome = "exact" | "overshot";

const countModel: GameModel<CountState, 1 | 2, CountOutcome> = {
  getActions: (state) => (state.count < 4 ? [1, 2] : []),
  applyAction: (state, action) => ({ count: state.count + action }),
  getOutcome: (state) =>
    state.count === 4 ? "exact" : state.count > 4 ? "overshot" : null,
  getStateKey: (state) => String(state.count),
  assertInvariants: (state) => {
    expect(state.count).toBeGreaterThanOrEqual(0);
  },
};

describe("game simulation framework", () => {
  test("explores every reachable outcome without revisiting states", () => {
    const result = exploreGame(
      countModel,
      { count: 0 },
      {
        checkMutations: true,
      },
    );

    expect([...result.outcomes.keys()].sort()).toEqual(["exact", "overshot"]);
    expect(result.deadEnds).toHaveLength(0);
    expect(result.truncatedPaths).toHaveLength(0);
    expect(result.visitedStates).toBe(6);
    expect(result.outcomes.get("exact")?.example).toEqual([2, 2]);
  });

  test("reports unfinished games instead of treating them as losses", () => {
    const result = simulateGame(countModel, { count: 0 }, { maxSteps: 1 });

    expect(result.status).toBe("step-limit");
    expect(result.actions).toEqual([1]);
  });

  test("replays random choices from the same seed", () => {
    const first = createSeededRandom(42);
    const second = createSeededRandom(42);

    expect(Array.from({ length: 10 }, first)).toEqual(
      Array.from({ length: 10 }, second),
    );
  });

  test("records the seed and path for randomized campaigns", () => {
    const results = runSeededGames(
      () => ({ model: countModel, initialState: { count: 0 } }),
      { runs: 5, startSeed: 20 },
    );

    expect(results.map((result) => result.seed)).toEqual([20, 21, 22, 23, 24]);
    expect(results.every((result) => result.status === "terminal")).toBe(true);
  });

  test("enumerates bounded card-selection combinations", () => {
    expect(enumerateCombinations(["A", "B", "C"], { maxSize: 2 })).toEqual([
      ["A"],
      ["A", "B"],
      ["A", "C"],
      ["B"],
      ["B", "C"],
      ["C"],
    ]);
  });

  test("mutation checks catch mutating transition implementations", () => {
    const mutatingModel: GameModel<CountState, 1, "done"> = {
      getActions: () => [1],
      applyAction: (state) => {
        (state as CountState).count += 1;
        return state as CountState;
      },
      getOutcome: (state) => (state.count > 0 ? "done" : null),
      getStateKey: (state) => String(state.count),
    };

    expect(() =>
      simulateGame(mutatingModel, { count: 0 }, { checkMutations: true }),
    ).toThrow("applyAction mutated its input state");
  });

  test("seeded failures identify the deal that must be replayed", () => {
    expect(() =>
      runSeededGames(
        () => ({
          initialState: { count: -1 },
          model: countModel,
        }),
        { runs: 1, startSeed: 77 },
      ),
    ).toThrow("seed 77");
  });
});

export type RandomSource = () => number;

export type GameModel<State, Action, Outcome extends string> = {
  getActions: (state: Readonly<State>) => readonly Action[];
  applyAction: (state: Readonly<State>, action: Action) => State;
  getOutcome: (state: Readonly<State>) => Outcome | null;
  getStateKey: (state: Readonly<State>) => string;
  assertInvariants?: (state: Readonly<State>) => void;
};

export type SimulationResult<State, Action, Outcome extends string> = {
  status: "terminal" | "dead-end" | "step-limit";
  state: State;
  actions: Action[];
  outcome: Outcome | null;
};

export type ExplorationResult<Action, Outcome extends string> = {
  visitedStates: number;
  exploredTransitions: number;
  deadEnds: Action[][];
  truncatedPaths: Action[][];
  outcomes: Map<Outcome, { states: number; example: Action[] }>;
};

export function createSeededRandom(seed: number): RandomSource {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function chooseRandomAction<Action>(
  actions: readonly Action[],
  random: RandomSource,
): Action {
  if (actions.length === 0) {
    throw new Error("Cannot choose an action from an empty list");
  }

  return actions[Math.floor(random() * actions.length)];
}

export function enumerateCombinations<T>(
  items: readonly T[],
  options: { minSize?: number; maxSize?: number } = {},
) {
  const minSize = options.minSize ?? 1;
  const maxSize = Math.min(options.maxSize ?? items.length, items.length);
  const combinations: T[][] = [];

  function visit(start: number, selected: T[]) {
    if (selected.length >= minSize) combinations.push([...selected]);
    if (selected.length === maxSize) return;

    for (let index = start; index < items.length; index += 1) {
      selected.push(items[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  }

  visit(0, []);
  return combinations;
}

function applyChecked<State, Action, Outcome extends string>(
  model: GameModel<State, Action, Outcome>,
  state: State,
  action: Action,
  checkMutation: boolean | undefined,
) {
  const stateBefore = checkMutation ? JSON.stringify(state) : undefined;
  const nextState = model.applyAction(state, action);
  if (stateBefore !== undefined && JSON.stringify(state) !== stateBefore) {
    throw new Error("applyAction mutated its input state");
  }

  return nextState;
}

export function simulateGame<State, Action, Outcome extends string>(
  model: GameModel<State, Action, Outcome>,
  initialState: State,
  options: {
    maxSteps?: number;
    chooseAction?: (
      actions: readonly Action[],
      state: Readonly<State>,
      step: number,
    ) => Action;
    checkMutations?: boolean;
  } = {},
): SimulationResult<State, Action, Outcome> {
  const maxSteps = options.maxSteps ?? 1_000;
  const actionsTaken: Action[] = [];
  let state = initialState;

  for (let step = 0; step <= maxSteps; step += 1) {
    try {
      model.assertInvariants?.(state);
    } catch (error) {
      throw new Error(
        `Simulation failed at step ${step} after actions ${JSON.stringify(actionsTaken)}`,
        { cause: error },
      );
    }
    const outcome = model.getOutcome(state);

    if (outcome !== null) {
      return { status: "terminal", state, actions: actionsTaken, outcome };
    }

    const actions = model.getActions(state);
    if (actions.length === 0) {
      return {
        status: "dead-end",
        state,
        actions: actionsTaken,
        outcome: null,
      };
    }

    if (step === maxSteps) {
      break;
    }

    const action = options.chooseAction
      ? options.chooseAction(actions, state, step)
      : actions[0];
    try {
      state = applyChecked(model, state, action, options.checkMutations);
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : "";
      throw new Error(
        `Simulation failed applying action ${JSON.stringify(action)} at step ${step}${detail}`,
        { cause: error },
      );
    }
    actionsTaken.push(action);
  }

  return {
    status: "step-limit",
    state,
    actions: actionsTaken,
    outcome: null,
  };
}

export function exploreGame<State, Action, Outcome extends string>(
  model: GameModel<State, Action, Outcome>,
  initialState: State,
  options: {
    maxDepth?: number;
    maxStates?: number;
    checkMutations?: boolean;
  } = {},
): ExplorationResult<Action, Outcome> {
  const maxDepth = options.maxDepth ?? 100;
  const maxStates = options.maxStates ?? 100_000;
  const queue: { state: State; actions: Action[] }[] = [
    { state: initialState, actions: [] },
  ];
  const seen = new Set<string>();
  const deadEnds: Action[][] = [];
  const truncatedPaths: Action[][] = [];
  const outcomes = new Map<Outcome, { states: number; example: Action[] }>();
  let exploredTransitions = 0;

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex];
    const stateKey = model.getStateKey(current.state);
    if (seen.has(stateKey)) continue;

    if (seen.size >= maxStates) {
      throw new Error(`State exploration exceeded maxStates (${maxStates})`);
    }

    seen.add(stateKey);
    model.assertInvariants?.(current.state);

    const outcome = model.getOutcome(current.state);
    if (outcome !== null) {
      const existing = outcomes.get(outcome);
      outcomes.set(outcome, {
        states: (existing?.states ?? 0) + 1,
        example: existing?.example ?? current.actions,
      });
      continue;
    }

    const actions = model.getActions(current.state);
    if (actions.length === 0) {
      deadEnds.push(current.actions);
      continue;
    }

    if (current.actions.length >= maxDepth) {
      truncatedPaths.push(current.actions);
      continue;
    }

    for (const action of actions) {
      exploredTransitions += 1;
      queue.push({
        state: applyChecked(
          model,
          current.state,
          action,
          options.checkMutations,
        ),
        actions: [...current.actions, action],
      });
    }
  }

  return {
    visitedStates: seen.size,
    exploredTransitions,
    deadEnds,
    truncatedPaths,
    outcomes,
  };
}

export function runSeededGames<State, Action, Outcome extends string>(
  createModelAndState: (
    seed: number,
    random: RandomSource,
  ) => {
    model: GameModel<State, Action, Outcome>;
    initialState: State;
  },
  options: {
    runs: number;
    startSeed?: number;
    maxSteps?: number;
    checkMutations?: boolean;
  },
) {
  const results: (SimulationResult<State, Action, Outcome> & {
    seed: number;
  })[] = [];

  for (let offset = 0; offset < options.runs; offset += 1) {
    const seed = (options.startSeed ?? 1) + offset;
    const random = createSeededRandom(seed);
    const { model, initialState } = createModelAndState(seed, random);
    try {
      const result = simulateGame(model, initialState, {
        maxSteps: options.maxSteps,
        checkMutations: options.checkMutations,
        chooseAction: (actions) => chooseRandomAction(actions, random),
      });
      results.push({ ...result, seed });
    } catch (error) {
      throw new Error(`Seeded simulation failed for seed ${seed}`, {
        cause: error,
      });
    }
  }

  return results;
}

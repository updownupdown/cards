# Testing card games

The suite uses Jest through `jest-expo` and React Native Testing Library. Tests
live outside `src/app` because Expo Router treats every file in that directory as
a route.

## Test layers

1. **Pure rules:** Test legal moves, scoring, card movement, setup, and terminal
   conditions without rendering React. Most game coverage belongs here.
2. **Model simulation:** Explore every reachable state for small state spaces and
   run reproducible seeded playouts for shuffled or very large games.
3. **Shared hooks and components:** Test undo, persistence, settings, modal
   policies, timers, and animation lifecycle with React Native Testing Library.
4. **Input integration:** Test that taps and drag/drop resolve the intended source
   and target, then call the same pure move validator used by rule tests.
5. **End to end:** Keep a small Maestro or browser suite for routing, real gestures,
   native animation, and one win/loss flow. Unit tests cannot validate native
   gesture recognition or visual stacking.

Snapshots are not the primary strategy. Gameplay assertions should describe
state and behavior.

## File layout

```text
src/components/Games/*.tsx      UI and game-specific rules in one file
src/hooks/state-history.ts      Shared undo policy
test/framework/game-model.ts    Exhaustive and seeded simulation tools
test/framework/*.test.ts        Tests for the framework itself
test/games/*.test.ts            Per-game rule and model tests
test/shared/*.test.ts           Hooks, policies, and shared components
e2e/*.spec.ts                   Playwright browser workflows
```

Each tested game exports a compact named facade such as `loboRules` or
`klondikeRules`. The component and tests call the same module-scope functions;
game-specific logic remains in its game file. Lobo is the first capture/scoring
example. Klondike shows how tap and drag input can share move-legality tests.

Run `npm test -- --runInBand` for Jest, `npm run test:e2e` for browser workflows,
and `npm run test:coverage:rules` for the non-gating per-facade function and
branch report. Install Playwright's browser once with
`npx playwright install chromium`.

## Game model contract

A model is a deterministic state machine:

```ts
type GameModel<State, Action, Outcome extends string> = {
  getActions(state: Readonly<State>): readonly Action[];
  applyAction(state: Readonly<State>, action: Action): State;
  getOutcome(state: Readonly<State>): Outcome | null;
  getStateKey(state: Readonly<State>): string;
  assertInvariants?(state: Readonly<State>): void;
};
```

`applyAction` must not mutate its input. Enable `checkMutations` while developing
a model. State must remain serializable, which also matches the app's resume-game
contract.

Actions should describe player decisions, automatic phase transitions, and, when
feasible, chance results. For example, a deal action can include the dealt card.
This makes chance branches exhaustively enumerable in small decks.

## Exhaustive exploration

Use `exploreGame` when the reachable state space is bounded:

```ts
const result = exploreGame(model, initialState, {
  maxDepth: 80,
  maxStates: 100_000,
  checkMutations: true,
});

expect(result.deadEnds).toEqual([]);
expect(result.truncatedPaths).toEqual([]);
expect([...result.outcomes.keys()].sort()).toEqual(["lost", "won"]);
```

The explorer uses breadth-first search and deduplicates with `getStateKey`.
Canonicalize irrelevant ordering or symmetric suits in that key when possible.
A poor key can make exploration too large; a key that omits meaningful state can
hide behavior.

`enumerateCombinations` generates bounded card selections for games such as Lobo
and CardCapture.

Exhaustively exploring every shuffled 52-card deal is not practical. "All
outcomes" should mean all branches for a fixed reduced state or fixture, plus a
large deterministic sample across deals.

## Seeded campaigns

Use `runSeededGames` for large games:

```ts
const results = runSeededGames(
  (seed, random) => ({
    model: createGameModel(),
    initialState: createInitialState({ random }),
  }),
  { runs: 5_000, startSeed: 1, maxSteps: 2_000 },
);

expect(results.every((result) => result.status !== "step-limit")).toBe(true);
```

The same seed produces the same deal and action choices. Failures include the
seed, and simulation failures include the step and action. Add every discovered
failure seed as a named regression test before fixing the bug.

Randomness must be injectable. New setup and shuffle functions should accept a
random source instead of calling `Math.random` deep inside a transition.

## Invariants

Run invariants after every simulated transition. Useful card-game invariants
include:

- Every card ID is unique across all zones.
- The card multiset is conserved unless the rules explicitly create or remove a
  card.
- Scores, counters, and draw counts stay in range.
- A selected card still exists in the zone named by the selection.
- The current phase has at least one legal action or is terminal.
- Terminal flags, outcome text, and win targets agree.
- Face-up and face-down cards obey each zone's rules.
- Undo restores game state and clears transient selection/drag state.

Invariants often find defects faster than asserting a single expected final
state because they run across every intermediate state.

## Adding a game

1. Keep game-specific rules in `src/components/Games/<Game>.tsx`. Move
   closure-bound helpers to module scope only when tests need them.
2. Export a small `<game>Rules` object and any fixture state types. Do not export
   every internal helper individually.
3. Add table tests for legal moves, scoring, setup, and terminal boundaries.
4. Make setup deterministic by accepting a random source or prepared deck when
   deals affect the behavior under test. Do not assert against random module-level
   initial-state card IDs.
5. For deeper exploration, add serializable `State`, `Action`, and `Outcome`
   types plus an immutable transition function in the same game file. The
   component must call that same transition.
6. Add invariants and a stable state key, then exhaustive reduced-state tests or
   seeded full-deck campaigns as appropriate.
7. Add one integration test for important UI wiring. Drag games should test
   source/target hit resolution separately from move legality.
8. Cover settings variants and resume/undo behavior that changes the game model.

Importing a game `.tsx` also loads its shared UI dependencies. `test/setup.ts`
isolates native storage, dynamic card artwork discovery, Metro game discovery,
and the animated-card and game-wrapper rendering leaves. Tests for those systems
should explicitly unmock the relevant module.

## Recommended rollout

Every production-enabled game has a focused rule suite: **100% current production
coverage**. All 54 authored games have suites, including definitions currently
marked local-only; local-only games are not counted as production coverage.
Game-specific rules remain in their owning game files and are exposed through
compact named facades.

The final breadth pass added DeckOfSpies, AlpineSolitaire, EightOff, FreeCell,
LootTheLoop, OptritaLines, Penguin, RussianSolitaire, and TheEmissary. Their
suites cover tiered setup and spy scoring, Alpine route ranking and challenge
modifiers, open-cell tableau/foundation rules, loop-deck safety, Optrita line
geometry, Penguin rank wrapping and terminal checks, Russian same-suit stacking,
and Emissary follow-suit/trump debates. Earlier regressions include
Calculation's playable waste piles, Golf's persisted outcome, Canfield's
Ace-to-King tableau wrap, Spider's empty-column stock guard, Area52's strict
single-attack value, TheBogey's fixed-slot completion and occupied-column score,
and HideAndSeek's constrained playmate deal.

Completed depth work:

- A production-definition audit now fails when any enabled game lacks a matching
  rule suite, while explicitly excluding local-only definitions.
- CardCapture and DeadCenter route player actions through tested same-file
  transitions with invalid-action and card-conservation checks.
- MonteCarlo has injectable shuffle randomness, atomic pair/consolidate
  transitions, and a reproducible 100-seed full-game campaign with mutation and
  card-conservation checks. Initial deals with no legal pair now end as losses.
- `useStateManager` integration coverage includes setup, resume hydration,
  debounced persistence, reset, undo, and animation-lock cleanup.
- Drag overlap resolution is pure and tested for geometry, legality, distance,
  and priority. GameWrapper records attempts and terminal results exactly once.
- OptritaLines resolves ordered suit matches, lowest trump, free picks, scoring,
  and round rollover through production-owned transitions. A reduced exhaustive
  model reaches player wins, hard-mode grid wins, and next-round outcomes while
  checking immutability and card conservation.
- TheEmissary routes visit start, debate resolution, and visit completion through
  pure actions. Action tests cover follow-suit rejection, exact and excessive
  wins, ruler promotion, failed visits, and final victory; reduced exploration
  verifies that debate order can distinguish a kingdom win from over-debating.
- Lobo routes capture phases, folds, and round rollover through production-owned
  transitions. Its 50-seed campaign terminates at the 100-point target, replays
  exactly, rejects mutation, and conserves all 45 cards.
- Scoundrel routes room actions and automatic progression through production
  transitions. Its 100-seed campaign reaches terminal dungeons reproducibly while
  checking mutation, health bounds, and conservation of all 44 cards.
- Rendered GameModal coverage verifies that changed next-game settings reload
  exactly once on close, while immediate and unchanged values do not reload.
- Playwright performs a real Klondike pointer drag from one exposed tableau pile
  to a legal destination and verifies both affected piles from rendered cards.
- The derived rules-facade report discovers all 54 exported facade objects from
  TypeScript source and maps Istanbul function and branch data back to their
  members. It sorts shallow facades first and deliberately applies no threshold.
- The first report-guided pass added Empire's missing conquest legality matrix,
  moving its facade from 12.5% to 87.5% branch coverage with every member called.

Recommended next steps:

1. Review Penguin's setup branches and FortyThieves' foundation-suit helper, the
   two shallowest meaningful gaps in the current facade report.
2. Expand browser coverage only for critical cross-component workflows, such as
   settings that reset a live game. Keep game combinatorics in fast model tests.
3. Revisit Regicide's subset-heavy campaign after per-facade coverage identifies
   whether its current attack/defend outcomes have meaningful branch gaps.

CI should run `npm test -- --runInBand`, `npx tsc --noEmit`, `npm run lint`, and
`npm run test:e2e`. Playwright workers need `npx playwright install chromium`
once in their environment. Coverage is useful for finding untouched rule
branches, but no global percentage should replace per-game outcome and invariant
checks.

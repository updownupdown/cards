import { type PlayingCard } from "@/components/Cards/card-utils";
import { loboRules, type LoboGameState } from "@/components/Games/Lobo";
import {
  enumerateCombinations,
  runSeededGames,
  type GameModel,
  type RandomSource,
} from "../framework/game-model";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: true };
}

function state(overrides: Partial<LoboGameState> = {}): LoboGameState {
  return {
    deck: [],
    player: [],
    wolf: [],
    discard: [],
    playerScore: 0,
    wolfScore: 0,
    round: 1,
    roundOver: false,
    roundWon: false,
    roundPoints: 0,
    ended: false,
    won: false,
    mode: "medium",
    ...overrides,
  };
}

describe("Lobo rules", () => {
  test.each([
    ["perfect", [card("6")], [card("6", "wolf-6")]],
    ["sum", [card("4"), card("6")], [card("10")]],
    ["split", [card("9")], [card("6"), card("3")]],
    ["over", [card("8")], [card("3")]],
  ] as const)("detects a %s capture", (expected, player, wolf) => {
    expect(loboRules.detectAction(player, wolf)).toBe(expected);
  });

  test("rejects selections that do not describe one action", () => {
    expect(loboRules.detectAction([card("3")], [card("8")])).toBeNull();
    expect(
      loboRules.detectAction([card("3"), card("4")], [card("2"), card("5")]),
    ).toBeNull();
  });

  test("maps each capture to the correct compensating draw", () => {
    expect(loboRules.getCaptureEffect([card("8")], [card("3")])).toEqual({
      action: "over",
      drawFor: "wolf",
      drawCount: 5,
    });
    expect(
      loboRules.getCaptureEffect([card("4"), card("6")], [card("10")]),
    ).toEqual({ action: "sum", drawFor: "player", drawCount: 1 });
  });

  test.each([
    ["easy", 40, "8"],
    ["medium", 45, "9"],
    ["hard", 50, "10"],
  ] as const)(
    "builds the %s deck with five copies per rank",
    (mode, expectedCount, highestRank) => {
      const deck = loboRules.buildDeck(mode, () => 0.5);

      expect(deck).toHaveLength(expectedCount);
      expect(deck.filter((entry) => entry.rank === highestRank)).toHaveLength(
        5,
      );
      expect(new Set(deck.map((entry) => entry.id)).size).toBe(expectedCount);
    },
  );

  test("scores a round and ends the race at 100", () => {
    const result = loboRules.scoreRound(
      state({ player: [card("8"), card("5")], playerScore: 90 }),
      true,
    );

    expect(result).toMatchObject({
      playerScore: 103,
      wolfScore: 0,
      roundPoints: 13,
      roundWon: true,
      roundOver: true,
      ended: true,
      won: true,
    });
  });

  test("executes a capture atomically with its compensating draw", () => {
    const player = card("8", "player");
    const wolf = card("3", "wolf");
    const draw = { ...card("4", "draw"), faceUp: false };
    const game = state({ deck: [draw], player: [player], wolf: [wolf] });

    const plan = loboRules.executeCaptureAction(game, [player.id], [wolf.id]);

    expect(plan).toMatchObject({
      effect: { action: "over", drawFor: "wolf", drawCount: 5 },
      roundWillEnd: false,
    });
    expect(game.player).toEqual([]);
    expect(game.wolf.map(({ id }) => id)).toEqual(["draw"]);
    expect(game.wolf[0].faceUp).toBe(true);
    expect(game.discard.map(({ id }) => id)).toEqual(["player", "wolf"]);
    expect(game.discard.every(({ faceUp }) => !faceUp)).toBe(true);
    loboRules.assertInvariants(game);
  });

  test("rejects invalid capture IDs without mutation", () => {
    const game = state({
      player: [card("6", "player")],
      wolf: [card("6", "wolf")],
    });
    const snapshot = structuredClone(game);

    expect(
      loboRules.executeCaptureAction(game, ["missing"], ["wolf"]),
    ).toBeNull();
    expect(game).toEqual(snapshot);
  });

  test("winning the final capture scores and closes the round", () => {
    const game = state({
      player: [card("6", "player")],
      wolf: [card("6", "wolf")],
      playerScore: 95,
    });

    const plan = loboRules.executeCaptureAction(game, ["player"], ["wolf"]);

    expect(plan?.roundWillEnd).toBe(true);
    expect(game).toMatchObject({
      playerScore: 95,
      roundPoints: 0,
      roundWon: true,
      roundOver: true,
      ended: false,
    });
  });

  test("starts the next round with a deterministic reshuffle", () => {
    const first = state({
      deck: [card("2", "deck-1"), card("3", "deck-2")],
      player: [card("4", "player-1"), card("5", "player-2")],
      wolf: [card("6", "wolf-1"), card("7", "wolf-2")],
      discard: [card("8", "discard-1"), card("9", "discard-2")],
      roundOver: true,
    });
    const second = structuredClone(first);
    const constantRandom = () => 0.25;

    expect(
      loboRules.startNextRoundAction(first, "medium", constantRandom),
    ).toBe(true);
    expect(
      loboRules.startNextRoundAction(second, "medium", constantRandom),
    ).toBe(true);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ round: 2, roundOver: false });
    expect(first.player).toHaveLength(4);
    expect(first.wolf).toHaveLength(4);
    loboRules.assertInvariants(first);
  });

  test("runs replayable seeded games to a score of 100", () => {
    type Action =
      | { type: "capture"; playerIds: string[]; wolfIds: string[] }
      | { type: "fold" };
    type Outcome = "player" | "wolf";

    function createCampaign(random: RandomSource) {
      const initialState = state({
        deck: loboRules.buildDeck("medium", random),
      });
      loboRules.dealRoundAction(initialState);

      const model: GameModel<LoboGameState, Action, Outcome> = {
        getActions: (current) => {
          const actions: Action[] = [{ type: "fold" }];
          const playerSelections = enumerateCombinations(current.player);
          const wolfSelections = enumerateCombinations(current.wolf);

          for (const playerSelection of playerSelections) {
            for (const wolfSelection of wolfSelections) {
              if (
                loboRules.detectAction(playerSelection, wolfSelection) !== null
              ) {
                actions.push({
                  type: "capture",
                  playerIds: playerSelection.map(({ id }) => id),
                  wolfIds: wolfSelection.map(({ id }) => id),
                });
              }
            }
          }
          return actions;
        },
        applyAction: (current, action) => {
          const next = structuredClone(current);
          if (action.type === "fold") {
            loboRules.foldRoundAction(next);
          } else {
            loboRules.executeCaptureAction(
              next,
              action.playerIds,
              action.wolfIds,
            );
          }
          if (next.roundOver) {
            loboRules.startNextRoundAction(next, next.mode, random);
          }
          return next;
        },
        getOutcome: (current) =>
          current.ended ? (current.won ? "player" : "wolf") : null,
        getStateKey: (current) => JSON.stringify(current),
        assertInvariants: (current) => {
          loboRules.assertInvariants(current);
          const cards = [
            ...current.deck,
            ...current.player,
            ...current.wolf,
            ...current.discard,
          ];
          expect(cards).toHaveLength(45);
          expect(new Set(cards.map(({ id }) => id)).size).toBe(45);
        },
      };

      return { model, initialState };
    }

    const run = () =>
      runSeededGames((_seed, random) => createCampaign(random), {
        runs: 50,
        maxSteps: 200,
        checkMutations: true,
      });
    const first = run();
    const replay = run();

    expect(first.every(({ status }) => status === "terminal")).toBe(true);
    expect(
      first.every(
        ({ state: result }) =>
          result.playerScore >= 100 || result.wolfScore >= 100,
      ),
    ).toBe(true);
    expect(
      replay.map(({ seed, outcome, actions }) => ({ seed, outcome, actions })),
    ).toEqual(
      first.map(({ seed, outcome, actions }) => ({ seed, outcome, actions })),
    );
  });

  test("invariants reject duplicated cards across zones", () => {
    const duplicate = card("A", "duplicate");

    expect(() =>
      loboRules.assertInvariants(
        state({ player: [duplicate], wolf: [duplicate] }),
      ),
    ).toThrow("more than one zone");
  });
});

import {
  shuffle,
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import {
  scoundrelRules,
  type ScoundrelAction,
  type ScoundrelGameState,
} from "@/components/Games/Scoundrel";
import {
  runSeededGames,
  type GameModel,
  type RandomSource,
} from "../framework/game-model";

function card(
  rank: CardRank,
  suit: CardSuit,
  id = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(
  overrides: Partial<ScoundrelGameState> = {},
): ScoundrelGameState {
  return {
    draw: [],
    discard: [],
    roomCards: [null, null, null, null],
    roomNum: 1,
    weaponCard: null,
    weaponUsedOn: [],
    health: 20,
    lastRoomNumRanFrom: null,
    isRunning: false,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Scoundrel rules", () => {
  test("builds the 44-card dungeon deck", () => {
    const deck = scoundrelRules.createDeck();

    expect(deck).toHaveLength(44);
    expect(deck.filter((entry) => entry.suit === "clubs")).toHaveLength(13);
    expect(deck.filter((entry) => entry.suit === "spades")).toHaveLength(13);
    expect(deck.filter((entry) => entry.suit === "hearts")).toHaveLength(9);
    expect(deck.filter((entry) => entry.suit === "diamonds")).toHaveLength(9);
  });

  test.each([
    ["clubs", "monster"],
    ["spades", "monster"],
    ["diamonds", "weapon"],
    ["hearts", "potion"],
  ] as const)("classifies %s as %s", (suit, expected) => {
    expect(scoundrelRules.cardType(card("5", suit))).toBe(expected);
  });

  test("values an ace monster at 14", () => {
    expect(scoundrelRules.cardValue(card("A", "clubs"))).toBe(14);
  });

  test("weapon damage cannot fall below zero", () => {
    expect(
      scoundrelRules.damageWithWeapon(
        card("10", "diamonds"),
        card("7", "clubs"),
      ),
    ).toBe(0);
    expect(
      scoundrelRules.damageWithWeapon(
        card("4", "diamonds"),
        card("9", "clubs"),
      ),
    ).toBe(5);
  });

  test("a weapon can only continue against an equal or weaker monster", () => {
    const weapon = card("6", "diamonds");
    const firstMonster = card("9", "clubs", "first-monster");

    expect(
      scoundrelRules.canFightWithWeapon(
        state({ weaponCard: weapon }),
        firstMonster,
      ),
    ).toBe(true);
    expect(
      scoundrelRules.canFightWithWeapon(
        state({ weaponCard: weapon, weaponUsedOn: [firstMonster] }),
        card("9", "spades", "equal-monster"),
      ),
    ).toBe(true);
    expect(
      scoundrelRules.canFightWithWeapon(
        state({ weaponCard: weapon, weaponUsedOn: [firstMonster] }),
        card("10", "spades", "stronger-monster"),
      ),
    ).toBe(false);
  });

  test("refills empty slots while preserving the leftover card position", () => {
    const kept = card("2", "hearts", "kept");
    const draw = [
      card("3", "clubs", "draw-1", false),
      card("4", "clubs", "draw-2", false),
      card("5", "clubs", "draw-3", false),
      card("6", "clubs", "remaining", false),
    ];
    const original = state({
      draw,
      roomCards: [null, null, kept, null],
      roomNum: 4,
    });

    const result = scoundrelRules.refillRoom(original);

    expect(result).not.toBe(original);
    expect(result.roomCards[2]).toBe(kept);
    expect(result.roomCards.map((entry) => entry?.id)).toEqual([
      "draw-1",
      "draw-2",
      "kept",
      "draw-3",
    ]);
    expect(result.roomCards.every((entry) => entry?.faceUp)).toBe(true);
    expect(result.draw.map((entry) => entry.id)).toEqual(["remaining"]);
    expect(result.roomNum).toBe(5);
    expect(original.draw).toBe(draw);
  });

  test("does not increment the room immediately after running", () => {
    const result = scoundrelRules.refillRoom(
      state({
        draw: [
          card("2", "clubs", "one", false),
          card("3", "clubs", "two", false),
          card("4", "clubs", "three", false),
          card("5", "clubs", "four", false),
        ],
        roomNum: 6,
        isRunning: true,
      }),
    );

    expect(result.roomNum).toBe(6);
    expect(result.isRunning).toBe(false);
  });

  test("chooses the most favorable three-card room resolution", () => {
    const bestHealth = scoundrelRules.bestHealthAfterRoom(
      [
        card("10", "diamonds", "weapon"),
        card("K", "clubs", "strong-monster"),
        card("Q", "spades", "weaker-monster"),
        card("10", "hearts", "potion"),
      ],
      10,
    );

    expect(bestHealth).toBe(18);
  });

  test("applies potion, weapon, and monster actions atomically", () => {
    const game = state({
      health: 10,
      roomCards: [
        card("5", "hearts", "potion"),
        card("6", "diamonds", "weapon"),
        card("9", "clubs", "monster"),
        null,
      ],
    });

    expect(
      scoundrelRules.applyAction(game, { type: "heal", roomIndex: 0 }),
    ).toBe(true);
    expect(game.health).toBe(15);
    expect(game.discard.map(({ id }) => id)).toEqual(["potion"]);

    expect(
      scoundrelRules.applyAction(game, { type: "equip", roomIndex: 1 }),
    ).toBe(true);
    expect(game.weaponCard?.id).toBe("weapon");

    expect(
      scoundrelRules.applyAction(game, {
        type: "fight-weapon",
        roomIndex: 2,
      }),
    ).toBe(true);
    expect(game.health).toBe(12);
    expect(game.weaponUsedOn.map(({ id }) => id)).toEqual(["monster"]);
    expect(scoundrelRules.validRoomCards(game.roomCards)).toHaveLength(0);
  });

  test("rejects a mismatched room action without mutation", () => {
    const game = state({
      roomCards: [card("5", "hearts", "potion"), null, null, null],
    });
    const snapshot = structuredClone(game);

    expect(
      scoundrelRules.applyAction(game, {
        type: "fight-bare",
        roomIndex: 0,
      }),
    ).toBe(false);
    expect(game).toEqual(snapshot);
  });

  test("progresses refills, losses, and potion-bonus wins", () => {
    const refilled = scoundrelRules.advanceGame(
      state({
        draw: [
          card("2", "clubs", "one", false),
          card("3", "clubs", "two", false),
          card("4", "clubs", "three", false),
          card("5", "clubs", "four", false),
        ],
      }),
    );
    expect(scoundrelRules.validRoomCards(refilled.roomCards)).toHaveLength(4);

    const lost = scoundrelRules.advanceGame(
      state({
        health: 0,
        roomCards: [card("7", "clubs", "remaining"), null, null, null],
      }),
    );
    expect(lost).toMatchObject({ ended: true, won: false, score: -7 });

    const won = scoundrelRules.advanceGame(
      state({
        health: 20,
        lastActionType: "potion",
        lastPotionValue: 6,
      }),
    );
    expect(won).toMatchObject({ ended: true, won: true, score: 26 });
  });

  test("runs replayable seeded dungeons to terminal outcomes", () => {
    type Outcome = "won" | "lost";

    function availableActions(
      current: Readonly<ScoundrelGameState>,
    ): ScoundrelAction[] {
      const actions: ScoundrelAction[] = [];
      if (
        scoundrelRules.validRoomCards(current.roomCards).length === 4 &&
        current.lastRoomNumRanFrom !== current.roomNum
      ) {
        actions.push({ type: "run" });
      }

      current.roomCards.forEach((roomCard, roomIndex) => {
        if (!roomCard) return;
        const type = scoundrelRules.cardType(roomCard);
        if (type === "potion") {
          actions.push({ type: "heal", roomIndex });
        } else if (type === "weapon") {
          actions.push({ type: "equip", roomIndex });
        } else {
          actions.push({ type: "fight-bare", roomIndex });
          if (scoundrelRules.canFightWithWeapon(current, roomCard)) {
            actions.push({ type: "fight-weapon", roomIndex });
          }
        }
      });
      return actions;
    }

    function fullyAdvance(current: ScoundrelGameState) {
      let next = current;
      while (true) {
        const advanced = scoundrelRules.advanceGame(next);
        if (advanced === next) return next;
        next = advanced;
      }
    }

    function createCampaign(random: RandomSource) {
      const deck = shuffle(
        scoundrelRules
          .createDeck()
          .map((entry) => ({ ...entry, faceUp: false })),
        random,
      );
      const initialState = fullyAdvance(state({ draw: deck, roomNum: 0 }));
      const model: GameModel<ScoundrelGameState, ScoundrelAction, Outcome> = {
        getActions: availableActions,
        applyAction: (current, action) => {
          const next = structuredClone(current);
          if (!scoundrelRules.applyAction(next, action)) {
            throw new Error("Generated an invalid Scoundrel action");
          }
          return fullyAdvance(next);
        },
        getOutcome: (current) =>
          current.ended ? (current.won ? "won" : "lost") : null,
        getStateKey: (current) => JSON.stringify(current),
        assertInvariants: (current) => {
          const cards = [
            ...current.draw,
            ...current.discard,
            ...scoundrelRules.validRoomCards(current.roomCards),
            ...(current.weaponCard ? [current.weaponCard] : []),
            ...current.weaponUsedOn,
          ];
          expect(cards).toHaveLength(44);
          expect(new Set(cards.map(({ id }) => id)).size).toBe(44);
          expect(current.health).toBeGreaterThanOrEqual(0);
          expect(current.health).toBeLessThanOrEqual(20);
        },
      };
      return { model, initialState };
    }

    const run = () =>
      runSeededGames((_seed, random) => createCampaign(random), {
        runs: 100,
        maxSteps: 100,
        checkMutations: true,
      });
    const first = run();
    const replay = run();

    expect(first.every(({ status }) => status === "terminal")).toBe(true);
    expect(
      first.every(({ outcome }) => outcome === "won" || outcome === "lost"),
    ).toBe(true);
    expect(
      replay.map(({ seed, outcome, actions }) => ({ seed, outcome, actions })),
    ).toEqual(
      first.map(({ seed, outcome, actions }) => ({ seed, outcome, actions })),
    );
  });
});

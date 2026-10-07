import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import {
  fightClubsRules,
  type FightClubsGameState,
} from "@/components/Games/FightClubs";
import { lycanRules, type LycanGameState } from "@/components/Games/Lycan";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { Hint } from "@/hints/hint";

// The hint finders of Lycan and Fight Clubs, on positions a few deals may
// never reach. game-hints.test.tsx plays their hints by taps.

function tappedCards(hint: Hint | null) {
  return (hint?.steps ?? [])
    .flat()
    .flatMap((target) => ("card" in target ? [target.card] : []));
}

function lastZone(hint: Hint | null) {
  const target = hint?.steps.at(-1)?.[0];
  return target && "zone" in target ? target.zone : undefined;
}

describe("Lycan hints", () => {
  function round(
    player: PlayingCard[],
    wolf: PlayingCard[],
    deck: PlayingCard[] = [card("2", "clubs", false), card("3", "clubs")],
  ): LycanGameState {
    return {
      deck,
      player,
      wolf,
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
    };
  }

  test("takes the Wolf's last card to win the round", () => {
    const five = card("5", "spades");
    const wolfFive = card("5", "hearts");
    const state = round(
      [card("2", "hearts"), five, card("9", "hearts")],
      [wolfFive],
    );
    const hint = lycanRules.findHint(state);
    expect(tappedCards(hint)).toEqual([five.id, wolfFive.id]);
    expect(hint?.message.values?.label).toBe("Perfect");
    expect(lastZone(hint)).toBe("buttons");
    expect(hint?.message.note).toBeTruthy();
  });

  test("clears two Wolf cards with one when it can", () => {
    // With the deck out, a 9 splits the Wolf's 4 and 5 and ends the round.
    const nine = card("9", "spades");
    const state = round(
      [card("A", "hearts"), nine],
      [card("4", "hearts"), card("5", "clubs")],
      [],
    );
    const hint = lycanRules.findHint(state);
    expect(hint?.message.values?.label).toBe("Split");
    const plan = lycanRules.createCapturePlan(
      state,
      tappedCards(hint).filter((id) => state.player.some((c) => c.id === id)),
      tappedCards(hint).filter((id) => state.wolf.some((c) => c.id === id)),
    );
    expect(plan?.roundWillEnd).toBe(true);
  });

  test("folds when no capture is possible", () => {
    const state = round([card("A", "hearts")], [card("9", "spades")]);
    const hint = lycanRules.findHint(state);
    expect(hint?.message).toMatchObject({
      key: "press",
      values: { label: "Fold" },
      note: "No capture left: fold",
    });
    expect(hint?.steps).toEqual([[{ zone: "buttons" }]]);
  });

  test("undoes a stray pick first and keeps the right ones", () => {
    const five = card("5", "spades");
    const two = card("2", "hearts");
    const wolfFive = card("5", "hearts");
    const state = round([two, five], [wolfFive]);
    const hint = lycanRules.findHint(state, [two.id, five.id], []);
    expect(hint?.steps).toEqual([
      [{ card: two.id }],
      [{ card: wolfFive.id }],
      [{ zone: "buttons" }],
    ]);
  });

  test("every hint is a legal capture or a fold, and repeats", () => {
    const state = round([], []);
    state.deck = lycanRules.buildDeck("medium", () => 0.5);
    for (let index = state.deck.length - 1; index > 0; index -= 1) {
      // A fixed shuffle, so the test always plays the same deal.
      const other = (index * 7919) % (index + 1);
      [state.deck[index], state.deck[other]] = [
        state.deck[other],
        state.deck[index],
      ];
    }
    state.deck = state.deck.map((c) => ({ ...c, faceUp: false }));
    lycanRules.dealRoundAction(state);
    for (let step = 0; step < 30 && !state.ended; step += 1) {
      if (state.roundOver) {
        lycanRules.startNextRoundAction(state, "medium", () => 0.3);
        continue;
      }
      const hint = lycanRules.findHint(state);
      expect(lycanRules.findHint(state)).toEqual(hint);
      if (hint?.message.values?.label === "Fold") {
        expect(lycanRules.foldRoundAction(state)).toBe(true);
        continue;
      }
      const ids = tappedCards(hint);
      const plan = lycanRules.executeCaptureAction(
        state,
        ids.filter((id) => state.player.some((c) => c.id === id)),
        ids.filter((id) => state.wolf.some((c) => c.id === id)),
      );
      expect(plan?.effect.action.toLowerCase()).toBe(
        String(hint?.message.values?.label).toLowerCase(),
      );
    }
  });
});

describe("Fight Clubs hints", () => {
  function board(
    grid: (PlayingCard | null)[],
    hand: PlayingCard[],
  ): FightClubsGameState {
    return {
      clubsDeck: [card("K", "clubs", false)],
      gridDeck: [card("2", "hearts", false), card("3", "spades", false)],
      hand,
      grid,
      discard: [],
      ended: false,
      won: false,
      winLoseMessage: "",
    };
  }

  /** Plays a hint as the board does: the club, the picks, the button. */
  function playHint(
    state: FightClubsGameState,
    hint: Hint | null,
    picked: number[] = [],
  ) {
    const ids = tappedCards(hint);
    const club = state.hand.find((c) => ids.includes(c.id))!;
    // Each tap on a grid card picks it, or puts it back.
    let selected = [...picked];
    for (const id of ids) {
      const index = state.grid.findIndex((c) => c?.id === id);
      if (index < 0) continue;
      selected = selected.includes(index)
        ? selected.filter((other) => other !== index)
        : [...selected, index];
    }
    const action = lastZone(hint)!.replace("action-", "");
    const clears = fightClubsRules.getActionClearIndexes(
      state,
      club,
      action as never,
      selected,
    );
    expect(clears.length).toBeGreaterThan(0);
    const line =
      action === "row"
        ? Math.floor(selected[0] / 3)
        : action === "column"
          ? (selected[0] % 3) + 3
          : null;
    expect(
      fightClubsRules.playAction(
        state,
        club.id,
        (line === null ? action : "line") as never,
        selected,
        line,
      ),
    ).toBe(true);
    return clears;
  }

  test("plays the club that clears most", () => {
    const seven = card("7", "clubs");
    const grid = [
      card("3", "hearts"),
      card("4", "spades"),
      card("K", "diamonds"),
      card("Q", "hearts"),
      card("2", "diamonds"),
      card("2", "spades"),
      card("9", "diamonds"),
      card("J", "hearts"),
      card("10", "hearts"),
    ];
    const state = board(grid, [card("A", "clubs"), seven]);
    const hint = fightClubsRules.findHint(state);
    // Up with the 7 takes the 9, 10, J, Q and K (Down only four).
    expect(tappedCards(hint)[0]).toBe(seven.id);
    expect(lastZone(hint)).toBe("action-up");
    expect(hint?.message.values?.label).toBe("♠ Up");
    expect(playHint(state, hint)).toHaveLength(5);
  });

  test("picks the cards a Sum needs, after undoing stray picks", () => {
    const ten = card("10", "clubs");
    const grid: (PlayingCard | null)[] = [
      card("A", "hearts"),
      card("2", "spades"),
      card("3", "hearts"),
      card("4", "spades"),
      card("K", "hearts"),
      card("K", "spades"),
      card("Q", "hearts"),
      card("Q", "spades"),
      card("Q", "diamonds"),
    ];
    const state = board(grid, [ten]);
    const hint = fightClubsRules.findHint(state, null, [4]);
    expect(hint?.steps[0]).toEqual([{ card: grid[4]!.id }]);
    expect(lastZone(hint)).toBe("action-sum");
    // A + 2 + 3 + 4 = 10: four cards for one club.
    expect(playHint(state, hint, [4])).toEqual([0, 1, 2, 3]);
  });

  test("every hint plays, a deal through", () => {
    const decks = fightClubsRules.createDecks("easy");
    const state = board(
      Array.from({ length: 9 }, () => null),
      [],
    );
    state.clubsDeck = decks.clubs;
    state.gridDeck = decks.grid;
    fightClubsRules.refreshGrid(state);
    fightClubsRules.refreshHand(state);
    while (!state.ended) {
      const hint = fightClubsRules.findHint(state);
      expect(fightClubsRules.findHint(state)).toEqual(hint);
      playHint(state, hint);
    }
    expect(fightClubsRules.findHint(state)).toBeNull();
  });
});

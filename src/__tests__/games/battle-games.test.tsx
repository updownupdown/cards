import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressButton,
  pressCardId,
  pressZone,
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import CabinSiege from "@/components/Games/CabinSiege";
import ChainOfCommand from "@/components/Games/ChainOfCommand";
import Dynasty from "@/components/Games/Dynasty";
import Seer from "@/components/Games/Seer";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Dynasty", () => {
  const deadRoyal = () => ({
    cards: [card("K", "clubs", false)],
    armour: 0,
    dead: true,
  });

  function baseState() {
    return {
      deck: [] as PlayingCard[],
      discard: [],
      grid: Array.from({ length: 9 }, () => [] as PlayingCard[]),
      aces: [],
      jokers: [],
      lastDrawWasSpecial: false,
      mode: "place",
      selectedStack: null,
      ended: false,
      won: false,
    };
  }

  test("defeating the last royal wins", async () => {
    // Placing on grid 1 attacks royal slot 10 with the tops of grids 4 and 7.
    const state = baseState();
    state.grid[4] = [card("5", "spades")];
    state.grid[7] = [card("6", "spades")];
    const royals = Array.from({ length: 12 }, deadRoyal);
    royals[10] = { cards: [card("J", "spades")], armour: 0, dead: false };
    await renderGame("/dynasty", Dynasty, {
      ...state,
      royals,
      pending: card("3", "clubs"),
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "grid" && zone.pileIndex === 1);

    expect(outcome()).toBe("won");
  });

  test("running out of cards with royals standing loses", async () => {
    const royals = Array.from({ length: 12 }, deadRoyal);
    // Slots 4 and 9 (attacked from grid 0) are empty; slot 0 still stands.
    royals[4] = { cards: [], armour: 0, dead: false };
    royals[9] = { cards: [], armour: 0, dead: false };
    royals[0] = { cards: [card("J", "spades")], armour: 0, dead: false };
    await renderGame("/dynasty", Dynasty, {
      ...baseState(),
      royals,
      pending: card("3", "clubs"),
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "grid" && zone.pileIndex === 0);

    expect(outcome()).toBe("lost");
  });
});

describe("Cabin Siege", () => {
  function setup(supportRanks: [PlayingCard["rank"], PlayingCard["rank"]], draw: PlayingCard[]) {
    const zombies = Array.from({ length: 12 }, (_, index) => ({
      id: `z-${index}`,
      card: card("K", "clubs"),
      dead: index !== 1,
    }));
    zombies[1].card = card("J", "spades");
    const piles = Array.from({ length: 9 }, () => [card("9", "diamonds")]);
    piles[1] = [card("5", "spades")];
    // A top-row zombie is attacked with the other two cards in its column.
    piles[4] = [card(supportRanks[0], "spades")];
    piles[7] = [card(supportRanks[1], "spades")];
    return {
      draw,
      piles,
      zombies,
      phase: "play",
      lastPlayedPile: null,
      ended: false,
      won: false,
    };
  }

  test("killing the last zombie wins", async () => {
    const state = setup(["5", "6"], [card("2", "hearts"), card("7", "spades")]);
    await renderGame("/cabin-siege", CabinSiege, state);
    expect(outcome()).toBe("playing");

    await pressCardId(state.piles[1][0].id);
    await pressCardId(state.zombies[1].card.id);

    expect(outcome()).toBe("won");
  });

  test("running out of cards with zombies left loses", async () => {
    const state = setup(["2", "3"], [card("7", "spades")]);
    await renderGame("/cabin-siege", CabinSiege, state);
    expect(outcome()).toBe("playing");

    await pressCardId(state.piles[1][0].id);

    expect(outcome()).toBe("lost");
  });
});

describe("Seer", () => {
  const baseState = () => ({
    table: [],
    discard: [],
    pendingFreed: [],
    pendingHardChoice: [],
    ended: false,
    won: false,
    winLoseMessage: "",
  });

  test("completing the eighth prediction wins", async () => {
    const board = Array.from({ length: 8 }, () => [card("2", "spades")]);
    board[0] = [];
    await renderGame("/seer", Seer, {
      ...baseState(),
      board,
      // The top card is red, matching prediction 0 ("Red").
      stock: [card("4", "clubs", false), card("3", "hearts", false)],
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "prediction" && zone.pileIndex === 0);

    expect(outcome()).toBe("won");
  });

  test("running out of cards before every prediction loses", async () => {
    await renderGame("/seer", Seer, {
      ...baseState(),
      board: Array.from({ length: 8 }, () => [] as PlayingCard[]),
      stock: [card("4", "clubs", false)],
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "prediction" && zone.pileIndex === 0);

    expect(outcome()).toBe("lost");
  });
});

describe("Chain of Command", () => {
  const emptyRanks = () =>
    Array.from({ length: 5 }, () => ({
      members: [] as PlayingCard[],
      candidates: [] as PlayingCard[],
    }));

  async function promote(
    renderer: Awaited<ReturnType<typeof renderGame>>,
    member: PlayingCard,
    replacement: PlayingCard,
  ) {
    await pressCardId(member.id);
    await pressCardId(replacement.id);
    await pressButton(renderer, "Candidate");
  }

  test("promoting out of rank 1 wins", async () => {
    // Remaining 3 and 4 sum to 7, so the 7 is a valid replacement.
    const two = card("2", "spades");
    const seven = card("7", "hearts");
    const ranks = emptyRanks();
    ranks[0] = {
      members: [two, card("3", "spades"), card("4", "spades")],
      candidates: [seven],
    };
    const renderer = await renderGame("/chain-of-command", ChainOfCommand, {
      ranks,
      dead: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await promote(renderer, two, seven);

    expect(outcome()).toBe("won");
  });

  test("no promotion left loses", async () => {
    const two = card("2", "spades");
    const seven = card("7", "hearts");
    const ranks = emptyRanks();
    ranks[1] = {
      members: [two, card("3", "spades"), card("4", "spades")],
      candidates: [seven],
    };
    const renderer = await renderGame("/chain-of-command", ChainOfCommand, {
      ranks,
      dead: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await promote(renderer, two, seven);

    expect(outcome()).toBe("lost");
  });
});

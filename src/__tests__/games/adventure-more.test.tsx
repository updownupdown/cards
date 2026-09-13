import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressButton,
  pressCard,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Ascent from "@/components/Games/Ascent";
import Crownslayer from "@/components/Games/Crownslayer";
import LoneJoker from "@/components/Games/LoneJoker";
import RoyalEnvoy from "@/components/Games/RoyalEnvoy/RoyalEnvoy";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Lone Joker", () => {
  // Missing the round target on the last play ends the run.
  async function endRun(totalExcess: number) {
    const low = card("2", "clubs");
    const renderer = await renderGame("/lone-joker", LoneJoker, {
      deck: [card("6", "hearts", false), card("8", "spades", false)],
      hand: [low, card("7", "diamonds"), card("9", "hearts"), card("J", "spades")],
      discard: [],
      scoring: [],
      bankedJoker: false,
      bankedJokerCard: null,
      round: 1,
      roundScore: 0,
      totalExcess,
      shopPoints: 0,
      playsRemaining: 1,
      discardsRemaining: 0,
      handLimit: 8,
      bonuses: {},
      doubleNextPlay: false,
      usedShield: false,
      lastHandName: null,
      lastHandPoints: 0,
      phase: "playing",
      ended: false,
      won: false,
      winLoseMessage: "",
    });
    expect(outcome()).toBe("playing");

    await pressCardId(low.id);
    await pressButton(renderer, "Play");
  }

  test("ending the run with 500 or more points wins", async () => {
    await endRun(500);

    expect(outcome()).toBe("won");
  });

  test("ending the run below 500 points loses", async () => {
    await endRun(120);

    expect(outcome()).toBe("lost");
  });
});

describe("Crownslayer", () => {
  const baseState = {
    castleDeck: [],
    selectedCards: [],
    tavernDeck: [card("6", "clubs", false)],
    discardPile: [],
    spadeShield: 0,
    ended: false,
    won: false,
    winLoseMessage: null,
    victoryType: null,
  };

  test("defeating the twelfth enemy wins", async () => {
    const finisher = card("5", "hearts");
    const renderer = await renderGame("/crownslayer", Crownslayer, {
      ...baseState,
      hand: [finisher, card("3", "diamonds")],
      jestersDeck: [],
      phase: "attack",
      currentEnemy: {
        card: card("K", "spades"),
        health: 1,
        maxHealth: 40,
        attack: 20,
      },
      enemiesDefeated: 11,
      damageDealt: 39,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(finisher.id);
    await pressButton(renderer, "Attack");

    expect(outcome()).toBe("won");
  });

  test("failing to block the enemy's attack loses", async () => {
    const renderer = await renderGame("/crownslayer", Crownslayer, {
      ...baseState,
      hand: [card("2", "clubs"), card("3", "diamonds")],
      // A jester in reserve keeps the automatic defeat check from firing.
      jestersDeck: [{ id: "joker-test", rank: "Joker", suit: "spades", faceUp: true }],
      phase: "defend",
      currentEnemy: {
        card: card("J", "spades"),
        health: 12,
        maxHealth: 20,
        attack: 10,
      },
      enemiesDefeated: 3,
      damageDealt: 8,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Defend");

    expect(outcome()).toBe("lost");
  });
});

describe("Ascent", () => {
  const milestone = (rank: PlayingCard["rank"]) => {
    const anchor = card(rank, "spades");
    return {
      cards: [anchor],
      type: "traverse",
      size: 1,
      anchorValue: Number(rank),
      anchorSuit: "spades",
    };
  };

  function climbState(hand: PlayingCard[], trail: unknown[], deck: PlayingCard[]) {
    return {
      deck,
      fatigue: [],
      discard: [],
      hand,
      playedRoutes: [],
      trail,
      phase: "play",
      winLoseMessage: "",
      ended: false,
      won: false,
    };
  }

  test("making camp with the final milestone summits the mountain", async () => {
    // A two-card ascent beats the one-card milestones on any difficulty.
    const eight = card("8", "hearts");
    const nine = card("9", "hearts");
    const renderer = await renderGame(
      "/ascent",
      Ascent,
      climbState([eight, nine], [milestone("2"), milestone("3")], [
        card("4", "clubs", false),
      ]),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(eight.id);
    await pressCardId(nine.id);
    await pressButton(renderer, "Play Route");

    expect(outcome()).toBe("won");
  });

  test("running out of cards to draw loses", async () => {
    // A clubs anchor draws one card for each lower card left in hand.
    const king = card("K", "clubs");
    const renderer = await renderGame(
      "/ascent",
      Ascent,
      climbState([king, card("3", "hearts"), card("5", "diamonds")], [], []),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);
    await pressButton(renderer, "Play Route");

    expect(outcome()).toBe("lost");
  });
});

describe("Royal Envoy", () => {
  function envoyState(handCard: PlayingCard) {
    const kingdoms = Array.from({ length: 8 }, (_, id) => ({
      id,
      ruler: card(id % 2 ? "Q" : "K", "hearts", id === 7),
      requiredWins: id + 1,
      visited: id < 7,
      won: id < 7,
    }));
    return {
      kingdoms,
      draw: [card("2", "clubs", false)],
      discardWon: [],
      discardLost: [],
      advisors: [],
      visit: {
        kingdomId: 7,
        trumpSuit: "hearts",
        requiredWins: 1,
        wins: 0,
        debateTopic: card("5", "spades"),
        debateRecord: [],
      },
      hand: [handCard],
      handNeedsOrdering: false,
      ended: false,
      won: false,
      winLoseMessage: "",
      neededToHand: 0,
      discardFromHand: 0,
      handSize: 8,
    };
  }

  test("winning over the last kingdom wins", async () => {
    const winner = card("7", "spades");
    await renderGame("/royal-envoy", RoyalEnvoy, envoyState(winner));
    expect(outcome()).toBe("playing");

    await pressCardId(winner.id);

    expect(outcome()).toBe("won");
  });

  test("finishing a visit without enough debate wins loses", async () => {
    const loser = card("3", "spades");
    await renderGame("/royal-envoy", RoyalEnvoy, envoyState(loser));
    expect(outcome()).toBe("playing");

    await pressCard((mapped) => mapped.card.id === loser.id);

    expect(outcome()).toBe("lost");
  });
});

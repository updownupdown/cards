import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  createInitialSolatroState,
  solatroRules,
} from "@/components/Games/Solatro";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("Solatro rules", () => {
  test("starts with all 54 cards face down in the discard pile", () => {
    const state = createInitialSolatroState();

    expect(state.deck).toHaveLength(0);
    expect(state.discard).toHaveLength(54);
    expect(state.discard.every((entry) => !entry.faceUp)).toBe(true);
  });

  test.each([
    [[card("A", "spades")], "High Card", 5],
    [[card("8", "spades"), card("8", "hearts")], "Pair", 10],
    [
      [
        card("10", "hearts"),
        card("J", "hearts"),
        card("Q", "hearts"),
        card("K", "hearts"),
        card("A", "hearts"),
      ],
      "Royal Flush",
      150,
    ],
    [
      [
        card("10", "hearts"),
        card("J", "hearts"),
        card("Q", "hearts"),
        card("K", "hearts"),
        card("Joker", "spades", "wild"),
      ],
      "Royal Flush",
      150,
    ],
  ] as const)("scores %s as %s", (cards, name, points) => {
    expect(solatroRules.scorePokerHand([...cards])).toEqual({ name, points });
  });

  test("raises the target by 25 each round and assigns ratings", () => {
    expect(solatroRules.targetForRound(1)).toBe(25);
    expect(solatroRules.targetForRound(4)).toBe(100);
    expect(solatroRules.ratingForRounds(2)).toBeNull();
    expect(solatroRules.ratingForRounds(3)).toBe("Cat Food");
    expect(solatroRules.ratingForRounds(7)).toBe("Official Dweeb");
    expect(solatroRules.ratingForRounds(12)).toBe("Ultra Mega Uber Giga-Dweeb");
  });

  test("banks the first drawn Joker and loses both when another appears", () => {
    const first = createInitialSolatroState();
    first.deck = [card("3", "clubs"), card("Joker", "spades", "joker-1")];
    first.hand = [];
    first.discard = [];
    solatroRules.drawToLimit(first, 1);

    expect(first.bankedJoker).toBe(true);
    expect(first.hand.map((entry) => entry.rank)).toEqual(["3"]);

    first.deck = [card("4", "clubs"), card("Joker", "hearts", "joker-2")];
    first.hand = [];
    solatroRules.drawToLimit(first, 1);

    expect(first.bankedJoker).toBe(false);
    expect(first.hand.map((entry) => entry.rank)).toEqual(["4"]);
    expect(
      first.discard.filter((entry) => entry.rank === "Joker"),
    ).toHaveLength(2);
  });

  test("records excess for the final score and spends only shop points", () => {
    const state = createInitialSolatroState();
    state.roundScore = 85;

    solatroRules.finishRound(state);
    expect(state.phase).toBe("shop");
    expect(state.shopPoints).toBe(60);
    expect(state.totalExcess).toBe(60);

    expect(solatroRules.buyBonus(state, "extraCard")).toBe(true);
    expect(state.shopPoints).toBe(50);
    expect(state.bonuses.extraCard).toBe(true);
    expect(solatroRules.buyBonus(state, "extraCard")).toBe(false);
  });

  test("consumes a shield to survive a failed round", () => {
    const state = createInitialSolatroState();
    state.round = 5;
    state.roundScore = 100;
    state.bonuses.shield = true;

    solatroRules.finishRound(state);

    expect(state.phase).toBe("shop");
    expect(state.ended).toBe(false);
    expect(state.bonuses.shield).toBe(false);
    expect(state.usedShield).toBe(true);
    expect(state.shopPoints).toBe(0);
  });

  test("gathers every card zone and the banked Joker into discard", () => {
    const state = createInitialSolatroState();
    const cards = state.discard.splice(0);
    state.deck = cards.splice(0, 20);
    state.hand = cards.splice(0, 8);
    state.scoring = cards.splice(0, 5);
    state.bankedJokerCard = cards.splice(0, 1)[0];
    state.bankedJoker = true;
    state.discard = cards;

    solatroRules.gatherToDiscard(state);

    expect(state.discard).toHaveLength(54);
    expect(new Set(state.discard.map((entry) => entry.id)).size).toBe(54);
    expect(state.discard.every((entry) => !entry.faceUp)).toBe(true);
    expect(state.deck).toHaveLength(0);
    expect(state.hand).toHaveLength(0);
    expect(state.scoring).toHaveLength(0);
    expect(state.bankedJokerCard).toBeNull();
    expect(state.bankedJoker).toBe(false);
  });
});

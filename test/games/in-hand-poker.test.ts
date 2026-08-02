import { type PlayingCard } from "@/components/Cards/card-utils";
import { inHandPokerRules } from "@/components/Games/InHandPoker";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("In-Hand Poker rules", () => {
  test.each([
    {
      name: "wheel straight",
      cards: [
        card("A", "spades"),
        card("2", "hearts"),
        card("3", "clubs"),
        card("4", "diamonds"),
        card("5", "spades"),
      ],
      category: 4,
      high: 5,
    },
    {
      name: "full house",
      cards: [
        card("Q", "spades"),
        card("Q", "hearts"),
        card("Q", "clubs"),
        card("7", "diamonds"),
        card("7", "spades"),
      ],
      category: 6,
      high: 12,
    },
    {
      name: "straight flush",
      cards: [
        card("5", "hearts"),
        card("6", "hearts"),
        card("7", "hearts"),
        card("8", "hearts"),
        card("9", "hearts"),
      ],
      category: 8,
      high: 9,
    },
  ])("ranks a $name", ({ cards, category, high }) => {
    expect(inHandPokerRules.handValue(cards).slice(0, 2)).toEqual([
      category,
      high,
    ]);
  });

  test("uses kickers to break equal hand categories", () => {
    const acePair = [
      card("A", "spades"),
      card("A", "hearts"),
      card("9", "clubs"),
      card("5", "diamonds"),
      card("2", "spades"),
    ];
    const kingPair = [
      card("K", "spades"),
      card("K", "hearts"),
      card("Q", "clubs"),
      card("J", "diamonds"),
      card("10", "spades"),
    ];

    expect(
      inHandPokerRules.compareValues(
        inHandPokerRules.handValue(acePair),
        inHandPokerRules.handValue(kingPair),
      ),
    ).toBeGreaterThan(0);
  });

  test("uses a Joker to complete a royal flush", () => {
    const value = inHandPokerRules.bestHand([
      card("10", "hearts"),
      card("J", "hearts"),
      card("Q", "hearts"),
      card("K", "hearts"),
      card("Joker", "spades", "joker"),
    ]);

    expect(value.slice(0, 2)).toEqual([8, 14]);
    expect(inHandPokerRules.handName(value)).toBe("Royal Flush");
  });

  test("selects the best five cards from an oversized hand", () => {
    const result = inHandPokerRules.bestFiveOf([
      card("2", "clubs"),
      card("10", "hearts"),
      card("J", "hearts"),
      card("Q", "hearts"),
      card("K", "hearts"),
      card("A", "hearts"),
      card("9", "diamonds"),
    ]);

    expect(result.val.slice(0, 2)).toEqual([8, 14]);
    expect(result.best).toHaveLength(5);
  });

  test("ends the game on the third consecutive fold", () => {
    expect(inHandPokerRules.foldOutcome(0)).toEqual({
      foldStreak: 1,
      ended: false,
    });
    expect(inHandPokerRules.foldOutcome(1)).toEqual({
      foldStreak: 2,
      ended: false,
    });
    expect(inHandPokerRules.foldOutcome(2)).toEqual({
      foldStreak: 3,
      ended: true,
    });
  });
});

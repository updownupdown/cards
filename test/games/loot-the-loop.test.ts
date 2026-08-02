import {
  lootTheLoopRules,
  type LoopCard,
} from "@/components/Games/LootTheLoop";

function card(rank: LoopCard["rank"]): LoopCard {
  return { id: String(rank), rank, suit: "spades", faceUp: false };
}

describe("Loot the Loop rules", () => {
  test("classifies Aces, faces, and the Joker as hazardous starts", () => {
    expect(lootTheLoopRules.isBadStartCard(card("A"))).toBe(true);
    expect(lootTheLoopRules.isBadStartCard(card("Q"))).toBe(true);
    expect(lootTheLoopRules.isBadStartCard(card("Joker"))).toBe(true);
    expect(lootTheLoopRules.isBadStartCard(card("7"))).toBe(false);
  });

  test("builds a unique 53-card loop with one Joker", () => {
    const deck = lootTheLoopRules.getLoopDeck();

    expect(deck).toHaveLength(53);
    expect(new Set(deck.map(({ id }) => id)).size).toBe(53);
    expect(deck.filter(({ rank }) => rank === "Joker")).toHaveLength(1);
    expect(deck.every(({ faceUp }) => !faceUp)).toBe(true);
  });

  test("never starts with two hazardous cards", () => {
    const deck = lootTheLoopRules.getLoopDeck();

    expect(deck.slice(0, 2).every(lootTheLoopRules.isBadStartCard)).toBe(false);
    expect(lootTheLoopRules.maxMarkedPaths).toBe(3);
  });
});

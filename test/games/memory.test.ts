import { type PlayingCard } from "@/components/Cards/card-utils";
import { memoryRules } from "@/components/Games/Memory";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("Memory rules", () => {
  test.each([6, 10, 15, 21, 28, 36])("creates %s unique pairs", (pairCount) => {
    const deck = memoryRules.createMemoryDeck(pairCount);
    const identities = new Map<string, PlayingCard[]>();

    for (const candidate of deck) {
      const key = `${candidate.rank}-${candidate.suit}`;
      identities.set(key, [...(identities.get(key) ?? []), candidate]);
    }

    expect(deck).toHaveLength(pairCount * 2);
    expect(identities.size).toBe(pairCount);
    expect([...identities.values()].every((pair) => pair.length === 2)).toBe(
      true,
    );
    expect(new Set(deck.map(({ id }) => id)).size).toBe(deck.length);
    expect(deck.every(({ faceUp }) => !faceUp)).toBe(true);
  });

  test("rejects boards larger than the available unique deck", () => {
    expect(() => memoryRules.createMemoryDeck(53)).toThrow(
      "Not enough unique cards",
    );
  });

  test("matches cards by both rank and suit", () => {
    expect(
      memoryRules.cardsMatch(
        card("7", "hearts", "first"),
        card("7", "hearts", "second"),
      ),
    ).toBe(true);
    expect(
      memoryRules.cardsMatch(card("7", "hearts"), card("7", "diamonds")),
    ).toBe(false);
    expect(
      memoryRules.cardsMatch(card("7", "hearts"), card("8", "hearts")),
    ).toBe(false);
  });

  test("keeps every configured board size even", () => {
    expect(
      Object.values(memoryRules.gridConfig).every(
        ({ cols, rows }) => (cols * rows) % 2 === 0,
      ),
    ).toBe(true);
  });
});

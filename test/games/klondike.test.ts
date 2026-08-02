import { type PlayingCard } from "@/components/Cards/card-utils";
import { klondikeRules } from "@/components/Games/Klondike";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  faceUp = true,
): PlayingCard {
  return { id: `${rank}-${suit}`, rank, suit, faceUp };
}

describe("Klondike rules", () => {
  test("only a king can move to an empty tableau pile", () => {
    expect(klondikeRules.canPlaceOnTableau(card("K", "hearts"))).toBe(true);
    expect(klondikeRules.canPlaceOnTableau(card("Q", "spades"))).toBe(false);
  });

  test("tableau moves descend by rank and alternate color", () => {
    const blackEight = card("8", "spades");

    expect(
      klondikeRules.canPlaceOnTableau(card("7", "hearts"), blackEight),
    ).toBe(true);
    expect(
      klondikeRules.canPlaceOnTableau(card("7", "clubs"), blackEight),
    ).toBe(false);
    expect(
      klondikeRules.canPlaceOnTableau(card("6", "hearts"), blackEight),
    ).toBe(false);
  });

  test("foundations start with aces and ascend in one suit", () => {
    expect(klondikeRules.canPlaceOnFoundation(card("A", "diamonds"))).toBe(
      true,
    );
    expect(
      klondikeRules.canPlaceOnFoundation(
        card("2", "diamonds"),
        card("A", "diamonds"),
      ),
    ).toBe(true);
    expect(
      klondikeRules.canPlaceOnFoundation(
        card("2", "hearts"),
        card("A", "diamonds"),
      ),
    ).toBe(false);
  });

  test("validates every adjacency in a dragged tableau run", () => {
    expect(
      klondikeRules.isValidTableauRun([
        card("9", "clubs"),
        card("8", "diamonds"),
        card("7", "spades"),
      ]),
    ).toBe(true);
    expect(
      klondikeRules.isValidTableauRun([
        card("9", "clubs"),
        card("8", "spades"),
      ]),
    ).toBe(false);
  });

  test("reveals the new top card without mutating the source pile", () => {
    const pile = [card("4", "clubs", false), card("3", "hearts", false)];
    const revealed = klondikeRules.revealLastIfNeeded(pile);

    expect(revealed[1].faceUp).toBe(true);
    expect(pile[1].faceUp).toBe(false);
  });
});

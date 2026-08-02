import { type PlayingCard } from "@/components/Cards/card-utils";
import { russianSolitaireRules } from "@/components/Games/RussianSolitaire";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
): PlayingCard {
  return { id: `${rank}-${suit}`, rank, suit, faceUp: true };
}

describe("Russian Solitaire rules", () => {
  test("builds down one rank in the same suit", () => {
    expect(
      russianSolitaireRules.russianCanStack(
        card("6", "clubs"),
        card("7", "clubs"),
      ),
    ).toBe(true);
    expect(
      russianSolitaireRules.russianCanStack(
        card("6", "spades"),
        card("7", "clubs"),
      ),
    ).toBe(false);
    expect(
      russianSolitaireRules.russianCanStack(
        card("5", "clubs"),
        card("7", "clubs"),
      ),
    ).toBe(false);
  });

  test("allows only Kings into empty columns", () => {
    expect(russianSolitaireRules.russianCanStack(card("K"), undefined)).toBe(
      true,
    );
    expect(russianSolitaireRules.russianCanStack(card("Q"), undefined)).toBe(
      false,
    );
  });
});

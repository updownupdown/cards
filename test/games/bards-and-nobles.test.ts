import { type PlayingCard } from "@/components/Cards/card-utils";
import { bardsAndNoblesRules } from "@/components/Games/BardsAndNobles";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
): PlayingCard {
  return { id: `${rank}-${suit}`, rank, suit, faceUp: true };
}

describe("Bards & Nobles rules", () => {
  test("values books and customers using the specified values", () => {
    expect(bardsAndNoblesRules.bookValue(card("A", "hearts"))).toBe(11);
    expect(bardsAndNoblesRules.bookValue(card("A", "hearts"), true)).toBe(1);
    expect(bardsAndNoblesRules.bookValue(card("9", "hearts"))).toBe(9);
    expect(bardsAndNoblesRules.customerMoney(card("J", "clubs"))).toBe(11);
    expect(bardsAndNoblesRules.customerPenalty(card("K", "clubs"))).toBe(3);
  });

  test("makes only books matching the used-book genre free", () => {
    const usedBook = card("4", "spades");
    const books = [
      card("8", "spades"),
      card("A", "hearts"),
      card("3", "clubs"),
    ];

    expect(
      bardsAndNoblesRules.selectedOfferValue(books, usedBook, new Set()),
    ).toBe(14);
    expect(
      bardsAndNoblesRules.selectedOfferValue(
        books,
        usedBook,
        new Set([books[1].id]),
      ),
    ).toBe(4);
  });

  test("prioritizes an Ace's exclusive offer over its limited-time offer", () => {
    const usedBook = card("4", "spades");
    const ace = card("A", "spades");

    expect(bardsAndNoblesRules.isExclusiveOffer(ace, usedBook)).toBe(true);
    expect(
      bardsAndNoblesRules.selectedOfferValue(
        [ace],
        usedBook,
        new Set([ace.id]),
      ),
    ).toBe(0);
  });

  test("makes matching book values free with Super Exclusive Offer", () => {
    const usedBook = card("4", "spades");
    const books = [card("4", "hearts"), card("3", "clubs")];

    expect(
      bardsAndNoblesRules.selectedOfferValue(books, usedBook, new Set(), true),
    ).toBe(3);
  });

  test("maps final Guild Standing to the documented result", () => {
    expect(bardsAndNoblesRules.outcomeMessage(9)).toBe("Terminated");
    expect(bardsAndNoblesRules.outcomeMessage(10)).toBe(
      "Employee of the Month",
    );
    expect(bardsAndNoblesRules.outcomeMessage(18)).toBe(
      "Executive Lordship Program",
    );
  });
});

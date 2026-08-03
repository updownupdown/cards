import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import {
  merchantsSolitaireRules,
  type MerchantsSolitaireGameState,
} from "@/components/Games/MerchantsSolitaire";

function card(
  rank: CardRank,
  id: string = rank,
  suit: CardSuit = "hearts",
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(
  overrides: Partial<MerchantsSolitaireGameState> = {},
): MerchantsSolitaireGameState {
  return {
    line: [],
    usedItems: [],
    inventory: [],
    shop: Array.from({ length: 8 }, () => null),
    lockedShelves: Array.from({ length: 8 }, () => false),
    guildStanding: [],
    discard: [],
    currentCustomer: null,
    currentUsedItem: null,
    turnsCompleted: 0,
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

const standardSettings = {
  loyalPatrons: false,
  checkBack: false,
  superExclusive: false,
  vandals: 0 as const,
};

describe("Merchant's Solitaire rules", () => {
  test("separates 40 items from 12 customers", () => {
    const decks = merchantsSolitaireRules.createMerchantDecks(0);

    expect(decks.items).toHaveLength(40);
    expect(decks.customers).toHaveLength(12);
  });

  test("makes matching type items free and lets an Ace be valued at one", () => {
    const used = card("5", "used", "hearts");
    const free = card("9", "free", "hearts");
    const ace = card("A", "ace", "clubs");

    expect(
      merchantsSolitaireRules.offerTotal([free, ace], used, standardSettings, [
        "ace",
      ]),
    ).toBe(1);
  });

  test("Super Exclusive Offer also makes matching ranks free", () => {
    const used = card("7", "used", "hearts");
    const sameRank = card("7", "same-rank", "clubs");

    expect(
      merchantsSolitaireRules.offerTotal(
        [sameRank],
        used,
        { ...standardSettings, superExclusive: true },
        [],
      ),
    ).toBe(0);
  });

  test("adds preferred selected items to Guild Standing and returns the Used Item to Inventory", () => {
    const customer = card("J", "customer", "spades");
    const used = card("2", "used", "hearts");
    const matching = card("10", "matching", "spades");
    const other = card("3", "other", "clubs");
    const game = state({
      shop: [
        matching,
        other,
        card("4", "shelf-2"),
        card("5", "shelf-3"),
        card("6", "shelf-4"),
        card("7", "shelf-5"),
        card("8", "shelf-6"),
        card("9", "shelf-7"),
      ],
      currentCustomer: customer,
      currentUsedItem: used,
      line: [card("Q", "next")],
      usedItems: [card("4", "next-used")],
      inventory: [card("7", "restock-one"), card("8", "restock-two")],
    });

    expect(
      merchantsSolitaireRules.resolveTrade(
        game,
        { shopIndexes: [0, 1], includeInventory: false, lowAceIds: [] },
        standardSettings,
      ),
    ).toBe(true);
    expect(game.guildStanding.map((entry) => entry.id)).toEqual(["matching"]);
    expect(game.discard.map((entry) => entry.id)).toContain("other");
    expect(game.inventory[0]?.id).toBe("used");
    expect(game.currentCustomer?.id).toBe("next");
  });

  test("Loyal Patrons sends a four-item customer to Guild Standing", () => {
    const game = state({
      shop: [
        card("2", "one", "clubs"),
        card("3", "two", "diamonds"),
        card("4", "three", "hearts"),
        card("4", "four", "clubs"),
        null,
        null,
        null,
        null,
      ],
      currentCustomer: card("J", "customer", "spades"),
      currentUsedItem: card("2", "used", "spades"),
    });

    expect(
      merchantsSolitaireRules.resolveTrade(
        game,
        { shopIndexes: [0, 1, 2, 3], includeInventory: false, lowAceIds: [] },
        { ...standardSettings, loyalPatrons: true },
      ),
    ).toBe(true);
    expect(game.guildStanding.map((entry) => entry.id)).toEqual(["customer"]);
  });

  test("locks a shop shelf for each Vandal without consuming a Used Item", () => {
    const locked = card("6", "locked");
    const game = state({
      line: [card("J", "customer"), card("Joker", "vandal")],
      usedItems: [card("3", "used")],
      shop: [locked, card("4", "open"), null, null, null, null, null, null],
    });

    merchantsSolitaireRules.advanceToCustomer(game);

    expect(game.lockedShelves[0]).toBe(true);
    expect(game.shop[0]?.faceUp).toBe(false);
    expect(game.currentCustomer?.id).toBe("customer");
    expect(game.currentUsedItem?.id).toBe("used");
  });

  test("ends immediately when a penalty cannot be paid", () => {
    const game = state({
      currentCustomer: card("K", "king"),
      currentUsedItem: card("2", "used"),
      guildStanding: [card("4", "only-standing")],
    });

    merchantsSolitaireRules.passCustomer(game);

    expect(game).toMatchObject({ ended: true, won: false });
    expect(game.guildStanding).toHaveLength(0);
  });
});

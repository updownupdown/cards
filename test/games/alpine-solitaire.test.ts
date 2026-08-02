import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  alpineSolitaireRules,
  type AlpineRouteRecord,
} from "@/components/Games/AlpineSolitaire";
import type { AlpineChallenge } from "@/data/game-menu";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function route(
  cards: PlayingCard[],
  challenge: AlpineChallenge = "none",
): AlpineRouteRecord {
  const result = alpineSolitaireRules.analyzeRoute(cards, challenge);
  if (!result) throw new Error("Expected a legal route fixture");
  return result;
}

describe("Alpine Solitaire rules", () => {
  test("classifies ordered ascents, traverses, and suited descents", () => {
    expect(route([card("3"), card("4"), card("5")])).toMatchObject({
      type: "ascent",
      size: 3,
      anchorValue: 5,
    });
    expect(
      route([card("7", "clubs"), card("7", "hearts", "other-seven")]),
    ).toMatchObject({ type: "traverse", size: 2, anchorValue: 7 });
    expect(
      route([card("K", "spades"), card("9", "spades"), card("4", "spades")]),
    ).toMatchObject({ type: "descent", size: 3, anchorValue: 4 });
  });

  test("rejects unordered, repeated-rank, and mixed-suit descent routes", () => {
    expect(
      alpineSolitaireRules.analyzeRoute(
        [card("4"), card("3"), card("5")],
        "none",
      ),
    ).toBeNull();
    expect(
      alpineSolitaireRules.analyzeRoute(
        [card("8", "clubs"), card("6", "hearts")],
        "none",
      ),
    ).toBeNull();
    expect(
      alpineSolitaireRules.analyzeRoute(
        [card("5"), card("5", "clubs"), card("4")],
        "none",
      ),
    ).toBeNull();
  });

  test("applies Nanga Parbat equal-step ascents and forbids traverses", () => {
    expect(
      route([card("2"), card("5"), card("8")], "nanga-parbat"),
    ).toMatchObject({ type: "ascent", anchorValue: 8 });
    expect(
      alpineSolitaireRules.analyzeRoute(
        [card("7"), card("7", "clubs")],
        "nanga-parbat",
      ),
    ).toBeNull();
  });

  test("compares routes by size, then type, then anchor", () => {
    const descent = route([card("9", "clubs"), card("5", "clubs")]);
    const traverse = route([card("6"), card("6", "clubs")]);
    const ascent = route([card("5"), card("6", "clubs")]);
    const larger = route([card("2"), card("3"), card("4")]);

    expect(alpineSolitaireRules.compareRoutes(larger, ascent)).toBeGreaterThan(
      0,
    );
    expect(
      alpineSolitaireRules.compareRoutes(ascent, traverse),
    ).toBeGreaterThan(0);
    expect(
      alpineSolitaireRules.compareRoutes(traverse, descent),
    ).toBeGreaterThan(0);
  });

  test("requires each ordinary route to beat the previous route", () => {
    const previous = route([card("5"), card("6")]);
    const lower = route([card("4"), card("5")]);
    const higher = route([card("6"), card("7")]);

    expect(
      alpineSolitaireRules.canPlayRoute(lower, previous, "none", null),
    ).toMatchObject({ ok: false, comparisonField: "Anchor" });
    expect(
      alpineSolitaireRules.canPlayRoute(higher, previous, "none", null),
    ).toEqual({ ok: true });
  });

  test("enforces Lhotse, Gasherbrum I, and Broad Peak restrictions", () => {
    const single = route([card("6", "hearts")]);

    expect(
      alpineSolitaireRules.canPlayRoute(single, null, "lhotse", null).ok,
    ).toBe(false);
    expect(
      alpineSolitaireRules.canPlayRoute(
        route([card("5", "clubs")]),
        null,
        "gasherbrum-i",
        null,
      ).ok,
    ).toBe(false);
    expect(
      alpineSolitaireRules.canPlayRoute(single, null, "broad-peak", "hearts")
        .ok,
    ).toBe(false);
  });

  test("computes and caps each approach draw", () => {
    expect(
      alpineSolitaireRules.computeDraw(
        route([card("2"), card("3", "hearts")]),
        [card("4"), card("8"), card("A")],
        "none",
      ),
    ).toBe(2);
    expect(
      alpineSolitaireRules.computeDraw(
        route([card("8", "clubs"), card("4", "clubs")]),
        [card("A"), card("2"), card("9")],
        "none",
      ),
    ).toBe(2);
    expect(
      alpineSolitaireRules.computeDraw(
        route([card("3"), card("4", "diamonds")]),
        [card("2", "diamonds"), card("7", "diamonds"), card("9", "diamonds")],
        "none",
      ),
    ).toBe(2);
    expect(
      alpineSolitaireRules.computeDraw(
        route([
          card("2", "hearts"),
          card("3", "diamonds"),
          card("4", "spades"),
        ]),
        [],
        "none",
      ),
    ).toBe(2);
  });

  test("qualifies milestones by difficulty and challenge", () => {
    const short = route([card("3"), card("4")]);
    const long = route([card("2"), card("3"), card("4")]);
    const traverse = route([card("7"), card("7", "clubs")]);

    expect(
      alpineSolitaireRules.milestoneQualifies(
        short,
        [long],
        "gentle",
        "none",
        [],
      ),
    ).toBe(true);
    expect(
      alpineSolitaireRules.milestoneQualifies(
        short,
        [long],
        "intense",
        "none",
        [],
      ),
    ).toBe(false);
    expect(
      alpineSolitaireRules.milestoneQualifies(
        long,
        [],
        "standard",
        "dhaulagiri",
        [traverse],
      ),
    ).toBe(true);
    expect(
      alpineSolitaireRules.milestoneQualifies(
        long,
        [],
        "standard",
        "dhaulagiri",
        [short],
      ),
    ).toBe(false);
  });
});

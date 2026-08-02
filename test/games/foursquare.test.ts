import { type PlayingCard } from "@/components/Cards/card-utils";
import { foursquareRules } from "@/components/Games/Foursquare";

function card(
  rank: PlayingCard["rank"],
  faceUp = true,
  id: string = `${rank}-${faceUp}`,
): PlayingCard {
  return { id, rank, suit: "spades", faceUp };
}

function emptyPiles(): PlayingCard[][] {
  return Array.from({ length: 16 }, () => []);
}

describe("Foursquare rules", () => {
  test("allows the first card in any pile", () => {
    expect(foursquareRules.legalPlacements(emptyPiles(), card("7"))).toEqual(
      Array.from({ length: 16 }, (_, index) => index),
    );
  });

  test("uses orthogonal adjacency without wrapping rows", () => {
    const piles = emptyPiles();
    piles[3] = [card("7")];

    expect(foursquareRules.getAdjacentPiles(piles)).toEqual([2, 3, 7]);
  });

  test("flips a line only for a strict high or low card", () => {
    const piles = emptyPiles();
    piles[1] = [card("5")];
    piles[2] = [card("9")];

    expect(
      foursquareRules.applyFlips(piles, 0, card("10")).flippedIndices,
    ).toEqual([1, 2, 3]);
    expect(
      foursquareRules.applyFlips(piles, 0, card("9")).flippedIndices,
    ).toEqual([]);
  });

  test("allows covering a face-down pile when that restores the limit", () => {
    const piles = emptyPiles();
    piles[0] = [card("4", false, "down-0")];
    piles[1] = [card("6", false, "down-1")];
    piles[4] = [card("8", false, "down-4")];
    piles[5] = [card("10", false, "down-5")];

    expect(foursquareRules.numFaceDownTopCards(piles)).toBe(4);
    expect(foursquareRules.legalPlacements(piles, card("7"))).toContain(0);
  });

  test("rejects full piles and a missing draw card", () => {
    const piles = emptyPiles();
    piles[0] = [card("2"), card("3"), card("4"), card("5")];

    expect(foursquareRules.legalPlacements(piles, card("7"))).not.toContain(0);
    expect(foursquareRules.legalPlacements(piles, undefined)).toEqual([]);
  });

  test("wins only with sixteen occupied face-up piles", () => {
    expect(foursquareRules.hasAllFaceUp(emptyPiles())).toBe(false);
    expect(
      foursquareRules.hasAllFaceUp(
        Array.from({ length: 16 }, (_, index) => [card("A", true, `${index}`)]),
      ),
    ).toBe(true);
  });
});

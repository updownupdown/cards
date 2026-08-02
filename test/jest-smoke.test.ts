import { rankValue, type PlayingCard } from "@/components/Cards/card-utils";

test("jest-expo resolves TypeScript path aliases", () => {
  const ace: PlayingCard = {
    id: "ace",
    suit: "spades",
    rank: "A",
    faceUp: true,
  };

  expect(rankValue(ace)).toBe(1);
});

import { PlayingCard, RANK_VALUE } from "../Cards/card-utils";
import { YukonBoard } from "./Yukon";

export function alaskaCanStack(card: PlayingCard, destination?: PlayingCard) {
  if (!destination) return card.rank === "K";
  return (
    card.suit === destination.suit &&
    Math.abs(RANK_VALUE[card.rank] - RANK_VALUE[destination.rank]) === 1
  );
}

export default function Alaska() {
  return (
    <YukonBoard
      canStack={alaskaCanStack}
      winMessage="Every Alaskan suit is home!"
    />
  );
}

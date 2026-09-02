import { PlayingCard, RANK_VALUE } from "../Cards/card-utils";
import { YukonBoard } from "./Yukon";

export function moosehideCanStack(
  card: PlayingCard,
  destination?: PlayingCard,
) {
  if (!destination) return card.rank === "K";
  return (
    card.suit !== destination.suit &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destination.rank]
  );
}

export default function Moosehide() {
  return (
    <YukonBoard
      canStack={moosehideCanStack}
      winMessage="Every trail leads home!"
    />
  );
}

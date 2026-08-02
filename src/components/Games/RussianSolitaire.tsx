import { PlayingCard, RANK_VALUE } from "../Cards/card-utils";
import { YukonBoard } from "./Yukon";

function russianCanStack(
  card: PlayingCard,
  destTop: PlayingCard | undefined,
): boolean {
  if (!destTop) return card.rank === "K"; // only Kings to empty columns
  return (
    card.suit === destTop.suit &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destTop.rank]
  );
}

export const russianSolitaireRules = {
  russianCanStack,
};

export default function RussianSolitaire() {
  return (
    <YukonBoard canStack={russianCanStack} winMessage="Every suit is home!" />
  );
}

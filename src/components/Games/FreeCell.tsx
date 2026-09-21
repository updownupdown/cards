import { ReserveCellBoard, type ReserveCellGameState } from "./EightOff";
import {
  isRed,
  RANK_VALUE,
  RANKS,
  shuffle,
  SUITS,
  type PlayingCard,
} from "../Cards/card-utils";

export type FreeCellGameState = ReserveCellGameState;

function canPlaceOnCascade(
  card: PlayingCard,
  destinationTop?: PlayingCard,
): boolean {
  if (!destinationTop) return true;
  return (
    isRed(card.suit) !== isRed(destinationTop.suit) &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank]
  );
}

function canPlaceOnFoundation(
  card: PlayingCard,
  destinationTop?: PlayingCard,
): boolean {
  if (!destinationTop) return card.rank === "A";
  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[destinationTop.rank] + 1
  );
}

function createInitialState(): FreeCellGameState {
  const deck = shuffle(
    SUITS.flatMap((suit) =>
      RANKS.map((rank) => ({
        id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
        suit,
        rank,
        faceUp: true,
      })),
    ),
  );
  const cascades: PlayingCard[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, index) => cascades[index % 8].push(card));

  return {
    cascades,
    freeCells: [null, null, null, null],
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
  };
}

export const freeCellRules = {
  canPlaceOnCascade,
  canPlaceOnFoundation,
  createInitialState,
};

export default function FreeCell() {
  return (
    <ReserveCellBoard
      columnCount={8}
      createState={createInitialState}
      canPlaceOnCascade={canPlaceOnCascade}
      foundationStartColumn={4}
      freeCellRow={0}
      cascadeRow={1.2}
    />
  );
}

import { ReserveCellBoard, type ReserveCellGameState } from "./EightOff";
import {
  createDeck,
  isRed,
  RANK_VALUE,
  shuffle,
  SUITS,
  type PlayingCard,
} from "../Cards/card-utils";
import { useGameVariant } from "@/hooks/useGameVariant";

export type KingAlbertGameState = ReserveCellGameState;

/**
 * King Albert: nine columns of one to nine cards and a seven-card reserve.
 * Raglan: the Aces start on the foundations, the columns stop at seven cards
 * and the reserve holds six.
 */
const DEALS = {
  "king-albert": {
    columnSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    reserveSize: 7,
    acesOnFoundations: false,
  },
  raglan: {
    columnSizes: [1, 2, 3, 4, 5, 6, 7, 7, 7],
    reserveSize: 6,
    acesOnFoundations: true,
  },
} as const;

type KingAlbertVariant = keyof typeof DEALS;

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

function createKingAlbertState(
  variant: KingAlbertVariant,
): ReserveCellGameState {
  const { columnSizes, reserveSize, acesOnFoundations } = DEALS[variant];
  let deck = shuffle(createDeck({ faceUp: true }));
  const foundations = SUITS.map(() => [] as PlayingCard[]);
  if (acesOnFoundations) {
    SUITS.forEach((suit, index) => {
      const ace = deck.find((card) => card.rank === "A" && card.suit === suit);
      if (ace) foundations[index].push(ace);
    });
    deck = deck.filter((card) => card.rank !== "A");
  }

  let offset = 0;
  const cascades = columnSizes.map((size) => {
    const column = deck.slice(offset, offset + size);
    offset += size;
    return column;
  });

  return {
    cascades,
    freeCells: deck.slice(offset, offset + reserveSize),
    foundations,
  };
}

export const kingAlbertRules = {
  canPlaceOnCascade,
  createInitialState: createKingAlbertState,
};

const createKingAlbert = () => createKingAlbertState("king-albert");
const createRaglan = () => createKingAlbertState("raglan");

export default function KingAlbert() {
  const variant = useGameVariant("/king-albert");
  if (!variant) return null;
  const { reserveSize } = DEALS[variant];
  return (
    <ReserveCellBoard
      key={variant}
      columnCount={9}
      createState={variant === "raglan" ? createRaglan : createKingAlbert}
      canPlaceOnCascade={canPlaceOnCascade}
      foundationStartColumn={2.5}
      freeCellStartColumn={(9 - reserveSize) / 2}
      singleCardMoves
      cellsAcceptCards={false}
      fixedRows={7.6}
    />
  );
}

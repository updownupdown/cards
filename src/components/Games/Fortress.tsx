import { CastleBoard, type CastleGameState } from "./BeleagueredCastle";
import {
  createDeck,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";

export type FortressGameState = CastleGameState;

function fortressCanStack(
  card: PlayingCard,
  destination: PlayingCard | undefined,
) {
  if (!destination) return true;
  return (
    card.suit === destination.suit &&
    Math.abs(rankValue(card) - rankValue(destination)) === 1
  );
}

function createFortressState(): CastleGameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const columnSizes = [6, 6, 5, 5, 5, 5, 5, 5, 5, 5];
  let offset = 0;
  const columns = columnSizes.map((size) => {
    const column = deck.slice(offset, offset + size);
    offset += size;
    return column;
  });
  return {
    columns,
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
    ended: false,
    won: false,
  };
}

export const fortressRules = {
  canStack: fortressCanStack,
  createInitialState: createFortressState,
};

export default function Fortress() {
  return (
    <CastleBoard
      columnCount={10}
      createState={createFortressState}
      canStack={fortressCanStack}
      winMessage="The fortress is complete!"
    />
  );
}

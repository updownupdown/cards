import {
  beleagueredCastleRules,
  CastleBoard,
  type CastleGameState,
} from "./BeleagueredCastle";
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
  let state: CastleGameState;
  do {
    const deck = shuffle(createDeck({ faceUp: true }));
    const columnSizes = [6, 6, 5, 5, 5, 5, 5, 5, 5, 5];
    let offset = 0;
    const columns = columnSizes.map((size) => {
      const column = deck.slice(offset, offset + size);
      offset += size;
      return column;
    });
    state = {
      columns,
      foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
      ended: false,
      won: false,
    };
  } while (!beleagueredCastleRules.anyLegalMove(state, fortressCanStack));

  return state;
}

function dealFortress(state: CastleGameState) {
  const cards = state.foundations[0].splice(0);
  const columnSizes = [6, 6, 5, 5, 5, 5, 5, 5, 5, 5];

  state.columns = columnSizes.map((size) =>
    cards.splice(0, size).map((card) => ({ ...card, faceUp: true })),
  );
  state.foundations = Array.from({ length: 4 }, () => [] as PlayingCard[]);
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
      deal={dealFortress}
      canStack={fortressCanStack}
      winMessage="The fortress is complete!"
    />
  );
}

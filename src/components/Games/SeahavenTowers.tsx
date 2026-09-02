import { ReserveCellBoard, type ReserveCellGameState } from "./EightOff";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";

export type SeahavenTowersGameState = ReserveCellGameState;

function createSeahavenTowersState(): ReserveCellGameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const cascades = Array.from({ length: 10 }, (_, index) =>
    deck.slice(index * 5, index * 5 + 5),
  );
  const freeCells: (PlayingCard | null)[] = [deck[50], deck[51], null, null];
  return {
    cascades,
    freeCells,
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
  };
}

export const seahavenTowersRules = {
  createInitialState: createSeahavenTowersState,
};

export default function SeahavenTowers() {
  return (
    <ReserveCellBoard
      columnCount={10}
      createState={createSeahavenTowersState}
    />
  );
}

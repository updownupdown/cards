import {
  SingleCardSolitaire,
  type SingleCardState,
} from "./SingleCardSolitaire";

export type BristolGameState = SingleCardState;

export default function Bristol() {
  return <SingleCardSolitaire variant="bristol" />;
}

import {
  SingleCardSolitaire,
  type SingleCardState,
} from "./SingleCardSolitaire";

export type FourSeasonsGameState = SingleCardState;

export default function FourSeasons() {
  return <SingleCardSolitaire variant="four-seasons" />;
}
